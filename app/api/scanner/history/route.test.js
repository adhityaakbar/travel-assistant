import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgres://test:***@localhost:5432/test';
process.env.APP_SECRET ||= 'test-app-secret';
process.env.JWT_SECRET ||= 'test-jwt-secret';

const { createHistoryHandler } = await import('./route.js');

test('scanner history rejects unauthenticated requests before query', async () => {
  let calls = 0;
  const GET = createHistoryHandler({
    authenticate: () => null,
    query: async () => { calls += 1; },
  });
  const response = await GET(new Request('http://localhost/api/scanner/history'));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
  assert.equal(calls, 0);
});

test('scanner history rejects authenticated non-owner requests before query', async () => {
  let calls = 0;
  const GET = createHistoryHandler({
    authenticate: () => ({ role: 'user' }),
    query: async () => { calls += 1; },
  });
  const response = await GET(new Request('http://localhost/api/scanner/history'));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
  assert.equal(calls, 0);
});

test('scanner history returns normalized owner history', async () => {
  const item = { id: 1, product_name: 'Camera', price_jpy: 42000, lowest_price_idr: 4500000 };
  const GET = createHistoryHandler({
    authenticate: () => ({ role: 'owner' }),
    query: async () => ({ rows: [item] }),
  });
  const response = await GET(new Request('http://localhost/api/scanner/history'));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { history: [item] });
});
