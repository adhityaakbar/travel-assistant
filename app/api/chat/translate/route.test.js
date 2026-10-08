import assert from 'node:assert/strict';
import test from 'node:test';
import { createTranslateHandler } from './route.js';

const request = (body) => new Request('http://localhost/api/chat/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const owner = () => ({ role: 'owner' });

test('translate rejects non-owner before provider', async () => {
  let calls = 0;
  const response = await createTranslateHandler({ authenticate: () => null, translate: async () => { calls += 1; } }).POST(request({ text: 'x', source_language: 'id', target_language: 'ja' }));
  assert.equal(response.status, 401); assert.equal(calls, 0);
});

test('translate validates non-empty fields', async () => {
  const response = await createTranslateHandler({ authenticate: owner, translate: async () => 'x' }).POST(request({ text: ' ', source_language: 'id', target_language: 'ja' }));
  assert.equal(response.status, 422);
});

test('translate returns normalized response', async () => {
  const response = await createTranslateHandler({ authenticate: owner, translate: async () => 'こんにちは' }).POST(request({ text: 'halo', source_language: 'id', target_language: 'ja' }));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { success: true, translation: 'こんにちは', source_language: 'id', target_language: 'ja' });
});

test('translate hides provider failure', async () => {
  const response = await createTranslateHandler({ authenticate: owner, translate: async () => { throw new Error('secret-key provider body'); } }).POST(request({ text: 'halo error test', source_language: 'id', target_language: 'ja' }));
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /secret-key|provider body/);
});
