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

export const SUPPORTED_LANGUAGES = [
  { code: 'id-ID', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ja-JP', name: 'Bahasa Jepang', flag: '🇯🇵' },
  { code: 'en-US', name: 'Bahasa Inggris', flag: '🇺🇸' },
  { code: 'zh-CN', name: 'Bahasa Mandarin', flag: '🇨🇳' },
  { code: 'ko-KR', name: 'Bahasa Korea', flag: '🇰🇷' },
  { code: 'es-ES', name: 'Bahasa Spanyol', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Bahasa Prancis', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Bahasa Jerman', flag: '🇩🇪' },
  { code: 'ar-SA', name: 'Bahasa Arab', flag: '🇸🇦' },
  { code: 'hi-IN', name: 'Bahasa Hindi', flag: '🇮🇳' },
  { code: 'jv-ID', name: 'Bahasa Jawa', flag: '🇮🇩' },
  { code: 'btk-ID', name: 'Bahasa Batak', flag: '🇮🇩' },
  { code: 'min-ID', name: 'Bahasa Minang', flag: '🇮🇩' },
];

export const QUICK_PHRASES = [
  { category: '🚨 Darurat', text: 'Tolong saya! Ke mana rumah sakit atau kantor polisi terdekat?' },
  { category: '🚨 Darurat', text: 'Saya kehilangan dompet dan paspor saya.' },
  { category: '🗣️ Dasar', text: 'Permisi, bisakah Anda membantu saya?' },
  { category: '🗣️ Dasar', text: 'Terima kasih banyak atas bantuannya.' },
  { category: '🗣️ Dasar', text: 'Apakah Anda bisa berbicara bahasa Indonesia atau Inggris?' },
  { category: '🍣 Makanan', text: 'Apakah makanan ini halal atau mengandung daging babi?' },
  { category: '🍣 Makanan', text: 'Tolong berikan menu rekomendasi di restoran ini.' },
  { category: '🍣 Makanan', text: 'Permisi, saya mau minta bil / nota pembayaran.' },
  { category: '🚅 Transport', text: 'Di mana lokasi stasiun kereta atau halte bus terdekat?' },
  { category: '🚅 Transport', text: 'Tolong antar saya ke alamat ini, terima kasih.' },
  { category: '🏨 Hotel', text: 'Saya ingin melakukan proses check-in kamar atas nama saya.' },
  { category: '🏨 Hotel', text: 'Boleh saya meminta handuk tambahan dan kunci cadangan?' },
  { category: '🛍️ Belanja', text: 'Berapa harga barang ini? Apakah bisa diskon bebas pajak (tax-free)?' },
  { category: '🛍️ Belanja', text: 'Apakah toko ini menerima pembayaran kartu kredit atau QRIS?' },
];

export function getLanguageLabel(code) {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return found ? `${found.flag} ${found.name}` : code;
}

export function getRecognitionLanguage(code) {
  const map = {
    id: 'id-ID',
    ja: 'ja-JP',
    en: 'en-US',
    zh: 'zh-CN',
    ko: 'ko-KR',
    fr: 'fr-FR',
    es: 'es-ES',
    de: 'de-DE',
    ru: 'ru-RU',
    th: 'th-TH',
    jv: 'jw-ID',
    su: 'su-ID',
  };
  return map[code] || (code?.includes('-') ? code : 'id-ID');
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
