import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLatestTranslationState, conversationPayload, getBubbleSide, getLanguageLabel, getRecognitionLanguage, invalidateTranslationRequest, isEmptyInput, isLatestTranslationRequest, isTranslationCurrent, toggleRecognition } from './chat.js';

test('mic toggle keeps recognition active until onend', () => {
  const calls = [];
  const recognition = { start: () => calls.push('start'), stop: () => calls.push('stop') };
  let listening = false;
  const setListening = (value) => { listening = value; };

  toggleRecognition({ recognition, isListening: listening, setListening });
  assert.equal(listening, true);
  assert.deepEqual(calls, ['start']);
  recognition.onend();
  assert.equal(listening, false);

  toggleRecognition({ recognition, isListening: listening, setListening });
  toggleRecognition({ recognition, isListening: true, setListening });
  assert.deepEqual(calls, ['start', 'start', 'stop']);
});

test('language side puts Indonesian left and Japanese right', () => {
  assert.equal(getBubbleSide('id'), 'left');
  assert.equal(getBubbleSide('id-ID'), 'left');
  assert.equal(getBubbleSide('ja'), 'right');
  assert.equal(getBubbleSide('ja-JP'), 'right');
});

test('draft bubbles follow language side in both directions', () => {
  assert.equal(getBubbleSide('id'), 'left');
  assert.equal(getBubbleSide('ja'), 'right');
  assert.equal(getBubbleSide('ja') === 'right', true);
  assert.equal(getBubbleSide('id') === 'left', true);
});

test('stale async translation response is ignored', () => {
  assert.equal(isLatestTranslationRequest(2, 2), true);
  assert.equal(isLatestTranslationRequest(1, 2), false);
});

test('stale translation rejection cannot overwrite current error or loading', () => {
  const state = { error: '', loading: true };
  const staleSetters = {
    setError: (error) => { state.error = error; },
    setLoading: (loading) => { state.loading = loading; },
  };

  assert.equal(applyLatestTranslationState(1, 2, () => staleSetters.setError('stale failure')), false);
  assert.equal(applyLatestTranslationState(1, 2, () => staleSetters.setLoading(false)), false);
  assert.deepEqual(state, { error: '', loading: true });

  assert.equal(applyLatestTranslationState(2, 2, () => staleSetters.setError('current failure')), true);
  assert.equal(applyLatestTranslationState(2, 2, () => staleSetters.setLoading(false)), true);
  assert.deepEqual(state, { error: 'current failure', loading: false });
});

test('language UI values follow selected language', () => {
  assert.equal(getLanguageLabel('ja'), 'Jepang');
  assert.equal(getLanguageLabel('id'), 'Indonesia');
  assert.equal(getRecognitionLanguage('ja'), 'ja-JP');
  assert.equal(getRecognitionLanguage('id'), 'id-ID');
});

test('empty input rejects whitespace', () => {
  assert.equal(isEmptyInput('   '), true);
  assert.equal(isEmptyInput('Halo'), false);
});

test('conversation payload preserves bidirectional language values', () => {
  assert.deepEqual(conversationPayload({
    sourceText: 'Halo', sourceLanguage: 'id', translatedText: 'こんにちは', targetLanguage: 'ja'
  }), {
    source_text: 'Halo', source_language: 'id', translated_text: 'こんにちは', target_language: 'ja'
  });
  assert.deepEqual(conversationPayload({
    sourceText: 'こんにちは', sourceLanguage: 'ja', translatedText: 'Halo', targetLanguage: 'id'
  }), {
    source_text: 'こんにちは', source_language: 'ja', translated_text: 'Halo', target_language: 'id'
  });
});

test('input or language changes invalidate in-flight translation request', () => {
  assert.equal(invalidateTranslationRequest(4), 5);
  assert.equal(isLatestTranslationRequest(4, invalidateTranslationRequest(4)), false);
});

test('translation becomes stale when source or languages change', () => {
  const current = { sourceText: 'Halo', sourceLanguage: 'id', translatedText: 'こんにちは', targetLanguage: 'ja' };
  assert.equal(isTranslationCurrent(current, current), true);
  assert.equal(isTranslationCurrent({ ...current, sourceText: 'Hai' }, current), false);
  assert.equal(isTranslationCurrent(current, { ...current, sourceLanguage: 'ja', targetLanguage: 'id' }), false);
  assert.equal(isTranslationCurrent({ ...current, translatedText: '' }, current), false);
});
