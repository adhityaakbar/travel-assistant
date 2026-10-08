import assert from 'node:assert/strict';
import test from 'node:test';
import { DELETE, createHistoryDeleteHandler } from './route.js';

const owner = () => ({ role: 'owner' });
const request = new Request('http://localhost/api/chat/history/7', { method: 'DELETE' });
const context = (id) => ({ params: { id } });

 test('dynamic history DELETE rejects unauthorized requests', async () => {
  const response = await DELETE(request, context('7'));
  assert.equal(response.status, 401);
});

test('dynamic history DELETE rejects invalid IDs', async () => {
  const response = await createHistoryDeleteHandler({ authenticate: owner, query: async () => { throw new Error('must not query'); } }).DELETE(request, context('0'));
  assert.equal(response.status, 400);
});

test('dynamic history DELETE deletes owned row with parameterized ID', async () => {
  let values;
  const response = await createHistoryDeleteHandler({ authenticate: owner, query: async (sql, args) => { values = [sql, args]; return { rowCount: 1 }; } }).DELETE(request, context('7'));
  assert.equal(response.status, 200);
  assert.deepEqual(values[1], [7]);
  assert.match(values[0], /DELETE FROM conversations WHERE id = \$1/);
});

test('dynamic history DELETE returns 404 when row missing', async () => {
  const response = await createHistoryDeleteHandler({ authenticate: owner, query: async () => ({ rowCount: 0 }) }).DELETE(request, context('7'));
  assert.equal(response.status, 404);
});
