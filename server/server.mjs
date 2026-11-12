/**
 * PERKIM Web Maintenance Dashboard - Local HTTP Server
 * 
 * Serves the built SPA, file operations API, sync, deploy, and AI endpoints.
 * The NVIDIA key stays on the server; the browser only talks to local /api/* endpoints.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve, extname, sep } from 'node:path';
import { config } from './config.mjs';
import { validateChatRequest } from './validation.mjs';
import { streamNvidiaChat, NvidiaError, checkNvidiaConnection } from './nvidia-client.mjs';
import { AI_MODES, buildUpstreamMessages } from './ai-prompts.mjs';
import { runSystemChecks } from './checks.mjs';
import {
  listDir,
  readFileContent,
  writeFileContent,
  deleteFile,
  moveFile,
  uploadFile,
  scanManifest,
  getFileHash,
} from './file-ops.mjs';
import { fullSync, getSyncStatus } from './sync-engine.mjs';
import { runMonitorAudit, getLatestAuditResults, deployWorkflow, validateDeployPrerequisites } from './deploy.mjs';
import { runFullScan } from './scan.mjs';

const DIST_DIR = resolve('dist');
const PUBLIC_DIR = resolve('public');
const DATA_DIR = resolve('data');

// SSE clients for live updates
const sseClients = new Set();

function sendJson(res, status, payload) {
  if (res.writableEnded || res.destroyed) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function sendSse(res, event, data) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcastSse(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (!client.writableEnded && !client.destroyed) {
      client.write(message);
    }
  }
}

async function readJson(req, maxBytes = null) {
  const limit = maxBytes || config.limits.maxBodyBytes;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error('Request body too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Invalid JSON');
    error.status = 400;
    throw error;
  }
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const allowed = new Set([
    config.allowedOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    ...config.allowedOrigins,
  ]);

  res.setHeader('Access-Control-Allow-Origin', origin && allowed.has(origin) ? origin : config.allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Dev-Token');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function resolveInside(baseDir, urlPath) {
  const target = resolve(baseDir, urlPath.replace(/^[/\\]+/, ''));
  return target === baseDir || target.startsWith(baseDir + sep) ? target : null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

async function tryServeFile(res, baseDir, urlPath) {
  const filePath = resolveInside(baseDir, urlPath);
  if (!filePath) return false;

  try {
    const content = await readFile(filePath);
    res.setHeader('Content-Type', MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = 200;
    res.end(content);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return false;
    throw error;
  }
}

async function serveStatic(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url || '/', `http://${req.headers.host}`).pathname);
  } catch {
    res.statusCode = 400;
    return res.end('Bad Request');
  }

  if (urlPath === '/') urlPath = '/index.html';

  try {
    if (urlPath.startsWith('/data/')) {
      if (await tryServeFile(res, DATA_DIR, urlPath.slice('/data'.length))) return;
    } else {
      if (await tryServeFile(res, DIST_DIR, urlPath)) return;
      if (await tryServeFile(res, PUBLIC_DIR, urlPath)) return;
    }

    if (!urlPath.startsWith('/api/') && !urlPath.startsWith('/data/') && !extname(urlPath)) {
      await tryServeFile(res, DIST_DIR, '/index.html') || await tryServeFile(res, PUBLIC_DIR, '/index.html');
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  } catch (error) {
    console.error('[STATIC] Read error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}

// ==========================================
// AI ENDPOINTS
// ==========================================

async function handleApiAiChat(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  let payload;
  try {
    payload = await readJson(req);
  } catch (error) {
    return sendJson(res, error.status || 400, { error: error.message });
  }

  const validation = validateChatRequest(payload);
  if (!validation.valid) {
    return sendJson(res, 400, { error: 'Validation failed', details: validation.errors });
  }

  if (!config.nvidia.hasValidKey) {
    return sendJson(res, 503, {
      error: 'NVIDIA_API_KEY is not configured on the local server.',
      code: 'AI_NOT_CONFIGURED',
    });
  }

  const { mode, locale, context, messages, settings } = validation.sanitized;
  const upstream = buildUpstreamMessages({ mode, locale, context, messages });

  if (!upstream.messages.some((item) => item.role === 'user')) {
    return sendJson(res, 400, { error: 'At least one user message is required.' });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  sendSse(res, 'meta', { model: config.nvidia.model, mode });

  const abortController = new AbortController();
  const abort = () => abortController.abort();
  req.on('aborted', abort);
  res.on('close', abort);

  try {
    await streamNvidiaChat({
      messages: upstream.messages,
      settings,
      signal: abortController.signal,
      onChunk: (text) => sendSse(res, 'delta', { text }),
      onThinking: () => sendSse(res, 'thinking', { active: true }),
    });
    sendSse(res, 'done', { model: config.nvidia.model });
  } catch (error) {
    if (!abortController.signal.aborted) {
      if (error instanceof NvidiaError) {
        sendSse(res, 'error', { error: error.message, code: error.code });
      } else {
        console.error('[AI] Unexpected stream error:', error);
        sendSse(res, 'error', { error: 'Unexpected server error', code: 'SERVER_ERROR' });
      }
    }
  } finally {
    req.off('aborted', abort);
    res.off('close', abort);
    if (!res.writableEnded && !res.destroyed) res.end();
  }
}

async function handleApiAiStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  sendJson(res, 200, {
    configured: config.nvidia.hasValidKey,
    model: config.nvidia.model,
    modes: AI_MODES,
    runtime: 'local-node-server',
  });
}

async function handleApiAiCheck(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const report = await runSystemChecks();
    sendJson(res, 200, report);
  } catch (error) {
    console.error('[AI] Check failed:', error);
    sendJson(res, 500, { error: error.message || 'System checks failed.' });
  }
}

// ==========================================
// FILE OPERATIONS ENDPOINTS
// ==========================================

async function handleApiFilesTree(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.searchParams.get('path') || '';
  const root = url.searchParams.get('root') || 'web';

  try {
    const tree = await listDir(path, root);
    sendJson(res, 200, { tree, path, root });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleApiFilesRead(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.searchParams.get('path');
  const root = url.searchParams.get('root') || 'web';
  const encoding = url.searchParams.get('encoding') || 'utf8';

  if (!path) return sendJson(res, 400, { error: 'path parameter required' });

  try {
    const content = await readFileContent(path, root, encoding === 'buffer' ? 'buffer' : 'utf8');
    if (encoding === 'buffer') {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.end(content);
    } else {
      sendJson(res, 200, { path, content, encoding });
    }
  } catch (error) {
    sendJson(res, 404, { error: error.message });
  }
}

async function handleApiFilesWrite(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    res.setHeader('Allow', 'POST, PUT');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  try {
    const payload = await readJson(req);
    const { path, content, root = 'web', encoding = 'utf8' } = payload;

    if (!path) return sendJson(res, 400, { error: 'path required' });
    if (content === undefined) return sendJson(res, 400, { error: 'content required' });

    const result = await writeFileContent(path, content, root, encoding);
    broadcastSse('file-changed', { path, root, action: 'write' });
    sendJson(res, 200, { success: true, ...result });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleApiFilesDelete(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.searchParams.get('path');
  const root = url.searchParams.get('root') || 'web';

  if (!path) return sendJson(res, 400, { error: 'path parameter required' });

  try {
    await deleteFile(path, root);
    broadcastSse('file-changed', { path, root, action: 'delete' });
    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleApiFilesMove(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  try {
    const payload = await readJson(req);
    const { src, dest, root = 'web' } = payload;

    if (!src || !dest) return sendJson(res, 400, { error: 'src and dest required' });

    await moveFile(src, dest, root);
    broadcastSse('file-changed', { src, dest, root, action: 'move' });
    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleApiFilesUpload(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  // Handle multipart/form-data
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return sendJson(res, 400, { error: 'Content-Type must be multipart/form-data' });
  }

  // Simple multipart parser for single file upload
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return sendJson(res, 400, { error: 'Missing boundary' });

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  const parts = body.toString('binary').split(`--${boundary}`);
  let fileData = null;
  let fileName = null;
  let path = '';
  let root = 'web';
  let optimize = true;

  for (const part of parts) {
    if (part.includes('name="file"')) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd > 0) {
        const headers = part.slice(0, headerEnd);
        const nameMatch = headers.match(/name="file".*filename="([^"]+)"/i);
        if (nameMatch) fileName = nameMatch[1];
        fileData = Buffer.from(part.slice(headerEnd + 4, part.length - 2), 'binary');
      }
    } else if (part.includes('name="path"')) {
      path = part.split('\r\n\r\n')[1]?.replace(/\r?\n--$/, '').trim() || '';
    } else if (part.includes('name="root"')) {
      root = part.split('\r\n\r\n')[1]?.replace(/\r?\n--$/, '').trim() || 'web';
    } else if (part.includes('name="optimize"')) {
      optimize = part.split('\r\n\r\n')[1]?.includes('true');
    }
  }

  if (!fileData || !fileName) {
    return sendJson(res, 400, { error: 'File not found in upload' });
  }

  const uploadPath = path ? `${path}/${fileName}` : fileName;

  try {
    const result = await uploadFile(uploadPath, fileData, root, { optimize });
    broadcastSse('file-changed', { path: uploadPath, root, action: 'upload' });
    sendJson(res, 200, { success: true, path: uploadPath, ...result });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleApiFilesHash(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.searchParams.get('path');
  const root = url.searchParams.get('root') || 'web';

  if (!path) return sendJson(res, 400, { error: 'path parameter required' });

  try {
    const hash = await getFileHash(path, root);
    sendJson(res, 200, { path, hash });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

async function handleApiScanManifest(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.searchParams.get('path') || '';
  const root = url.searchParams.get('root') || 'web';

  try {
    const manifest = await scanManifest(root, path);
    sendJson(res, 200, manifest);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

// ==========================================
// SYNC ENDPOINTS
// ==========================================

async function handleApiSyncStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const status = await getSyncStatus();
    sendJson(res, 200, status);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleApiSyncPlan(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  try {
    const payload = await readJson(req);
    const { sourceManifest, targetManifest } = payload;

    if (!sourceManifest || !targetManifest) {
      return sendJson(res, 400, { error: 'sourceManifest and targetManifest required' });
    }

    const { computeSyncPlan } = await import('./sync-engine.mjs');
    const plan = await computeSyncPlan(sourceManifest, targetManifest);
    sendJson(res, 200, { plan });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleApiSyncApply(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  try {
    const payload = await readJson(req);
    const { plan, direction = 'push', dryRun = false, force = false } = payload;

    if (!plan) return sendJson(res, 400, { error: 'plan required' });

    // Set up SSE for progress
    const clientId = Date.now();
    const progressRes = res;
    let headersSent = false;

    const sendProgress = (data) => {
      if (!headersSent) {
        progressRes.statusCode = 200;
        progressRes.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        progressRes.setHeader('Cache-Control', 'no-cache');
        progressRes.setHeader('Connection', 'keep-alive');
        progressRes.flushHeaders?.();
        headersSent = true;
      }
      sendSse(progressRes, 'progress', data);
    };

    const results = await fullSync(direction, {
      dryRun,
      force,
      onProgress: sendProgress,
    });

    sendSse(progressRes, 'done', { results });
    progressRes.end();
  } catch (error) {
    if (!res.writableEnded) sendJson(res, 500, { error: error.message });
  }
}

// ==========================================
// DEPLOY ENDPOINTS
// ==========================================

async function handleApiDeployValidate(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const validation = await validateDeployPrerequisites();
    sendJson(res, 200, validation);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleApiDeployRun(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  try {
    const payload = await readJson(req) || {};
    const { skipSync = false, skipAudit = false, fullAudit = true } = payload;

    // SSE for progress
    const progressRes = res;
    let headersSent = false;

    const sendProgress = (data) => {
      if (!headersSent) {
        progressRes.statusCode = 200;
        progressRes.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        progressRes.setHeader('Cache-Control', 'no-cache');
        progressRes.setHeader('Connection', 'keep-alive');
        progressRes.flushHeaders?.();
        headersSent = true;
      }
      sendSse(progressRes, 'progress', data);
    };

    const result = await deployWorkflow({
      skipSync,
      skipAudit,
      fullAudit,
      onProgress: sendProgress,
    });

    sendSse(progressRes, 'done', { result });
    progressRes.end();
  } catch (error) {
    if (!res.writableEnded) sendJson(res, 500, { error: error.message });
  }
}

async function handleApiDeployAudit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  try {
    const payload = await readJson(req) || {};
    const { full = false } = payload;

    const progressRes = res;
    let headersSent = false;

    const sendProgress = (data) => {
      if (!headersSent) {
        progressRes.statusCode = 200;
        progressRes.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        progressRes.setHeader('Cache-Control', 'no-cache');
        progressRes.setHeader('Connection', 'keep-alive');
        progressRes.flushHeaders?.();
        headersSent = true;
      }
      sendSse(progressRes, 'progress', data);
    };

    const result = await runMonitorAudit(full, sendProgress);
    sendSse(progressRes, 'done', { result });
    progressRes.end();
  } catch (error) {
    if (!res.writableEnded) sendJson(res, 500, { error: error.message });
  }
}

async function handleApiDeployResults(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const results = await getLatestAuditResults();
    sendJson(res, 200, results);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

// ==========================================
// SCAN ENDPOINTS
// ==========================================

async function handleApiScanRun(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  if (!checkDevAuth(req, res)) return;

  try {
    const progressRes = res;
    let headersSent = false;

    const sendProgress = (data) => {
      if (!headersSent) {
        progressRes.statusCode = 200;
        progressRes.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        progressRes.setHeader('Cache-Control', 'no-cache');
        progressRes.setHeader('Connection', 'keep-alive');
        progressRes.flushHeaders?.();
        headersSent = true;
      }
      sendSse(progressRes, 'progress', data);
    };

    // Run scan with progress
    const results = await runFullScanWithProgress(sendProgress);
    sendSse(progressRes, 'done', { results });
    progressRes.end();
  } catch (error) {
    if (!res.writableEnded) sendJson(res, 500, { error: error.message });
  }
}

async function runFullScanWithProgress(onProgress) {
  const categories = [
    'pages', 'data-files', 'modules', 'styles', 'assets', 'config',
  ];

  const results = {
    scannedAt: new Date().toISOString(),
    categories: {},
    summary: {},
  };

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    onProgress({ stage: 'scanning', category: cat, progress: (i / categories.length) * 100 });

    const { scanCategory } = await import('./scan.mjs');
    const files = await scanCategory(cat);

    results.categories[cat] = {
      label: (await import('./scan.mjs')).ASSET_CATEGORIES[cat].label,
      count: files.length,
      files,
    };
  }

  results.summary = {
    totalFiles: Object.values(results.categories).reduce((sum, c) => sum + c.count, 0),
    byCategory: Object.fromEntries(
      Object.entries(results.categories).map(([k, v]) => [k, v.count])
    ),
  };

  onProgress({ stage: 'saving', progress: 100 });
  return results;
}

async function handleApiScanResults(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const manifest = await readJsonFile(join(DATA_DIR, 'manifest.json'));
    if (!manifest) return sendJson(res, 404, { error: 'No scan results found. Run scan first.' });
    sendJson(res, 200, manifest);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function readJsonFile(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

// ==========================================
// SSE EVENTS ENDPOINT
// ==========================================

async function handleApiEvents(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial connection event
  sendSse(res, 'connected', { timestamp: new Date().toISOString() });

  req.on('close', () => {
    sseClients.delete(res);
  });
}

// ==========================================
// HEALTH & STATUS ENDPOINTS
// ==========================================

async function handleApiHealth(req, res) {
  sendJson(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: config.nvidia.hasValidKey,
    paths: config.paths,
  });
}

async function handleApiStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const status = await checkNvidiaConnection();
  sendJson(res, 200, {
    configured: config.nvidia.hasValidKey,
    connected: status.connected,
    model: status.model,
    version: '1.0.0',
  });
}

async function handleApiModels(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }
  sendJson(res, 200, {
    models: [
      { id: config.nvidia.model, name: 'Nemotron 3 Ultra', provider: 'NVIDIA', default: true },
    ],
    default: config.nvidia.model,
  });
}

// ==========================================
// DEV ENDPOINTS (Terminal, etc.)
// ==========================================

async function handleApiDevEnv(req, res) {
  if (!config.dev.enabled) return sendJson(res, 404, { error: 'Not Found' });
  if (!checkDevAuth(req, res)) return;
  if (!checkRateLimit(req, res)) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const masked = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && (v.startsWith('nvapi-') || v.startsWith('ghp_') || v.length > 40)) {
      masked[k] = '*'.repeat(8);
    } else {
      masked[k] = v;
    }
  }
  sendJson(res, 200, masked);
}

async function handleApiDevExec(req, res) {
  if (!config.dev.enabled) return sendJson(res, 404, { error: 'Not Found' });
  if (!checkDevAuth(req, res)) return;
  if (!checkRateLimit(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const payload = await readJson(req);
    const { cmd, cwd = process.cwd() } = payload;

    if (!cmd || typeof cmd !== 'string') {
      return sendJson(res, 400, { error: 'cmd (string) is required' });
    }

    const allowed = config.dev.allowList.some(allowedCmd =>
      cmd === allowedCmd || cmd.startsWith(allowedCmd + ' ')
    );
    if (!allowed) {
      return sendJson(res, 403, { error: 'Command not allowed. Allowed: ' + config.dev.allowList.join(', ') });
    }

    const { spawn } = await import('child_process');
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : 'sh';
    const shellArgs = isWindows ? ['/c', cmd] : ['-c', cmd];
    const proc = spawn(shell, shellArgs, { cwd, env: process.env, timeout: 120000 });

    let stdout = '', stderr = '';
    proc.stdout.on('data', d => stdout += d.toString());
    proc.stderr.on('data', d => stderr += d.toString());

    await new Promise((resolve, reject) => {
      proc.on('close', code => resolve({ stdout, stderr, code }));
      proc.on('error', reject);
    }).then(result => {
      sendJson(res, 200, result);
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

// Dev endpoint auth guard
function checkDevAuth(req, res) {
  const token = req.headers['x-dev-token'];
  if (!config.dev.apiToken) {
    sendJson(res, 503, { error: 'DEV_API_TOKEN not configured on server' });
    return false;
  }
  if (token !== config.dev.apiToken) {
    sendJson(res, 401, { error: 'Invalid or missing X-Dev-Token header' });
    return false;
  }
  return true;
}

// Simple in-memory rate limiter (per IP)
const rateLimitMap = new Map();
function checkRateLimit(req, res) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = config.dev.rateLimit.windowMs;
  const maxReq = config.dev.rateLimit.maxRequests;

  const requests = rateLimitMap.get(ip) || [];
  const recent = requests.filter(ts => now - ts < windowMs);

  if (recent.length >= maxReq) {
    sendJson(res, 429, { error: `Rate limit exceeded. Max ${maxReq} requests per ${windowMs/1000}s.` });
    return false;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);

  if (rateLimitMap.size > 1000) {
    for (const [key, vals] of rateLimitMap.entries()) {
      const fresh = vals.filter(ts => now - ts < windowMs);
      if (fresh.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, fresh);
    }
  }
  return true;
}

// ==========================================
// ROUTE REQUEST
// ==========================================

function routeRequest(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;

  if (path.startsWith('/api/')) {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }
  }

  // Health & Status
  if (path === '/api/health') return handleApiHealth(req, res);
  if (path === '/api/status') return handleApiStatus(req, res);
  if (path === '/api/models') return handleApiModels(req, res);

  // AI Endpoints
  if (path === '/api/ai/status') return handleApiAiStatus(req, res);
  if (path === '/api/ai/check') return handleApiAiCheck(req, res);
  if (path === '/api/ai/chat') return handleApiAiChat(req, res);

  // File Operations
  if (path === '/api/files/tree') return handleApiFilesTree(req, res);
  if (path === '/api/files/read') return handleApiFilesRead(req, res);
  if (path === '/api/files/write') return handleApiFilesWrite(req, res);
  if (path === '/api/files/delete') return handleApiFilesDelete(req, res);
  if (path === '/api/files/move') return handleApiFilesMove(req, res);
  if (path === '/api/files/upload') return handleApiFilesUpload(req, res);
  if (path === '/api/files/hash') return handleApiFilesHash(req, res);
  if (path === '/api/files/manifest') return handleApiScanManifest(req, res);

  // Sync
  if (path === '/api/sync/status') return handleApiSyncStatus(req, res);
  if (path === '/api/sync/plan') return handleApiSyncPlan(req, res);
  if (path === '/api/sync/apply') return handleApiSyncApply(req, res);

  // Deploy
  if (path === '/api/deploy/validate') return handleApiDeployValidate(req, res);
  if (path === '/api/deploy/run') return handleApiDeployRun(req, res);
  if (path === '/api/deploy/audit') return handleApiDeployAudit(req, res);
  if (path === '/api/deploy/results') return handleApiDeployResults(req, res);

  // Scan
  if (path === '/api/scan/run') return handleApiScanRun(req, res);
  if (path === '/api/scan/results') return handleApiScanResults(req, res);

  // SSE Events
  if (path === '/api/events') return handleApiEvents(req, res);

  // Dev
  if (path === '/api/dev/env') return handleApiDevEnv(req, res);
  if (path === '/api/dev/exec') return handleApiDevExec(req, res);

  return serveStatic(req, res);
}

const server = createServer(routeRequest);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[SERVER] Port ${config.port} already in use`);
  } else {
    console.error('[SERVER] Error:', err);
  }
  process.exit(1);
});

server.listen(config.port, config.host, () => {
  console.log(`[SERVER] PERKIM Web Maintenance Dashboard running at http://${config.host}:${config.port}`);
  console.log('[SERVER] API endpoints:');
  console.log('  - /api/health, /api/status, /api/models');
  console.log('  - /api/ai/status, /api/ai/chat, /api/ai/check');
  console.log('  - /api/files/tree, /api/files/read, /api/files/write, /api/files/upload');
  console.log('  - /api/sync/status, /api/sync/plan, /api/sync/apply');
  console.log('  - /api/deploy/validate, /api/deploy/run, /api/deploy/audit');
  console.log('  - /api/scan/run, /api/scan/results');
  console.log('  - /api/events (SSE)');
  console.log('  - /api/dev/env, /api/dev/exec');
  console.log(`[SERVER] Model: ${config.nvidia.model}`);
  console.log(`[SERVER] NVIDIA key: ${config.nvidia.hasValidKey ? 'configured' : 'MISSING'}`);
  console.log(`[SERVER] Static root: ${DIST_DIR}`);
  console.log(`[SERVER] PERKIM Web: ${config.paths.perkimWeb}`);
  console.log(`[SERVER] PERKIM Monitor: ${config.paths.perkimMonitor}`);
});

server.on('listening', () => {
  const address = server.address();
  console.log(`[SERVER] Listening on ${address.address}:${address.port}`);
});

function shutdown() {
  console.log('\n[SERVER] Shutting down...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (reason) => console.error('[SERVER] Unhandled rejection:', reason));
process.on('uncaughtException', (err) => { console.error('[SERVER] Uncaught exception:', err); process.exit(1); });