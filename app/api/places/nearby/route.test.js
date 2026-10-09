import assert from 'node:assert/strict';
import test from 'node:test';
import { createNearbyHandler, normalizeCategory } from './route.js';

const baseSpots = [
  { id: 'far', name: 'Far coffee', category: 'kopi', lat: 35.02, lng: 139, rating: '4.0★' },
  { id: 'near', name: 'Near coffee', category: 'coffee', lat: 35.001, lng: 139, rating: '4.0★' },
  { id: 'food', name: 'Food', category: 'eat', lat: 35.003, lng: 139, rating: '4.0★' },
  { id: 'shop', name: 'Shop', category: 'thrift', lat: 35.004, lng: 139, rating: '4.0★' },
  { id: 'gadget', name: 'Gadget', category: 'gadget', lat: 35.005, lng: 139, rating: '4.0★' },
  { id: 'water', name: 'Water', category: 'water', lat: 35.0055, lng: 139, rating: '4.0★' },
  { id: 'attr', name: 'Attraction', category: 'attraction', lat: 35.006, lng: 139, rating: '4.0★' },
  { id: 'foto', name: 'Foto', category: 'foto', lat: 35.007, lng: 139, rating: '4.0★' },
  { id: 'hiburan', name: 'Hiburan', category: 'hiburan', lat: 35.008, lng: 139, rating: '4.0★' },
];

function request(query = '') {
  return new Request(`http://localhost/api/places/nearby${query}`);
}

function handler(options = {}) {
  return createNearbyHandler({ curatedSpots: baseSpots, apiKey: 'test-key', dbQuery: null, ...options });
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
  assert.deepEqual(
    ['all', 'foto', 'food', 'shopping', 'gadget', 'coffee', 'water', 'attraction', 'hiburan'].map(normalizeCategory),
    ['all', 'foto', 'food', 'shopping', 'gadget', 'coffee', 'water', 'attraction', 'hiburan']
  );
  assert.deepEqual(
    ['kopi', 'kafe', 'eat', 'makan', 'thrift', 'belanja', 'air', 'air_minum', 'atraksi', 'photo', 'entertainment'].map(normalizeCategory),
    ['coffee', 'coffee', 'food', 'food', 'shopping', 'shopping', 'water', 'water', 'attraction', 'foto', 'hiburan']
  );
  assert.equal(normalizeCategory('unknown'), null);
});

test('filters all 8 supported categories after normalization', async () => {
  const expected = { all: 9, coffee: 2, food: 1, shopping: 1, gadget: 1, water: 1, attraction: 1, foto: 1, hiburan: 1 };
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

test('provider empty result completes up to 20 spots from curated spots', async () => {
  const response = await handler({ apiKey: 'test-key', searchPlaces: async () => [] })(request('?lat=35&lng=139&category=all'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, 'curated');
  assert.ok(body.places.length > 0);
});

test('provider failure falls back gracefully to curated spots', async () => {
  const response = await handler({ apiKey: 'fake_key', searchPlaces: async () => { throw new Error('secret provider detail'); } })(request('?lat=35.001&lng=139&category=all'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, 'curated');
  assert.ok(body.places.length > 0);
});
