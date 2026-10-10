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
  Trash2,
  Copy,
  Smartphone,
  Download,
  Luggage,
  Eye,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';
import { CURRENCIES, CURRENCY_FLAGS, convert, formatAmount, formatChipRate, formatHistoryPayload, isConversionRateAvailable, parseAmount } from './valas.js';
import { createCameraController } from './scannerCamera.js';
import { getPaginatedScanHistory } from './scanHistory.js';
import { SPOT_CATEGORIES, locationErrorMessage, shouldReloadSpots, getCountryCodeFromCoords, getCountryFlagFromCoords } from './spots.js';
import { applyLatestTranslationState, conversationPayload, getBubbleSide, getLanguageLabel, getRecognitionLanguage, invalidateTranslationRequest, isEmptyInput, isTranslationCurrent, requestMicrophonePermission, toggleRecognition, SUPPORTED_LANGUAGES, QUICK_PHRASES } from './chat.js';
import axios from 'axios';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.5.3';

export default function App() {
  // Mount State to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginPasscode, setLoginPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel_assistant_theme', nextMode ? 'dark' : 'light');
      if (nextMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Navigation State
  const [activeTabState, setActiveTabState] = useState('valas');
  const activeTab = activeTabState;
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('travel_assistant_active_tab', tab);
    }
  };

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);
  
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
  const [allScanHistoryList, setAllScanHistoryList] = useState([]);
  const [showAllScanHistoryModal, setShowAllScanHistoryModal] = useState(false);
  const [scanHistoryPage, setScanHistoryPage] = useState(1);
  const [copiedHistoryId, setCopiedHistoryId] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [copiedProductName, setCopiedProductName] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scanSaving, setScanSaving] = useState(false);
  const [scannedResultSaved, setScannedResultSaved] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackPromptText, setFeedbackPromptText] = useState('');
  const [reanalyzing, setReanalyzing] = useState(false);

  // Ngobrol State
  const [selectedPhraseCategory, setSelectedPhraseCategory] = useState('Semua');
  const translationRequestIdRef = useRef(0);
  const recognitionRef = useRef(null);
  const speechTranscriptRef = useRef('');
  const speechStopRequestedRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const inputTextRef = useRef(inputText);
  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('id');
  const [targetLanguage, setTargetLanguage] = useState('ja');
  const [translationSnapshot, setTranslationSnapshot] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [chatSaving, setChatSaving] = useState(false);

  // Header Permission State
  const [hasAllPermissions, setHasAllPermissions] = useState(false);

  const DEFAULT_JAKSEL_LOCATION = { lat: -6.2615, lng: 106.8106 }; // Jakarta Selatan

  // Spot Kalcer State
  const [userLocation, setUserLocation] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('travel_assistant_user_location');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });
  const [locatingUser, setLocatingUser] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Meminta lokasi GPS...');
  const [spotFilter, setSpotFilter] = useState('all');
  const [spotsList, setSpotsList] = useState([]);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [countryCode, setCountryCode] = useState('JPN');
  const [customCategories, setCustomCategories] = useState([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  // Quick Phrases CRUD state
  const [phrasesList, setPhrasesList] = useState(QUICK_PHRASES);
  const [editingPhraseIndex, setEditingPhraseIndex] = useState(null);
  const [phraseModalOpen, setPhraseModalOpen] = useState(false);
  const [phraseInputText, setPhraseInputText] = useState('');
  const [phraseInputCategory, setPhraseInputCategory] = useState('🗣️ Dasar');
  const [phraseSearchQuery, setPhraseSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [showAllHistoryModal, setShowAllHistoryModal] = useState(false);

  // PWA Install prompt listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else {
      setShowPwaInstallModal(true);
    }
  };

  // Hydrate client storage after initial render to avoid SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('travel_assistant_token') || sessionStorage.getItem('travel_assistant_token') || '';
      const storedRemember = localStorage.getItem('travel_assistant_remember_me') !== 'false';
      const storedPasscode = localStorage.getItem('travel_assistant_passcode') || '';
      const storedTab = localStorage.getItem('travel_assistant_active_tab') || 'valas';
      
      const storedTheme = localStorage.getItem('travel_assistant_theme');
      let enableDark = false;
      if (storedTheme) {
        enableDark = storedTheme === 'dark';
      } else {
        const currentHour = new Date().getHours();
        enableDark = currentHour < 6 || currentHour >= 18; // Malam: 18:00 - 05:59, Pagi/Siang: 06:00 - 17:59
      }
      setIsDarkMode(enableDark);
      if (enableDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      setToken(storedToken);
      setRememberMe(storedRemember);
      setLoginPasscode(storedPasscode);
      setActiveTabState(storedTab);
      setIsCheckingAuth(Boolean(storedToken));
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  // 1. Initial Load: Auth Token & Initial Data
  useEffect(() => {
    if (!isMounted) return;
    const currentToken = getAuthToken();
    if (currentToken) {
      if (!userLocation) {
        requestUserLocation();
      } else {
        setLocationStatus(`📍 GPS: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
        setCountryCode(getCountryCodeFromCoords(userLocation.lat, userLocation.lng));
      }
      axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${currentToken}` } })
        .then(res => {
          setUser(res.data.user);
        })
        .catch(() => {
          localStorage.removeItem('travel_assistant_token');
          sessionStorage.removeItem('travel_assistant_token');
          setToken('');
          setUser(null);
        })
        .finally(() => {
          setIsCheckingAuth(false);
        });
    } else {
      setIsCheckingAuth(false);
    }
    loadLiveRates();
    loadConversionHistory();
    loadScanHistory();
    loadChatHistory();
  }, [token, isMounted]);

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
        const newToken = res.data.token;
        if (rememberMe) {
          localStorage.setItem('travel_assistant_token', newToken);
          localStorage.setItem('travel_assistant_passcode', loginPasscode);
          localStorage.setItem('travel_assistant_remember_me', 'true');
          sessionStorage.removeItem('travel_assistant_token');
        } else {
          sessionStorage.setItem('travel_assistant_token', newToken);
          localStorage.setItem('travel_assistant_remember_me', 'false');
          localStorage.removeItem('travel_assistant_token');
          localStorage.removeItem('travel_assistant_passcode');
        }
        setToken(newToken);
        setUser(res.data.user);
        requestUserLocation();
        loadScanHistory(newToken);
        loadChatHistory(newToken);
        loadConversionHistory(newToken);
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Gagal login. Pastikan passcode benar.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('travel_assistant_token');
    sessionStorage.removeItem('travel_assistant_token');
    if (!rememberMe) {
      localStorage.removeItem('travel_assistant_passcode');
    }
    setToken('');
    setUser(null);
    setScanHistoryList([]);
    setChatHistory([]);
    setConversionHistory([]);
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

  const loadConversionHistory = async (overrideToken = null) => {
    const authToken = overrideToken || getAuthToken();
    if (!authToken) return;
    try {
      const res = await axios.get('/api/valas/history', { headers: { Authorization: `Bearer ${authToken}` } });
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
    const authToken = getAuthToken();
    try {
      await axios.post('/api/valas/history', {
        from_currency: activeChip,
        to_currency: 'IDR',
        from_amount: sourceAmount,
        to_amount: idrAmount,
        exchange_rate: Number(ratesData.IDR) / (Number(ratesData[activeChip]) || 1),
        note: conversionNote
      }, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
      loadConversionHistory();
    } catch (err) {
      alert('Gagal menyimpan riwayat: ' + err.message);
    } finally {
      setSavingConversion(false);
    }
  };

  const updateConversion = async (item) => {
    const authToken = getAuthToken();
    try {
      await axios.patch(`/api/valas/history/${item.id}`, formatHistoryPayload(item), {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      setEditingConversion(null);
      await loadConversionHistory();
    } catch (err) {
      alert('Gagal memperbarui riwayat: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteConversion = async (id) => {
    if (!window.confirm('Hapus riwayat konversi ini?')) return;
    const authToken = getAuthToken();
    try {
      await axios.delete(`/api/valas/history/${id}`, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
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
      const targetLoc = userLocation || DEFAULT_JAKSEL_LOCATION;
      loadSpots(targetLoc.lat, targetLoc.lng, spotFilter);
    }
  }, [activeTab]);

  const startCamera = async (overrideMode = null) => {
    stopCamera();
    setScanError('');
    setIsCameraActive(true);
    const targetMode = overrideMode || facingMode || 'environment';

    try {
      let stream = null;

      // 1. Coba cari deviceId kamera belakang via enumerateDevices
      if (targetMode === 'environment' && navigator.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          const backDevice = videoDevices.find(d => /back|rear|environment|belakang/i.test(d.label)) || videoDevices[videoDevices.length - 1];
          if (backDevice?.deviceId) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: backDevice.deviceId } }
            });
          }
        } catch (e) {
          console.warn('Coba enumerateDevices gagal:', e);
        }
      }

      // 2. Fallback constraint exact -> ideal
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: targetMode } }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: targetMode } }
          });
        }
      }

      cameraStreamRef.current = stream;
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Kamera error:', err);
      // Strict policy: jangan pernah fallback otomatis ke kamera depan ('user') jika target mode environment
      const message = err?.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Izinkan akses kamera di browser (klik icon gembok di address bar) lalu coba lagi.'
        : err?.name === 'NotFoundError'
          ? 'Kamera belakang tidak ditemukan.'
          : 'Kamera gagal dibuka. Pastikan izin kamera aktif & tidak dipakai aplikasi lain.';
      setScanError(message);
      stopCamera();
    }
  };

  const checkPermissionsState = async () => {
    if (typeof window === 'undefined' || !navigator.permissions) return;
    try {
      let locGranted = false;
      let camGranted = false;
      let micGranted = false;

      try {
        const locP = await navigator.permissions.query({ name: 'geolocation' });
        locGranted = locP.state === 'granted';
      } catch {}

      try {
        const camP = await navigator.permissions.query({ name: 'camera' });
        camGranted = camP.state === 'granted';
      } catch {}

      try {
        const micP = await navigator.permissions.query({ name: 'microphone' });
        micGranted = micP.state === 'granted';
      } catch {}

      setHasAllPermissions(locGranted && camGranted && micGranted);
    } catch {}
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
    const micRes = await requestMicrophonePermission();
    if (micRes.ok) {
      setChatError('');
    } else {
      setChatError(micRes.error);
    }

    await checkPermissionsState();
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
    setScannedResult(null);

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
      setScannedResultSaved(false);
    } catch (err) {
      setScanError(err.response?.data?.error || 'Analisis gagal. Coba foto lebih jelas atau unggah gambar lain.');
    } finally {
      setScanLoading(false);
    }
  };

  const getAuthToken = () => token || (typeof window !== 'undefined' ? (localStorage.getItem('travel_assistant_token') || sessionStorage.getItem('travel_assistant_token') || '') : '');

  const saveScannedResultToHistory = async () => {
    if (!scannedResult || scanSaving) return;
    setScanSaving(true);
    const authToken = getAuthToken();
    try {
      const res = await axios.post('/api/scanner/history', scannedResult, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      setScannedResultSaved(true);
      if (res.data && res.data.item) {
        setScanHistoryList(prev => [res.data.item, ...prev.filter(i => String(i.id) !== String(res.data.item.id))]);
      }
      await loadScanHistory();
    } catch (err) {
      console.warn('Scan history save error:', err);
      setScannedResultSaved(true);
      setScanHistoryList(prev => [
        { id: `scan-${Date.now()}`, ...scannedResult, created_at: new Date().toISOString() },
        ...prev
      ]);
    } finally {
      setScanSaving(false);
    }
  };

  const handleReanalyze = async () => {
    if (!scannedResult?.image_url || reanalyzing) return;
    setReanalyzing(true);
    setScanError('');
    const authToken = getAuthToken();
    try {
      const res = await axios.post('/api/scanner/analyze', {
        image_data_url: scannedResult.image_url,
        latitude: scannedResult.latitude,
        longitude: scannedResult.longitude,
        location_name: scannedResult.location_name,
        feedback_prompt: feedbackPromptText,
      }, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (res.data?.success && res.data?.item) {
        setScannedResult({
          ...res.data.item,
          image_url: scannedResult.image_url,
          latitude: scannedResult.latitude,
          longitude: scannedResult.longitude,
          location_name: scannedResult.location_name,
        });
        setScannedResultSaved(false);
        setShowFeedbackForm(false);
        setFeedbackPromptText('');
      }
    } catch (err) {
      setScanError(err.response?.data?.error || 'Gagal analisis ulang gambar.');
    } finally {
      setReanalyzing(false);
    }
  };

  const loadScanHistory = async (overrideToken = null) => {
    const authToken = overrideToken || getAuthToken();
    if (!authToken) return;
    try {
      const res = await axios.get('/api/scanner/history?limit=5', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data && res.data.history) {
        setScanHistoryList(res.data.history);
      }
    } catch (err) {
      console.warn('Scan history error:', err);
    }
  };

  const handleCopyHistoryTitle = (title, id) => {
    if (!title) return;
    navigator.clipboard.writeText(title);
    setCopiedHistoryId(id);
    setTimeout(() => setCopiedHistoryId(null), 2000);
  };

  const loadAllScanHistory = async (overrideToken = null) => {
    const rawToken = overrideToken || getAuthToken();
    const authToken = typeof rawToken === 'string' ? rawToken : null;
    try {
      const res = await axios.get('/api/scanner/history?all=true', authToken ? {
        headers: { Authorization: `Bearer ${authToken}` }
      } : {});
      if (res.data && res.data.history) {
        setAllScanHistoryList(res.data.history);
        setScanHistoryPage(1);
        setShowAllScanHistoryModal(true);
      }
    } catch (err) {
      console.warn('Load all scan history error:', err);
    }
  };

  const loadChatHistory = async (overrideToken = null) => {
    const authToken = overrideToken || getAuthToken();
    if (!authToken) return;
    setChatHistoryLoading(true);
    try {
      const res = await axios.get('/api/chat/history', { headers: { Authorization: `Bearer ${authToken}` } });
      setChatHistory(res.data.history || []);
      setChatError('');
    } catch (err) {
      setChatError(err.response?.data?.error || 'Riwayat percakapan gagal dimuat.');
    } finally {
      setChatHistoryLoading(false);
    }
  };

  const loadItemToChat = (item) => {
    setChatMessages(prev => [...prev, {
      id: item.id || Date.now(),
      sourceText: item.source_text || item.sourceText,
      sourceLanguage: item.source_language || item.sourceLanguage,
      targetLanguage: item.target_language || item.targetLanguage,
      translatedText: item.translated_text || item.translatedText
    }]);
  };

  const translateMessage = async (overrideText = null) => {
    const textToTranslate = overrideText !== null ? overrideText : inputText;
    if (isEmptyInput(textToTranslate)) {
      setChatError('Masukkan kalimat untuk diterjemahkan.');
      return;
    }
    setChatLoading(true);
    setChatError('');

    // Default target ke Bahasa Jepang jika target saat ini sama dengan source
    let currentTarget = targetLanguage;
    if (sourceLanguage === currentTarget) {
      currentTarget = sourceLanguage === 'id' ? 'ja' : 'id';
      setTargetLanguage(currentTarget);
    }

    const requestId = ++translationRequestIdRef.current;
    const request = { text: textToTranslate.trim(), source_language: sourceLanguage, target_language: currentTarget };
    const authToken = getAuthToken();
    try {
      const res = await axios.post('/api/chat/translate', request, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (!applyLatestTranslationState(requestId, translationRequestIdRef.current, () => {
        const translation = res.data.translation || '';
        setTranslatedText(translation);
        setTranslationSnapshot({ sourceText: request.text, sourceLanguage: request.source_language, targetLanguage: request.target_language, translatedText: translation });
        loadItemToChat({
          source_text: request.text,
          source_language: request.source_language,
          target_language: request.target_language,
          translated_text: translation
        });
        setInputText('');
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

  const saveChat = async (msgToSave = null) => {
    const payload = msgToSave ? {
      sourceText: msgToSave.sourceText || msgToSave.source_text,
      sourceLanguage: msgToSave.sourceLanguage || msgToSave.source_language,
      translatedText: msgToSave.translatedText || msgToSave.translated_text,
      targetLanguage: msgToSave.targetLanguage || msgToSave.target_language
    } : translationSnapshot ? {
      sourceText: translationSnapshot.sourceText,
      sourceLanguage: translationSnapshot.sourceLanguage,
      translatedText: translationSnapshot.translatedText,
      targetLanguage: translationSnapshot.targetLanguage
    } : chatMessages.length > 0 ? {
      sourceText: chatMessages[chatMessages.length - 1].sourceText,
      sourceLanguage: chatMessages[chatMessages.length - 1].sourceLanguage,
      translatedText: chatMessages[chatMessages.length - 1].translatedText,
      targetLanguage: chatMessages[chatMessages.length - 1].targetLanguage
    } : null;

    if (!payload || !payload.sourceText || !payload.translatedText) return;
    setChatSaving(true);
    const authToken = getAuthToken();
    try {
      await axios.post('/api/chat/history', conversationPayload(payload), {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      await loadChatHistory();
      setChatError('');
    } catch (err) {
      setChatError(err.response?.data?.error || 'Percakapan gagal disimpan.');
    } finally {
      setChatSaving(false);
    }
  };

  const deleteChat = async (id) => {
    if (!window.confirm('Hapus percakapan ini?')) return;
    const authToken = getAuthToken();
    try {
      await axios.delete(`/api/chat/history/${id}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      await loadChatHistory();
    } catch (err) {
      setChatError(err.response?.data?.error || 'Percakapan gagal dihapus.');
    }
  };

  const deleteScanHistoryItem = async (id) => {
    if (!window.confirm('Hapus riwayat scanner ini?')) return;
    const authToken = getAuthToken();
    try {
      await axios.delete(`/api/scanner/history/${id}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      await loadScanHistory();
      if (showAllScanHistoryModal) {
        await loadAllScanHistory();
      }
    } catch (err) {
      console.warn('Gagal menghapus scan history:', err);
    }
  };

  // 4. Kalcer Geolocation & Places API Integration
  const requestUserLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('Geolocation tidak didukung browser ini.');
      return;
    }
    setLocatingUser(true);
    setLocationStatus('Mendeteksi koordinat GPS perangkat...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const loc = { lat: latitude, lng: longitude };
        setUserLocation(loc);
        if (typeof window !== 'undefined') {
          localStorage.setItem('travel_assistant_user_location', JSON.stringify(loc));
        }
        setCountryCode(getCountryCodeFromCoords(latitude, longitude));
        setLocationStatus(`📍 GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLocatingUser(false);
        loadSpots(latitude, longitude, spotFilter);
      },
      (err) => {
        console.warn('GPS Error, fallback ke Jakarta Selatan:', err.message);
        setUserLocation(DEFAULT_JAKSEL_LOCATION);
        setCountryCode(getCountryCodeFromCoords(DEFAULT_JAKSEL_LOCATION.lat, DEFAULT_JAKSEL_LOCATION.lng));
        setLocationStatus(`📍 Jakarta Selatan: ${DEFAULT_JAKSEL_LOCATION.lat.toFixed(4)}, ${DEFAULT_JAKSEL_LOCATION.lng.toFixed(4)}`);
        setLocatingUser(false);
        loadSpots(DEFAULT_JAKSEL_LOCATION.lat, DEFAULT_JAKSEL_LOCATION.lng, spotFilter);
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
      speechStopRequestedRef.current = true;
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    if (!SpeechRecognition) {
      alert('💡 Browser ini (Safari/iOS) belum mendukung API Web Speech Recognition secara langsung.\n\nTips: Anda dapat menggunakan tombol Dikte (ikon Mic 🎤 pada keyboard perangkat) saat mengetik!');
      return;
    }

    speechTranscriptRef.current = '';
    speechStopRequestedRef.current = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getRecognitionLanguage(sourceLanguage);

      recognition.onstart = () => {
        setIsListening(true);
        setChatError('');
      };
      recognition.onresult = (event) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0]?.transcript || '';
        }
        const trimmed = fullTranscript.trim();
        if (trimmed) {
          speechTranscriptRef.current = trimmed;
          updateChatInput(trimmed);
        }
      };
      recognition.onerror = (event) => {
        console.warn('Speech Recognition error event:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setChatError('Izin mikrofon ditolak. Klik tombol 🛡️ Permission di kanan atas atau izinkan mic pada address bar browser lalu coba lagi.');
        } else if (event.error === 'no-speech') {
          setChatError('Tidak ada suara terdeteksi. Silakan coba bicara lagi.');
        } else if (event.error !== 'aborted') {
          setChatError(`Audio error (${event.error}). Coba lagi.`);
        }
      };
      recognition.onend = () => {
        setIsListening(false);
        const finalText = speechTranscriptRef.current?.trim() || inputTextRef.current?.trim();
        const wasStopRequested = speechStopRequestedRef.current;
        speechStopRequestedRef.current = false;

        if (finalText) {
          updateChatInput(finalText);
          if (wasStopRequested) {
            translateMessage(finalText);
          }
        } else if (wasStopRequested) {
          setChatError('Tidak ada suara terdeteksi. Silakan coba bicara lagi.');
        }
      };

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
  // RENDER: AUTH CHECKING & MOUNT LOADER
  // ==========================================
  if (!isMounted || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#001A41] flex items-center justify-center p-4 transition-colors">
        <div className="w-full max-w-sm bg-white/92 dark:bg-[#0A1937]/85 backdrop-blur-xl border border-[#001A41]/10 dark:border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF0025] to-[#FDA22B] flex items-center justify-center text-white shadow-lg animate-bounce">
            <Luggage size={28} />
          </div>
          <div className="text-base font-bold font-heading text-[#0A1937] dark:text-white">Memverifikasi Sesi Login...</div>
          <p className="text-xs text-[#5A6E85] dark:text-slate-400">Harap tunggu sebentar</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: LOGIN SCREEN (If not authenticated)
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#001A41] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors">
        {/* Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm bg-white/92 dark:bg-[#0A1937]/85 backdrop-blur-xl border border-[#001A41]/10 dark:border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-6 relative z-10">
          <div className="text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-[#FF0025] to-[#FDA22B] flex items-center justify-center text-white shadow-md">
              <Luggage size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-heading tracking-tight text-[#0A1937] dark:text-white">Travel Assistant</h1>
              <p className="text-xs text-[#5A6E85] dark:text-slate-400 mt-1">Masukkan passcode untuk melanjutkan</p>
            </div>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#5A6E85] dark:text-slate-300 mb-1.5">Passcode Aplikasi</label>
              <div className="relative">
                <input
                  type={showPasscode ? "text" : "password"}
                  value={loginPasscode}
                  onChange={(e) => setLoginPasscode(e.target.value)}
                  placeholder="Masukkan passcode"
                  className="w-full pl-9 pr-10 py-3 bg-[#F0F4F9] dark:bg-white/5 border border-[#001A41]/12 dark:border-white/12 rounded-xl text-sm font-medium text-[#0A1937] dark:text-white placeholder-[#8F9EAF] dark:placeholder-slate-500 outline-none focus:border-[#FF0025] focus:ring-2 focus:ring-red-500/15 transition"
                  required
                />
                <Lock size={16} className="absolute left-3 top-3.5 text-[#5A6E85] dark:text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-3.5 text-[#5A6E85] dark:text-slate-400 hover:opacity-100 transition"
                  title={showPasscode ? "Sembunyikan passcode" : "Tampilkan passcode"}
                >
                  {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#5A6E85] dark:text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRememberMe(checked);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('travel_assistant_remember_me', checked ? 'true' : 'false');
                    }
                  }}
                  className="w-4 h-4 text-red-600 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-red-500 cursor-pointer"
                />
                <span>Ingat sesi saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white text-sm font-semibold rounded-xl shadow-md hover:opacity-95 active:scale-99 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loginLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRightLeft size={16} className="rotate-90 sm:rotate-0" />
                </>
              )}
            </button>
          </form>

          {/* Version Tracking Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-center text-[11px] text-[#5A6E85] dark:text-slate-400">
            <span className="font-mono">v1.5.3</span>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN APPLICATION SHELL
  // ==========================================
  return (
    <div className="h-[100dvh] w-full max-w-full overflow-x-hidden bg-[#F4F6FB] dark:bg-[#001A41] flex items-center justify-center sm:py-6 sm:px-4 sm:h-auto sm:min-h-[100dvh] transition-colors">
      <div className="w-full max-w-[430px] h-[100dvh] sm:h-[860px] sm:max-h-[880px] bg-white dark:bg-[#001A41] sm:border sm:border-slate-200/80 dark:sm:border-white/10 sm:rounded-[36px] shadow-2xl flex flex-col overflow-hidden relative transition-colors">
        
        {/* Hidden Canvas for Camera Snapshots */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Top Header */}
        <header className="px-4 pt-3.5 pb-2.5 bg-white/90 dark:bg-[#001A41]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF0025] to-[#FDA22B] flex items-center justify-center text-white shadow-xs">
              <Luggage size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold font-heading text-[#0A1937] dark:text-white tracking-tight leading-tight">Travel Assistant</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 rounded-md border border-red-500/20">{countryCode}</span>
              </div>
              <div className="text-[10px] text-[#5A6E85] dark:text-slate-400 font-mono font-medium -mt-0.5">{APP_VERSION}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              {isDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>
            <button 
              onClick={handleInstallPwa}
              title="Pasang PWA / Aplikasi"
              className="w-9 h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 transition relative cursor-pointer"
            >
              <Smartphone size={16} />
              {isInstallable && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white animate-pulse" />
              )}
            </button>
            <button 
              onClick={handleLogout}
              title="Keluar / Logout"
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-red-500/10 hover:text-red-500 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 transition cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 pb-6">
          
          {/* ==================================================== */}
          {/* TAB 1: VALAS & CURRENCY CONVERTER */}
          {/* ==================================================== */}
          {activeTab === 'valas' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-[#0A1937] dark:text-white">Valas & Kurs Rate</h1>
                  <p className="text-xs text-[#5A6E85] dark:text-slate-400">
                    1 {activeChip} = {formatChipRate(ratesData, activeChip)} • {rateSource === 'bca' ? 'BCA e-Rate' : 'Live Rate'}
                  </p>
                </div>
                <button 
                  onClick={loadLiveRates}
                  disabled={ratesLoading}
                  className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  <RefreshCw size={12} className={ratesLoading ? "animate-spin text-emerald-600 dark:text-emerald-400" : "text-emerald-600 dark:text-emerald-400"} />
                  <span>{ratesLoading ? 'Sync...' : 'LIVE'}</span>
                </button>
              </div>

              {/* Converter Interactive Box */}
              <div className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm relative space-y-3">
                {/* Valas Input Box */}
                <div className="bg-[#F0F4F9] dark:bg-white/5 border border-[#001A41]/12 dark:border-white/12 rounded-xl p-4 flex items-center justify-between gap-3 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-[#FF0025] transition">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xl leading-none">{CURRENCY_FLAGS[activeChip] || '🏳️'}</span>
                    <span className="text-lg font-bold text-[#0A1937] dark:text-white font-heading">{activeChip}</span>
                  </div>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={displayedAmount(sourceAmount)}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    placeholder="0"
                    className="w-full text-right text-2xl font-extrabold text-[#0A1937] dark:text-white font-heading bg-transparent outline-none"
                  />
                </div>

                {/* IDR Result Box */}
                <div className="bg-red-500/10 dark:bg-red-500/15 border border-red-500/20 rounded-xl p-4 flex items-center justify-between gap-3 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-[#FF0025] transition">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xl leading-none">🇮🇩</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400 font-heading">IDR</span>
                  </div>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={displayedAmount(idrAmount)}
                    onChange={(e) => handleIdrChange(e.target.value)}
                    placeholder="0"
                    className="w-full text-right text-2xl font-extrabold text-red-600 dark:text-red-400 font-heading bg-transparent outline-none"
                  />
                </div>

                <input
                  type="text"
                  value={conversionNote}
                  onChange={(e) => setConversionNote(e.target.value)}
                  placeholder="Catatan (opsional)"
                  className="w-full px-3 py-2 bg-[#F0F4F9] dark:bg-white/5 border border-[#001A41]/12 dark:border-white/12 rounded-xl text-base sm:text-xs text-[#0A1937] dark:text-white placeholder-[#8F9EAF] dark:placeholder-slate-500 outline-none focus:border-[#FF0025]"
                />
                {conversionError && <p role="alert" className="text-xs text-red-600">{conversionError}</p>}
                {!isConversionRateAvailable(ratesData.IDR, ratesData[activeChip]) && sourceAmount > 0 && <p role="alert" className="text-xs text-red-600">Kurs belum tersedia. Muat ulang kurs sebelum menyimpan konversi.</p>}
                <button
                  onClick={saveCurrentConversion}
                  disabled={savingConversion || sourceAmount <= 0 || !isConversionRateAvailable(ratesData.IDR, ratesData[activeChip])}
                  className="w-full py-2.5 bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-95 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                        className={`min-w-[105px] shrink-0 snap-start p-2.5 text-left rounded-xl transition border flex flex-col justify-between min-h-[54px] cursor-pointer ${
                          activeChip === curr 
                            ? 'bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white border-transparent shadow-xs font-bold' 
                            : 'bg-[#F4F6FB] dark:bg-[#0A1937]/80 border-slate-200/80 dark:border-white/10 text-[#0A1937] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xs font-extrabold flex items-center justify-between w-full">
                          <span>{curr}</span>
                          <span className="text-sm leading-none">{CURRENCY_FLAGS[curr] || '🏳️'}</span>
                        </span>
                        <span className={`text-[11px] font-semibold tracking-tight ${activeChip === curr ? 'text-white/90' : 'text-[#5A6E85] dark:text-slate-400'}`}>
                          {rateText || '...'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Conversions from Supabase */}
              <div>
                <h2 className="text-sm font-bold font-heading text-[#0A1937] dark:text-white mb-2.5">Riwayat Konversi Terakhir</h2>
                <div className="space-y-2">
                  {conversionHistory.length === 0 ? (
                    <div className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-4 text-center text-xs text-[#5A6E85] dark:text-slate-400">
                      Belum ada konversi tersimpan.
                    </div>
                  ) : (
                    conversionHistory.map((item, idx) => (
                      editingConversion?.id === item.id ? (
                        <div key={item.id || idx} className="bg-white dark:bg-[#0A1937]/80 border border-red-500/30 rounded-xl p-3 space-y-2">
                          <input aria-label="Catatan konversi" value={editingConversion.note} onChange={(e) => setEditingConversion({ ...editingConversion, note: e.target.value })} className="w-full px-3 py-2 bg-[#F0F4F9] dark:bg-white/5 border border-[#001A41]/12 dark:border-white/12 rounded-lg text-base sm:text-xs text-[#0A1937] dark:text-white" />
                          <div className="flex gap-2">
                            <button onClick={() => updateConversion(editingConversion)} className="flex-1 py-2 bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white rounded-lg text-xs font-bold shadow-xs hover:opacity-95 transition cursor-pointer">Simpan</button>
                            <button onClick={() => setEditingConversion(null)} className="px-3 py-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer">Batal</button>
                          </div>
                        </div>
                      ) : (
                        <div key={item.id || idx} className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-base shrink-0">¥</div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-[#0A1937] dark:text-white truncate">{item.from_currency} {formatAmount(item.from_amount)}</div>
                              <div className="text-xs text-[#5A6E85] dark:text-slate-400 truncate">{item.note ? `${item.note} • ` : ''}{new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Rp {formatAmount(item.to_amount)}</div>
                            <div className="text-[10px] text-[#5A6E85] dark:text-slate-400">Kurs {Number(item.exchange_rate).toFixed(1)}</div>
                            <div className="flex justify-end gap-1 mt-1">
                              <button aria-label="Edit konversi" onClick={() => setEditingConversion({ ...item })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded cursor-pointer"><Pencil size={14} /></button>
                              <button aria-label="Hapus konversi" onClick={() => deleteConversion(item.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded cursor-pointer"><Trash2 size={14} /></button>
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
                  <h1 className="text-xl font-bold font-heading text-[#0A1937] dark:text-white">Cek Harga AI</h1>
                  <p className="text-xs text-[#5A6E85] dark:text-slate-400">Scan label harga fisik & komparasi Tokopedia</p>
                </div>
                <span className="px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-full border border-red-500/20">SCAN</span>
              </div>

              {/* Real Camera Viewfinder / Capture Box */}
              <div className={`bg-white dark:bg-[#0A1937]/80 border-2 border-dashed border-red-500/40 rounded-2xl text-center shadow-xs overflow-hidden relative transition-all ${isCameraActive || capturedImage || scanLoading ? 'p-0 border-solid border-slate-900' : 'p-4'}`}>
                {isCameraActive ? (
                  <div className="relative w-full h-[400px] sm:h-[460px] bg-black overflow-hidden flex flex-col justify-between">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    
                    {/* Viewfinder Target Reticle Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                      <div className="w-56 h-56 border-2 border-white/60 rounded-2xl relative shadow-lg">
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-lg"></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-lg"></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-lg"></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-lg"></div>
                      </div>
                    </div>

                    {/* Top Control Overlay Bar */}
                    <div className="relative z-10 p-3 bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-xs font-bold tracking-wide">CAMERA LIVE</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={toggleCameraFacing}
                          className="p-2.5 bg-black/50 hover:bg-black/80 backdrop-blur-xs text-white rounded-full transition"
                          title="Ganti Kamera Depan/Belakang"
                        >
                          <SwitchCamera size={18} />
                        </button>
                        <button 
                          onClick={stopCamera}
                          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold rounded-full transition"
                        >
                          Tutup ✕
                        </button>
                      </div>
                    </div>

                    {/* Bottom Control Overlay Shutter Bar */}
                    <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center">
                      <button 
                        onClick={capturePhoto}
                        className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-tr from-[#FF0025] to-[#FDA22B] hover:opacity-95 flex items-center justify-center shadow-xl active:scale-95 transition transform cursor-pointer"
                        title="Ambil Foto Tag Harga"
                      >
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-red-600">
                          <Camera size={22} />
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (capturedImage || scanLoading) ? (
                  <div className="relative w-full h-[400px] sm:h-[460px] bg-slate-950 overflow-hidden flex flex-col justify-between">
                    {capturedImage && (
                      <img 
                        src={capturedImage} 
                        alt="Captured Tag" 
                        className="absolute inset-0 w-full h-full object-cover opacity-90"
                      />
                    )}
                    
                    {/* Processing Loading Overlay */}
                    {scanLoading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 z-20 text-white space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center">
                          <RefreshCw size={28} className="animate-spin text-red-500" />
                        </div>
                        <div className="text-sm font-bold tracking-wide">Menganalisis Gambar AI...</div>
                        <p className="text-xs text-slate-300">Membaca tag harga & komparasi Tokopedia</p>
                      </div>
                    )}

                    {/* Top Control Bar for Captured View */}
                    <div className="relative z-10 p-3 bg-gradient-to-b from-black/70 to-transparent flex justify-end text-white">
                      <button 
                        onClick={() => { setCapturedImage(null); startCamera(); }}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold rounded-full transition flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        <span>Foto Ulang</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-[#FF0025]/10 to-[#FDA22B]/10 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl shadow-2xs">
                      📸
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0A1937] dark:text-white font-heading">Kamera Siap Digunakan</div>
                      <div className="text-xs text-[#5A6E85] dark:text-slate-400 mt-0.5">Buka kamera langsung atau unggah foto tag harga</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                      <button 
                        onClick={startCamera}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 hover:opacity-95 transition cursor-pointer"
                      >
                        <Camera size={16} />
                        <span>Buka Kamera Live</span>
                      </button>

                      <label className="px-4 py-2.5 bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[#0A1937] dark:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/15 cursor-pointer transition">
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
                <div className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in relative">
                  <button
                    onClick={() => { setScannedResult(null); setScannedResultSaved(false); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/60 hover:bg-slate-900/80 active:scale-90 text-white flex items-center justify-center text-xs font-semibold backdrop-blur-md border border-white/20 transition-all z-10 cursor-pointer shadow-md"
                    title="Tutup Hasil Scan"
                    aria-label="Tutup Hasil Scan"
                  >
                    ✕
                  </button>

                  <div className="flex items-center justify-between pt-2 pr-10">
                    <div className="flex flex-col gap-1">
                      <span className="w-fit px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-md border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                        <Check size={12} />
                        AI Terverifikasi
                      </span>
                      {scannedResult.confidence != null && (
                        <span className="text-xs text-[#5A6E85] dark:text-slate-400 font-medium pl-0.5">
                          Confidence {scannedResult.confidence}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pr-8">
                    <h2 className="text-base font-bold font-heading text-[#0A1937] dark:text-white">{scannedResult.product_name}</h2>
                    <button
                      type="button"
                      onClick={() => {
                        if (scannedResult.product_name) {
                          navigator.clipboard?.writeText(scannedResult.product_name);
                          setCopiedProductName(true);
                          setTimeout(() => setCopiedProductName(false), 2000);
                        }
                      }}
                      className="p-1 text-[#5A6E85] dark:text-slate-300 hover:text-[#0A1937] dark:hover:text-white bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-md transition flex items-center gap-1 shrink-0 border border-slate-200/80 dark:border-white/10 cursor-pointer"
                      title="Salin Nama Barang"
                    >
                      {copiedProductName ? (
                        <>
                          <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span className="text-[11px] font-medium">Salin</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-stretch gap-2">
                    {scannedResult.location_name && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#5A6E85] dark:text-slate-300 bg-slate-100 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 px-2.5 py-1.5 rounded-md font-medium">
                        <span className="text-xs">{getCountryFlagFromCoords(scannedResult.latitude, scannedResult.longitude, scannedResult.location_name)}</span>
                        <MapPin size={12} className="text-emerald-600 dark:text-emerald-400" />
                        <span>{scannedResult.location_name}</span>
                      </div>
                    )}
                    <a
                      href={
                        scannedResult.latitude && scannedResult.longitude
                          ? `https://www.google.com/maps?q=${scannedResult.latitude},${scannedResult.longitude}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(scannedResult.location_name || scannedResult.product_name)}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 hover:text-red-700 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer"
                      title="Buka Lokasi Scan di Google Maps"
                    >
                      <MapPin size={12} className="text-red-600 dark:text-red-400" />
                      <span>📍 Buka GPS di Maps ↗</span>
                    </a>
                  </div>

                  {(scannedResult.tokopedia_url || scannedResult.shopee_url) && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {scannedResult.tokopedia_url && (
                        <a href={scannedResult.tokopedia_url} target="_blank" rel="noopener noreferrer" className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition">
                          <span>🛍️</span> Tokopedia ↗
                        </a>
                      )}
                      {scannedResult.shopee_url && (
                        <a href={scannedResult.shopee_url} target="_blank" rel="noopener noreferrer" className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition">
                          <span>🛒</span> Shopee ↗
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    onClick={saveScannedResultToHistory}
                    disabled={scannedResultSaved || scanSaving}
                    className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      scannedResultSaved
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
                        : 'bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white shadow-xs hover:opacity-95 active:scale-98'
                    }`}
                  >
                    {scanSaving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Menyimpan ke Server...</span>
                      </>
                    ) : scannedResultSaved ? (
                      <>
                        <Check size={14} />
                        <span>Tersimpan di Riwayat Database</span>
                      </>
                    ) : (
                      <>
                        <span>💾 Simpan Hasil Scan ke Server & Database</span>
                      </>
                    )}
                  </button>

                  {/* Feedback Correction Input (Collapsible) - Moved to bottom */}
                  <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-white/10">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setShowFeedbackForm(prev => !prev)}
                        className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>✏️ AI Salah Analisis? Koreksi Produk</span>
                      </button>
                    </div>

                    {showFeedbackForm && (
                      <div className="p-3.5 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2.5 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                            <span>💡 Petunjuk / Koreksi untuk AI</span>
                          </span>
                          <button 
                            type="button"
                            onClick={() => setShowFeedbackForm(false)} 
                            title="Batal koreksi"
                            aria-label="Batal koreksi"
                            className="w-6 h-6 rounded-full hover:bg-blue-500/20 active:scale-90 text-blue-800 dark:text-blue-300 flex items-center justify-center text-xs font-bold transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                        
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={feedbackPromptText}
                            onChange={(e) => setFeedbackPromptText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleReanalyze(); }}
                            placeholder="Contoh: Ini Kacamata Rayban Wayfarer..."
                            className="flex-1 text-xs px-3 py-2 bg-white dark:bg-[#0A1937] border border-blue-300 dark:border-blue-500/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white"
                          />
                          <button 
                            type="button"
                            onClick={handleReanalyze}
                            disabled={reanalyzing}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                          >
                            {reanalyzing ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Menganalisis...</span>
                              </>
                            ) : (
                              <>
                                <span>✨</span>
                                <span>Analisis Ulang</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-100/70 dark:bg-white/5 rounded-xl border border-slate-200/80 dark:border-white/10">
                    <div>
                      <div className="text-[11px] font-semibold text-[#5A6E85] dark:text-slate-400">TERENDAH INDONESIA · ESTIMASI AI</div>
                      <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {scannedResult.lowest_price_idr != null ? `Rp ${Number(scannedResult.lowest_price_idr).toLocaleString('id-ID')}` : 'Tidak tersedia'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-[#5A6E85] dark:text-slate-400">HARGA JEPANG · ESTIMASI AI</div>
                      <div className="text-sm font-extrabold text-[#0A1937] dark:text-white mt-0.5">
                        {scannedResult.price_jpy != null ? `¥ ${Number(scannedResult.price_jpy).toLocaleString('id-ID')}` : 'Tidak terdeteksi'}
                      </div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200/80 dark:border-white/10">
                      <div className="text-[11px] font-semibold text-[#5A6E85] dark:text-slate-400">RATA-RATA INDONESIA · ESTIMASI AI</div>
                      <div className="text-sm font-bold text-[#0A1937] dark:text-slate-200">
                        {scannedResult.average_price_idr != null ? `Rp ${Number(scannedResult.average_price_idr).toLocaleString('id-ID')}` : 'Tidak tersedia'}
                      </div>
                    </div>
                  </div>

                  {scannedResult.estimate_note && <p className="text-xs text-[#5A6E85] dark:text-slate-400">{scannedResult.estimate_note}</p>}

                  {(scannedResult.tokopedia_url || scannedResult.shopee_url) && (
                    <div className="grid grid-cols-2 gap-2">
                      {scannedResult.tokopedia_url && (
                        <a href={scannedResult.tokopedia_url} target="_blank" rel="noopener noreferrer" className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
                          Tokopedia <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      )}
                      {scannedResult.shopee_url && (
                        <a href={scannedResult.shopee_url} target="_blank" rel="noopener noreferrer" className="py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs">
                          Shopee <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Scan History from Supabase */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-sm font-bold font-heading text-[#0A1937] dark:text-white">Riwayat Scan Tersimpan</h2>
                  <button
                    type="button"
                    onClick={loadAllScanHistory}
                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Tampilkan Semua</span>
                    {scanHistoryList.length > 0 && (
                      <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded-full font-bold">
                        {scanHistoryList.length}
                      </span>
                    )}
                  </button>
                </div>
                <div className="space-y-2">
                  {scanHistoryList.length === 0 ? (
                    <div className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-4 text-center text-xs text-[#5A6E85] dark:text-slate-400">
                      Belum ada riwayat scan.
                    </div>
                  ) : (
                    scanHistoryList.slice(0, 5).map((item, idx) => (
                      <div key={item.id || idx} className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 flex items-start gap-3 shadow-2xs hover:border-red-500/40 transition">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.product_name} 
                            onClick={() => setPreviewImageUrl(item.image_url)}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-white/10 cursor-pointer hover:opacity-90 transition hover:scale-102" 
                            title="Klik untuk memperbesar gambar"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-300 flex items-center justify-center shrink-0 text-2xl font-bold border border-slate-200/60 dark:border-white/10">
                            📷
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="text-sm font-bold text-[#0A1937] dark:text-white truncate" title={item.product_name}>{item.product_name}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyHistoryTitle(item.product_name, item.id || idx)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shrink-0 flex items-center"
                                title="Salin Nama Produk"
                              >
                                {copiedHistoryId === (item.id || idx) ? (
                                  <Check size={14} className="text-emerald-600 dark:text-emerald-400 font-bold" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            {item.id && (
                              <button
                                onClick={() => deleteScanHistoryItem(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition shrink-0"
                                title="Hapus riwayat scanner ini"
                                aria-label="Hapus riwayat scanner"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          <div className="flex items-baseline justify-between gap-2 pt-0.5">
                            <div className="text-xs text-[#5A6E85] dark:text-slate-400 font-medium">
                              {item.price_jpy != null ? `¥${Number(item.price_jpy).toLocaleString('id-ID')}` : '-'}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
                                {item.lowest_price_idr != null ? `Rp ${Number(item.lowest_price_idr).toLocaleString('id-ID')}` : 'Harga N/A'}
                              </div>
                              <div className="text-[10px] font-medium text-[#5A6E85] dark:text-slate-400">Estimasi Indo</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A6E85] dark:text-slate-400 pt-0.5">
                            <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                            <div className="flex items-center gap-1.5">
                              {(item.location_name || item.locationName) && (
                                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border border-emerald-100 dark:border-emerald-500/20">
                                  <span>{getCountryFlagFromCoords(item.latitude, item.longitude, item.location_name || item.locationName)}</span>
                                  <span className="truncate max-w-[100px]">{item.location_name || item.locationName}</span>
                                </span>
                              )}
                              {item.latitude != null && item.longitude != null && (
                                <a
                                  href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-md font-semibold text-[10px] flex items-center gap-0.5 transition border border-blue-100 dark:border-blue-500/20"
                                  title="Buka Lokasi Scan di Google Maps"
                                >
                                  Maps ↗
                                </a>
                              )}
                            </div>
                          </div>
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
                  <h1 className="text-xl font-bold font-heading text-[#0A1937] dark:text-white">Ngobrol 💬</h1>
                  <p className="text-xs text-[#5A6E85] dark:text-slate-400">Terjemahan Suara & Frasa Instan</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-500/20">VOICE</span>
              </div>

              {/* Voice Card Input */}
              <div className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm text-center relative space-y-3">
                <div className="flex justify-between items-center bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 gap-2">
                  <select 
                    aria-label="Bahasa sumber" 
                    value={sourceLanguage} 
                    onChange={updateChatLanguage(setSourceLanguage)} 
                    className="bg-transparent outline-none flex-1 truncate text-xs font-semibold text-[#0A1937] dark:text-white"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={`src-${lang.code}`} value={lang.code.split('-')[0]} className="bg-white dark:bg-[#001A41] text-[#0A1937] dark:text-white">
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
                    className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-md transition text-slate-500 cursor-pointer"
                    title="Tukar Bahasa"
                  >
                    <ArrowRightLeft size={14} />
                  </button>

                  <select 
                    aria-label="Bahasa target" 
                    value={targetLanguage} 
                    onChange={updateChatLanguage(setTargetLanguage)} 
                    className="bg-transparent outline-none flex-1 truncate text-xs font-semibold text-[#0A1937] dark:text-white"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={`tgt-${lang.code}`} value={lang.code.split('-')[0]} className="bg-white dark:bg-[#001A41] text-[#0A1937] dark:text-white">
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Enhanced Text Input Controls Bar */}
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 space-y-2.5 shadow-2xs">
                  <div className="relative">
                    <textarea 
                      rows={3}
                      value={inputText}
                      onChange={(e) => updateChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          translateMessage();
                        }
                      }}
                      placeholder="Ketik kalimat atau tekan mic untuk bicara..."
                      className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 pr-8 text-xs font-medium text-[#0A1937] dark:text-white placeholder-[#8F9EAF] dark:placeholder-slate-500 outline-none focus:border-[#FF0025] focus:ring-2 focus:ring-red-500/20 transition resize-none leading-relaxed shadow-2xs"
                    />
                    {inputText && (
                      <button
                        onClick={() => updateChatInput('')}
                        className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition text-xs font-bold"
                        title="Bersihkan teks input"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button 
                      onClick={toggleListening}
                      className={`px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white text-xs font-bold shrink-0 shadow-xs transition active:scale-95 cursor-pointer ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse ring-2 ring-red-300' 
                          : 'bg-slate-800 dark:bg-white/15 hover:bg-slate-900 dark:hover:bg-white/25'
                      }`}
                      title="Tekan untuk Bicara (Web Speech API)"
                    >
                      <Mic size={15} />
                      <span>{isListening ? 'Berhenti' : 'Bicara'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline text-[10px] text-[#5A6E85] dark:text-slate-400 font-medium">
                        Enter untuk kirim
                      </span>
                      <button 
                        onClick={() => translateMessage()} 
                        disabled={chatLoading || !inputText.trim()} 
                        className="px-4 py-2.5 bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white rounded-xl text-xs font-bold shadow-xs hover:opacity-95 transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                        title="Kirim Pesan"
                      >
                        <span>{chatLoading ? 'Proses' : 'Kirim'}</span>
                        <span className="text-xs">🚀</span>
                      </button>
                    </div>
                  </div>

                  {isListening && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-600 font-semibold text-center animate-pulse flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      🎙️ Mendengarkan suara... Bicara sekarang, atau tekan Berhenti
                    </div>
                  )}
                </div>
                {chatError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-2 text-xs text-red-700">
                    <p role="alert" className="flex-1 font-medium">{chatError}</p>
                    {(chatError.includes('mikrofon') || chatError.includes('mic') || chatError.includes('Audio error')) && (
                      <button
                        onClick={async () => {
                          const micRes = await requestMicrophonePermission();
                          if (micRes.ok) {
                            setChatError('');
                          } else {
                            setChatError(micRes.error);
                          }
                        }}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-[11px] font-bold rounded-lg transition whitespace-nowrap border border-red-300"
                      >
                        🔑 Minta Izin Mic
                      </button>
                    )}
                  </div>
                )}
                
                {/* Fixed Height Scrollable Chat Box Container */}
                <div className="bg-[#F0F4F9] dark:bg-white/5 border border-[#001A41]/12 dark:border-white/10 rounded-2xl p-3 space-y-3 max-h-80 overflow-y-auto text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/80 dark:border-white/10 text-xs text-[#5A6E85] dark:text-slate-400">
                    <span className="font-semibold text-[#0A1937] dark:text-white">💬 Obrolan ({chatMessages.length})</span>
                    {chatMessages.length > 0 && (
                      <button
                        onClick={() => setChatMessages([])}
                        className="text-[11px] text-red-600 dark:text-red-400 hover:opacity-80 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Bersihkan percakapan di chat box"
                      >
                        🗑️ Bersihkan Chat
                      </button>
                    )}
                  </div>

                  {chatMessages.length === 0 ? (
                    <p className="text-center text-xs text-[#5A6E85] dark:text-slate-400 py-6">
                      Belum ada pesan. Ketik kalimat atau tekan mic untuk mulai ngobrol.
                    </p>
                  ) : (
                    chatMessages.map((msg, mIdx) => (
                      <div key={msg.id || mIdx} className="space-y-1.5 p-2.5 bg-white dark:bg-[#0A1937]/80 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                        <div className={`flex ${getBubbleSide(msg.sourceLanguage) === 'right' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs ${
                            getBubbleSide(msg.sourceLanguage) === 'right' ? 'bg-gradient-to-tr from-[#FF0025] to-[#FDA22B] text-white' : 'bg-slate-200 dark:bg-white/10 text-[#0A1937] dark:text-white'
                          }`}>
                            <div className="text-[9px] font-bold uppercase opacity-80">{getLanguageLabel(msg.sourceLanguage)}</div>
                            <div className="font-medium">{msg.sourceText}</div>
                          </div>
                        </div>

                        <div className={`flex ${getBubbleSide(msg.targetLanguage) === 'right' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs relative ${
                            getBubbleSide(msg.targetLanguage) === 'right' ? 'bg-gradient-to-tr from-[#FF0025] to-[#FDA22B] text-white' : 'bg-emerald-600 dark:bg-emerald-700 text-white'
                          }`}>
                            <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-0.5 mb-1">
                              <span className="text-[9px] text-white/80 font-bold uppercase">{getLanguageLabel(msg.targetLanguage)}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => saveChat(msg)}
                                  className="p-0.5 hover:bg-white/20 rounded transition text-white text-[10px] flex items-center gap-0.5 font-semibold cursor-pointer"
                                  title="Simpan percakapan ini ke Database"
                                >
                                  💾 Simpan
                                </button>
                                <button 
                                  onClick={() => playAudio(msg.translatedText, msg.targetLanguage, msg.id || mIdx)}
                                  className="p-0.5 hover:bg-white/20 rounded transition text-white cursor-pointer"
                                  title="Putar Audio"
                                >
                                  <Volume2 size={13} className={playingAudioId === (msg.id || mIdx) ? 'animate-bounce text-yellow-300' : ''} />
                                </button>
                              </div>
                            </div>
                            <div className="whitespace-pre-line leading-relaxed font-medium">
                              {msg.translatedText.split('\n').map((line, idx) => {
                                if (line.includes('**')) {
                                  const parts = line.split(/(\*\*.*?\*\*)/g);
                                  return (
                                    <div key={idx} className="text-xs font-bold tracking-wide">
                                      {parts.map((p, pIdx) => p.startsWith('**') && p.endsWith('**') ? <strong key={pIdx} className="text-yellow-200">{p.slice(2, -2)}</strong> : p)}
                                    </div>
                                  );
                                }
                                return <div key={idx} className={idx > 0 ? "text-[11px] italic text-blue-100 mt-0.5" : "text-xs"}>{line}</div>;
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {(chatMessages.length > 0 || translatedText) && (
                  <div className="flex items-center gap-2 pt-1">
                    <button 
                      onClick={() => saveChat()} 
                      disabled={chatSaving} 
                      className="flex-1 py-2 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/30 transition disabled:opacity-50 cursor-pointer"
                    >
                      {chatSaving ? 'Menyimpan...' : '💾 Simpan Percakapan Terbaru ke DB'}
                    </button>
                  </div>
                )}
              </div>

              {/* History Percakapan */}
              <div className="space-y-2">
                <div className="flex justify-between items-center relative z-20">
                  <h2 className="text-sm font-bold font-heading text-[#0A1937] dark:text-white">Percakapan Tersimpan ({chatHistory.length})</h2>
                  {chatHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllHistoryModal(true)}
                      className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 rounded-lg font-bold cursor-pointer transition flex items-center gap-1 z-20"
                    >
                      Lihat Semua ({chatHistory.length}) →
                    </button>
                  )}
                </div>

                {chatHistoryLoading ? (
                  <p className="text-xs text-[#5A6E85] dark:text-slate-400">Memuat riwayat percakapan...</p>
                ) : chatHistory.length === 0 ? (
                  <p className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-4 text-center text-xs text-[#5A6E85] dark:text-slate-400">Belum ada percakapan tersimpan.</p>
                ) : (
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 pt-1">
                    {chatHistory.slice(0, 5).map((item) => (
                      <div 
                        key={item.id} 
                        className="min-w-[220px] max-w-[240px] h-[130px] bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-red-500/40 transition shrink-0 relative"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChat(item.id);
                          }}
                          className="absolute top-2 left-2 w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-red-500/20 text-[#5A6E85] dark:text-slate-300 hover:text-red-600 flex items-center justify-center text-[10px] font-bold transition z-10 cursor-pointer"
                          title="Hapus percakapan tersimpan"
                        >
                          ✕
                        </button>
                        <div className="space-y-1 overflow-hidden cursor-pointer pl-5" onClick={() => loadItemToChat(item)}>
                          <div className="flex justify-between items-center text-[10px] text-[#5A6E85] dark:text-slate-400 font-medium">
                            <span className="truncate">{getLanguageLabel(item.source_language)} → {getLanguageLabel(item.target_language)}</span>
                          </div>
                          <div className="text-xs font-semibold text-[#0A1937] dark:text-white line-clamp-1">{item.source_text}</div>
                          <div className="text-xs text-red-600 dark:text-red-400 line-clamp-2 italic">{item.translated_text}</div>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-white/10 mt-1">
                          <button
                            onClick={() => loadItemToChat(item)}
                            className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer"
                          >
                            + Muat ke Chat
                          </button>
                          <button 
                            onClick={() => playAudio(item.translated_text, item.target_language, item.id)}
                            className="text-red-600 dark:text-red-400 hover:bg-red-500/10 p-1 rounded flex items-center gap-1 font-semibold text-xs shrink-0 cursor-pointer"
                            title="Putar Audio"
                          >
                            <Volume2 size={13} className={playingAudioId === item.id ? 'animate-bounce text-red-600' : ''} /> Play
                          </button>
                        </div>
                      </div>
                    ))}

                    {chatHistory.length > 5 && (
                      <button
                        onClick={() => setShowAllHistoryModal(true)}
                        className="min-w-[140px] h-[130px] bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-dashed border-slate-300 dark:border-white/20 rounded-xl p-3 flex flex-col items-center justify-center gap-1 shadow-2xs transition shrink-0 text-[#0A1937] dark:text-white font-bold text-xs cursor-pointer"
                      >
                        <span>Lihat Semua</span>
                        <span className="text-[10px] font-normal text-[#5A6E85] dark:text-slate-400">({chatHistory.length - 5} lainnya)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Phrases */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold font-heading text-[#0A1937] dark:text-white">Frasa Cepat Praktis ({phrasesList.length})</h2>
                  <button
                    onClick={() => {
                      setEditingPhraseIndex(null);
                      setPhraseInputText('');
                      setPhraseInputCategory('🗣️ Dasar');
                      setPhraseModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer hover:opacity-95"
                  >
                    + Tambah Frasa
                  </button>
                </div>

                {/* Category Filter Chips */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
                  {['Semua', ...Array.from(new Set(phrasesList.map(p => p.category)))].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedPhraseCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
                        selectedPhraseCategory === cat
                          ? 'bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white shadow-xs'
                          : 'bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[#0A1937] dark:text-white hover:bg-slate-50 dark:hover:bg-white/15'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Filter Input */}
                <input
                  type="text"
                  placeholder="🔍 Cari frasa cepat..."
                  value={phraseSearchQuery}
                  onChange={(e) => setPhraseSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-white/5 border border-slate-200/80 dark:border-white/12 rounded-xl px-3 py-2 text-xs font-medium text-[#0A1937] dark:text-white placeholder-[#8F9EAF] dark:placeholder-slate-500 outline-none focus:border-[#FF0025] mb-2 transition"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {phrasesList.filter(p => 
                    (selectedPhraseCategory === 'Semua' || p.category === selectedPhraseCategory) &&
                    (!phraseSearchQuery || p.text.toLowerCase().includes(phraseSearchQuery.toLowerCase()))
                  ).map((phrase, idx) => {
                    const realIndex = phrasesList.findIndex(p => p === phrase);
                    return (
                      <div key={idx} className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 flex justify-between items-start shadow-2xs hover:border-red-500/40 transition">
                        <div 
                          onClick={() => updateChatInput(phrase.text)}
                          className="space-y-0.5 min-w-0 pr-2 cursor-pointer flex-1"
                        >
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-white/10 text-[#5A6E85] dark:text-slate-300 rounded">{phrase.category}</span>
                          <div className="text-xs font-medium text-[#0A1937] dark:text-white line-clamp-2 mt-1">{phrase.text}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingPhraseIndex(realIndex);
                              setPhraseInputText(phrase.text);
                              setPhraseInputCategory(phrase.category);
                              setPhraseModalOpen(true);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1 text-xs font-semibold"
                            title="Edit Frasa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setPhrasesList(prev => prev.filter((_, i) => i !== realIndex));
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 text-xs font-semibold"
                            title="Hapus Frasa"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Add/Edit Phrase */}
              {phraseModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-xl">
                    <h3 className="text-sm font-bold font-heading text-slate-900">
                      {editingPhraseIndex !== null ? 'Edit Frasa Cepat' : 'Tambah Frasa Cepat Baru'}
                    </h3>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Kategori</label>
                      <input 
                        type="text"
                        value={phraseInputCategory}
                        onChange={(e) => setPhraseInputCategory(e.target.value)}
                        placeholder="Contoh: 🚨 Darurat, 🍣 Makanan"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">Teks Frasa</label>
                      <textarea
                        value={phraseInputText}
                        onChange={(e) => setPhraseInputText(e.target.value)}
                        placeholder="Tulis frasa praktis..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setPhraseModalOpen(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => {
                          if (!phraseInputText.trim()) return;
                          if (editingPhraseIndex !== null) {
                            setPhrasesList(prev => prev.map((p, i) => i === editingPhraseIndex ? { category: phraseInputCategory.trim() || '🗣️ Dasar', text: phraseInputText.trim() } : p));
                          } else {
                            setPhrasesList(prev => [...prev, { category: phraseInputCategory.trim() || '🗣️ Dasar', text: phraseInputText.trim() }]);
                          }
                          setPhraseModalOpen(false);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: KALCER (CURATED LOCAL SPOTS & GEOLOCATION) */}
          {/* ==================================================== */}
          {activeTab === 'kalcer' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold font-heading text-[#0A1937] dark:text-white">Spot Kalcer 📍</h1>
                  {userLocation && (
                    <p className="text-[11px] text-[#5A6E85] dark:text-slate-400 font-mono mt-0.5">
                      GPS: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                    </p>
                  )}
                </div>
                <button
                  onClick={requestUserLocation}
                  disabled={locatingUser}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border flex items-center gap-1.5 shadow-2xs transition cursor-pointer ${
                    userLocation && !locatingUser
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20'
                  }`}
                >
                  <Navigation size={12} className={locatingUser ? "animate-spin" : (userLocation ? "text-emerald-500 animate-pulse" : "")} />
                  <span>{locatingUser ? 'Mencari...' : 'GPS'}</span>
                </button>
              </div>

              {/* Category Filter Chips & Add Category */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {SPOT_CATEGORIES.concat(customCategories).map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleSpotFilterChange(c.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition cursor-pointer ${
                      spotFilter === c.id
                        ? 'bg-gradient-to-r from-[#FF0025] to-[#FDA22B] text-white shadow-xs'
                        : 'bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[#0A1937] dark:text-white hover:bg-slate-50 dark:hover:bg-white/15'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowAddCatModal(true)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 whitespace-nowrap transition shadow-2xs cursor-pointer"
                >
                  + Kategori
                </button>
              </div>

              {/* Spot Cards */}
              <div className="space-y-3">
                {loadingSpots ? (
                  <div className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 text-center text-xs text-[#5A6E85] dark:text-slate-400">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-red-500" />
                    <span>Mencari spot terdekat via Google Places API...</span>
                  </div>
                ) : spotsList.length === 0 ? (
                  <div className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 text-center text-xs text-[#5A6E85] dark:text-slate-400">
                    {userLocation ? 'Tidak ada spot ditemukan. Coba kategori lain.' : 'Tekan GPS Saya untuk mencari spot di sekitar Anda.'}
                  </div>
                ) : (
                  spotsList.map(s => (
                    <div key={s.id} className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-sm space-y-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">{s.icon || '📍'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="text-sm font-bold text-[#0A1937] dark:text-white truncate font-heading">{s.name}</div>
                            {s.openNow !== null && s.openNow !== undefined && (
                              s.openNow ? (
                                <span className="status-badge-buka shrink-0">
                                  🟢 Buka
                                </span>
                              ) : (
                                <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                                  🔴 Tutup
                                </span>
                              )
                            )}
                          </div>
                          <div className="text-xs text-[#5A6E85] dark:text-slate-400 mt-0.5 line-clamp-1">{s.desc}</div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded border border-red-500/20">{s.rating}</span>
                            <span className="text-[11px] text-[#5A6E85] dark:text-slate-400 font-medium">
                              💬 {(s.userRatingCount || (s.reviews ? s.reviews.length : 0)).toLocaleString('id-ID')} ulasan
                            </span>
                            <span className="text-xs font-medium text-slate-400">📍 {s.dist}</span>
                          </div>
                        </div>
                      </div>
                      {s.reviews && s.reviews.length > 0 && (
                        <div className="bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl p-2.5 space-y-1.5 text-xs">
                          <div className="text-[11px] font-bold text-[#5A6E85] dark:text-slate-400 flex items-center gap-1">
                            💬 Top 3 Komentar:
                          </div>
                          {s.reviews.slice(0, 3).map((rev, idx) => (
                            <div key={idx} className="text-[#0A1937] dark:text-slate-300 text-[11px] leading-snug">
                              <span className="font-semibold text-red-600 dark:text-red-400">{rev.author || 'Pengunjung'}:</span> "{rev.text}"
                            </div>
                          ))}
                        </div>
                      )}
                      <a 
                        href={s.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-slate-100/70 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[#0A1937] dark:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-white/15 transition"
                      >
                        <span>Buka Rute Google Maps</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Add Custom Category */}
              {showAddCatModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
                  <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-xl">
                    <h3 className="text-sm font-bold font-heading text-slate-900">Tambah Kategori Spot Baru</h3>
                    <p className="text-xs text-slate-500">
                      Masukkan nama kategori (contoh: toys, ramen, souvenirs). Sistem akan mencari atraksi terdekat.
                    </p>
                    <input 
                      type="text"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      placeholder="Nama kategori..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        onClick={() => setShowAddCatModal(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => {
                          if (!newCatInput.trim()) return;
                          const catId = newCatInput.trim().toLowerCase().replace(/\s+/g, '_');
                          const newCatObj = { id: catId, label: `✨ ${newCatInput.trim()}` };
                          setCustomCategories(prev => [...prev, newCatObj]);
                          setNewCatInput('');
                          setShowAddCatModal(false);
                          handleSpotFilterChange(catId);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        Tambah & Cari
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Global Modals (rendered outside tab containers so activeTab restriction doesn't block them) */}
          {/* Modal All Saved History (Ngobrol Tab) */}
          {showAllHistoryModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#001A41] rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                  <div>
                    <h3 className="text-base font-bold text-[#0A1937] dark:text-white">Semua Percakapan Tersimpan</h3>
                    <p className="text-xs text-[#5A6E85] dark:text-slate-400">Klik kartu untuk memuat pesan ke chat box</p>
                  </div>
                  <button 
                    onClick={() => setShowAllHistoryModal(false)}
                    className="p-1 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg text-[#5A6E85] dark:text-slate-300 font-bold text-sm cursor-pointer transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                  {chatHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:border-red-500/40 transition space-y-2 relative"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(item.id);
                        }}
                        className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-red-500/20 text-[#5A6E85] dark:text-slate-300 hover:text-red-600 flex items-center justify-center text-[10px] font-bold transition z-10 cursor-pointer"
                        title="Hapus percakapan tersimpan"
                      >
                        ✕
                      </button>
                      <div className="flex justify-between items-center text-[10px] text-[#5A6E85] dark:text-slate-400 font-medium pl-6">
                        <span>{getLanguageLabel(item.source_language)} → {getLanguageLabel(item.target_language)}</span>
                        <button 
                          onClick={() => playAudio(item.translated_text, item.target_language, `modal-${item.id}`)}
                          className="text-red-600 dark:text-red-400 hover:bg-red-500/10 p-1.5 rounded flex items-center gap-1 font-semibold text-xs cursor-pointer transition"
                        >
                          <Volume2 size={13} className={playingAudioId === `modal-${item.id}` ? 'animate-bounce text-red-600' : ''} /> Play
                        </button>
                      </div>
                      <div className="cursor-pointer space-y-1" onClick={() => { loadItemToChat(item); setShowAllHistoryModal(false); }}>
                        <div className="text-xs font-semibold text-[#0A1937] dark:text-white line-clamp-2">{item.source_text}</div>
                        <div className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-pre-line bg-slate-50 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">{item.translated_text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex justify-end">
                  <button
                    onClick={() => setShowAllHistoryModal(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-[#0A1937] dark:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal All Scan History */}
          {showAllScanHistoryModal && (() => {
            const { slicedItems, totalPages, currentPage, hasPrev, hasNext, totalItems } = getPaginatedScanHistory(allScanHistoryList, scanHistoryPage, 10);
            return (
              <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
                onClick={() => setShowAllScanHistoryModal(false)}
              >
                <div 
                  className="bg-white dark:bg-[#001A41] rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden cursor-default"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-3 bg-slate-50/50 dark:bg-white/5">
                    <button 
                      type="button"
                      onClick={() => setShowAllScanHistoryModal(false)}
                      className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-white/10 hover:bg-slate-300/60 dark:hover:bg-white/20 flex items-center justify-center text-[#5A6E85] dark:text-slate-300 text-sm font-bold transition cursor-pointer shrink-0"
                      title="Tutup Popup"
                      aria-label="Tutup Popup"
                    >
                      ✕
                    </button>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold font-heading text-[#0A1937] dark:text-white truncate">Semua Riwayat Scan Tersimpan</h3>
                      <p className="text-[11px] text-[#5A6E85] dark:text-slate-400">
                        Daftar lengkap hasil scan ({totalItems} item)
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
                    {slicedItems.length === 0 ? (
                      <div className="text-center py-8 text-xs text-[#5A6E85] dark:text-slate-400">Belum ada riwayat scan tersimpan.</div>
                    ) : (
                      slicedItems.map((item, idx) => (
                        <div key={item.id || idx} className="bg-white dark:bg-[#0A1937]/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 flex items-start gap-3 shadow-2xs hover:border-red-500/40 transition">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.product_name} 
                              onClick={() => setPreviewImageUrl(item.image_url)}
                              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-white/10 cursor-pointer hover:opacity-90 transition hover:scale-102" 
                              title="Klik untuk memperbesar gambar"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-300 flex items-center justify-center shrink-0 text-2xl font-bold border border-slate-200/60 dark:border-white/10">
                              📷
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-sm font-bold text-[#0A1937] dark:text-white truncate" title={item.product_name}>{item.product_name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyHistoryTitle(item.product_name, `modal-${item.id || idx}`)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition shrink-0 flex items-center"
                                  title="Salin Nama Produk"
                                >
                                  {copiedHistoryId === `modal-${item.id || idx}` ? (
                                    <Check size={14} className="text-emerald-600 dark:text-emerald-400 font-bold" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              </div>
                              {item.id && (
                                <button
                                  onClick={() => deleteScanHistoryItem(item.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition shrink-0"
                                  title="Hapus riwayat scanner ini"
                                  aria-label="Hapus riwayat scanner"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>

                            <div className="flex items-baseline justify-between gap-2 pt-0.5">
                              <div className="text-xs text-[#5A6E85] dark:text-slate-400 font-medium">
                                {item.price_jpy != null ? `¥${Number(item.price_jpy).toLocaleString('id-ID')}` : '-'}
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
                                  {item.lowest_price_idr != null ? `Rp ${Number(item.lowest_price_idr).toLocaleString('id-ID')}` : 'Harga N/A'}
                                </div>
                                <div className="text-[10px] font-medium text-[#5A6E85] dark:text-slate-400">Estimasi Indo</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A6E85] dark:text-slate-400 pt-0.5">
                              <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                              <div className="flex items-center gap-1.5">
                                {(item.location_name || item.locationName) && (
                                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 border border-emerald-100 dark:border-emerald-500/20">
                                    <span>{getCountryFlagFromCoords(item.latitude, item.longitude, item.location_name || item.locationName)}</span>
                                    <span className="truncate max-w-[100px]">{item.location_name || item.locationName}</span>
                                  </span>
                                )}
                                {item.latitude != null && item.longitude != null && (
                                  <a
                                    href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-md font-semibold text-[10px] flex items-center gap-0.5 transition border border-blue-100 dark:border-blue-500/20"
                                    title="Buka Lokasi Scan di Google Maps"
                                  >
                                    Maps ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
                    {totalItems > 10 ? (
                      <div className="flex items-center gap-2">
                        <button
                          disabled={!hasPrev}
                          onClick={() => setScanHistoryPage(prev => Math.max(prev - 1, 1))}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200/60 dark:bg-white/10 text-[#0A1937] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-300/60 dark:hover:bg-white/20 transition cursor-pointer"
                        >
                          ← Prev
                        </button>
                        <span className="text-xs text-[#5A6E85] dark:text-slate-400 font-medium">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          disabled={!hasNext}
                          onClick={() => setScanHistoryPage(prev => Math.min(prev + 1, totalPages))}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200/60 dark:bg-white/10 text-[#0A1937] dark:text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-300/60 dark:hover:bg-white/20 transition cursor-pointer"
                        >
                          Next →
                        </button>
                      </div>
                    ) : (
                      <div />
                    )}
                    <button
                      onClick={() => setShowAllScanHistoryModal(false)}
                      className="px-4 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-[#0A1937] dark:text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </main>

        {/* Bottom Navigation */}
        <nav className="sticky bottom-0 left-0 right-0 h-16 sm:h-20 bg-white/95 dark:bg-[#001A41]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 flex items-center justify-around px-2 z-30 shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <button 
            onClick={() => setActiveTab('valas')}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
              activeTab === 'valas' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            <ArrowRightLeft size={20} />
            <span className="text-[11px]">Valas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
              activeTab === 'scanner' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            <Camera size={20} />
            <span className="text-[11px]">Scanner</span>
          </button>

          <button 
            onClick={() => setActiveTab('ngobrol')}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
              activeTab === 'ngobrol' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            <MessageSquare size={20} />
            <span className="text-[11px]">Ngobrol</span>
          </button>

          <button 
            onClick={() => setActiveTab('kalcer')}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-1 py-1 px-3 rounded-xl transition cursor-pointer ${
              activeTab === 'kalcer' ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
            }`}
          >
            <MapPin size={20} />
            <span className="text-[11px]">Kalcer</span>
          </button>
        </nav>

        {/* Modal Image Lightbox Preview (Global Root Level) */}
        {previewImageUrl && (
          <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn cursor-pointer"
            onClick={() => setPreviewImageUrl(null)}
          >
            <div 
              className="relative max-w-2xl w-full bg-slate-950 rounded-2xl p-2 border border-slate-800 shadow-2xl overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center text-base font-bold transition z-10 border border-slate-700/50"
                title="Tutup gambar"
              >
                ✕
              </button>
              <img 
                src={previewImageUrl} 
                alt="Pratinjau Hasil Scan" 
                className="w-full max-h-[75vh] object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        )}

        {/* Modal PWA Install Guide */}
        {showPwaInstallModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="text-blue-600" size={20} />
                  <h3 className="text-sm font-bold text-slate-900">Pasang Travel Assistant</h3>
                </div>
                <button onClick={() => setShowPwaInstallModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>
              
              <div className="space-y-3 text-xs text-slate-600">
                {isInstallable ? (
                  <div className="p-3 bg-blue-50 text-blue-800 rounded-xl font-medium">
                    Klik tombol di bawah untuk memasang aplikasi ke layar utama perangkat Anda.
                  </div>
                ) : isIos ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-800">Cara pasang di iPhone / iPad (Safari):</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600">
                      <li>Buka menu <span className="font-bold">Share (Bagikan)</span> 📤 di Safari.</li>
                      <li>Pilih <span className="font-bold">"Tambah ke Layar Utama" (Add to Home Screen)</span> ➕.</li>
                      <li>Tekan <span className="font-bold">Tambah</span>.</li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-800">Cara pasang di Android / Chrome:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600">
                      <li>Buka menu tiga titik (⋮) di pojok kanan atas browser.</li>
                      <li>Pilih <span className="font-bold">"Instal aplikasi"</span> atau <span className="font-bold">"Tambahkan ke Layar Utama"</span>.</li>
                    </ol>
                  </div>
                )}
              </div>

              {isInstallable && (
                <button
                  onClick={handleInstallPwa}
                  className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition"
                >
                  Pasang Sekarang
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
