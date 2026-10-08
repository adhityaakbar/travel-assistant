export function toggleRecognition({ recognition, isListening, setListening }) {
  if (!recognition) return false;
  recognition.onend = () => setListening(false);
  recognition.onerror = () => setListening(false);
  if (isListening) {
    recognition.stop();
    return false;
  }
  setListening(true);
  recognition.start();
  return true;
}

export function getBubbleSide(language) {
  return language?.startsWith('ja') ? 'right' : 'left';
}

export function getDraftBubbleSides(sourceLanguage, targetLanguage) {
  return { source: getBubbleSide(sourceLanguage), translated: getBubbleSide(targetLanguage) };
}

export function getLanguageLabel(language) {
  return language?.startsWith('ja') ? 'Jepang' : 'Indonesia';
}

export function getRecognitionLanguage(language) {
  return language?.startsWith('ja') ? 'ja-JP' : 'id-ID';
}

export function isLatestTranslationRequest(requestId, latestRequestId) {
  return requestId === latestRequestId;
}

export function invalidateTranslationRequest(requestId) {
  return requestId + 1;
}

export function applyLatestTranslationState(requestId, latestRequestId, update) {
  if (!isLatestTranslationRequest(requestId, latestRequestId)) return false;
  update();
  return true;
}

export function isEmptyInput(text) {
  return !text?.trim();
}

export function isTranslationCurrent({ sourceText, sourceLanguage, translatedText, targetLanguage }, snapshot = {}) {
  return Boolean(
    sourceText?.trim() && translatedText?.trim() &&
    sourceText.trim() === snapshot.sourceText?.trim() &&
    sourceLanguage === snapshot.sourceLanguage && targetLanguage === snapshot.targetLanguage
  );
}

export function conversationPayload({ sourceText, sourceLanguage, translatedText, targetLanguage }) {
  return {
    source_text: sourceText,
    source_language: sourceLanguage,
    translated_text: translatedText,
    target_language: targetLanguage,
  };
}
