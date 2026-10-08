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

test('uses OPENAI_TRANSLATE_MODEL over OPENAI_MODEL when set', async () => {
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_BASE_URL = 'https://router.test';
  process.env.OPENAI_API_KEY = 'secret-key';
  process.env.OPENAI_MODEL = 'fallback-model';
  process.env.OPENAI_TRANSLATE_MODEL = 'custom-translate-model';

  let requestedModel = null;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    requestedModel = body.model;
    return new Response(JSON.stringify({ choices: [{ message: { content: 'こんにちは' } }] }), { status: 200 });
  };

  try {
    const result = await translateText({ text: 'halo', sourceLanguage: 'id', targetLanguage: 'ja' });
    assert.equal(result, 'こんにちは');
    assert.equal(requestedModel, 'custom-translate-model');
  } finally {
    globalThis.fetch = oldFetch;
    delete process.env.OPENAI_TRANSLATE_MODEL;
  }
});
