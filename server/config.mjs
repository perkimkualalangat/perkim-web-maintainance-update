/**
 * Server configuration - single source of truth for all settings
 * Loaded once at startup, validated, then frozen
 */

// Must run before loadConfig() reads process.env.
import './env.mjs';
import { resolve } from 'node:path';

function loadConfig() {
  const apiKey = process.env.NVIDIA_API_KEY;
  const hasValidKey = apiKey && apiKey !== 'your-nvidia-api-key-here' && apiKey.startsWith('nvapi-');
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!hasValidKey) {
    console.warn('[CONFIG] NVIDIA_API_KEY not set or invalid - API features will be disabled');
    console.warn('[CONFIG] Get your key from https://build.nvidia.com and add to .env.local');
  }

  // Resolve PERKIM paths
  const perkimWebPath = resolve(process.env.PERKIM_WEB_PATH || '../perkim-web');
  const perkimMonitorPath = resolve(process.env.PERKIM_MONITOR_PATH || '../perkim-monitor');

  const config = {
    // Server
    port: Number(process.env.PORT) || 5174,
    host: process.env.HOST || '127.0.0.1',

    // PERKIM Paths
    paths: {
      perkimWeb: perkimWebPath,
      perkimMonitor: perkimMonitorPath,
    },

    // Feature flags
    dev: {
      enabled: process.env.ENABLE_DEV_PAGE === 'true',
      apiToken: process.env.DEV_API_TOKEN || null,
      rateLimit: {
        windowMs: Number(process.env.DEV_RATE_LIMIT_WINDOW_MS) || 60_000,
        maxRequests: Number(process.env.DEV_RATE_LIMIT_MAX_REQUESTS) || 10,
      },
      allowList: [
        // PERKIM Monitor commands
        'npm run audit',
        'npm run audit:full',
        'npm run serve',
        'npm run start',
        // PERKIM Web commands (if package.json exists)
        'npm run dev',
        'npm run build',
        'npm run preview',
        // General
        'git status',
        'git diff',
        'git log --oneline -10',
        'node --version',
        'npm --version',
        'ls -la',
        'pwd',
      ],
    },

    // File operations
    files: {
      maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE) || 52_428_800, // 50MB
      enableWatcher: process.env.ENABLE_FILE_WATCHER !== 'false',
      allowedExtensions: [
        '.js', '.jsx', '.mjs', '.json', '.css', '.html', '.md',
        '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico',
        '.pdf', '.woff', '.woff2', '.ttf', '.eot',
        '.txt', '.yaml', '.yml', '.toml', '.ini',
      ],
      blockedPaths: ['node_modules', '.git', 'dist', 'build', '.cache'],
    },

    // NVIDIA API
    nvidia: {
      apiKey: hasValidKey ? process.env.NVIDIA_API_KEY : null,
      model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b',
      baseUrl: (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, ''),
      timeoutMs: Number(process.env.NVIDIA_TIMEOUT_MS) || 180_000,
      maxTokens: Number(process.env.NVIDIA_MAX_TOKENS) || 2048,
      hasValidKey,
    },

    // Request limits
    limits: {
      maxBodyBytes: 512 * 1024,        // 512 KB (for JSON API)
      maxHistoryMessages: 16,
      maxMessageChars: 16_000,
      maxContextChars: 90_000,
    },

    // Security
    corsOrigin: 'http://127.0.0.1:5173',
    allowedOrigin: allowedOrigins[0] || 'http://127.0.0.1:5173',
    allowedOrigins,
  };

  Object.freeze(config);
  Object.freeze(config.paths);
  Object.freeze(config.dev);
  Object.freeze(config.files);
  Object.freeze(config.nvidia);
  Object.freeze(config.limits);
  Object.freeze(config.allowedOrigins);
  return config;
}

export const config = loadConfig();
export default config;