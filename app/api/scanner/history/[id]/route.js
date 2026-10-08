import { NextResponse } from 'next/server.js';
import { query as defaultQuery } from '../../../../../server/db.js';
import { verifyToken } from '../../../../../server/auth.js';

const error = (message, status) => NextResponse.json({ error: message }, { status });
const owner = (authenticate, request) => { try { return authenticate(request)?.role === 'owner'; } catch { return false; } };

export function createScannerHistoryDeleteHandler({ query = defaultQuery, authenticate = verifyToken } = {}) {
  return async function DELETE(request, { params }) {
    if (!owner(authenticate, request)) return error('Autentikasi diperlukan', 401);
    if (typeof params?.id !== 'string' || !/^[1-9]\d*$/.test(params.id) || !Number.isSafeInteger(Number(params.id))) {
      return error('ID riwayat scanner tidak valid', 400);
    }
    try {
      const result = await query('DELETE FROM scan_history WHERE id = $1', [Number(params.id)]);
      if (!result.rowCount) return error('Riwayat scanner tidak ditemukan', 404);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: 'Gagal menghapus riwayat scanner', status: 500 });
    }
  };
}

const handler = createScannerHistoryDeleteHandler();
export const DELETE = handler;