import { NextResponse } from 'next/server.js';
import { query as defaultQuery } from '../../../../server/db.js';
import { CURRENCIES } from '../../../../src/valas.js';
import { verifyToken } from '../../../../server/auth.js';

const SUPPORTED_CURRENCIES = new Set([...CURRENCIES, 'IDR']);
const numericError = 'Nilai numerik harus berupa angka finite non-negatif';

function error(message, status) { return NextResponse.json({ error: message }, { status }); }

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'Payload tidak valid';
  if (!SUPPORTED_CURRENCIES.has(payload.from_currency) || !SUPPORTED_CURRENCIES.has(payload.to_currency)) return 'Mata uang tidak didukung';
  if (['from_amount', 'to_amount'].some((key) => typeof payload[key] !== 'number' || !Number.isFinite(payload[key]) || payload[key] < 0)
    || typeof payload.exchange_rate !== 'number' || !Number.isFinite(payload.exchange_rate) || payload.exchange_rate <= 0) return numericError;
  if (payload.note !== undefined && typeof payload.note !== 'string') return 'Catatan harus berupa teks';
  return null;
}

function isOwner(auth) { return auth?.role === 'owner'; }

export function createCollectionHandler({ query = defaultQuery, authenticate = verifyToken } = {}) {
  const requireAuth = (request) => {
    try { return authenticate(request); } catch { return null; }
  };
  return {
    async GET(request) {
      if (!isOwner(requireAuth(request))) return error('Autentikasi diperlukan', 401);
      try {
        const result = await query('SELECT id, from_currency, to_currency, from_amount, to_amount, exchange_rate, note, created_at FROM conversions ORDER BY created_at DESC LIMIT 10');
        return NextResponse.json({ history: result.rows });
      } catch { return error('Gagal memuat riwayat', 500); }
    },
    async POST(request) {
      if (!isOwner(requireAuth(request))) return error('Autentikasi diperlukan', 401);
      let payload;
      try { payload = await request.json(); } catch { return error('Payload tidak valid', 400); }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return error('Payload tidak valid', 400);
      const from_currency = Object.hasOwn(payload, 'from_currency') ? payload.from_currency : 'JPY';
      const to_currency = Object.hasOwn(payload, 'to_currency') ? payload.to_currency : 'IDR';
      const validationError = validatePayload({ ...payload, from_currency, to_currency });
      if (validationError) return error(validationError, validationError === 'Payload tidak valid' ? 400 : 422);
      try {
        const result = await query('INSERT INTO conversions (from_currency, to_currency, from_amount, to_amount, exchange_rate, note) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [from_currency, to_currency, payload.from_amount, payload.to_amount, payload.exchange_rate, payload.note ?? '']);
        return NextResponse.json({ success: true, item: result.rows[0] }, { status: 201 });
      } catch { return error('Gagal menyimpan riwayat', 500); }
    },
  };
}

const handler = createCollectionHandler();
export const GET = handler.GET;
export const POST = handler.POST;
