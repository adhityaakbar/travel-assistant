import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeProductImage } from './scanner.js';

const configured = ['OPENAI_BASE_URL', 'OPENAI_API_KEY', 'OPENAI_MODEL'].every((name) => process.env[name]);

test('optional live scanner provider smoke test', { skip: !configured }, async () => {
  const result = await analyzeProductImage({ imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeElEQVR4nO3PQQkAMAzAwEqsfyZmIvY4BoEIuMzZ/brhgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAsa0IIGtKABLWhACxrQgga0oAEtaEALGtCCBrSgAS1oQAseu4U+wVrHp9c/AAAAAElFTkSuQmCC' });
  assert.equal(typeof result.product_name, 'string');
});

if (!configured) process.stdout.write('SKIP live scanner provider smoke test: OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL not all set\n');
