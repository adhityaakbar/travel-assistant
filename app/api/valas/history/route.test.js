import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL ||= 'postgres://test:***@localhost:5432/test';
process.env.APP_SECRET ||= 'test-app-secret';
process.env.JWT_SECRET ||= 'test-jwt-secret';

const { createHistoryHandler } = await import('./[id]/route.js');
const { createCollectionHandler } = await import('./route.js');

const item = {
  id: 7,
  from_currency: 'JPY',
  to_currency: 'IDR',
  from_amount: 100,
  to_amount: 1500000,
  exchange_rate: 15000,
  note: '',
};

function request(method, body) {
  return new Request('http://localhost/api/valas/history/7', {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const ownerAuth = () => ({ role: 'owner' });

const validPayload = {
  from_currency: 'JPY',
  to_currency: 'IDR',
  from_amount: 100,
  to_amount: 1500000,
  exchange_rate: 15000,
  note: '',
};

test('POST rejects unauthenticated requests before querying', async () => {
  let calls = 0;
  const response = await createCollectionHandler({
    authenticate: () => null,
    query: async () => { calls += 1; },
  }).POST(request('POST', validPayload));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
  assert.equal(calls, 0);
});

test('GET accepts owner authentication', async () => {
  const response = await createCollectionHandler({
    authenticate: ownerAuth,
    query: async () => ({ rows: [item] }),
  }).GET(request('GET'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { history: [item] });
});

test('POST safely rejects null JSON payload before dereferencing it', async () => {
  let calls = 0;
  const response = await createCollectionHandler({
    authenticate: ownerAuth,
    query: async () => { calls += 1; },
  }).POST(request('POST', null));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Payload tidak valid' });
  assert.equal(calls, 0);
});

test('POST rejects explicit null currency instead of applying defaults', async () => {
  let calls = 0;
  const response = await createCollectionHandler({
    authenticate: ownerAuth,
    query: async () => { calls += 1; },
  }).POST(request('POST', { ...validPayload, from_currency: null }));
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: 'Mata uang tidak didukung' });
  assert.equal(calls, 0);
});

test('POST accepts owner authentication', async () => {
  const response = await createCollectionHandler({
    authenticate: ownerAuth,
    query: async () => ({ rows: [item] }),
  }).POST(request('POST', validPayload));
  assert.equal(response.status, 201);
});

test('POST safely rejects invalid payload before querying', async () => {
  let calls = 0;
  const response = await createCollectionHandler({ authenticate: ownerAuth, query: async () => { calls += 1; } })
    .POST(request('POST', { ...validPayload, exchange_rate: Number.NaN }));
  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: 'Nilai numerik harus berupa angka finite non-negatif' });
  assert.equal(calls, 0);
});

test('POST rejects zero exchange rate before querying', async () => {
  let calls = 0;
  const response = await createCollectionHandler({ authenticate: ownerAuth, query: async () => { calls += 1; } })
    .POST(request('POST', { ...validPayload, exchange_rate: 0 }));
  assert.equal(response.status, 422);
  assert.equal(calls, 0);
});

test('POST accepts zero amounts with a positive exchange rate', async () => {
  let values;
  const response = await createCollectionHandler({
    authenticate: ownerAuth,
    query: async (_text, queryValues) => { values = queryValues; return { rows: [{ ...item, from_amount: 0, to_amount: 0 }] }; },
  }).POST(request('POST', { ...validPayload, from_amount: 0, to_amount: 0 }));
  assert.equal(response.status, 201);
  assert.deepEqual(values.slice(2, 5), [0, 0, 15000]);
});

test('PATCH rejects unauthenticated requests before querying', async () => {
  let calls = 0;
  const response = await createHistoryHandler({
    authenticate: () => null,
    query: async () => { calls += 1; },
  }).PATCH(request('PATCH', validPayload), { params: { id: '7' } });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
  assert.equal(calls, 0);
});

test('PATCH rejects authenticated non-owner before querying', async () => {
  let calls = 0;
  const response = await createHistoryHandler({
    authenticate: () => ({ role: 'user' }),
    query: async () => { calls += 1; },
  }).PATCH(request('PATCH', validPayload), { params: { id: '7' } });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
  assert.equal(calls, 0);
});

test('DELETE rejects unauthenticated requests before querying', async () => {
  let calls = 0;
  const response = await createHistoryHandler({
    authenticate: () => null,
    query: async () => { calls += 1; },
  }).DELETE(request('DELETE'), { params: { id: '7' } });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
  assert.equal(calls, 0);
});

test('DELETE rejects authenticated non-owner before querying', async () => {
  let calls = 0;
  const response = await createHistoryHandler({
    authenticate: () => ({ role: 'user' }),
    query: async () => { calls += 1; },
  }).DELETE(request('DELETE'), { params: { id: '7' } });
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Autentikasi diperlukan' });
  assert.equal(calls, 0);
});

test('PATCH updates valid history and persists empty note', async () => {
  let call;
  const response = await createHistoryHandler({
    authenticate: ownerAuth,
    query: async (text, values) => {
      call = { text, values };
      return { rowCount: 1, rows: [item] };
    },
  }).PATCH(request('PATCH', validPayload), { params: { id: '7' } });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, item });
  assert.match(call.text, /UPDATE conversions\s+SET/);
  assert.doesNotMatch(call.text, /15000/);
  assert.deepEqual(call.values, ['JPY', 'IDR', 100, 1500000, 15000, '', 7]);
});

test('PATCH rejects invalid positive integer ID', async () => {
  let calls = 0;
  const response = await createHistoryHandler({ authenticate: ownerAuth, query: async () => { calls += 1; } })
    .PATCH(request('PATCH', validPayload), { params: { id: '0' } });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'ID riwayat tidak valid' });
  assert.equal(calls, 0);
});

test('PATCH rejects unsupported currency and invalid numeric payload', async () => {
  const handler = createHistoryHandler({ authenticate: ownerAuth, query: async () => { throw new Error('must not query'); } });
  const unsupported = await handler.PATCH(request('PATCH', { ...validPayload, from_currency: 'BAD' }), { params: { id: '7' } });
  assert.equal(unsupported.status, 422);
  assert.deepEqual(await unsupported.json(), { error: 'Mata uang tidak didukung' });

  const invalidNumber = await handler.PATCH(request('PATCH', { ...validPayload, from_amount: -1 }), { params: { id: '7' } });
  assert.equal(invalidNumber.status, 422);
  assert.deepEqual(await invalidNumber.json(), { error: 'Nilai numerik harus berupa angka finite non-negatif' });
});

test('PATCH rejects zero exchange rate before querying', async () => {
  let calls = 0;
  const response = await createHistoryHandler({ authenticate: ownerAuth, query: async () => { calls += 1; } })
    .PATCH(request('PATCH', { ...validPayload, exchange_rate: 0 }), { params: { id: '7' } });
  assert.equal(response.status, 422);
  assert.equal(calls, 0);
});

test('PATCH accepts zero amounts with a positive exchange rate', async () => {
  let values;
  const response = await createHistoryHandler({
    authenticate: ownerAuth,
    query: async (_text, queryValues) => { values = queryValues; return { rowCount: 1, rows: [item] }; },
  }).PATCH(request('PATCH', { ...validPayload, from_amount: 0, to_amount: 0 }), { params: { id: '7' } });
  assert.equal(response.status, 200);
  assert.deepEqual(values.slice(2, 5), [0, 0, 15000]);
});

test('DELETE removes valid history with UUID or numeric ID', async () => {
  let call;
  const uuid = '6c841160-eb14-415a-8cc1-9004ca815a01';
  const response = await createHistoryHandler({
    authenticate: ownerAuth,
    query: async (text, values) => { call = { text, values }; return { rowCount: 1, rows: [] }; },
  }).DELETE(request('DELETE'), { params: { id: uuid } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.deepEqual(call.values, [uuid]);
});

test('DELETE returns 404 when row is missing and never exposes DB details', async () => {
  const response = await createHistoryHandler({
    authenticate: ownerAuth,
    query: async () => ({ rowCount: 0, rows: [] }),
  }).DELETE(request('DELETE'), { params: { id: '7' } });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Riwayat tidak ditemukan' });
});

test('PATCH returns 404 when row is missing and hides database error', async () => {
  const missing = await createHistoryHandler({ authenticate: ownerAuth, query: async () => ({ rowCount: 0, rows: [] }) })
    .PATCH(request('PATCH', validPayload), { params: { id: '7' } });
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Riwayat tidak ditemukan' });

  const failed = await createHistoryHandler({ authenticate: ownerAuth, query: async () => { throw new Error('secret db password'); } })
    .PATCH(request('PATCH', validPayload), { params: { id: '7' } });
  assert.equal(failed.status, 500);
  assert.deepEqual(await failed.json(), { error: 'Gagal memperbarui riwayat' });
});
