import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgres://test:test@localhost:5432/test';
process.env.APP_SECRET ||= 'test-app-secret';
process.env.JWT_SECRET ||= 'test-jwt-secret';

const { createAnalyzeHandler } = await import('./route.js');
const { POST: historyPost } = await import('../history/route.js');

const imageDataUrl = 'data:image/png;base64,aGVsbG8=';
const analysis = {
  product_name: 'Sony WH-1000XM5',
  brand: 'Sony',
  model: 'WH-1000XM5',
  price_jpy: 42000,
  lowest_price_idr: 4500000,
  average_price_idr: 5200000,
  currency: 'JPY',
  marketplace: 'both',
  marketplace_url: 'https://www.tokopedia.com/sony/headphones',
  tokopedia_url: 'https://www.tokopedia.com/sony/headphones',
  shopee_url: 'https://shopee.co.id/sony/headphones',
  confidence: 0.91,
  estimate_note: 'Estimasi AI',
};

function request(body) {
  return new Request('http://localhost/api/scanner/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const ownerAuth = () => ({ role: 'owner' });

function handler({ analyze = async () => analysis, query = async () => ({ rows: [] }), authenticate = ownerAuth } = {}) {
  return createAnalyzeHandler({ analyze, query, authenticate });
}

test('rejects unauthenticated requests before parsing body', async () => {
  const response = await handler({ authenticate: () => null })(request({ image_data_url: imageDataUrl }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
});

test('rejects authenticated non-owner requests', async () => {
  const response = await handler({ authenticate: () => ({ role: 'user' }) })(request({ image_data_url: imageDataUrl }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
});

test('rejects missing image', async () => {
  const response = await handler()(request({}));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'image_data_url wajib diisi' });
});

test('rejects unsupported image media type', async () => {
  const response = await handler()(request({ image_data_url: 'data:image/gif;base64,R0lGODlh' }));
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: 'Format gambar harus JPEG, PNG, atau WebP' });
});

test('rejects decoded image payloads larger than 8 MB', async () => {
  const oversized = `data:image/jpeg;base64,${Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64')}`;
  const response = await handler()(request({ image_data_url: oversized }));
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: 'Ukuran gambar maksimal 8 MB' });
});

test('provider failure returns 502 and does not insert', async () => {
  let inserts = 0;
  const response = await handler({
    analyze: async () => { throw new Error('provider unavailable'); },
    query: async () => { inserts += 1; },
  })(request({ image_data_url: imageDataUrl }));

  assert.equal(response.status, 502);
  assert.equal(inserts, 0);
  assert.deepEqual(await response.json(), { error: 'Gagal menganalisis gambar' });
});

test('analyzes and saves normalized fields as an estimate', async () => {
  let analyzedImage;
  let insert;
  const saved = { id: 7, ...analysis, is_estimate: true, created_at: '2026-10-07T00:00:00.000Z' };
  const response = await handler({
    analyze: async ({ imageDataUrl: value }) => { analyzedImage = value; return analysis; },
    query: async (text, values) => { insert = { text, values }; return { rows: [saved] }; },
  })(request({ image_data_url: imageDataUrl }));

  assert.equal(response.status, 201);
  assert.equal(analyzedImage, imageDataUrl);
  assert.match(insert.text, /INSERT INTO scan_history/);
  assert.match(insert.text, /is_estimate/);
  assert.deepEqual(insert.values, [
    analysis.product_name, analysis.brand, analysis.model, analysis.price_jpy,
    analysis.lowest_price_idr, analysis.average_price_idr, analysis.currency,
    analysis.marketplace, analysis.marketplace_url, analysis.tokopedia_url,
    analysis.shopee_url, analysis.confidence, analysis.estimate_note, true,
  ]);
  assert.deepEqual(await response.json(), { success: true, item: saved });
});

test('history POST cannot bypass analysis', async () => {
  const response = await historyPost();
  assert.equal(response.status, 405);
});
