import assert from 'node:assert/strict';
import test from 'node:test';
import { createScannerHistoryDeleteHandler } from './route.js';

const request = () => new Request('http://localhost/api/scanner/history/1', { method: 'DELETE' });
const owner = () => ({ role: 'owner' });

test('scanner history DELETE rejects unauthorized requests', async () => {
  const handler = createScannerHistoryDeleteHandler({ authenticate: () => null });
  const response = await handler(request(), { params: { id: '1' } });
  assert.equal(response.status, 401);
});

test('scanner history DELETE deletes row', async () => {
  const handler = createScannerHistoryDeleteHandler({
    authenticate: owner,
    query: async () => ({ rowCount: 1 })
  });
  const response = await handler(request(), { params: { id: '1' } });
  assert.equal(response.status, 200);
});