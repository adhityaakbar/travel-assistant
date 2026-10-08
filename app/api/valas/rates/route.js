import { NextResponse } from 'next/server';
import axios from 'axios';

export const CURRENCIES = ['JPY', 'USD', 'SGD', 'KRW', 'EUR', 'GBP', 'AUD', 'CNY', 'THB', 'MYR'];

let cachedRates = null;
let lastFetched = 0;

export const dynamic = 'force-dynamic';

async function fetchBcaRates() {
  const res = await axios.get('https://www.bca.co.id/id/informasi/kurs', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    timeout: 7000,
  });

  const html = res.data || '';
  const matches = [...html.matchAll(/data-value-buy="([^"]+)"[\s\S]*?data-value-sell="([^"]+)"[\s\S]*?data-text=([A-Z]{3})/g)];

  if (!matches.length) throw new Error('Data BCA e-Rate tidak ditemukan');

  const bcaIdrRates = {};
  for (const match of matches) {
    const code = match[3] === 'CNH' ? 'CNY' : match[3];
    const buy = parseFloat(match[1].split('-')[0].replace(/,/g, ''));
    const sell = parseFloat(match[2].split('-')[0].replace(/,/g, ''));
    if (code && Number.isFinite(buy) && Number.isFinite(sell) && buy > 0 && sell > 0) {
      bcaIdrRates[code] = (buy + sell) / 2;
    }
  }

  const jpyIdr = bcaIdrRates.JPY;
  if (!jpyIdr || jpyIdr <= 0) throw new Error('Kurs JPY BCA tidak valid');

  const rates = {
    IDR: jpyIdr,
    JPY: 1,
  };

  for (const curr of CURRENCIES) {
    if (curr === 'JPY') continue;
    const currIdr = bcaIdrRates[curr];
    if (currIdr && currIdr > 0) {
      rates[curr] = jpyIdr / currIdr;
    }
  }

  return {
    base: 'JPY',
    source: 'bca',
    lastUpdated: new Date().toISOString(),
    rates,
  };
}

async function fetchFallbackRates() {
  const response = await axios.get(process.env.CURRENCY_API_URL || 'https://open.er-api.com/v6/latest/JPY', { timeout: 8000 });
  const rates = response.data?.rates || {};
  return {
    base: 'JPY',
    source: 'fallback',
    lastUpdated: new Date().toISOString(),
    rates: {
      IDR: Number(rates.IDR) || 0,
      ...Object.fromEntries(CURRENCIES.map((currency) => [currency, Number(rates[currency]) || (currency === 'JPY' ? 1 : 0)])),
    },
  };
}

export async function GET() {
  if (cachedRates && Date.now() - lastFetched < 300000) {
    return NextResponse.json(cachedRates);
  }

  try {
    const data = await fetchBcaRates();
    cachedRates = data;
    lastFetched = Date.now();
    return NextResponse.json(data);
  } catch {
    try {
      const fallbackData = await fetchFallbackRates();
      cachedRates = fallbackData;
      lastFetched = Date.now();
      return NextResponse.json(fallbackData);
    } catch {
      cachedRates ||= {
        base: 'JPY',
        source: 'error',
        lastUpdated: new Date().toISOString(),
        rates: { IDR: 0, ...Object.fromEntries(CURRENCIES.map((currency) => [currency, currency === 'JPY' ? 1 : 0])) },
      };
      return NextResponse.json(cachedRates);
    }
  }
}
