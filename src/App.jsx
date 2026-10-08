'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowUpDown, 
  ArrowRightLeft,
  Coins,
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
  Compass,
  Upload,
  SwitchCamera,
  Navigation,
  BookmarkPlus,
  Pencil,
  Trash2
} from 'lucide-react';
import { CURRENCIES, CURRENCY_FLAGS, convert, formatAmount, formatChipRate, formatHistoryPayload, isConversionRateAvailable, parseAmount } from './valas.js';
import { createCameraController } from './scannerCamera.js';
import { SPOT_CATEGORIES, locationErrorMessage, shouldReloadSpots } from './spots.js';
import { applyLatestTranslationState, conversationPayload, getBubbleSide, getLanguageLabel, getRecognitionLanguage, invalidateTranslationRequest, isEmptyInput, isTranslationCurrent, toggleRecognition, SUPPORTED_LANGUAGES, QUICK_PHRASES } from './chat.js';
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
  const [rateSource, setRateSource] = useState('bca');
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
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState('Semua');
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

  const DEFAULT_TOKYO_LOCATION = { lat: 35.6595, lng: 139.7004 }; // Shibuya Scramble, Tokyo

  // Spot Kalcer State
  const [userLocation, setUserLocation] = useState(DEFAULT_TOKYO_LOCATION);
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationStatus, setLocationStatus] = useState('📍 Spot Tokyo (Rekomendasi)');
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
        setRateSource(res.data.source || 'bca');
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
    if (activeTab === 'ngobrol') {
      loadChatHistory();
      // Default Ngobrol: Bahasa Indonesia -> Bahasa Jepang
      setSourceLanguage('id');
      setTargetLanguage('ja');
    }
    if (activeTab === 'kalcer') {
      const targetLoc = userLocation || DEFAULT_TOKYO_LOCATION;
      loadSpots(targetLoc.lat, targetLoc.lng, spotFilter);
    }
  }, [activeTab]);

  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setScanError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } }
      });
      cameraStreamRef.current = stream;
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Kamera error:', err);
      // Fallback ke kamera depan jika kamera belakang ideal gagal
      if (mode === 'environment') {
        setFacingMode('user');
        return startCamera('user');
      }
      const message = err?.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Izinkan akses kamera di browser (klik icon gembok di address bar) lalu coba lagi.'
        : err?.name === 'NotFoundError'
          ? 'Kamera tidak ditemukan. Hubungkan webcam atau perangkat kamera.'
          : 'Kamera gagal dibuka. Pastikan izin kamera aktif & tidak dipakai aplikasi lain.';
      setScanError(message);
      stopCamera();
    }
  };

  const requestAllPermissions = async () => {
    let statusText = [];

    // 1. Location
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationError(null);
        },
        (err) => {
          setLocationError('Izin lokasi ditolak/tidak aktif di browser.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // 2. Camera
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
        camStream.getTracks().forEach(t => t.stop());
      }
    } catch {
      setScanError('Izin kamera ditolak di browser.');
    }

    // 3. Microphone
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream.getTracks().forEach(t => t.stop());
      }
    } catch {
      // mic permission denied silently or prompt
    }
  };

  const toggleCameraFacing = () => {
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

    // Fetch GPS location at scan/upload time if available
    let photoLat = userLocation?.lat || null;
    let photoLng = userLocation?.lng || null;
    let photoLocName = null;

    if (!photoLat && typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, maximumAge: 60000 });
        });
        photoLat = pos.coords.latitude;
        photoLng = pos.coords.longitude;
        setUserLocation({ lat: photoLat, lng: photoLng });
      } catch {
        // Continue scan without location if denied/timeout
      }
    }

    if (photoLat && photoLng) {
      photoLocName = `GPS (${photoLat.toFixed(4)}, ${photoLng.toFixed(4)})`;
    }

    try {
      const res = await axios.post('/api/scanner/analyze', { 
        image_data_url: imageDataUrl,
        latitude: photoLat,
        longitude: photoLng,
        location_name: photoLocName
      }, { headers: { Authorization: `Bearer ${token}` } });
      const item = res.data.item;
      setScannedResult({ ...item, image_url: imageDataUrl, latitude: photoLat, longitude: photoLng, location_name: photoLocName });

      // Auto save scan result to history if token is present
      if (token && item && item.product_name) {
        try {
          await axios.post('/api/scanner/history', {
            product_name: item.product_name,
            price_jpy: item.price_jpy || 0,
            lowest_price_idr: item.lowest_price_idr || 0,
            average_price_idr: item.average_price_idr || 0,
            tokopedia_url: item.tokopedia_url || null,
            shopee_url: item.shopee_url || null,
            image_url: imageDataUrl,
            latitude: photoLat,
            longitude: photoLng,
            location_name: photoLocName
          }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (saveErr) {
          console.warn('Auto save scan history warning:', saveErr);
        }
      }

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

  const translateMessage = async (overrideText = null) => {
    const textToTranslate = overrideText !== null ? overrideText : inputText;
    if (isEmptyInput(textToTranslate)) {
      setChatError('Masukkan kalimat untuk diterjemahkan.');
      return;
    }
    setChatLoading(true);
    setChatError('');
    setTranslatedText('');
    setTranslationSnapshot(null);

    // Default target ke Bahasa Jepang jika target saat ini sama dengan source
    let currentTarget = targetLanguage;
    if (sourceLanguage === currentTarget) {
      currentTarget = sourceLanguage === 'id' ? 'ja' : 'id';
      setTargetLanguage(currentTarget);
    }

    const requestId = ++translationRequestIdRef.current;
    const request = { text: textToTranslate.trim(), source_language: sourceLanguage, target_language: currentTarget };
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
        // Fallback retry dengan enableHighAccuracy: false jika high accuracy timeout/gagal
        if (err?.code === 3 || err?.code === 2) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setUserLocation({ lat: latitude, lng: longitude });
              setLocationStatus(`📍 GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
              setLocatingUser(false);
              loadSpots(latitude, longitude, spotFilter);
            },
            (retryErr) => {
              setLocationStatus(locationErrorMessage(retryErr));
              setSpotsList([]);
              setLocatingUser(false);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
          );
          return;
        }
        setLocationStatus(locationErrorMessage(err));
        setSpotsList([]);
        setLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
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

  const [playingAudioId, setPlayingAudioId] = useState(null);

  // 5. Speech Audio (ElevenLabs + SpeechSynthesis Fallback) & Speech Recognition
  const playAudio = async (text, lang = 'ja-JP', id = null) => {
    if (!text) return;
    if (id) setPlayingAudioId(id);
    try {
      const res = await axios.post('/api/chat/tts', { text, language: lang }, { responseType: 'blob' });
      if (res.status === 200 && res.data && res.data.type?.includes('audio')) {
        const audioUrl = URL.createObjectURL(res.data);
        const audio = new Audio(audioUrl);
        audio.onended = () => setPlayingAudioId(null);
        audio.onerror = () => fallbackWebSpeech(text, lang);
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('ElevenLabs TTS fallback to SpeechSynthesis:', err);
    }
    fallbackWebSpeech(text, lang);
  };

  const fallbackWebSpeech = (text, lang) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/\*\*/g, '').replace(/\(.*?\)/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayingAudioId(null);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SpeechRecognition) {
      alert('💡 Browser ini (Safari/iOS) belum mendukung API Web Speech Recognition secara langsung.\n\nTips: Anda dapat menggunakan tombol Dikte (ikon Mic 🎤 pada keyboard perangkat) saat mengetik!');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = getRecognitionLanguage(sourceLanguage);

      recognition.onstart = () => {
        setIsListening(true);
        setChatError('');
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) updateChatInput(transcript);
        setIsListening(false);
      };
      recognition.onerror = (event) => {
        console.warn('Speech Recognition error event:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setChatError('Izin mikrofon ditolak. Izinkan akses mic di address bar browser lalu coba lagi.');
        } else if (event.error === 'no-speech') {
          setChatError('Tidak ada suara terdeteksi. Silakan coba bicara lagi.');
        } else if (event.error !== 'aborted') {
          setChatError(`Audio error (${event.error}). Coba lagi.`);
        }
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech Recognition Exception:', err);
      setIsListening(false);
      setChatError('Gagal memulai perekaman suara. Periksa mikrofon browser.');
    }
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
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Compass size={32} />
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
                    onClick={requestAllPermissions}
                    title="Minta Izin Akses Perangkat (Kamera, Mic, Lokasi)"
                    className="px-2.5 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 text-xs font-bold transition"
                  >
                    <span>🔑 Permission</span>
                  </button>
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
                    1 {activeChip} = {formatChipRate(ratesData, activeChip)} • {rateSource === 'bca' ? 'BCA e-Rate' : 'Live Rate'}
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
                {/* Valas Input Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-center justify-between gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xl leading-none">{CURRENCY_FLAGS[activeChip] || '🏳️'}</span>
                    <span className="text-lg font-bold text-slate-800 font-heading">{activeChip}</span>
                  </div>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={displayedAmount(sourceAmount)}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    placeholder="0"
                    className="w-full text-right text-2xl font-extrabold text-slate-900 font-heading bg-transparent outline-none"
                  />
                </div>

                {/* IDR Result Box */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xl leading-none">🇮🇩</span>
                    <span className="text-lg font-bold text-blue-900 font-heading">IDR</span>
                  </div>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={displayedAmount(idrAmount)}
                    onChange={(e) => handleIdrChange(e.target.value)}
                    placeholder="0"
                    className="w-full text-right text-2xl font-extrabold text-blue-900 font-heading bg-transparent outline-none"
                  />
                </div>

                <input
                  type="text"
                  value={conversionNote}
                  onChange={(e) => setConversionNote(e.target.value)}
                  placeholder="Catatan (opsional)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base sm:text-xs"
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

              {/* Preset Currency Chips (Horizontal Swipe - Perfectly Aligned) */}
              <div className="py-1">
                <div className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory py-1 px-0 no-scrollbar">
                  {CURRENCIES.map(curr => {
                    const rateText = formatChipRate(ratesData, curr);
                    return (
                      <button 
                        key={curr}
                        onClick={() => { setActiveChip(curr); recalculate(sourceAmount, curr); }}
                        className={`min-w-[105px] shrink-0 snap-start p-2.5 text-left rounded-xl transition border flex flex-col justify-between min-h-[54px] ${
                          activeChip === curr 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-extrabold flex items-center justify-between w-full">
                          <span>{curr}</span>
                          <span className="text-sm leading-none">{CURRENCY_FLAGS[curr] || '🏳️'}</span>
                        </span>
                        <span className={`text-[11px] font-semibold tracking-tight ${activeChip === curr ? 'text-blue-100' : 'text-slate-500'}`}>
                          {rateText || '...'}
                        </span>
                      </button>
                    );
                  })}
                </div>
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
                          <input aria-label="Catatan konversi" value={editingConversion.note} onChange={(e) => setEditingConversion({ ...editingConversion, note: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-base sm:text-xs" />
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
                      <div className="text-[11px] font-semibold text-slate-500">TERENDAH INDONESIA · ESTIMASI AI</div>
                      <div className="text-sm font-extrabold text-emerald-600 mt-0.5">
                        {scannedResult.lowest_price_idr != null ? `Rp ${Number(scannedResult.lowest_price_idr).toLocaleString('id-ID')}` : 'Tidak tersedia'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500">HARGA JEPANG · ESTIMASI AI</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {scannedResult.price_jpy != null ? `¥ ${Number(scannedResult.price_jpy).toLocaleString('id-ID')}` : 'Tidak terdeteksi'}
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
                        <div className="min-w-0 pr-2">
                          <div className="text-sm font-bold text-slate-900 truncate">{item.product_name}</div>
                          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span>{new Date(item.created_at).toLocaleDateString('id-ID')}</span>
                            <span>•</span>
                            <span>¥{Number(item.price_jpy).toLocaleString('id-ID')}</span>
                            {item.latitude != null && item.longitude != null && (
                              <a
                                href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-1.5 py-0.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-semibold text-[10px] flex items-center gap-0.5 transition"
                                title="Buka Lokasi Scan di Google Maps"
                              >
                                📍 Google Maps
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
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
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-600 gap-2">
                  <select 
                    aria-label="Bahasa sumber" 
                    value={sourceLanguage} 
                    onChange={updateChatLanguage(setSourceLanguage)} 
                    className="bg-transparent outline-none flex-1 truncate text-xs font-semibold"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={`src-${lang.code}`} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  
                  <button 
                    onClick={() => {
                      const temp = sourceLanguage;
                      setSourceLanguage(targetLanguage);
                      setTargetLanguage(temp);
                    }}
                    className="p-1 hover:bg-slate-200 rounded-md transition text-slate-500"
                    title="Tukar Bahasa"
                  >
                    <ArrowRightLeft size={14} />
                  </button>

                  <select 
                    aria-label="Bahasa target" 
                    value={targetLanguage} 
                    onChange={updateChatLanguage(setTargetLanguage)} 
                    className="bg-transparent outline-none flex-1 truncate text-xs font-semibold"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={`tgt-${lang.code}`} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => updateChatInput(e.target.value)}
                  placeholder="Ketik kalimat atau tekan mic untuk bicara..."
                  className="w-full text-center text-base sm:text-sm p-2 outline-none text-slate-800 placeholder-slate-400 border-b border-slate-100"
                />

                <button onClick={translateMessage} disabled={chatLoading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-60">
                  {chatLoading ? 'Menerjemahkan...' : `Terjemahkan (${getLanguageLabel(sourceLanguage)} → ${getLanguageLabel(targetLanguage)})`}
                </button>
                {chatError && <p role="alert" className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{chatError}</p>}
                
                {translatedText && (
                  <div className="space-y-3 text-left pt-2 border-t border-slate-100 animate-in fade-in">
                    <div className="flex justify-start">
                      <div className="max-w-[90%] bg-slate-100 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{getLanguageLabel(sourceLanguage)}</div>
                        <div>{inputText}</div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="max-w-[90%] bg-blue-600 text-white rounded-2xl px-3.5 py-2.5 text-xs space-y-1 shadow-xs relative">
                        <div className="flex items-center justify-between gap-2 border-b border-blue-500/50 pb-1 mb-1">
                          <span className="text-[10px] text-blue-200 font-bold uppercase">{getLanguageLabel(targetLanguage)}</span>
                          <button 
                            onClick={() => playAudio(translatedText, targetLanguage, 'active-trans')}
                            className="p-1 hover:bg-blue-500 rounded-md transition text-white"
                            title="Putar Audio Suara (ElevenLabs / TTS)"
                          >
                            <Volume2 size={14} className={playingAudioId === 'active-trans' ? 'animate-bounce text-yellow-300' : ''} />
                          </button>
                        </div>
                        <div className="whitespace-pre-line leading-relaxed font-medium">
                          {translatedText.split('\n').map((line, idx) => {
                            if (line.includes('**')) {
                              const parts = line.split(/(\*\*.*?\*\*)/g);
                              return (
                                <div key={idx} className="text-sm font-bold tracking-wide">
                                  {parts.map((p, pIdx) => p.startsWith('**') && p.endsWith('**') ? <strong key={pIdx} className="text-yellow-200">{p.slice(2, -2)}</strong> : p)}
                                </div>
                              );
                            }
                            return <div key={idx} className={idx > 0 ? "text-xs italic text-blue-100 mt-0.5" : "text-sm"}>{line}</div>;
                          })}
                        </div>
                      </div>
                    </div>

                    <button onClick={saveChat} disabled={chatSaving || !isTranslationCurrent({ sourceText: inputText, sourceLanguage, translatedText, targetLanguage }, translationSnapshot)} className="w-full py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50">
                      {chatSaving ? 'Menyimpan...' : '💾 Simpan Percakapan'}
                    </button>
                  </div>
                )}

                <div className="flex justify-center pt-2">
                  <button 
                    onClick={toggleListening}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl text-white shadow-lg transition active:scale-95 ${
                      isListening ? 'bg-red-500 animate-pulse ring-4 ring-red-200' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    title="Tekan untuk Bicara (Web Speech API)"
                  >
                    <Mic size={24} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isListening ? '🎙️ Mendengarkan suara Anda...' : 'Tekan tombol mic untuk mulai rekam'}
                </p>
              </div>

              {/* History Percakapan */}
              <div className="space-y-2">
                <h2 className="text-sm font-bold font-heading text-slate-900">Percakapan Tersimpan</h2>
                {chatHistoryLoading ? (
                  <p className="text-xs text-slate-500">Memuat riwayat percakapan...</p>
                ) : chatHistory.length === 0 ? (
                  <p className="bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">Belum ada percakapan tersimpan.</p>
                ) : (
                  chatHistory.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                      <div className="flex justify-between items-start text-[10px] text-slate-400">
                        <span>{getLanguageLabel(item.source_language)} → {getLanguageLabel(item.target_language)}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => playAudio(item.translated_text, item.target_language, item.id)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded flex items-center gap-1 font-semibold text-xs"
                          >
                            <Volume2 size={12} className={playingAudioId === item.id ? 'animate-bounce text-blue-600' : ''} /> Play
                          </button>
                          <button onClick={() => deleteChat(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded text-xs font-semibold">Hapus</button>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg text-xs text-slate-800">{item.source_text}</div>
                      <div className="bg-blue-50 p-2 rounded-lg text-xs font-medium text-blue-950 whitespace-pre-line">{item.translated_text}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Phrases */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold font-heading text-slate-900">Frasa Cepat Praktis</h2>
                  <span className="text-xs text-slate-400 font-medium">Filter Kategori</span>
                </div>

                {/* Category Filter Chips */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2.5">
                  {['Semua', ...Array.from(new Set(QUICK_PHRASES.map(p => p.category)))].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedPhraseCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                        selectedPhraseCategory === cat
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_PHRASES.filter(p => selectedPhraseCategory === 'Semua' || p.category === selectedPhraseCategory).map((phrase, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-2xs hover:border-blue-300 transition">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{phrase.category}</span>
                        <div className="text-xs font-medium text-slate-800 line-clamp-2 mt-1">{phrase.text}</div>
                      </div>
                      <button 
                        onClick={() => {
                          setInputText(phrase.text);
                          translateMessage(phrase.text);
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold shrink-0 transition"
                      >
                        Terjemahkan
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

              {/* GPS Coordinates & Status Badge */}
              {userLocation && (
                <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-blue-900 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold">GPS Terdeteksi:</span>
                  </div>
                  <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-blue-200 text-[11px] font-semibold text-blue-700 shadow-2xs">
                    {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                  </span>
                </div>
              )}

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
                            {s.userRatingCount > 0 && (
                              <span className="text-[11px] text-slate-500 font-medium">({s.userRatingCount.toLocaleString('id-ID')} ulasan)</span>
                            )}
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
            <ArrowRightLeft size={20} />
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
