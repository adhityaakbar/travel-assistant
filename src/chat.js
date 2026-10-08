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

export let QUICK_PHRASES = [
  // 🚨 Darurat (30 frasa)
  { category: '🚨 Darurat', text: 'Tolong saya! Ke mana rumah sakit atau kantor polisi terdekat?' },
  { category: '🚨 Darurat', text: 'Saya kehilangan dompet dan paspor saya.' },
  { category: '🚨 Darurat', text: 'Panggilkan ambulans segera!' },
  { category: '🚨 Darurat', text: 'Saya tersesat, bisakah bantu saya menemukan hotel ini?' },
  { category: '🚨 Darurat', text: 'Ada kebakaran di dekat sini!' },
  { category: '🚨 Darurat', text: 'Ponsel saya dicuri di stasiun.' },
  { category: '🚨 Darurat', text: 'Saya merasa sangat sakit dan pusing.' },
  { category: '🚨 Darurat', text: 'Apakah ada dokter yang bisa bahasa Inggris atau Indonesia?' },
  { category: '🚨 Darurat', text: 'Di mana pos polisi terdekat (Koban)?' },
  { category: '🚨 Darurat', text: 'Saya alergi makanan ini, tolong bantu!' },
  { category: '🚨 Darurat', text: 'Anak saya terpisah dari saya.' },
  { category: '🚨 Darurat', text: 'Tolong hubungi kedutaan besar Indonesia.' },
  { category: '🚨 Darurat', text: 'Saya butuh obat sakit kepala di apotek.' },
  { category: '🚨 Darurat', text: 'Koper saya tertinggal di dalam kereta.' },
  { category: '🚨 Darurat', text: 'Mobil atau taksi saya mengalami kecelakaan.' },
  { category: '🚨 Darurat', text: 'Di mana toilet darurat terdekat?' },
  { category: '🚨 Darurat', text: 'Kartu kredit saya hilang atau tertelan mesin.' },
  { category: '🚨 Darurat', text: 'Bisakah saya meminjam telepon untuk keadaan darurat?' },
  { category: '🚨 Darurat', text: 'Saya membutuhkan tempat perlindungan gempa bumi.' },
  { category: '🚨 Darurat', text: 'Tolong jangan sentuh barang ini, berbahaya!' },
  { category: '🚨 Darurat', text: 'Di mana kantor barang hilang (Lost and Found)?' },
  { category: '🚨 Darurat', text: 'Apakah area ini aman saat malam hari?' },
  { category: '🚨 Darurat', text: 'Saya tidak bisa menemukan jalan keluar dari stasiun ini.' },
  { category: '🚨 Darurat', text: 'Obat saya habis, di mana apotek buka 24 jam?' },
  { category: '🚨 Darurat', text: 'Bisakah Anda mengisi daya ponsel saya sebentar untuk darurat?' },
  { category: '🚨 Darurat', text: 'Saya terluka di kaki dan tidak bisa berjalan.' },
  { category: '🚨 Darurat', text: 'Tolong panggilkan petugas keamanan stasiun.' },
  { category: '🚨 Darurat', text: 'Apakah di sini ada pemadam kebakaran?' },
  { category: '🚨 Darurat', text: 'Saya terjebak di dalam lift!' },
  { category: '🚨 Darurat', text: 'Mohon bantuan translate kalimat darurat ini.' },

  // 🗣️ Dasar (30 frasa)
  { category: '🗣️ Dasar', text: 'Permisi, bisakah Anda membantu saya?' },
  { category: '🗣️ Dasar', text: 'Terima kasih banyak atas bantuannya.' },
  { category: '🗣️ Dasar', text: 'Apakah Anda bisa berbicara bahasa Indonesia atau Inggris?' },
  { category: '🗣️ Dasar', text: 'Halo, selamat pagi / siang / malam.' },
  { category: '🗣️ Dasar', text: 'Sampai jumpa lagi!' },
  { category: '🗣️ Dasar', text: 'Maaf merepotkan Anda.' },
  { category: '🗣️ Dasar', text: 'Saya tidak paham, bisa bicara lebih pelan?' },
  { category: '🗣️ Dasar', text: 'Tolong tuliskan kalimat ini di kertas.' },
  { category: '🗣️ Dasar', text: 'Apakah boleh saya mengambil foto di sini?' },
  { category: '🗣️ Dasar', text: 'Nama saya Adhit, salam kenal!' },
  { category: '🗣️ Dasar', text: 'Di mana letak toilet?' },
  { category: '🗣️ Dasar', text: 'Ya, betul sekali.' },
  { category: '🗣️ Dasar', text: 'Tidak, terima kasih.' },
  { category: '🗣️ Dasar', text: 'Bolehkah saya minta bantuan sebentar?' },
  { category: '🗣️ Dasar', text: 'Berapa umurnya tempat ini?' },
  { category: '🗣️ Dasar', text: 'Cuaca hari ini sangat bagus ya.' },
  { category: '🗣️ Dasar', text: 'Jam berapa sekarang?' },
  { category: '🗣️ Dasar', text: 'Kapan tempat ini buka?' },
  { category: '🗣️ Dasar', text: 'Kapan tempat ini tutup?' },
  { category: '🗣️ Dasar', text: 'Saya sangat senang berkunjung ke sini.' },
  { category: '🗣️ Dasar', text: 'Bisa ulangi sekali lagi?' },
  { category: '🗣️ Dasar', text: 'Apa artinya kata ini?' },
  { category: '🗣️ Dasar', text: 'Di mana tempat berkumpul yang mudah?' },
  { category: '🗣️ Dasar', text: 'Apakah tempat ini bebas rokok?' },
  { category: '🗣️ Dasar', text: 'Di mana area merokok?' },
  { category: '🗣️ Dasar', text: 'Bolehkah saya duduk di kursi ini?' },
  { category: '🗣️ Dasar', text: 'Tolong ambilkan foto kami berdua.' },
  { category: '🗣️ Dasar', text: 'Semoga hari Anda menyenangkan!' },
  { category: '🗣️ Dasar', text: 'Hati-hati di jalan.' },
  { category: '🗣️ Dasar', text: 'Tidak apa-apa / No problem.' },

  // 🍣 Makanan (30 frasa)
  { category: '🍣 Makanan', text: 'Apakah makanan ini halal atau mengandung daging babi?' },
  { category: '🍣 Makanan', text: 'Tolong berikan menu rekomendasi di restoran ini.' },
  { category: '🍣 Makanan', text: 'Permisi, saya mau minta bil / nota pembayaran.' },
  { category: '🍣 Makanan', text: 'Apakah ada menu berbahasa Inggris?' },
  { category: '🍣 Makanan', text: 'Saya memesan mi ramen satu dan teh hijau panas.' },
  { category: '🍣 Makanan', text: 'Makanan ini sangat lezat!' },
  { category: '🍣 Makanan', text: 'Apakah air minum ini gratis?' },
  { category: '🍣 Makanan', text: 'Tolong pisahkan bumbu pedasnya.' },
  { category: '🍣 Makanan', text: 'Saya vegetaris / vegetarian, tidak makan daging.' },
  { category: '🍣 Makanan', text: 'Apakah hidangan ini mengandung kacang tanah?' },
  { category: '🍣 Makanan', text: 'Bisakah saya membungkus makanan sisa ini untuk dibawa pulang?' },
  { category: '🍣 Makanan', text: 'Tolong sediakan sendok dan garpu.' },
  { category: '🍣 Makanan', text: 'Apakah pembayaran bisa dilakukan terpisah masing-masing orang?' },
  { category: '🍣 Makanan', text: 'Meja untuk dua orang, apakah ada yang kosong?' },
  { category: '🍣 Makanan', text: 'Berapa lama kami harus menunggu antrean?' },
  { category: '🍣 Makanan', text: 'Saya sudah buat reservasi atas nama Adhit.' },
  { category: '🍣 Makanan', text: 'Tolong air es satu gelas lagi.' },
  { category: '🍣 Makanan', text: 'Apakah rasa makanan ini sangat pedas?' },
  { category: '🍣 Makanan', text: 'Menu penutup / dessert favorit di sini apa?' },
  { category: '🍣 Makanan', text: 'Apakah mengandung alkohol / mirin?' },
  { category: '🍣 Makanan', text: 'Apakah resto ini menerima kartu kredit?' },
  { category: '🍣 Makanan', text: 'Tolong bersihkan meja ini.' },
  { category: '🍣 Makanan', text: 'Maaf, pesanan kami belum keluar.' },
  { category: '🍣 Makanan', text: 'Ini bukan apa yang saya pesan.' },
  { category: '🍣 Makanan', text: 'Bisa minta tisu dapur / tisu basah?' },
  { category: '🍣 Makanan', text: 'Apakah ada kursi khusus untuk anak kecil?' },
  { category: '🍣 Makanan', text: 'Bisakah pesanan disajikan lebih cepat?' },
  { category: '🍣 Makanan', text: 'Apakah seafood di sini segar?' },
  { category: '🍣 Makanan', text: 'Saya ingin pesan porsi besar (Omori).' },
  { category: '🍣 Makanan', text: 'Selamat makan! (Itadakimasu).' },

  // 🚅 Transport (30 frasa)
  { category: '🚅 Transport', text: 'Di mana lokasi stasiun kereta atau halte bus terdekat?' },
  { category: '🚅 Transport', text: 'Tolong antar saya ke alamat ini, terima kasih.' },
  { category: '🚅 Transport', text: 'Peron berapa untuk kereta jurusan Shinjuku?' },
  { category: '🚅 Transport', text: 'Berapa harga tiket kereta menuju bandara?' },
  { category: '🚅 Transport', text: 'Apakah kereta ini berhenti di stasiun Tokyo?' },
  { category: '🚅 Transport', text: 'Di mana saya bisa meletakkan koper besar ini?' },
  { category: '🚅 Transport', text: 'Di mana lokasi loker koin (coin locker)?' },
  { category: '🚅 Transport', text: 'Bagaimana cara mengisi ulang kartu Suica / Pasmo?' },
  { category: '🚅 Transport', text: 'Tolong hentikan taksi di depan toko itu.' },
  { category: '🚅 Transport', text: 'Berapa estimasi ongkos taksi sampai ke hotel?' },
  { category: '🚅 Transport', text: 'Apakah bus ini menuju area wisata fushimi inari?' },
  { category: '🚅 Transport', text: 'Kapan jadwal kereta terakhir (Last Train) malam ini?' },
  { category: '🚅 Transport', text: 'Saya salah naik kereta, bagaimana cara kembali?' },
  { category: '🚅 Transport', text: 'Di mana tempat pembelian JR Pass?' },
  { category: '🚅 Transport', text: 'Apakah tempat duduk ini sudah dipesan orang lain?' },
  { category: '🚅 Transport', text: 'Bisakah saya memesan tiket Shinkansen gerbong bebas rokok?' },
  { category: '🚅 Transport', text: 'Di mana pintu keluar barat (West Exit)?' },
  { category: '🚅 Transport', text: 'Bisakah saya membawa sepeda ke dalam kereta?' },
  { category: '🚅 Transport', text: 'Di mana pangkalan taksi terdekat?' },
  { category: '🚅 Transport', text: 'Berapa menit lagi bus berikutnya datang?' },
  { category: '🚅 Transport', text: 'Apakah ada penerbangan tunda / delay?' },
  { category: '🚅 Transport', text: 'Di mana terminal kedatangan internasional?' },
  { category: '🚅 Transport', text: 'Tolong beri tahu kalau sudah sampai di pemberhentian berikutnya.' },
  { category: '🚅 Transport', text: 'Apakah jalan ke stasiun ini naik tangga atau ada lift?' },
  { category: '🚅 Transport', text: 'Di mana fasilitas kursi roda / elevator?' },
  { category: '🚅 Transport', text: 'Apakah jalur kereta ini sedang mengalami gangguan teknis?' },
  { category: '🚅 Transport', text: 'Saya mau refund tiket ini, di mana loketnya?' },
  { category: '🚅 Transport', text: 'Gerbong berapa yang paling dekat dengan tangga transfer?' },
  { category: '🚅 Transport', text: 'Tolong bukakan bagasi mobil taksi.' },
  { category: '🚅 Transport', text: 'Terima kasih pak sopir taksi.' },

  // 🏨 Hotel (30 frasa)
  { category: '🏨 Hotel', text: 'Saya ingin melakukan proses check-in kamar atas nama saya.' },
  { category: '🏨 Hotel', text: 'Boleh saya meminta handuk tambahan dan kunci cadangan?' },
  { category: '🏨 Hotel', text: 'Jam berapa batas waktu check-out?' },
  { category: '🏨 Hotel', text: 'Bisakah saya menitipkan koper di resepsionis sebelum check-in?' },
  { category: '🏨 Hotel', text: 'Apa kata sandi (password) Wi-Fi hotel ini?' },
  { category: '🏨 Hotel', text: 'Apakah sarapan pagi sudah termasuk dalam harga kamar?' },
  { category: '🏨 Hotel', text: 'AC di kamar saya tidak dingin, tolong diperiksa.' },
  { category: '🏨 Hotel', text: 'Air hangat di kamar mandi tidak menyala.' },
  { category: '🏨 Hotel', text: 'Tolong bersihkan kamar saya hari ini.' },
  { category: '🏨 Hotel', text: 'Jangan ganggu kamar saya (Do Not Disturb).' },
  { category: '🏨 Hotel', text: 'Di mana lokasi mesin cuci koin (coin laundry)?' },
  { category: '🏨 Hotel', text: 'Bisakah panggilkan taksi untuk besok pagi jam 7?' },
  { category: '🏨 Hotel', text: 'Di mana ruang sarapan pagi berada?' },
  { category: '🏨 Hotel', text: 'Bisakah saya mendapat kamar di lantai yang lebih tinggi?' },
  { category: '🏨 Hotel', text: 'Apakah ada adaptor colokan listrik yang bisa dipinjam?' },
  { category: '🏨 Hotel', text: 'Tolong berikan pengering rambut (hair dryer) tambahan.' },
  { category: '🏨 Hotel', text: 'Saya ingin melakukan check-out sekarang.' },
  { category: '🏨 Hotel', text: 'Kunci kamar saya tertinggal di dalam.' },
  { category: '🏨 Hotel', text: 'Apakah ada layanan antar jemput ke airport?' },
  { category: '🏨 Hotel', text: 'Di mana letak pembuangan sampah daur ulang?' },
  { category: '🏨 Hotel', text: 'Apakah ada kolam renang atau fasilitas gym?' },
  { category: '🏨 Hotel', text: 'Bisakah saya minta late check-out sampai jam 1 siang?' },
  { category: '🏨 Hotel', text: 'Suara tetangga kamar terlalu bising.' },
  { category: '🏨 Hotel', text: 'Apakah air keran di kamar aman untuk diminum?' },
  { category: '🏨 Hotel', text: 'Tolong kirimkan selimut tambahan ke kamar 302.' },
  { category: '🏨 Hotel', text: 'Di mana minimarket terdekat dari hotel ini?' },
  { category: '🏨 Hotel', text: 'Bisakah memesan makanan room service?' },
  { category: '🏨 Hotel', text: 'Berapa biaya tambahan per malam untuk 1 orang lagi?' },
  { category: '🏨 Hotel', text: 'Tolong simpankan barang berharga ini di deposit box.' },
  { category: '🏨 Hotel', text: 'Terima kasih atas pelayanan hotel yang ramah.' },

  // 🛍️ Belanja (30 frasa)
  { category: '🛍️ Belanja', text: 'Berapa harga barang ini? Apakah bisa diskon bebas pajak (tax-free)?' },
  { category: '🛍️ Belanja', text: 'Apakah toko ini menerima pembayaran kartu kredit atau QRIS?' },
  { category: '🛍️ Belanja', text: 'Bolehkah saya mencoba pakaian ini di kamar ganti (fitting room)?' },
  { category: '🛍️ Belanja', text: 'Apakah ada stok baru untuk warna yang lain?' },
  { category: '🛍️ Belanja', text: 'Tolong bungkus barang ini sebagai hadiah (gift wrap).' },
  { category: '🛍️ Belanja', text: 'Apakah barang ini asli buatan Jepang?' },
  { category: '🛍️ Belanja', text: 'Saya hanya melihat-lihat saja, terima kasih.' },
  { category: '🛍️ Belanja', text: 'Di mana loket khusus pembayaran Tax Free?' },
  { category: '🛍️ Belanja', text: 'Bisakah barang ini ditukar jika ukurannya tidak pas?' },
  { category: '🛍️ Belanja', text: 'Tolong berikan kantong plastik / tas belanja tambahan.' },
  { category: '🛍️ Belanja', text: 'Apakah barang ini ada garansi internasional?' },
  { category: '🛍️ Belanja', text: 'Di mana kasir untuk pembayaran tunai?' },
  { category: '🛍️ Belanja', text: 'Saya mau beli oleh-oleh khas daerah ini.' },
  { category: '🛍️ Belanja', text: 'Apakah snack ini tahan berapa lama masa kadaluarsanya?' },
  { category: '🛍️ Belanja', text: 'Tolong ambilkan barang yang masih baru di dalam kardus.' },
  { category: '🛍️ Belanja', text: 'Apakah promo potongan harga ini masih berlaku?' },
  { category: '🛍️ Belanja', text: 'Di mana toko skincare / kosmetik terbaik di sini?' },
  { category: '🛍️ Belanja', text: 'Di mana bagian toko elektronik dan gadget?' },
  { category: '🛍️ Belanja', text: 'Boleh saya minta struk belanja / receipt-nya?' },
  { category: '🛍️ Belanja', text: 'Toko ini tutup jam berapa malam ini?' },
  { category: '🛍️ Belanja', text: 'Bolehkah saya menawar harga barang ini?' },
  { category: '🛍️ Belanja', text: 'Di mana letak eskalator naik ke lantai 2?' },
  { category: '🛍️ Belanja', text: 'Saya mencari oleh-oleh untuk teman kantor.' },
  { category: '🛍️ Belanja', text: 'Apakah obat ini membutuhkan resep dokter?' },
  { category: '🛍️ Belanja', text: 'Tolong tunjukkan sepatu ukuran 42.' },
  { category: '🛍️ Belanja', text: 'Barang ini cacat / ada noda, bisakah ganti baru?' },
  { category: '🛍️ Belanja', text: 'Apakah barang ini aman dibawa masuk ke dalam kabin pesawat?' },
  { category: '🛍️ Belanja', text: 'Bisakah kirim barang ini langsung ke alamat hotel saya?' },
  { category: '🛍️ Belanja', text: 'Toko ini sangat lengkap dan bagus!' },
  { category: '🛍️ Belanja', text: 'Terima kasih, saya akan beli barang ini.' }
];

export function getLanguageLabel(langCode) {
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === langCode || l.code.split('-')[0] === langCode);
  return found ? `${found.flag} ${found.name}` : langCode;
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

export async function requestMicrophonePermission({ getUserMedia } = {}) {
  const getMedia = getUserMedia || (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices));
  if (!getMedia) {
    return { ok: false, error: 'Fitur mikrofon tidak didukung atau memerlukan koneksi HTTPS.' };
  }
  try {
    const stream = await getMedia({ audio: true });
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((t) => t.stop?.());
    }
    return { ok: true, error: '' };
  } catch (err) {
    const message = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
      ? 'Izin mikrofon ditolak. Izinkan akses mic di address bar browser (klik ikon gembok) lalu coba lagi.'
      : err?.name === 'NotFoundError'
        ? 'Mikrofon tidak ditemukan. Hubungkan perangkat audio / mic lalu coba lagi.'
        : 'Gagal mengakses mikrofon. Pastikan izin mic aktif & tidak dipakai aplikasi lain.';
    return { ok: false, error: message };
  }
}
