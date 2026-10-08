import assert from 'node:assert/strict';
import test from 'node:test';
import { createNearbyHandler, normalizeCategory } from './route.js';

const baseSpots = [
  { id: 'far', name: 'Far coffee', category: 'kopi', lat: 35.02, lng: 139, rating: '4.0★' },
  { id: 'near', name: 'Near coffee', category: 'coffee', lat: 35.001, lng: 139, rating: '4.0★' },
  { id: 'food', name: 'Food', category: 'eat', lat: 35.003, lng: 139, rating: '4.0★' },
  { id: 'shop', name: 'Shop', category: 'thrift', lat: 35.004, lng: 139, rating: '4.0★' },
  { id: 'gadget', name: 'Gadget', category: 'attraction', lat: 35.005, lng: 139, rating: '4.0★' },
];

function request(query = '') {
  return new Request(`http://localhost/api/places/nearby${query}`);
}

function handler(options = {}) {
  return createNearbyHandler({ curatedSpots: baseSpots, apiKey: '', ...options });
}

test('requires both coordinates', async () => {
  for (const query of ['', '?lat=35', '?lng=139']) {
    const response = await handler()(request(query));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Koordinat GPS lat dan lng wajib diisi' });
  }
});

test('rejects empty and whitespace coordinate values', async () => {
  for (const query of ['?lat=&lng=139', '?lat=35&lng=', '?lat=%20&lng=139', '?lat=35&lng=%20%20']) {
    const response = await handler()(request(query));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Koordinat GPS tidak valid' });
  }
});

test('accepts zero coordinates', async () => {
  const response = await handler()(request('?lat=0&lng=0'));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).location, { lat: 0, lng: 0 });
});

test('rejects non-finite and out-of-range coordinates', async () => {
  for (const query of ['?lat=abc&lng=139', '?lat=Infinity&lng=139', '?lat=91&lng=139', '?lat=35&lng=181']) {
    const response = await handler()(request(query));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Koordinat GPS tidak valid' });
  }
});

test('normalizes supported and legacy categories', () => {
  assert.deepEqual(['all', 'coffee', 'food', 'shopping', 'gadget'].map(normalizeCategory), ['all', 'coffee', 'food', 'shopping', 'gadget']);
  assert.deepEqual(['kopi', 'eat', 'thrift', 'attraction'].map(normalizeCategory), ['coffee', 'food', 'shopping', 'gadget']);
  assert.equal(normalizeCategory('unknown'), null);
});

test('filters all supported categories after normalization', async () => {
  const expected = { all: 5, coffee: 2, food: 1, shopping: 1, gadget: 1 };
  for (const [category, count] of Object.entries(expected)) {
    const response = await handler()(request(`?lat=35&lng=139&category=${category}`));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.category, category);
    assert.equal(body.count, count);
    assert.ok(body.places.every((place) => category === 'all' || place.category === category));
  }
});

test('sorts places nearest first', async () => {
  const response = await handler()(request('?lat=35&lng=139&category=coffee'));
  const body = await response.json();
  assert.deepEqual(body.places.map((place) => place.id), ['near', 'far']);
  assert.ok(body.places[0].distKm < body.places[1].distKm);
});

test('provider empty result stays empty instead of fabricating fallback', async () => {
  const response = await handler({ apiKey: 'configured', searchPlaces: async () => [] })(request('?lat=35&lng=139&category=all'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { location: { lat: 35, lng: 139 }, category: 'all', count: 0, places: [], source: 'provider', providerStatus: 'empty' });
});

test('provider failure falls back gracefully to curated spots', async () => {
  const response = await handler({ apiKey: 'fake_key', searchPlaces: async () => { throw new Error('secret provider detail'); } })(request('?lat=35.001&lng=139&category=all'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, 'curated');
  assert.ok(body.places.length > 0);
});
