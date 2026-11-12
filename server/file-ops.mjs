/**
 * file-ops.mjs — File CRUD operations for PERKIM Web
 * Handles read, write, list, upload, delete, move with path protection
 */

import { config } from './config.mjs';
import { readFile, writeFile, mkdir, readdir, stat, unlink, rename, copyFile } from 'node:fs/promises';
import { join, resolve, extname, relative, sep } from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';
import crypto from 'node:crypto';

const { perkimWeb, perkimMonitor } = config.paths;
const { files: filesConfig } = config;

const ROOT_DIRS = {
  web: perkimWeb,
  monitor: perkimMonitor,
};

/**
 * Validate and resolve path within allowed roots
 * @param {string} userPath - Relative path from user
 * @param {'web'|'monitor'} rootKey - Which root to use
 * @returns {string|null} Resolved absolute path or null if invalid
 */
function resolveSafePath(userPath, rootKey = 'web') {
  if (!userPath || typeof userPath !== 'string') return null;

  const root = ROOT_DIRS[rootKey];
  if (!root) return null;

  // Normalize: remove leading slashes, resolve relative
  const normalized = userPath.replace(/^\/+/, '').replace(/\\/g, '/');

  // Block directory traversal attempts
  if (normalized.includes('..') || normalized.startsWith('.')) {
    return null;
  }

  // Block access to blocked paths
  for (const blocked of filesConfig.blockedPaths) {
    if (normalized === blocked || normalized.startsWith(blocked + '/')) {
      return null;
    }
  }

  const target = resolve(root, normalized);

  // Ensure target is within root
  if (target !== root && !target.startsWith(root + sep)) {
    return null;
  }

  return target;
}

/**
 * Check if extension is allowed
 */
function isAllowedExtension(filePath) {
  const ext = extname(filePath).toLowerCase();
  return filesConfig.allowedExtensions.includes(ext);
}

/**
 * Get file info
 */
async function getFileInfo(absPath, rootKey = 'web') {
  const root = ROOT_DIRS[rootKey];
  try {
    const stats = await stat(absPath);
    const relPath = relative(root, absPath).replace(/\\/g, '/');
    return {
      path: relPath,
      name: relPath.split('/').pop(),
      size: stats.size,
      isDirectory: stats.isDirectory(),
      modified: stats.mtime.toISOString(),
      extension: extname(absPath).toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * List directory recursively
 */
export async function listDir(relPath = '', rootKey = 'web') {
  const absPath = resolveSafePath(relPath, rootKey);
  if (!absPath) throw new Error('Invalid path');

  try {
    const entries = await readdir(absPath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      // Skip blocked directories
      if (filesConfig.blockedPaths.some(b => entry.name === b || entry.name.startsWith(b + '.'))) {
        continue;
      }

      const childRel = relPath ? `${relPath}/${entry.name}` : entry.name;
      const childAbs = join(absPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively list subdirectories (limited depth)
        const info = await getFileInfo(childAbs, rootKey);
        if (info) {
          info.children = await listDir(childRel, rootKey);
          results.push(info);
        }
      } else if (isAllowedExtension(entry.name)) {
        const info = await getFileInfo(childAbs, rootKey);
        if (info) results.push(info);
      }
    }

    // Sort: directories first, then files, both alphabetically
    results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return results;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

/**
 * Read file content (text or binary)
 */
export async function readFileContent(relPath, rootKey = 'web', encoding = 'utf8') {
  const absPath = resolveSafePath(relPath, rootKey);
  if (!absPath) throw new Error('Invalid path');

  try {
    if (encoding === 'buffer') {
      return await readFile(absPath);
    }
    return await readFile(absPath, encoding);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('File not found');
    throw error;
  }
}

/**
 * Write file content (creates parent directories)
 */
export async function writeFileContent(relPath, content, rootKey = 'web', encoding = 'utf8') {
  const absPath = resolveSafePath(relPath, rootKey);
  if (!absPath) throw new Error('Invalid path');

  // Validate extension for text files
  if (encoding === 'utf8' && !isAllowedExtension(relPath)) {
    throw new Error('File type not allowed');
  }

  // Auto-backup existing file
  let backupPath = null;
  try {
    await stat(absPath);
    backupPath = `${absPath}.bak.${Date.now()}`;
    await copyFile(absPath, backupPath);
  } catch {
    // File doesn't exist, no backup needed
  }

  try {
    // Ensure parent directory exists
    const parentDir = join(absPath, '..');
    await mkdir(parentDir, { recursive: true });

    if (Buffer.isBuffer(content)) {
      await writeFile(absPath, content);
    } else {
      await writeFile(absPath, content, encoding);
    }

    return { success: true, backupPath };
  } catch (error) {
    // Restore backup on failure
    if (backupPath) {
      try { await copyFile(backupPath, absPath); } catch {}
      try { await unlink(backupPath); } catch {}
    }
    throw error;
  }
}

/**
 * Delete file or empty directory
 */
export async function deleteFile(relPath, rootKey = 'web') {
  const absPath = resolveSafePath(relPath, rootKey);
  if (!absPath) throw new Error('Invalid path');

  try {
    const stats = await stat(absPath);
    if (stats.isDirectory()) {
      await unlink(absPath); // Will fail if not empty
    } else {
      await unlink(absPath);
    }
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('File not found');
    if (error.code === 'ENOTEMPTY') throw new Error('Directory not empty');
    throw error;
  }
}

/**
 * Move/rename file
 */
export async function moveFile(srcRel, destRel, rootKey = 'web') {
  const srcAbs = resolveSafePath(srcRel, rootKey);
  const destAbs = resolveSafePath(destRel, rootKey);
  if (!srcAbs || !destAbs) throw new Error('Invalid path');

  if (!isAllowedExtension(destRel)) {
    throw new Error('Destination file type not allowed');
  }

  try {
    await mkdir(join(destAbs, '..'), { recursive: true });
    await rename(srcAbs, destAbs);
    return { success: true };
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Source file not found');
    throw error;
  }
}

/**
 * Upload file (multipart handling done in route, this saves buffer)
 */
export async function uploadFile(relPath, buffer, rootKey = 'web', options = {}) {
  const absPath = resolveSafePath(relPath, rootKey);
  if (!absPath) throw new Error('Invalid path');

  if (!isAllowedExtension(relPath)) {
    throw new Error('File type not allowed');
  }

  if (buffer.length > filesConfig.maxUploadSize) {
    throw new Error(`File too large. Max: ${filesConfig.maxUploadSize} bytes`);
  }

  // Optimize images
  let finalBuffer = buffer;
  const ext = extname(relPath).toLowerCase();
  const imageExts = ['.png', '.jpg', '.jpeg', '.webp'];

  if (imageExts.includes(ext) && options.optimize !== false) {
    try {
      finalBuffer = await sharp(buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    } catch {
      // If optimization fails, use original
    }
  }

  // Auto-backup
  let backupPath = null;
  try {
    await stat(absPath);
    backupPath = `${absPath}.bak.${Date.now()}`;
    await copyFile(absPath, backupPath);
  } catch {}

  try {
    await mkdir(join(absPath, '..'), { recursive: true });
    await writeFile(absPath, finalBuffer);
    return { success: true, size: finalBuffer.length, backupPath, optimized: finalBuffer !== buffer };
  } catch (error) {
    if (backupPath) {
      try { await copyFile(backupPath, absPath); } catch {}
      try { await unlink(backupPath); } catch {}
    }
    throw error;
  }
}

/**
 * Get file hash for sync comparison
 */
export async function getFileHash(relPath, rootKey = 'web', algorithm = 'sha256') {
  const absPath = resolveSafePath(relPath, rootKey);
  if (!absPath) return null;

  try {
    const buffer = await readFile(absPath);
    return crypto.createHash(algorithm).update(buffer).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Scan directory and generate manifest with hashes
 */
export async function scanManifest(rootKey = 'web', relPath = '') {
  const absPath = resolveSafePath(relPath, rootKey);
  if (!absPath) return { files: [], errors: [] };

  const files = [];
  const errors = [];

  async function scan(dir, currentRel) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (filesConfig.blockedPaths.some(b => entry.name === b || entry.name.startsWith(b + '.'))) continue;

        const childRel = currentRel ? `${currentRel}/${entry.name}` : entry.name;
        const childAbs = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scan(childAbs, childRel);
        } else if (isAllowedExtension(entry.name)) {
          try {
            const stats = await stat(childAbs);
            const hash = await getFileHash(childRel, rootKey);
            files.push({
              path: childRel,
              size: stats.size,
              modified: stats.mtime.toISOString(),
              hash,
              extension: extname(entry.name).toLowerCase(),
            });
          } catch (e) {
            errors.push({ path: childRel, error: e.message });
          }
        }
      }
    } catch (e) {
      errors.push({ path: currentRel || relPath, error: e.message });
    }
  }

  await scan(absPath, relPath);
  return { files, errors, scannedAt: new Date().toISOString(), root: rootKey };
}

export { resolveSafePath, isAllowedExtension, getFileInfo };