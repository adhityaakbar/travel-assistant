import assert from 'node:assert/strict';
import test from 'node:test';
import { initialSpotsState, locationErrorMessage, shouldReloadSpots, SPOT_CATEGORIES, getCountryCodeFromCoords, getFlagByCountryCode, getCountryFlagFromCoords } from './spots.js';

test('starts without fallback spots or coordinates', () => {
  assert.deepEqual(initialSpotsState(), { location: null, places: [] });
});

test('detects country code and flag from coordinates or location name', () => {
  assert.equal(getCountryCodeFromCoords(null, null), 'JPN');
  assert.equal(getCountryCodeFromCoords(-6.2, 106.8), 'IDN'); // Jakarta
  assert.equal(getCountryCodeFromCoords(35.6, 139.7), 'JPN'); // Tokyo
  assert.equal(getFlagByCountryCode('IDN'), '🇮🇩');
  assert.equal(getFlagByCountryCode('JPN'), '🇯🇵');
  assert.equal(getCountryFlagFromCoords(-6.2, 106.8), '🇮🇩');
  assert.equal(getCountryFlagFromCoords(null, null, 'Shibuya, Tokyo, Japan'), '🇯🇵');
});

test('lists normalized categories', () => {
  assert.deepEqual(SPOT_CATEGORIES.map(({ id }) => id), ['all', 'foto', 'food', 'shopping', 'gadget', 'coffee', 'attraction', 'hiburan']);
});

test('category reload requires acquired location', () => {
  assert.equal(shouldReloadSpots(null), false);
  assert.equal(shouldReloadSpots({ lat: 0, lng: 0 }), true);
});

test('permission and unavailable GPS errors are actionable', () => {
  assert.match(locationErrorMessage({ code: 1 }), /Izinkan lokasi/);
  assert.match(locationErrorMessage({ code: 2 }), /coba lagi/i);
});
