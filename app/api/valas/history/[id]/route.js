import { NextResponse } from 'next/server.js';
import { query as defaultQuery } from '../../../../../server/db.js';
import { CURRENCIES } from '../../../../../src/valas.js';
import { verifyToken } from '../../../../../server/auth.js';

const SUPPORTED_CURRENCIES = new Set([...CURRENCIES, 'IDR']);
const UPDATE_SQL = `UPDATE conversions
SET from_currency = $1, to_currency = $2, from_amount = $3, to_amount = $4, exchange_rate = $5, note = $6
WHERE id = $7
RETURNING id, from_currency, to_currency, from_amount, to_amount, exchange_rate, note, created_at`;

function error(message, status) {
  return NextResponse.json({ error: message }, { status });
}

function parseId(id) {
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) return null;
  const value = Number(id);
  return Number.isSafeInteger(value) ? value : null;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 'Payload tidak valid';
  if (!SUPPORTED_CURRENCIES.has(payload.from_currency) || !SUPPORTED_CURRENCIES.has(payload.to_currency)) return 'Mata uang tidak didukung';
  if (['from_amount', 'to_amount'].some((key) => typeof payload[key] !== 'number' || !Number.isFinite(payload[key]) || payload[key] < 0)
    || typeof payload.exchange_rate !== 'number' || !Number.isFinite(payload.exchange_rate) || payload.exchange_rate <= 0) {
    return 'Nilai numerik harus berupa angka finite non-negatif';
  }
  if (payload.note !== undefined && typeof payload.note !== 'string') return 'Catatan harus berupa teks';
  return null;
}

function isOwner(auth) { return auth?.role === 'owner'; }

export function createHistoryHandler({ query = defaultQuery, authenticate = verifyToken } = {}) {
  const requireAuth = (request) => {
    try { return authenticate(request); } catch { return null; }
  };
  return {
    async PATCH(request, { params }) {
      if (!isOwner(requireAuth(request))) return error('Autentikasi diperlukan', 401);
      const id = parseId(params?.id);
      if (id === null) return error('ID riwayat tidak valid', 400);

      let payload;
      try { payload = await request.json(); } catch { return error('Payload tidak valid', 400); }
      const validationError = validatePayload(payload);
      if (validationError) return error(validationError, validationError === 'Payload tidak valid' ? 400 : 422);

      try {
        const result = await query(UPDATE_SQL, [
          payload.from_currency, payload.to_currency, payload.from_amount,
          payload.to_amount, payload.exchange_rate, payload.note ?? '', id,
        ]);
        if (!result.rowCount) return error('Riwayat tidak ditemukan', 404);
        return NextResponse.json({ success: true, item: result.rows[0] });
      } catch { return error('Gagal memperbarui riwayat', 500); }
    },

    async DELETE(request, { params }) {
      if (!isOwner(requireAuth(request))) return error('Autentikasi diperlukan', 401);
      const id = parseId(params?.id);
      if (id === null) return error('ID riwayat tidak valid', 400);
      try {
        const result = await query('DELETE FROM conversions WHERE id = $1', [id]);
        if (!result.rowCount) return error('Riwayat tidak ditemukan', 404);
        return NextResponse.json({ success: true });
      } catch { return error('Gagal menghapus riwayat', 500); }
    },
  };
}

const handler = createHistoryHandler();
export const PATCH = handler.PATCH;
export const DELETE = handler.DELETE;
