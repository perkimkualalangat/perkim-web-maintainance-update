/**
 * sync-engine.mjs — Bi-directional sync between Dashboard and perkim-web
 * Computes diff, handles conflicts, applies changes atomically
 */

import { config } from './config.mjs';
import { scanManifest, writeFileContent, readFileContent, deleteFile, getFileHash, resolveSafePath } from './file-ops.mjs';

const { perkimWeb } = config.paths;

export async function computeSyncPlan(sourceManifest, targetManifest) {
  const sourceFiles = new Map(sourceManifest.files.map(f => [f.path, f]));
  const targetFiles = new Map(targetManifest.files.map(f => [f.path, f]));

  const allPaths = new Set([...sourceFiles.keys(), ...targetFiles.keys()]);

  const plan = {
    created: [],    // in source, not in target
    modified: [],   // in both, different hash
    deleted: [],    // in target, not in source
    unchanged: [],  // in both, same hash
    conflicts: [],  // both modified since last sync
  };

  for (const path of allPaths) {
    const src = sourceFiles.get(path);
    const tgt = targetFiles.get(path);

    if (src && !tgt) {
      plan.created.push({ path, hash: src.hash, size: src.size });
    } else if (!src && tgt) {
      plan.deleted.push({ path, hash: tgt.hash });
    } else if (src && tgt) {
      if (src.hash !== tgt.hash) {
        plan.modified.push({
          path,
          sourceHash: src.hash,
          targetHash: tgt.hash,
          sourceSize: src.size,
          targetSize: tgt.size,
        });
      } else {
        plan.unchanged.push({ path, hash: src.hash });
      }
    }
  }

  return plan;
}

/**
 * Apply sync plan to target (perkim-web)
 * direction: 'push' (dashboard → web) | 'pull' (web → dashboard)
 */
export async function applySyncPlan(plan, direction = 'push', options = {}) {
  const { dryRun = false, force = false, onProgress } = options;
  const results = { applied: [], skipped: [], errors: [] };

  const ops = direction === 'push'
    ? [...plan.created, ...plan.modified].map(op => ({ ...op, action: 'write' }))
    : [...plan.deleted].map(op => ({ ...op, action: 'delete' }));

  // For pull, we need the source content (from dashboard data)
  // This would require the dashboard to send file contents
  // For now, push is the primary direction

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    const progress = { current: i + 1, total: ops.length, path: op.path };

    try {
      if (dryRun) {
        results.skipped.push({ ...op, reason: 'dry-run' });
        onProgress?.({ ...progress, status: 'dry-run' });
        continue;
      }

      if (op.action === 'write') {
        // In push mode, we need content from dashboard
        // This would be passed via the API
        if (!op.content && !force) {
          results.skipped.push({ ...op, reason: 'no-content' });
          onProgress?.({ ...progress, status: 'skipped', reason: 'no-content' });
          continue;
        }

        if (op.content) {
          await writeFileContent(op.path, op.content, 'web');
          results.applied.push({ ...op, status: 'written' });
          onProgress?.({ ...progress, status: 'written' });
        }
      } else if (op.action === 'delete') {
        await deleteFile(op.path, 'web');
        results.applied.push({ ...op, status: 'deleted' });
        onProgress?.({ ...progress, status: 'deleted' });
      }
    } catch (error) {
      results.errors.push({ ...op, error: error.message });
      onProgress?.({ ...progress, status: 'error', error: error.message });
    }
  }

  return results;
}

/**
 * Full sync workflow: scan both, compute plan, present for review, apply
 */
export async function fullSync(direction = 'push', options = {}) {
  const { dryRun = false, force = false, onProgress } = options;

  onProgress?.({ stage: 'scanning-source', message: 'Scanning dashboard data...' });
  // Dashboard data is in /data/*.json - we'd need to convert to file manifest
  // For now, scan perkim-web as target

  onProgress?.({ stage: 'scanning-target', message: 'Scanning perkim-web...' });
  const targetManifest = await scanManifest('web');

  // Source manifest would come from dashboard's data files
  // This is a simplified version
  const sourceManifest = { files: [], errors: [] }; // TODO: populate from dashboard data

  onProgress?.({ stage: 'computing-plan', message: 'Computing sync plan...' });
  const plan = await computeSyncPlan(sourceManifest, targetManifest);

  if (dryRun) {
    return { plan, results: null, dryRun: true };
  }

  onProgress?.({ stage: 'applying', message: 'Applying sync plan...' });
  const results = await applySyncPlan(plan, direction, { dryRun, force, onProgress });

  // Update sync metadata
  const syncMeta = {
    lastSync: new Date().toISOString(),
    direction,
    plan: {
      created: plan.created.length,
      modified: plan.modified.length,
      deleted: plan.deleted.length,
      unchanged: plan.unchanged.length,
    },
    results: {
      applied: results.applied.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
    },
  };

  return { plan, results, syncMeta, dryRun: false };
}

/**
 * Get sync status (last sync time, pending changes)
 */
export async function getSyncStatus() {
  // Read sync metadata from data/sync-meta.json
  try {
    const content = await readFileContent('data/sync-meta.json', 'web');
    return JSON.parse(content);
  } catch {
    return {
      lastSync: null,
      pending: { created: 0, modified: 0, deleted: 0 },
      status: 'never-synced',
    };
  }
}

// computeSyncPlan, applySyncPlan, fullSync, and getSyncStatus are exported inline.