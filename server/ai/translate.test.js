import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeTranslateResponse, translateText } from './translate.js';

test('normalizes JSON translation', () => {
  assert.equal(normalizeTranslateResponse('{"translation":"こんにちは"}'), 'こんにちは');
});

test('normalizes SSE translation chunks', () => {
  const body = 'data: {"choices":[{"delta":{"content":"こんにちは"}}]}\n\ndata: [DONE]\n';
  assert.equal(normalizeTranslateResponse(body), 'こんにちは');
});

test('normalizes fenced JSON translation', () => {
  assert.equal(normalizeTranslateResponse('```json\n{"translation":"こんにちは"}\n```'), 'こんにちは');
});

test('rejects empty translation', () => {
  assert.throws(() => normalizeTranslateResponse('{"translation":"  "}'), /empty translation/);
});

test('rejects provider HTTP failure without leaking body', async () => {
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_BASE_URL = 'https://router.test';
  process.env.OPENAI_API_KEY = 'secret-key';
  process.env.OPENAI_MODEL = 'model';
  globalThis.fetch = async () => new Response('secret provider body', { status: 500 });
  try { await assert.rejects(() => translateText({ text: 'halo', sourceLanguage: 'id', targetLanguage: 'ja' }), (error) => !error.message.includes('secret provider body') && !error.message.includes('secret-key')); }
  finally { globalThis.fetch = oldFetch; }
});

test('rejects missing provider environment', async () => {
  const saved = [process.env.OPENAI_BASE_URL, process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL];
  delete process.env.OPENAI_BASE_URL; delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_MODEL;
  try { await assert.rejects(() => translateText({ text: 'halo', sourceLanguage: 'id', targetLanguage: 'ja' }), /not configured/); }
  finally { [process.env.OPENAI_BASE_URL, process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL] = saved; }
});
