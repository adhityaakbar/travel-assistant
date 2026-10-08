import assert from 'node:assert/strict';
import test from 'node:test';
import { createCameraController, startCamera, stopCamera } from './scannerCamera.js';

test('startCamera assigns stream before activating camera', async () => {
  const stream = { getTracks: () => [] };
  const video = { srcObject: null };
  const events = [];

  const result = await startCamera({
    getUserMedia: async () => stream,
    video,
    facingMode: 'environment',
    setStream: (value) => events.push(['stream', value]),
    setActive: (value) => events.push(['active', value]),
  });

  assert.equal(result, stream);
  assert.equal(video.srcObject, stream);
  assert.deepEqual(events, [['stream', stream], ['active', true]]);
});

test('startCamera stops stale pending stream without attaching or activating it', async () => {
  let resolveUserMedia;
  const stopped = [];
  const pending = new Promise((resolve) => { resolveUserMedia = resolve; });
  const stream = { getTracks: () => [{ stop: () => stopped.push('track') }] };
  const video = { srcObject: null };
  const events = [];
  const controller = createCameraController();
  const start = controller.start({
    getUserMedia: () => pending,
    video,
    facingMode: 'environment',
    setStream: (value) => events.push(['stream', value]),
    setActive: (value) => events.push(['active', value]),
  });

  controller.stop({ stream: null, video, setStream: () => {}, setActive: () => {} });
  resolveUserMedia(stream);
  assert.equal(await start, null);
  assert.deepEqual(stopped, ['track']);
  assert.equal(video.srcObject, null);
  assert.deepEqual(events, []);
});

test('stopCamera stops every track and clears source', () => {
  const stopped = [];
  const stream = { getTracks: () => [{ stop: () => stopped.push('one') }, { stop: () => stopped.push('two') }] };
  const video = { srcObject: stream };

  stopCamera({ stream, video, setStream: () => {}, setActive: () => {} });
  assert.deepEqual(stopped, ['one', 'two']);
  assert.equal(video.srcObject, null);
});

test('scheduled facing restart does not start after controller stop', () => {
  let scheduled;
  let cleared;
  let restart;
  const controller = createCameraController({
    setTimeoutFn: (callback) => { scheduled = callback; return 1; },
    clearTimeoutFn: (id) => { cleared = id; },
  });

  controller.start({ getUserMedia: async () => ({ getTracks: () => [] }), video: { srcObject: null }, facingMode: 'environment', setStream: () => {}, setActive: () => {} });
  controller.scheduleRestart(() => { restart = true; });
  controller.stop({ stream: null, video: null, setStream: () => {}, setActive: () => {} });
  scheduled();
  assert.equal(cleared, 1);
  assert.equal(restart, undefined);
});

test('rescheduled facing restart ignores already queued prior callback', () => {
  const scheduled = [];
  const starts = [];
  const controller = createCameraController({
    setTimeoutFn: (callback) => {
      scheduled.push(callback);
      return scheduled.length;
    },
    clearTimeoutFn: () => {},
  });

  controller.scheduleRestart(() => starts.push('first'));
  controller.scheduleRestart(() => starts.push('second'));
  scheduled[0]();
  scheduled[1]();

  assert.deepEqual(starts, ['second']);
});

test('startCamera stops partial stream when state setup fails', async () => {
  const stopped = [];
  const stream = { getTracks: () => [{ stop: () => stopped.push('track') }] };
  const video = { srcObject: null };

  await assert.rejects(() => startCamera({
    getUserMedia: async () => stream,
    video,
    facingMode: 'environment',
    setStream: () => { throw new Error('state failure'); },
    setActive: () => {},
  }), /state failure/);
  assert.equal(video.srcObject, null);
  assert.deepEqual(stopped, ['track']);
});
