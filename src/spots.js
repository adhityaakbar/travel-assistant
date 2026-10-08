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
