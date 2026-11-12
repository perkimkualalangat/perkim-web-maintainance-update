import { uidFieldFor } from './entities.js';

const MAX_RECORDS = 42;
const MAX_CONTEXT_CHARS = 80_000;

function normalize(value) {
  return String(value || '').toLocaleLowerCase();
}

function queryTokens(query) {
  return [...new Set(
    normalize(query)
      .split(/[^\p{L}\p{N}-]+/u)
      .filter((token) => token.length >= 3),
  )].slice(0, 24);
}

function recordScore(type, record, tokens) {
  const id = normalize(record?.[uidFieldFor(type)]);
  const text = normalize(JSON.stringify(record));
  let score = tokens.reduce((sum, token) => sum + (text.includes(token) ? 2 : 0), 0);
  if (tokens.some((token) => id.includes(token))) score += 8;
  if (record?.evidence_status === 'Lemah') score += 0.25;
  return score;
}

export function buildResearchContext(data, query) {
  const tokens = queryTokens(query);
  const counts = {};
  const ranked = [];

  for (const [type, records] of Object.entries(data || {})) {
    if (!Array.isArray(records)) continue;
    counts[type] = records.length;
    for (const record of records) {
      ranked.push({
        type,
        id: record?.[uidFieldFor(type)] || null,
        record,
        score: recordScore(type, record, tokens),
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
  const chosenItems = ranked.filter((item) => item.score > 0).slice(0, MAX_RECORDS);
  const represented = new Set(chosenItems.map((item) => item.type));
  for (const item of ranked) {
    if (chosenItems.length >= MAX_RECORDS) break;
    if (represented.has(item.type)) continue;
    chosenItems.push(item);
    represented.add(item.type);
  }
  const chosen = chosenItems.map((item) => ({
    ...item.record,
    _entity_type: item.type,
    _entity_id: item.id,
  }));

  const payload = {
    dataset: 'Nvidia Computer Ledger',
    generated_at: new Date().toISOString(),
    selection_method: tokens.length ? 'keyword-ranked' : 'entity-sample',
    query_tokens: tokens,
    entity_counts: counts,
    selected_records: chosen,
  };
  let serialized = JSON.stringify(payload, null, 2);
  while (serialized.length > MAX_CONTEXT_CHARS && payload.selected_records.length > 1) {
    payload.selected_records.pop();
    serialized = JSON.stringify(payload, null, 2);
  }
  return serialized;
}

async function readError(response) {
  try {
    const payload = await response.json();
    return payload.error || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export async function getAiStatus(signal) {
  const response = await fetch('/api/ai/status', { signal });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function runSystemChecks(signal) {
  const response = await fetch('/api/ai/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

function parseSseBlock(block) {
  let event = 'message';
  const data = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }
  if (data.length === 0) return null;
  try {
    return { event, payload: JSON.parse(data.join('\n')) };
  } catch {
    return null;
  }
}

export async function streamAi(
  { mode, locale, messages, context, signal },
  { onDelta, onMeta, onThinking },
) {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, locale, messages, context }),
    signal,
  });
  if (!response.ok) throw new Error(await readError(response));

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Streaming is not supported by this browser.');
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    for (const raw of blocks) {
      const packet = parseSseBlock(raw);
      if (!packet) continue;
      if (packet.event === 'delta') onDelta?.(packet.payload.text || '');
      if (packet.event === 'meta') onMeta?.(packet.payload);
      if (packet.event === 'thinking') onThinking?.(true);
      if (packet.event === 'error') {
        throw new Error(packet.payload.error || 'The AI stream failed.');
      }
    }
  }
}

export async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return response;
}