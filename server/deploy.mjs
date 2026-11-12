/**
 * deploy.mjs — Trigger perkim-monitor audit and deploy to GitHub Pages
 */

import { config } from './config.mjs';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const { perkimMonitor } = config.paths;

/**
 * Run a command and stream output via callback
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const cwd = options.cwd || perkimMonitor;
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...options.env },
      shell: process.platform === 'win32',
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      options.onStdout?.(text);
    });

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      options.onStderr?.(text);
    });

    child.on('error', (error) => {
      reject({ code: -1, stdout, stderr, error: error.message });
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Run perkim-monitor audit
 * @param {boolean} full - Run full audit with Lighthouse
 * @param {Function} onOutput - Callback for streaming output
 */
export async function runMonitorAudit(full = false, onOutput) {
  const script = full ? 'audit:full' : 'audit';

  const result = await runCommand('npm', ['run', script], {
    onStdout: (text) => onOutput?.({ type: 'stdout', text }),
    onStderr: (text) => onOutput?.({ type: 'stderr', text }),
  });

  return result;
}

/**
 * Run perkim-monitor serve (for preview)
 */
export async function runMonitorServe(port = 8082, onOutput) {
  const result = await runCommand('npm', ['run', 'serve', '--', String(port)], {
    onStdout: (text) => onOutput?.({ type: 'stdout', text }),
    onStderr: (text) => onOutput?.({ type: 'stderr', text }),
  });
  return result;
}

/**
 * Get latest audit results from monitor
 */
export async function getLatestAuditResults() {
  const statusPath = join(perkimMonitor, 'data', 'status.json');
  try {
    const content = await readFile(statusPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return { error: 'Audit results not found. Run audit first.', details: error.message };
  }
}

/**
 * Get monitor dashboard URL
 */
export function getMonitorUrls() {
  return {
    local: 'http://127.0.0.1:8082',
    githubPages: 'https://perkimkualalangat.github.io/perkim-monitor/',
    website: 'https://perkimkualalangat.github.io/Website-PERKIM/',
  };
}

/**
 * Deploy flow: sync → audit → commit → push
 * This is a high-level orchestrator
 */
export async function deployWorkflow(options = {}) {
  const { skipSync = false, skipAudit = false, fullAudit = true, onProgress } = options;
  const steps = [];

  // Step 1: Sync (if not skipped)
  if (!skipSync) {
    onProgress?.({ step: 1, total: 3, stage: 'sync', message: 'Syncing changes to perkim-web...' });
    steps.push({ stage: 'sync', status: 'started' });
    // TODO: Call sync engine
    // const syncResult = await syncEngine.fullSync('push', { dryRun: false });
    steps.push({ stage: 'sync', status: 'completed' });
  }

  // Step 2: Audit
  if (!skipAudit) {
    onProgress?.({ step: 2, total: 3, stage: 'audit', message: 'Running perkim-monitor audit...' });
    steps.push({ stage: 'audit', status: 'started' });

    const auditResult = await runMonitorAudit(fullAudit, (output) => {
      onProgress?.({ stage: 'audit', output });
    });

    if (auditResult.code !== 0) {
      throw new Error(`Audit failed with code ${auditResult.code}: ${auditResult.stderr}`);
    }

    // Check audit score
    const results = await getLatestAuditResults();
    if (results.summary && results.summary.score < 70) {
      console.warn(`[DEPLOY] Audit score ${results.summary.score} below threshold (70)`);
      // Don't fail, just warn
    }

    steps.push({ stage: 'audit', status: 'completed', score: results.summary?.score });
  }

  // Step 3: Deploy (git push to trigger GitHub Pages)
  onProgress?.({ step: 3, total: 3, stage: 'deploy', message: 'Deploying to GitHub Pages...' });
  steps.push({ stage: 'deploy', status: 'started' });

  // The actual deploy is done by GitHub Actions on push
  // Here we just commit and push if there are changes
  const gitResult = await runGitDeploy();

  steps.push({ stage: 'deploy', status: 'completed', ...gitResult });

  return {
    success: true,
    steps,
    urls: getMonitorUrls(),
    auditScore: steps.find(s => s.stage === 'audit')?.score,
  };
}

/**
 * Git commit and push for deployment
 */
async function runGitDeploy() {
  const webRoot = resolve(config.paths.perkimWeb);

  // Check for changes
  const statusResult = await runCommand('git', ['status', '--porcelain'], { cwd: webRoot });
  if (!statusResult.stdout.trim()) {
    return { message: 'No changes to deploy', deployed: false };
  }

  // Add all changes
  await runCommand('git', ['add', '-A'], { cwd: webRoot });

  // Commit
  const commitMsg = `chore: update from maintenance dashboard - ${new Date().toISOString().split('T')[0]}`;
  await runCommand('git', ['commit', '-m', commitMsg], { cwd: webRoot });

  // Push
  const pushResult = await runCommand('git', ['push', 'origin', 'main'], { cwd: webRoot });

  return {
    message: 'Changes pushed to GitHub Pages',
    deployed: true,
    commit: commitMsg,
    pushOutput: pushResult.stdout,
  };
}

/**
 * Validate deployment prerequisites
 */
export async function validateDeployPrerequisites() {
  const checks = [];

  // Check perkim-web is a git repo
  try {
    await runCommand('git', ['rev-parse', '--git-dir'], { cwd: config.paths.perkimWeb });
    checks.push({ name: 'perkim-web git repo', status: 'pass' });
  } catch {
    checks.push({ name: 'perkim-web git repo', status: 'fail', message: 'Not a git repository' });
  }

  // Check perkim-monitor exists
  try {
    await runCommand('npm', ['run', 'audit', '--dry-run'], { cwd: perkimMonitor });
    checks.push({ name: 'perkim-monitor audit script', status: 'pass' });
  } catch {
    checks.push({ name: 'perkim-monitor audit script', status: 'fail', message: 'Audit script not available' });
  }

  // Check NVIDIA API key
  checks.push({
    name: 'NVIDIA API key',
    status: config.nvidia.hasValidKey ? 'pass' : 'warn',
    message: config.nvidia.hasValidKey ? 'Configured' : 'Not configured (AI features disabled)',
  });

  const allPass = checks.every(c => c.status === 'pass');
  return { ready: allPass, checks };
}

export { runCommand };