import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  Camera, 
  MessageSquare, 
  MapPin, 
  Volume2, 
  Mic, 
  ExternalLink, 
  Check, 
  TrendingUp, 
  Plane, 
  Clock, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('valas');
  
  // Valas State
  const [jpyAmount, setJpyAmount] = useState(10000);
  const rate = 105.2; // 1 JPY = Rp 105.2
  const idrAmount = Math.round(jpyAmount * rate);

  const [activeChip, setActiveChip] = useState('JPY');

  // Ngobrol State
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState('resto');
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  // Spot Kalcer State
  const [spotFilter, setSpotFilter] = useState('all');

  // Text to Speech
  const playAudio = (text, lang = 'ja-JP') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle Voice Recognition
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Fitur Speech Recognition tidak didukung di browser ini. Silakan ketik langsung!');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.interimResults = false;

    if (!isListening) {
      setIsListening(true);
      recognition.start();
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        // Mock translate
        setTranslatedText(`(Jepang) ${transcript}`);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setIsListening(false);
      recognition.stop();
    }
  };

  const spots = [
    { id: 1, name: "Fuglen Tokyo", desc: "Nordic Coffee, Vintage Furniture & Cocktails", dist: "800 m", rating: "4.8★", cat: "kopi", icon: "☕", mapsUrl: "https://maps.google.com/?q=Fuglen+Tokyo" },
    { id: 2, name: "Ragtag Harajuku", desc: "Curated Designer Pre-loved & Thrift Store", dist: "1.4 km", rating: "4.7★", cat: "thrift", icon: "🛍️", mapsUrl: "https://maps.google.com/?q=Ragtag+Harajuku" },
    { id: 3, name: "Ichiran Shibuya", desc: "Famous Tonkotsu Ramen with Private Booths", dist: "350 m", rating: "4.9★", cat: "eat", icon: "🍜", mapsUrl: "https://maps.google.com/?q=Ichiran+Shibuya" }
  ];

  const phrases = {
    resto: [
      { idn: "Permisi / Maaf, tolong bantu", romaji: "Sumimasen", kanji: "すみません" },
      { idn: "Berapa total harganya?", romaji: "Kore wa ikura desu ka?", kanji: "これはいくらですか？" },
      { idn: "Tolong air putih satu", romaji: "Omizu o kudasai", kanji: "お水をください" }
    ],
    toko: [
      { idn: "Bisa bayar pakai kartu kredit?", romaji: "Kurejitto kaado wa tsukaemasu ka?", kanji: "クレジットカードは使えますか？" },
      { idn: "Bisa dapat diskon bebas pajak (Tax Free)?", romaji: "Menzei dekimasu ka?", kanji: "免税できますか？" },
      { idn: "Ada ukuran yang lebih besar?", romaji: "Motto ookii saizu wa arimasu ka?", kanji: "もっと大きいサイズはありますか？" }
    ],
    kereta: [
      { idn: "Stasiun Shibuya di sebelah mana?", romaji: "Shibuya eki wa doko desu ka?", kanji: "渋谷駅はどこですか？" },
      { idn: "Apakah kereta ini menuju Shinjuku?", romaji: "Kono densha wa Shinjuku ni ikimasu ka?", kanji: "この電車は新宿に行きますか？" }
    ]
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center sm:py-6 sm:px-4">
      {/* Mobile Shell Device Frame */}
      <div className="w-full max-w-[420px] min-h-screen sm:min-h-[860px] sm:max-h-[880px] bg-slate-50 sm:border sm:border-slate-200 sm:rounded-[36px] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Top Header / App Brand */}
        <header className="px-5 pt-4 pb-3 bg-white border-b border-slate-200/80 flex items-center justify-between z-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold font-heading text-slate-900 tracking-tight">Travel Assistant</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full border border-blue-200">JPN</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Pendamping belanja & trip cerdas</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-base shadow-2xs">
            ✈️
          </div>
        </header>

        {/* Scrollable Content Viewport */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 pb-28">
          
          {/* ==================================================== */}
          {/* TAB 1: VALAS & CURRENCY CONVERTER */}
          {/* ==================================================== */}
          {activeTab === 'valas' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-slate-900">Valas & Kurs</h1>
                  <p className="text-xs text-slate-500">Realtime JPY/IDR • 1 JPY = Rp {rate.toFixed(1)}</p>
                </div>
                <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  LIVE
                </div>
              </div>

              {/* Converter Interactive Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative space-y-3">
                {/* JPY Input Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1">
                    <span>KAMU BAYAR (JPY)</span>
                    <span className="text-blue-600 font-bold flex items-center gap-1">🇯🇵 JPY</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 font-heading">¥</span>
                    <input 
                      type="number" 
                      value={jpyAmount} 
                      onChange={(e) => setJpyAmount(Number(e.target.value))}
                      className="w-full text-right text-2xl font-extrabold text-slate-900 font-heading bg-transparent outline-none pr-1"
                    />
                  </div>
                </div>

                {/* Swap Indicator */}
                <div className="flex justify-center -my-1">
                  <button className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-blue-600 hover:bg-blue-50 transition active:scale-95">
                    <ArrowUpDown size={18} />
                  </button>
                </div>

                {/* IDR Result Box */}
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-blue-600 mb-1">
                    <span>SETARA RUPIAH (IDR)</span>
                    <span className="text-blue-700 font-bold">🇮🇩 IDR</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-blue-700 font-heading">Rp</span>
                    <span className="text-2xl font-extrabold text-blue-700 font-heading">
                      {idrAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preset Currency Chips */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {['JPY', 'USD', 'SGD', 'KRW'].map(curr => (
                  <button 
                    key={curr}
                    onClick={() => setActiveChip(curr)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                      activeChip === curr 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>

              {/* Recent Conversions */}
              <div>
                <h2 className="text-sm font-bold font-heading text-slate-900 mb-2.5">Riwayat Konversi Terakhir</h2>
                <div className="space-y-2">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">¥</div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">¥ 18.000</div>
                        <div className="text-xs text-slate-400">Sepatu Onitsuka • 14:30</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">Rp 1.893.600</div>
                      <div className="text-[10px] text-slate-400">Kurs 105.2</div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">¥</div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">¥ 2.500</div>
                        <div className="text-xs text-slate-400">Coffee Fuglen • Kemarin</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600">Rp 263.000</div>
                      <div className="text-[10px] text-slate-400">Kurs 105.2</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: SCANNER & AI PRICE COMPARISON */}
          {/* ==================================================== */}
          {activeTab === 'scanner' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-slate-900">Cek Harga AI</h1>
                  <p className="text-xs text-slate-500">Arahkan kamera ke label harga fisik</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-200">SCAN</span>
              </div>

              {/* Viewfinder simulation */}
              <div className="bg-white border-2 border-dashed border-blue-400 rounded-2xl p-6 text-center shadow-xs">
                <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-2">📸</div>
                <div className="text-sm font-bold text-slate-900">Kamera Siap Mendeteksi</div>
                <div className="text-xs text-slate-500 mt-0.5">Sistem AI akan otomatis membaca angka Yen pada tag fisik</div>
              </div>

              {/* Scanned Result Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="w-full h-32 bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 border border-slate-200">
                  <span className="text-3xl mb-1">👟</span>
                  <span className="text-xs font-medium text-slate-500">Thumbnail: Tag Onitsuka Tiger</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200">✓ AI Terverifikasi</span>
                  <span className="text-xs text-slate-400">Akurasi 99%</span>
                </div>

                <h2 className="text-base font-bold font-heading text-slate-900">Onitsuka Mexico 66 White/Blue</h2>

                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">HARGA TOKO JEPANG</div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">¥ 18.000</div>
                    <div className="text-xs text-slate-500 font-medium">≈ Rp 1.890.000</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500">TERMURAH DI INDO</div>
                    <div className="text-sm font-extrabold text-emerald-600 mt-0.5">Rp 1.650.000</div>
                    <div className="text-xs text-emerald-600 font-medium">Tokopedia Official</div>
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-700 text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles size={16} />
                  <span>Beli di Indo lebih hemat Rp 240.000!</span>
                </div>

                <a 
                  href="https://www.tokopedia.com/search?q=onitsuka%20mexico%2066" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition active:scale-98"
                >
                  <span>Cek di Tokopedia Official</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: NGOBROL (LIVE SPEECH & PHRASEBOOK) */}
          {/* ==================================================== */}
          {activeTab === 'ngobrol' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-slate-900">Ngobrol 💬</h1>
                  <p className="text-xs text-slate-500">Terjemahan Suara & Frasa Instan</p>
                </div>
                <span className="px-2.5 py-1 bg-purple-50 text-purple-600 text-xs font-bold rounded-full border border-purple-200">VOICE</span>
              </div>

              {/* Voice Card Input */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center relative space-y-3">
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-600">
                  <span>🇮🇩 Indonesia</span>
                  <ArrowUpDown size={14} className="text-slate-400 rotate-90" />
                  <span>🇯🇵 Japanese</span>
                </div>

                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik kalimat atau tekan mic untuk bicara..."
                  className="w-full text-center text-sm p-2 outline-none text-slate-800 placeholder-slate-400"
                />

                <div className="flex justify-center pt-1">
                  <button 
                    onClick={toggleListening}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl text-white shadow-lg transition active:scale-95 ${
                      isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Mic size={24} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isListening ? 'Mendengarkan suara...' : 'Tekan mic untuk mulai rekam suara'}
                </p>
              </div>

              {/* Quick Phrases */}
              <div>
                <h2 className="text-sm font-bold font-heading text-slate-900 mb-2">Frasa Cepat Praktis</h2>
                <div className="flex gap-1.5 mb-3">
                  {['resto', 'toko', 'kereta'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedPhraseCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition ${
                        selectedPhraseCategory === cat 
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {cat === 'resto' ? '🍔 Resto' : cat === 'toko' ? '🛍️ Belanja' : '🚆 Kereta'}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {phrases[selectedPhraseCategory].map((p, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-2xs">
                      <div>
                        <div className="text-xs text-slate-400 font-medium">{p.idn}</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{p.romaji}</div>
                        <div className="text-xs font-medium text-blue-600">{p.kanji}</div>
                      </div>
                      <button 
                        onClick={() => playAudio(p.kanji)}
                        className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-base hover:bg-blue-100 transition active:scale-95"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: KALCER (CURATED LOCAL SPOTS) */}
          {/* ==================================================== */}
          {activeTab === 'kalcer' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-slate-900">Spot Kalcer 📍</h1>
                  <p className="text-xs text-slate-500">Kurasi area Shibuya & Harajuku</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">NEARBY</span>
              </div>

              {/* Spot Cards */}
              <div className="space-y-3">
                {spots.map(s => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-3">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-2xl shrink-0">
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.desc}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded border border-blue-100">{s.rating}</span>
                          <span className="text-xs font-medium text-slate-400">📍 {s.dist}</span>
                        </div>
                      </div>
                    </div>
                    <a 
                      href={s.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-100 transition"
                    >
                      <span>Buka Rute Google Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

        {/* Fixed Modern TabBar Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around px-2 z-30">
          <button 
            onClick={() => setActiveTab('valas')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              activeTab === 'valas' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <span className="text-lg">💱</span>
            <span className="text-[11px]">Valas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              activeTab === 'scanner' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <Camera size={20} />
            <span className="text-[11px]">Scanner</span>
          </button>

          <button 
            onClick={() => setActiveTab('ngobrol')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              activeTab === 'ngobrol' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <MessageSquare size={20} />
            <span className="text-[11px]">Ngobrol</span>
          </button>

          <button 
            onClick={() => setActiveTab('kalcer')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
              activeTab === 'kalcer' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
            }`}
          >
            <MapPin size={20} />
            <span className="text-[11px]">Kalcer</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
