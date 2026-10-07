import express from 'express';
import axios from 'axios';
import { query } from '../db.js';

const router = express.Router();

let cachedRates = null;
let lastFetchedTime = 0;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Helper to fetch live rates from free currency API
const fetchLiveRates = async () => {
  const now = Date.now();
  if (cachedRates && (now - lastFetchedTime < CACHE_DURATION_MS)) {
    return cachedRates;
  }

  try {
    const apiUrl = process.env.CURRENCY_API_URL || 'https://open.er-api.com/v6/latest/JPY';
    const response = await axios.get(apiUrl, { timeout: 8000 });
    
    if (response.data && response.data.rates) {
      const rates = response.data.rates;
      // 1 JPY = X IDR
      const jpyToIdr = rates.IDR || 105.2;
      const jpyToUsd = rates.USD || 0.0067;
      const jpyToSgd = rates.SGD || 0.0090;
      const jpyToKrw = rates.KRW || 9.15;

      cachedRates = {
        base: 'JPY',
        lastUpdated: new Date().toISOString(),
        rates: {
          IDR: jpyToIdr,
          USD: jpyToUsd,
          SGD: jpyToSgd,
          KRW: jpyToKrw,
          JPY: 1
        }
      };
      lastFetchedTime = now;
      return cachedRates;
    }
  } catch (err) {
    console.warn('Currency API fetch warning:', err.message);
    if (cachedRates) return cachedRates;
  }

  // Fallback default rates
  return {
    base: 'JPY',
    lastUpdated: new Date().toISOString(),
    rates: {
      IDR: 105.2,
      USD: 0.0067,
      SGD: 0.0090,
      KRW: 9.15,
      JPY: 1
    }
  };
};

// GET /api/valas/rates
router.get('/rates', async (req, res) => {
  try {
    const data = await fetchLiveRates();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat kurs: ' + err.message });
  }
});

// GET /api/valas/history
router.get('/history', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, from_currency, to_currency, from_amount, to_amount, exchange_rate, note, created_at 
       FROM conversions 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    res.json({ history: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memuat riwayat: ' + err.message });
  }
});

// POST /api/valas/history
router.post('/history', async (req, res) => {
  try {
    const { from_currency = 'JPY', to_currency = 'IDR', from_amount, to_amount, exchange_rate, note } = req.body;

    const result = await query(
      `INSERT INTO conversions (from_currency, to_currency, from_amount, to_amount, exchange_rate, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [from_currency, to_currency, from_amount, to_amount, exchange_rate, note || 'Konversi Valas']
    );

    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan riwayat: ' + err.message });
  }
});

export default router;
