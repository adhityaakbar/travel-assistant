import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeScannerAnalysis, parseProviderResponse } from './scanner.js';

 test('parses OpenAI-compatible SSE response', () => {
  const payload = parseProviderResponse(`data: {"choices":[{"message":{"content":"{\\"product_name\\":\\"Camera\\"}"}}]}\n\ndata: [DONE]\n`);
  assert.equal(payload.choices[0].message.content, '{"product_name":"Camera"}');
});

test('normalizes valid scanner JSON', () => {
  const result = normalizeScannerAnalysis(JSON.stringify({
    product_name: 'Sony WH-1000XM5',
    brand: 'Sony',
    model: 'WH-1000XM5',
    price_jpy: 42000,
    lowest_price_idr: 4500000,
    average_price_idr: 5200000,
    currency: 'JPY',
    marketplace: 'both',
    marketplace_url: 'https://tokopedia.com/sony/headphones',
    tokopedia_url: 'https://www.tokopedia.com/sony/headphones',
    shopee_url: 'https://shopee.co.id/sony/headphones',
    confidence: 0.91,
    estimate_note: 'AI estimate',
  }));

  assert.equal(result.product_name, 'Sony WH-1000XM5');
  assert.equal(result.price_jpy, 42000);
  assert.equal(result.marketplace, 'both');
});

test('normalizes fenced JSON and derives missing marketplace search links', () => {
  const result = normalizeScannerAnalysis('```json\n{"product_name":"Nintendo Switch OLED","price_jpy":null}\n```');

  assert.equal(result.product_name, 'Nintendo Switch OLED');
  assert.equal(result.tokopedia_url, 'https://www.tokopedia.com/search?st=product&q=Nintendo%20Switch%20OLED');
  assert.equal(result.shopee_url, 'https://shopee.co.id/search?keyword=Nintendo%20Switch%20OLED');
});

test('rejects malformed product names', () => {
  assert.throws(() => normalizeScannerAnalysis('{"product_name":"  "}'), /product_name/);
});

test('drops invalid URLs and negative or non-finite prices', () => {
  const result = normalizeScannerAnalysis(JSON.stringify({
    product_name: 'Camera',
    price_jpy: -1,
    lowest_price_idr: 'not-a-number',
    average_price_idr: Infinity,
    marketplace_url: 'http://evil.example/item',
    tokopedia_url: 'https://evil.example/item',
    shopee_url: 'javascript:alert(1)',
  }));

  assert.equal(result.price_jpy, null);
  assert.equal(result.lowest_price_idr, null);
  assert.equal(result.average_price_idr, null);
  assert.equal(result.marketplace_url, null);
  assert.match(result.tokopedia_url, /^https:\/\/www\.tokopedia\.com\/search/);
  assert.match(result.shopee_url, /^https:\/\/shopee\.co\.id\/search/);
});
