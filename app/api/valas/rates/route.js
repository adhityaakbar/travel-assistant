import { NextResponse } from 'next/server';
import axios from 'axios';

export const CURRENCIES = ['JPY', 'USD', 'SGD', 'KRW', 'EUR', 'GBP', 'AUD', 'CNY', 'THB', 'MYR'];

let cachedRates;
let lastFetched = 0;

export const dynamic = 'force-dynamic';

export async function GET() {
  if (cachedRates && Date.now() - lastFetched < 600000) return NextResponse.json(cachedRates);
  try {
    const response = await axios.get(process.env.CURRENCY_API_URL || 'https://open.er-api.com/v6/latest/JPY', { timeout: 8000 });
    const rates = response.data?.rates || {};
    cachedRates = { base: 'JPY', lastUpdated: new Date().toISOString(), rates: { IDR: Number(rates.IDR) || 0, ...Object.fromEntries(CURRENCIES.map(currency => [currency, Number(rates[currency]) || (currency === 'JPY' ? 1 : 0)])) } };
    lastFetched = Date.now();
  } catch { cachedRates ||= { base: 'JPY', lastUpdated: new Date().toISOString(), rates: { IDR: 0, ...Object.fromEntries(CURRENCIES.map(currency => [currency, currency === 'JPY' ? 1 : 0])) } }; }
  return NextResponse.json(cachedRates);
}
