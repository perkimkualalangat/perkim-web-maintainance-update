/**
 * Minimal .env loader.
 *
 * Node does not load .env / .env.local automatically unless the process is
 * started with --env-file. The app is also launched from start.bat and from
 * `npm run server`, so we load the files here before config.mjs reads them.
 *
 * Existing process.env values always win (same behaviour as Vite's loadEnv).
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseLine(line) {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) return null;

  const [, key, rawValue] = match;
  let value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  // Trim an unquoted trailing comment ("value # note").
  if (!rawValue.trim().startsWith('"') && !rawValue.trim().startsWith("'")) {
    value = value.replace(/\s+#.*$/, '').trim();
  }

  return [key, value];
}

function loadFile(name) {
  const filePath = resolve(process.cwd(), name);
  if (!existsSync(filePath)) return;

  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  for (const line of content.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const entry = parseLine(line);
    if (!entry) continue;
    const [key, value] = entry;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadFile('.env.local');
loadFile('.env');
