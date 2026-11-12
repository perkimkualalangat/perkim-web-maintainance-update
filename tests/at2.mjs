/**
 * AT-2 acceptance checks for Nvidia Computer Ledger.
 *
 * Runs without a browser or a live NVIDIA key. The goal is to catch the
 * regressions that broke the AI page: wrapped data files, schema/reference
 * drift, endpoint contract mistakes, and lost research context.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  ENTITY_TYPES,
  collectRefIssues,
  validate,
  validateUnique,
} from '../src/assets/js/core/schema.js';
import { buildResearchContext } from '../src/lib/ai.js';
import {
  AI_MODES,
  buildUpstreamMessages,
} from '../server/ai-prompts.mjs';
import { validateChatRequest } from '../server/validation.mjs';
import { config } from '../server/config.mjs';

const DATA_DIR = resolve(process.cwd(), 'data');
const failures = [];
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL  ${name}\n      ${error.message}`);
  }
}

async function loadDataset() {
  const dataset = {};
  for (const type of ENTITY_TYPES) {
    const raw = await readFile(join(DATA_DIR, `${type}.json`), 'utf8');
    const payload = JSON.parse(raw);
    dataset[type] = Array.isArray(payload) ? payload : payload?.[type] || [];
  }
  return dataset;
}

const dataset = await loadDataset();
const total = Object.values(dataset).reduce((sum, items) => sum + items.length, 0);

test('all 17 entity files load as arrays', () => {
  assert.equal(Object.keys(dataset).length, 17);
  for (const type of ENTITY_TYPES) {
    assert.ok(Array.isArray(dataset[type]), `${type} is not an array`);
  }
});

test('dataset has records', () => {
  assert.ok(total >= 201, `expected at least 201 records, received ${total}`);
});

test('all records pass schema validation', () => {
  const errors = [];
  for (const type of ENTITY_TYPES) {
    for (const record of dataset[type]) {
      const result = validate(type, record);
      if (!result.valid) {
        errors.push(`${type}: ${result.errors.map((item) => item.message).join('; ')}`);
      }
    }
  }
  assert.equal(errors.length, 0, errors.slice(0, 5).join('\n'));
});

test('all IDs are unique', () => {
  const errors = [];
  for (const type of ENTITY_TYPES) {
    errors.push(...validateUnique(type, dataset[type]));
  }
  assert.equal(errors.length, 0, errors.slice(0, 5).map((item) => item.message).join('\n'));
});

test('cross-references resolve', () => {
  const issues = collectRefIssues(dataset);
  assert.equal(issues.length, 0, JSON.stringify(issues.slice(0, 5)));
});

test('research context contains selected records and counts', () => {
  const context = buildResearchContext(dataset, 'SVB crisis evidence');
  const parsed = JSON.parse(context);
  assert.equal(parsed.dataset, 'Nvidia Computer Ledger');
  assert.equal(Object.keys(parsed.entity_counts).length, 17);
  assert.ok(parsed.selected_records.length > 0);
  assert.ok(parsed.selected_records.length <= 42);
  assert.ok(parsed.selected_records.some((record) => record._entity_type));
});

test('all five AI modes are accepted', () => {
  for (const mode of AI_MODES) {
    const result = validateChatRequest({
      mode,
      locale: 'ms',
      context: '{}',
      messages: [{ role: 'user', content: 'hello' }],
    });
    assert.equal(result.valid, true, `${mode}: ${result.errors.join(', ')}`);
  }
});

test('invalid mode is rejected', () => {
  const result = validateChatRequest({
    mode: 'unknown',
    messages: [{ role: 'user', content: 'hello' }],
  });
  assert.equal(result.valid, false);
});

test('oversized context is rejected', () => {
  const result = validateChatRequest({
    mode: 'chat',
    context: 'x'.repeat(config.limits.maxContextChars + 1),
    messages: [{ role: 'user', content: 'hello' }],
  });
  assert.equal(result.valid, false);
});

test('general mode does not receive project context', () => {
  const built = buildUpstreamMessages({
    mode: 'general',
    locale: 'en',
    context: 'SECRET-RESEARCH-CONTEXT',
    messages: [{ role: 'user', content: 'write a poem' }],
  });
  assert.equal(built.messages.some((message) => message.content.includes('SECRET-RESEARCH-CONTEXT')), false);
});

test('research modes receive project context and language', () => {
  const built = buildUpstreamMessages({
    mode: 'chat',
    locale: 'ms',
    context: 'RESEARCH-CONTEXT',
    messages: [{ role: 'user', content: 'compare systems' }],
  });
  assert.ok(built.messages.some((message) => message.content.includes('RESEARCH-CONTEXT')));
  assert.ok(built.messages[0].content.includes('Bahasa Melayu'));
});

console.log(`\n${passed} passed, ${failures.length} failed, ${total} records audited.`);
if (failures.length > 0) process.exit(1);
