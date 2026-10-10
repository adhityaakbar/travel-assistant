import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaginatedScanHistory } from './scanHistory.js';

test('getPaginatedScanHistory paginates list correctly', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
  const page1 = getPaginatedScanHistory(items, 1, 10);

  assert.equal(page1.totalPages, 3);
  assert.equal(page1.currentPage, 1);
  assert.equal(page1.hasPrev, false);
  assert.equal(page1.hasNext, true);
  assert.equal(page1.slicedItems.length, 10);
  assert.equal(page1.slicedItems[0].id, 1);
  assert.equal(page1.slicedItems[9].id, 10);

  const page3 = getPaginatedScanHistory(items, 3, 10);
  assert.equal(page3.currentPage, 3);
  assert.equal(page3.hasPrev, true);
  assert.equal(page3.hasNext, false);
  assert.equal(page3.slicedItems.length, 5);
  assert.equal(page3.slicedItems[0].id, 21);
});

test('getPaginatedScanHistory handles empty list and out of bound pages', () => {
  const empty = getPaginatedScanHistory([], 1, 10);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.currentPage, 1);
  assert.equal(empty.slicedItems.length, 0);

  const items = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));
  const clampedPage = getPaginatedScanHistory(items, 99, 10);
  assert.equal(clampedPage.currentPage, 2);
  assert.equal(clampedPage.slicedItems.length, 5);
});
