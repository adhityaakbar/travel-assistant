export function getCountryCodeFromCoords(lat, lng) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return 'JPN';
  if (lat >= -11.0 && lat <= 6.0 && lng >= 95.0 && lng <= 141.0) return 'IDN';
  if (lat >= 24.0 && lat <= 46.0 && lng >= 122.0 && lng <= 154.0) return 'JPN';
  return 'JPN';
}

export function getFlagByCountryCode(code) {
  const flags = {
    IDN: '🇮🇩',
    JPN: '🇯🇵',
    SGP: '🇸🇬',
    USA: '🇺🇸',
    KOR: '🇰🇷',
    EUR: '🇪🇺',
    GBR: '🇬🇧',
    AUS: '🇦🇺',
    CHN: '🇨🇳',
    THA: '🇹🇭',
    MYS: '🇲🇾',
  };
  return flags[code] || '🇯🇵';
}

export function getCountryFlagFromCoords(lat, lng, locationName = '') {
  if (locationName) {
    const locLower = String(locationName).toLowerCase();
    if (locLower.includes('indonesia') || locLower.includes('jakarta') || locLower.includes('bali') || locLower.includes('bandung') || locLower.includes('surabaya')) return '🇮🇩';
    if (locLower.includes('japan') || locLower.includes('jepang') || locLower.includes('tokyo') || locLower.includes('osaka') || locLower.includes('kyoto')) return '🇯🇵';
    if (locLower.includes('singapore') || locLower.includes('singapura')) return '🇸🇬';
  }
  const code = getCountryCodeFromCoords(lat, lng);
  return getFlagByCountryCode(code);
}

export const SPOT_CATEGORIES = [
  { id: 'all', label: '🔥 Semua' },
  { id: 'foto', label: '📸 Foto' },
  { id: 'food', label: '🍜 Restoran/Makan' },
  { id: 'shopping', label: '🛍️ Belanja' },
  { id: 'gadget', label: '📱 Gadget' },
  { id: 'coffee', label: '☕ Kafe' },
  { id: 'attraction', label: '🗼 Atraksi' },
  { id: 'hiburan', label: '🎭 Hiburan' },
];

export function initialSpotsState() {
  return { location: null, places: [] };
}

export function shouldReloadSpots(location) {
  return Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng));
}

export function locationErrorMessage(error) {
  if (error?.code === 1) return 'Izinkan lokasi di pengaturan browser lalu coba lagi.';
  if (error?.code === 2) return 'Lokasi tidak tersedia. Periksa GPS/perangkat lalu coba lagi.';
  if (error?.code === 3) return 'GPS terlalu lama merespons. Coba lagi.';
  return 'Lokasi gagal didapatkan. Coba lagi.';
}
