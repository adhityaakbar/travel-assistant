'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUpDown, 
  Camera, 
  MessageSquare, 
  MapPin, 
  Volume2, 
  Mic, 
  ExternalLink, 
  Check, 
  Sparkles,
  RefreshCw,
  LogOut,
  User,
  ShieldCheck,
  Lock,
  Upload,
  SwitchCamera,
  Navigation,
  BookmarkPlus,
  Pencil,
  Trash2
} from 'lucide-react';
import { CURRENCIES, convert, formatAmount, formatHistoryPayload, isConversionRateAvailable, parseAmount } from './valas.js';
import { createCameraController } from './scannerCamera.js';
import { SPOT_CATEGORIES, locationErrorMessage, shouldReloadSpots } from './spots.js';
import { applyLatestTranslationState, conversationPayload, getBubbleSide, getLanguageLabel, getRecognitionLanguage, invalidateTranslationRequest, isEmptyInput, isTranslationCurrent, toggleRecognition } from './chat.js';
import axios from 'axios';

export default function App() {
  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => typeof window === 'undefined' ? '' : localStorage.getItem('travel_assistant_token') || '');
  const [loginPasscode, setLoginPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState('valas');
  
  // Valas State
  const [ratesData, setRatesData] = useState({ IDR: 0, ...Object.fromEntries(CURRENCIES.map(currency => [currency, currency === 'JPY' ? 1 : 0])) });
  const [ratesLoading, setRatesLoading] = useState(false);
  const [lastRateUpdate, setLastRateUpdate] = useState('');
  const [sourceAmount, setSourceAmount] = useState(0);
  const [idrAmount, setIdrAmount] = useState(0);
  const [activeChip, setActiveChip] = useState('JPY');
  const [conversionNote, setConversionNote] = useState('');
  const [conversionHistory, setConversionHistory] = useState([]);
  const [conversionError, setConversionError] = useState('');
  const [editingConversion, setEditingConversion] = useState(null);
  const [savingConversion, setSavingConversion] = useState(false);

  const displayedAmount = (value) => formatAmount(value);

  // Scanner & Camera State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraControllerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraTimerRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [capturedImage, setCapturedImage] = useState(null);
  const [scannedResult, setScannedResult] = useState(null);
  const [scanHistoryList, setScanHistoryList] = useState([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  // Ngobrol State
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState('resto');
  const translationRequestIdRef = useRef(0);
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('id');
  const [targetLanguage, setTargetLanguage] = useState('ja');
  const [translationSnapshot, setTranslationSnapshot] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [chatSaving, setChatSaving] = useState(false);

  // Spot Kalcer State
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Tekan GPS Saya untuk mencari spot di sekitar Anda.');
  const [spotFilter, setSpotFilter] = useState('all');
  const [spotsList, setSpotsList] = useState([]);
  const [loadingSpots, setLoadingSpots] = useState(false);

  // 1. Initial Load: Check Auth Token & Initial Data
  useEffect(() => {
    if (token) {
      axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('travel_assistant_token');
          setToken('');
          setUser(null);
        });
    }
    loadLiveRates();
    loadConversionHistory();
    loadScanHistory();
  }, [token]);

  // Handle Login
  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await axios.post('/api/auth/login', {
        secret: loginPasscode
      });

      if (res.data.success) {
        localStorage.setItem('travel_assistant_token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Gagal login. Pastikan passcode benar.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('travel_assistant_token');
    setToken('');
    setUser(null);
    stopCamera();
  };

  // 2. Valas API Integration
  const loadLiveRates = async () => {
    setRatesLoading(true);
    try {
      const res = await axios.get('/api/valas/rates');
      if (res.data && res.data.rates) {
        setRatesData(res.data.rates);
        setLastRateUpdate(new Date(res.data.lastUpdated).toLocaleTimeString('id-ID'));
        recalculate(sourceAmount, activeChip, res.data.rates);
      }
    } catch (err) {
      console.warn('Gagal memuat live rates:', err);
    } finally {
      setRatesLoading(false);
    }
  };

  const loadConversionHistory = async () => {
    try {
      const res = await axios.get('/api/valas/history', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.history) {
        setConversionHistory(res.data.history);
      }
    } catch (err) {
      console.warn('History fetch error:', err);
    }
  };

  const recalculate = (amount, currency = activeChip, rates = ratesData) => {
    const rate = Number(rates[currency]) || 0;
    const idrRate = Number(rates.IDR) || 0;
    setIdrAmount(Math.round(convert(amount, rate ? idrRate / rate : 0)));
  };

  const handleSourceChange = (value) => {
    const num = parseAmount(value);
    setSourceAmount(num);
    recalculate(num);
  };

  const handleIdrChange = (value) => {
    const num = parseAmount(value);
    const rate = Number(ratesData[activeChip]) || 0;
    const idrRate = Number(ratesData.IDR) || 0;
    setIdrAmount(num);
    setSourceAmount(Math.round(convert(num, rate / idrRate)) || 0);
  };

  const saveCurrentConversion = async () => {
    const idrRate = Number(ratesData.IDR);
    const currencyRate = Number(ratesData[activeChip]);
    if (sourceAmount <= 0) return;
    if (!isConversionRateAvailable(idrRate, currencyRate)) {
      setConversionError('Kurs belum tersedia. Muat ulang kurs sebelum menyimpan konversi.');
      return;
    }
    setConversionError('');
    setSavingConversion(true);
    try {
      await axios.post('/api/valas/history', {
        from_currency: activeChip,
        to_currency: 'IDR',
        from_amount: sourceAmount,
        to_amount: idrAmount,
        exchange_rate: Number(ratesData.IDR) / (Number(ratesData[activeChip]) || 1),
        note: conversionNote
      }, { headers: { Authorization: `Bearer ${token}` } });
      loadConversionHistory();
    } catch (err) {
      alert('Gagal menyimpan riwayat: ' + err.message);
    } finally {
      setSavingConversion(false);
    }
  };

  const updateConversion = async (item) => {
    try {
      await axios.patch(`/api/valas/history/${item.id}`, formatHistoryPayload(item), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditingConversion(null);
      await loadConversionHistory();
    } catch (err) {
      alert('Gagal memperbarui riwayat: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteConversion = async (id) => {
    if (!window.confirm('Hapus riwayat konversi ini?')) return;
    try {
      await axios.delete(`/api/valas/history/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadConversionHistory();
    } catch (err) {
      alert('Gagal menghapus riwayat: ' + (err.response?.data?.error || err.message));
    }
  };

  // 3. Camera & Scanner Implementation
  const cameraState = () => ({
    video: videoRef.current,
    setStream: (stream) => {
      cameraStreamRef.current = stream;
      setCameraStream(stream);
    },
    setActive: setIsCameraActive,
  });

  if (!cameraControllerRef.current) cameraControllerRef.current = createCameraController();

  const stopCamera = () => cameraControllerRef.current.stop({ stream: cameraStreamRef.current, ...cameraState() });

  useEffect(() => () => {
    cameraControllerRef.current?.stop({ stream: cameraStreamRef.current, ...cameraState() });
    if (cameraTimerRef.current) clearTimeout(cameraTimerRef.current);
  }, []);

  useEffect(() => {
    if (activeTab === 'scanner') loadScanHistory();
    if (activeTab === 'ngobrol') loadChatHistory();
  }, [activeTab]);

  const startCamera = async () => {
    stopCamera();
    setScanError('');
    try {
      await cameraControllerRef.current.start({
        getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
        video: videoRef.current,
        facingMode,
        ...cameraState(),
      });
      await videoRef.current?.play();
    } catch (err) {
      console.error('Kamera error:', err);
      const message = err?.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Izinkan kamera di pengaturan browser lalu coba lagi.'
        : err?.name === 'NotFoundError'
          ? 'Kamera tidak ditemukan. Hubungkan kamera atau pilih perangkat lain.'
          : 'Kamera gagal dibuka. Periksa izin dan perangkat kamera lalu coba lagi.';
      setScanError(message);
      stopCamera();
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) cameraControllerRef.current.scheduleRestart(startCamera);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      stopCamera();
      processScan(dataUrl);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
        processScan(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processScan = async (imageDataUrl) => {
    setScanLoading(true);
    setScanError('');
    try {
      const res = await axios.post('/api/scanner/analyze', { image_data_url: imageDataUrl }, { headers: { Authorization: `Bearer ${token}` } });
      setScannedResult({ ...res.data.item, image_url: imageDataUrl });
      await loadScanHistory();
    } catch (err) {
      setScanError(err.response?.data?.error || 'Analisis gagal. Coba foto lebih jelas atau unggah gambar lain.');
    } finally {
      setScanLoading(false);
    }
  };

  const loadScanHistory = async () => {
    try {
      const res = await axios.get('/api/scanner/history', { headers: { Authorization: `Bearer ${token}` } });
      if (res.data && res.data.history) {
        setScanHistoryList(res.data.history);
      }
    } catch (err) {
      console.warn('Scan history error:', err);
    }
  };

  const loadChatHistory = async () => {
    setChatHistoryLoading(true);
    try {
      const res = await axios.get('/api/chat/history', { headers: { Authorization: `Bearer ${token}` } });
      setChatHistory(res.data.history || []);
    } catch (err) {
      setChatError(err.response?.data?.error || 'Riwayat percakapan gagal dimuat.');
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const translateMessage = async () => {
    if (isEmptyInput(inputText)) {
      setChatError('Masukkan kalimat untuk diterjemahkan.');
      return;
    }
    setChatLoading(true);
    setChatError('');
    setTranslatedText('');
    setTranslationSnapshot(null);
    const requestId = ++translationRequestIdRef.current;
    const request = { text: inputText.trim(), source_language: sourceLanguage, target_language: targetLanguage };
    try {
      const res = await axios.post('/api/chat/translate', request, { headers: { Authorization: `Bearer ${token}` } });
      if (!applyLatestTranslationState(requestId, translationRequestIdRef.current, () => {
        const translation = res.data.translation || '';
        setTranslatedText(translation);
        setTranslationSnapshot({ sourceText: request.text, sourceLanguage: request.source_language, targetLanguage: request.target_language, translatedText: translation });
      })) return;
    } catch (err) {
      applyLatestTranslationState(requestId, translationRequestIdRef.current, () => {
        setChatError(err.response?.data?.error || 'Terjemahan gagal. Coba lagi.');
      });
    } finally {
      applyLatestTranslationState(requestId, translationRequestIdRef.current, () => setChatLoading(false));
    }
  };

  const updateChatInput = (value) => {
    translationRequestIdRef.current = invalidateTranslationRequest(translationRequestIdRef.current);
    setInputText(value);
    setTranslatedText('');
    setTranslationSnapshot(null);
  };

  const updateChatLanguage = (setter) => (event) => {
    translationRequestIdRef.current = invalidateTranslationRequest(translationRequestIdRef.current);
    setter(event.target.value);
    setTranslatedText('');
    setTranslationSnapshot(null);
  };

  const saveChat = async () => {
    if (!isTranslationCurrent({ sourceText: inputText, sourceLanguage, translatedText, targetLanguage }, translationSnapshot)) return;
    setChatSaving(true);
    try {
      await axios.post('/api/chat/history', conversationPayload({
        sourceText: inputText.trim(), sourceLanguage, translatedText, targetLanguage
      }), { headers: { Authorization: `Bearer ${token}` } });
      await loadChatHistory();
    } catch (err) {
      setChatError(err.response?.data?.error || 'Percakapan gagal disimpan.');
    } finally {
      setChatSaving(false);
    }
  };

  const deleteChat = async (id) => {
    if (!window.confirm('Hapus percakapan ini?')) return;
    try {
      await axios.delete(`/api/chat/history/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      await loadChatHistory();
    } catch (err) {
      setChatError(err.response?.data?.error || 'Percakapan gagal dihapus.');
    }
  };

  // 4. Kalcer Geolocation & Places API Integration
  const requestUserLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation tidak didukung pada browser ini.');
      return;
    }
    setLocatingUser(true);
    setLocationStatus('Mendeteksi koordinat GPS perangkat...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationStatus(`📍 GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLocatingUser(false);
        loadSpots(latitude, longitude, spotFilter);
      },
      (err) => {
        console.warn('GPS Error:', err.message);
        setLocationStatus(locationErrorMessage(err));
        setSpotsList([]);
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const loadSpots = async (lat, lng, cat) => {
    if (!shouldReloadSpots({ lat, lng })) return;
    setSpotsList([]);
    setLoadingSpots(true);
    setLocationStatus('Mencari spot terdekat...');
    try {
      const res = await axios.get(`/api/places/nearby?lat=${lat}&lng=${lng}&category=${cat}`);
      setSpotsList(res.data?.places || []);
      setLocationStatus(res.data?.places?.length ? `📍 GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Tidak ada spot dalam kategori ini. Coba kategori lain.');
    } catch (err) {
      setSpotsList([]);
      setLocationStatus(err.response?.status === 502 ? 'Layanan tempat sedang bermasalah. Coba lagi.' : 'Gagal memuat spot. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoadingSpots(false);
    }
  };

  const handleSpotFilterChange = (cat) => {
    setSpotFilter(cat);
    if (userLocation) loadSpots(userLocation.lat, userLocation.lng, cat);
  };

  // 5. Speech Audio & Speech Recognition
  const playAudio = (text, lang = 'ja-JP') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Browser ini belum mendukung Web Speech Recognition. Silakan ketik langsung!');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.interimResults = false;
      recognition.onresult = (event) => updateChatInput(event.results[0][0].transcript);
      recognitionRef.current = recognition;
    }
    recognitionRef.current.lang = getRecognitionLanguage(sourceLanguage);
    toggleRecognition({ recognition: recognitionRef.current, isListening, setListening: setIsListening });
  };

  const phrases = {
    resto: [
      { idn: "Permisi / Maaf, tolong bantu", romaji: "Sumimasen", kanji: "すみません" },
      { idn: "Berapa total harganya?", romaji: "Kore wa ikura desu ka?", kanji: "これはいくらですか？" },
      { idn: "Tolong air putih satu", romaji: "Omizu o kudasai", kanji: "お水をください" },
      { idn: "Rekomendasi menu apa?", romaji: "Osusume wa nan desu ka?", kanji: "おすすめは何ですか？" }
    ],
    toko: [
      { idn: "Bisa bayar pakai kartu kredit?", romaji: "Kurejitto kaado wa tsukaemasu ka?", kanji: "クレジットカードは使えますか？" },
      { idn: "Bisa dapat diskon bebas pajak (Tax Free)?", romaji: "Menzei dekimasu ka?", kanji: "免税できますか？" },
      { idn: "Ada ukuran yang lebih besar?", romaji: "Motto ookii saizu wa arimasu ka?", kanji: "もっと大きいサイズはありますか？" }
    ],
    kereta: [
      { idn: "Stasiun Shibuya di sebelah mana?", romaji: "Shibuya eki wa doko desu ka?", kanji: "渋谷駅はどこですか？" },
      { idn: "Apakah kereta ini menuju Shinjuku?", romaji: "Kono densha wa Shinjuku ni ikimasu ka?", kanji: "この電車は新宿に行きますか？" },
      { idn: "Di mana beli tiket IC card (Suica/Pasmo)?", romaji: "Suica wa doko de kaemasu ka?", kanji: "Suicaはどこで買えますか？" }
    ]
  };

  // ==========================================
  // RENDER: LOGIN SCREEN (If not authenticated)
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-3xl shadow-xs">
              ✈️
            </div>
            <h1 className="text-2xl font-extrabold font-heading text-slate-900 tracking-tight">Travel Assistant Japan</h1>
            <p className="text-xs text-slate-500 font-medium">Masuk untuk mengakses kurs live, scanner harga AI & spot kalcer</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Secret Aplikasi</label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPasscode}
                  onChange={(e) => setLoginPasscode(e.target.value)}
                  placeholder="Masukkan secret aplikasi"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition"
                  required
                />
                <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-98 transition flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Mulai Perjalanan</span>
                  <span>🚀</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN APPLICATION SHELL
  // ==========================================
  return (
    <div className="min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-slate-100 flex items-center justify-center sm:py-6 sm:px-4">
      <div className="w-full max-w-[430px] min-h-[100dvh] sm:min-h-[860px] sm:max-h-[880px] bg-slate-50 sm:border sm:border-slate-200 sm:rounded-[36px] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Hidden Canvas for Camera Snapshots */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Top Header */}
        <header className="px-5 pt-4 pb-3 bg-white border-b border-slate-200/80 flex items-center justify-between z-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold font-heading text-slate-900 tracking-tight">Travel Assistant</span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full border border-blue-200">JPN</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Halo, <span className="font-bold text-slate-800">Pemilik</span>
            </p>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleLogout}
              title="Keluar / Logout"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 flex items-center justify-center text-slate-600 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 pb-28">
          
          {/* ==================================================== */}
          {/* TAB 1: VALAS & CURRENCY CONVERTER */}
          {/* ==================================================== */}
          {activeTab === 'valas' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-slate-900">Valas & Kurs Live</h1>
                  <p className="text-xs text-slate-500">
                    1 {activeChip} = Rp {formatAmount(ratesData.IDR / (ratesData[activeChip] || 1))} • Update {lastRateUpdate || 'Realtime'}
                  </p>
                </div>
                <button 
                  onClick={loadLiveRates}
                  disabled={ratesLoading}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs hover:bg-emerald-100 transition"
                >
                  <RefreshCw size={12} className={ratesLoading ? "animate-spin text-emerald-600" : "text-emerald-600"} />
                  <span>{ratesLoading ? 'Sync...' : 'LIVE'}</span>
                </button>
              </div>

              {/* Converter Interactive Box */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative space-y-3">
                {/* JPY Input Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-1">
                    <span>KAMU BAYAR ({activeChip})</span>
                    <span className="text-blue-600 font-bold flex items-center gap-1">{activeChip}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 font-heading">{activeChip}</span>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={displayedAmount(sourceAmount)}
                      onChange={(e) => handleSourceChange(e.target.value)}
                      placeholder="0"
                      className="w-full text-right text-2xl font-extrabold text-slate-900 font-heading bg-transparent outline-none pr-1"
                    />
                  </div>
                </div>

              {/* IDR Result Box */}
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-blue-600 mb-1">
                    <span>SETARA RUPIAH (IDR)</span>
                    <span className="text-blue-700 font-bold">🇮🇩 IDR</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-blue-700 font-heading">Rp</span>
                    <input 
                      type="text"
                      inputMode="decimal"
                      value={displayedAmount(idrAmount)}
                      onChange={(e) => handleIdrChange(e.target.value)}
                      placeholder="0"
                      className="w-full text-right text-2xl font-extrabold text-blue-700 font-heading bg-transparent outline-none pr-1"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={conversionNote}
                  onChange={(e) => setConversionNote(e.target.value)}
                  placeholder="Catatan (opsional)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
                {conversionError && <p role="alert" className="text-xs text-red-600">{conversionError}</p>}
                {!isConversionRateAvailable(ratesData.IDR, ratesData[activeChip]) && sourceAmount > 0 && <p role="alert" className="text-xs text-red-600">Kurs belum tersedia. Muat ulang kurs sebelum menyimpan konversi.</p>}
                <button
                  onClick={saveCurrentConversion}
                  disabled={savingConversion || sourceAmount <= 0 || !isConversionRateAvailable(ratesData.IDR, ratesData[activeChip])}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <BookmarkPlus size={14} />
                  <span>{savingConversion ? 'Menyimpan ke Supabase...' : 'Simpan ke Riwayat Konversi'}</span>
                </button>
              </div>

              {/* Preset Currency Chips */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {CURRENCIES.map(curr => (
                  <button 
                    key={curr}
                    onClick={() => { setActiveChip(curr); recalculate(sourceAmount, curr); }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                      activeChip === curr 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {curr} {curr !== 'JPY' ? `(${Number(ratesData[curr] || 0).toFixed(4)})` : ''}
                  </button>
                ))}
              </div>

              {/* Recent Conversions from Supabase */}
              <div>
                <h2 className="text-sm font-bold font-heading text-slate-900 mb-2.5">Riwayat Konversi Terakhir</h2>
                <div className="space-y-2">
                  {conversionHistory.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                      Belum ada konversi tersimpan.
                    </div>
                  ) : (
                    conversionHistory.map((item, idx) => (
                      editingConversion?.id === item.id ? (
                        <div key={item.id || idx} className="bg-white border border-blue-200 rounded-xl p-3 space-y-2">
                          <input aria-label="Catatan konversi" value={editingConversion.note} onChange={(e) => setEditingConversion({ ...editingConversion, note: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs" />
                          <div className="flex gap-2">
                            <button onClick={() => updateConversion(editingConversion)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Simpan</button>
                            <button onClick={() => setEditingConversion(null)} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">Batal</button>
                          </div>
                        </div>
                      ) : (
                        <div key={item.id || idx} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base shrink-0">¥</div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">{item.from_currency} {formatAmount(item.from_amount)}</div>
                              <div className="text-xs text-slate-400 truncate">{item.note ? `${item.note} • ` : ''}{new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-emerald-600">Rp {formatAmount(item.to_amount)}</div>
                            <div className="text-[10px] text-slate-400">Kurs {Number(item.exchange_rate).toFixed(1)}</div>
                            <div className="flex justify-end gap-1 mt-1">
                              <button aria-label="Edit konversi" onClick={() => setEditingConversion({ ...item })} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                              <button aria-label="Hapus konversi" onClick={() => deleteConversion(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      )
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: SCANNER & LIVE CAMERA */}
          {/* ==================================================== */}
          {activeTab === 'scanner' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-slate-900">Cek Harga AI</h1>
                  <p className="text-xs text-slate-500">Scan label harga fisik & komparasi Tokopedia</p>
                </div>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-200">SCAN</span>
              </div>

              {/* Real Camera Viewfinder / Capture Box */}
              <div className="bg-white border-2 border-dashed border-blue-400 rounded-2xl p-4 text-center shadow-xs overflow-hidden relative">
                {isCameraActive ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-56 mx-auto">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover"
                      />
                      <button 
                        onClick={toggleCameraFacing}
                        className="absolute right-2 top-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80"
                        title="Ganti Kamera Depan/Belakang"
                      >
                        <SwitchCamera size={16} />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={capturePhoto}
                        className="flex-1 py-3 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 hover:bg-blue-700"
                      >
                        <Camera size={16} />
                        <span>Ambil Foto Tag Harga</span>
                      </button>
                      <button 
                        onClick={stopCamera}
                        className="px-4 py-3 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
                      >
                        Tutup
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-2xs">
                      📸
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Kamera Siap Digunakan</div>
                      <div className="text-xs text-slate-500 mt-0.5">Buka kamera langsung atau unggah foto tag harga</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                      <button 
                        onClick={startCamera}
                        className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition"
                      >
                        <Camera size={16} />
                        <span>Buka Kamera Live</span>
                      </button>

                      <label className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 cursor-pointer transition">
                        <Upload size={14} />
                        <span>Upload Foto</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {scanLoading && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Menganalisis gambar dengan AI...
                </div>
              )}
              {scanError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{scanError}</div>
              )}

              {/* Scanned Result Card */}
              {scannedResult && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in">
                  {scannedResult.image_url && (
                    <div className="w-full h-36 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
                      <img src={scannedResult.image_url} alt="Scanned" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-200 flex items-center gap-1">
                      <Check size={12} />
                      AI Terverifikasi
                    </span>
                    {scannedResult.confidence != null && <span className="text-xs text-slate-400">Confidence {scannedResult.confidence}</span>}
                  </div>

                  <h2 className="text-base font-bold font-heading text-slate-900">{scannedResult.product_name}</h2>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500">HARGA JEPANG · ESTIMASI AI</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {scannedResult.price_jpy != null ? `¥ ${Number(scannedResult.price_jpy).toLocaleString('id-ID')}` : 'Tidak terdeteksi'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500">TERENDAH INDONESIA · ESTIMASI AI</div>
                      <div className="text-sm font-extrabold text-emerald-600 mt-0.5">
                        {scannedResult.lowest_price_idr != null ? `Rp ${Number(scannedResult.lowest_price_idr).toLocaleString('id-ID')}` : 'Tidak tersedia'}
                      </div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200">
                      <div className="text-[11px] font-semibold text-slate-500">RATA-RATA INDONESIA · ESTIMASI AI</div>
                      <div className="text-sm font-bold text-slate-800">
                        {scannedResult.average_price_idr != null ? `Rp ${Number(scannedResult.average_price_idr).toLocaleString('id-ID')}` : 'Tidak tersedia'}
                      </div>
                    </div>
                  </div>

                  {scannedResult.estimate_note && <p className="text-xs text-slate-500">{scannedResult.estimate_note}</p>}

                  {(scannedResult.tokopedia_url || scannedResult.shopee_url) && (
                    <div className="grid grid-cols-2 gap-2">
                      {scannedResult.tokopedia_url && (
                        <a href={scannedResult.tokopedia_url} target="_blank" rel="noopener noreferrer" className="py-3 bg-green-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                          Tokopedia <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      )}
                      {scannedResult.shopee_url && (
                        <a href={scannedResult.shopee_url} target="_blank" rel="noopener noreferrer" className="py-3 bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                          Shopee <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Scan History from Supabase */}
              <div>
                <h2 className="text-sm font-bold font-heading text-slate-900 mb-2.5">Riwayat Scan Tersimpan</h2>
                <div className="space-y-2">
                  {scanHistoryList.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                      Belum ada riwayat scan.
                    </div>
                  ) : (
                    scanHistoryList.map((item, idx) => (
                      <div key={item.id || idx} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{item.product_name}</div>
                          <div className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString('id-ID')} • ¥{Number(item.price_jpy).toLocaleString('id-ID')}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-emerald-600">
                            {item.lowest_price_idr != null ? `Rp ${Number(item.lowest_price_idr).toLocaleString('id-ID')}` : 'Harga tidak tersedia'}
                          </div>
                          <div className="text-[10px] text-slate-400">Indo Price</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                  <select aria-label="Bahasa sumber" value={sourceLanguage} onChange={updateChatLanguage(setSourceLanguage)} className="bg-transparent outline-none">
                    <option value="id">🇮🇩 Indonesia</option>
                    <option value="ja">🇯🇵 Japanese</option>
                  </select>
                  <ArrowUpDown size={14} className="text-slate-400 rotate-90" />
                  <select aria-label="Bahasa target" value={targetLanguage} onChange={updateChatLanguage(setTargetLanguage)} className="bg-transparent outline-none">
                    <option value="ja">🇯🇵 Japanese</option>
                    <option value="id">🇮🇩 Indonesia</option>
                  </select>
                </div>

                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => updateChatInput(e.target.value)}
                  placeholder="Ketik kalimat atau tekan mic untuk bicara..."
                  className="w-full text-center text-sm p-2 outline-none text-slate-800 placeholder-slate-400"
                />

                <button onClick={translateMessage} disabled={chatLoading} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-60">
                  {chatLoading ? 'Menerjemahkan...' : `Terjemahkan ke ${getLanguageLabel(targetLanguage)}`}
                </button>
                {chatError && <p role="alert" className="text-xs text-red-600">{chatError}</p>}
                {translatedText && (
                  <div className="space-y-2 text-left">
                    <div className={`flex ${getBubbleSide(sourceLanguage) === 'right' ? 'justify-end' : 'justify-start'}`}><div className="max-w-[85%] bg-slate-100 rounded-xl px-3 py-2 text-sm text-slate-800">{inputText}</div></div>
                    <div className={`flex ${getBubbleSide(targetLanguage) === 'right' ? 'justify-end' : 'justify-start'}`}><div className="max-w-[85%] bg-blue-600 rounded-xl px-3 py-2 text-sm text-white">{translatedText}</div></div>
                    <button onClick={saveChat} disabled={chatSaving || !isTranslationCurrent({ sourceText: inputText, sourceLanguage, translatedText, targetLanguage }, translationSnapshot)} className="w-full py-2 border border-slate-300 rounded-xl text-xs font-bold disabled:opacity-60">{chatSaving ? 'Menyimpan...' : 'Simpan percakapan'}</button>
                  </div>
                )}

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
                  {isListening ? 'Mendengarkan suara...' : 'Tekan tombol mic untuk mulai rekam'}
                </p>
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-bold font-heading text-slate-900">Percakapan tersimpan</h2>
                {chatHistoryLoading ? <p className="text-xs text-slate-500">Memuat riwayat percakapan...</p> : chatHistory.length === 0 ? <p className="bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">Belum ada percakapan tersimpan.</p> : chatHistory.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className={`flex ${getBubbleSide(item.source_language) === 'right' ? 'justify-end' : 'justify-start'}`}><p className="max-w-[85%] bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs">{item.source_text}</p></div>
                    <div className={`flex ${getBubbleSide(item.target_language) === 'right' ? 'justify-end' : 'justify-start'}`}><p className="max-w-[85%] bg-blue-600 text-white rounded-lg px-2.5 py-1.5 text-xs">{item.translated_text}</p></div>
                    <button onClick={() => deleteChat(item.id)} className="text-xs text-red-600 font-semibold">Hapus</button>
                  </div>
                ))}
              </div>
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
          {/* TAB 4: KALCER (CURATED LOCAL SPOTS & GEOLOCATION) */}
          {/* ==================================================== */}
          {activeTab === 'kalcer' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-slate-900">Spot Kalcer 📍</h1>
                  <p className="text-xs text-slate-500">{locationStatus}</p>
                </div>
                <button
                  onClick={requestUserLocation}
                  disabled={locatingUser}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200 flex items-center gap-1.5 shadow-2xs hover:bg-blue-100 transition"
                >
                  <Navigation size={12} className={locatingUser ? "animate-spin" : ""} />
                  <span>{locatingUser ? 'Mencari...' : 'GPS Saya'}</span>
                </button>
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {SPOT_CATEGORIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSpotFilterChange(c.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                      spotFilter === c.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Spot Cards */}
              <div className="space-y-3">
                {loadingSpots ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Mencari spot terdekat via Google Places API...</span>
                  </div>
                ) : spotsList.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                    {userLocation ? 'Tidak ada spot ditemukan. Coba kategori lain.' : 'Tekan GPS Saya untuk mencari spot di sekitar Anda.'}
                  </div>
                ) : (
                  spotsList.map(s => (
                    <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-2xl shrink-0">
                          {s.icon || '📍'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">{s.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{s.desc}</div>
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
                  ))
                )}
              </div>
            </div>
          )}

        </main>

        {/* Bottom Navigation */}
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
