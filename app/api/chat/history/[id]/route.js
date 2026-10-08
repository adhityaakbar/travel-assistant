import { NextResponse } from 'next/server.js';
import { query as defaultQuery } from '../../../../../server/db.js';
import { verifyToken } from '../../../../../server/auth.js';

const error = (message, status) => NextResponse.json({ error: message }, { status });
const owner = (authenticate, request) => { try { return authenticate(request)?.role === 'owner'; } catch { return false; } };
const validId = (value) => typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));

export function createHistoryDeleteHandler({ query = defaultQuery, authenticate = verifyToken } = {}) {
  return {
    async DELETE(request, { params }) {
      if (!owner(authenticate, request)) return error('Autentikasi diperlukan', 401);
      if (!validId(params?.id)) return error('ID riwayat tidak valid', 400);
      try {
        const result = await query('DELETE FROM conversations WHERE id = $1', [Number(params.id)]);
        if (!result.rowCount) return error('Riwayat tidak ditemukan', 404);
        return NextResponse.json({ success: true });
      } catch {
        return error('Gagal menghapus riwayat percakapan', 500);
      }
    },
  };
}

const handler = createHistoryDeleteHandler();
export const DELETE = handler.DELETE;
