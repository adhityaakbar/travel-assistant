import assert from 'node:assert/strict';
import test from 'node:test';
import { createHistoryHandler } from './route.js';

const owner = () => ({ role: 'owner' });
const request = (body) => new Request('http://localhost/api/chat/history', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const item = { id: 1, source_text: 'halo', source_language: 'id', translated_text: 'こんにちは', target_language: 'ja', created_at: 'now' };

test('history GET newest first', async () => {
  const response = await createHistoryHandler({ authenticate: owner, query: async (sql) => { assert.match(sql, /ORDER BY created_at DESC, id DESC/); return { rows: [item] }; } }).GET(new Request('http://localhost/api/chat/history'));
  assert.deepEqual(await response.json(), { history: [item] });
});

test('history POST validates and parameterizes', async () => {
  let args;
  const response = await createHistoryHandler({ authenticate: owner, query: async (sql, values) => { args = [sql, values]; return { rows: [item] }; } }).POST(request({ source_text: 'halo', source_language: 'id', translated_text: 'こんにちは', target_language: 'ja' }));
  assert.equal(response.status, 201); assert.deepEqual(args[1], ['halo', 'id', 'こんにちは', 'ja']); assert.match(args[0], /\$1/);
});

test('history POST rejects empty fields', async () => {
  const response = await createHistoryHandler({ authenticate: owner, query: async () => { throw new Error('must not query'); } }).POST(request({ source_text: '', source_language: 'id', translated_text: 'x', target_language: 'ja' }));
  assert.equal(response.status, 422);
});

test('history DELETE validates id and uses parameter', async () => {
  let values;
  const response = await createHistoryHandler({ authenticate: owner, query: async (sql, args) => { values = args; return { rowCount: 1 }; } }).DELETE(new Request('http://localhost/api/chat/history/7'), { params: { id: '7' } });
  assert.equal(response.status, 200); assert.deepEqual(values, [7]);
});
