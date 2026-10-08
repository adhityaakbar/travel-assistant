import { NextResponse } from 'next/server.js';
import { query as defaultQuery } from '../../../../server/db.js';
import { verifyToken } from '../../../../server/auth.js';

const fields = ['source_text', 'source_language', 'translated_text', 'target_language'];
const error = (message, status) => NextResponse.json({ error: message }, { status });
const owner = (authenticate, request) => { try { return authenticate(request)?.role === 'owner'; } catch { return false; } };
const valid = (value) => typeof value === 'string' && value.trim();

export function createHistoryHandler({ query = defaultQuery, authenticate = verifyToken } = {}) {
  return {
    async GET(request) {
      if (!owner(authenticate, request)) return error('Autentikasi diperlukan', 401);
      try { const result = await query('SELECT id, source_text, source_language, translated_text, target_language, created_at FROM conversations ORDER BY created_at DESC, id DESC'); return NextResponse.json({ history: result.rows }); } catch { return error('Gagal memuat riwayat percakapan', 500); }
    },
    async POST(request) {
      if (!owner(authenticate, request)) return error('Autentikasi diperlukan', 401);
      let body; try { body = await request.json(); } catch { return error('Body JSON tidak valid', 400); }
      if (fields.some((field) => !valid(body?.[field]))) return error('Semua data percakapan wajib diisi', 422);
      try { const result = await query('INSERT INTO conversations (source_text, source_language, translated_text, target_language) VALUES ($1, $2, $3, $4) RETURNING id, source_text, source_language, translated_text, target_language, created_at', fields.map((field) => body[field].trim())); return NextResponse.json({ success: true, item: result.rows[0] }, { status: 201 }); } catch { return error('Gagal menyimpan riwayat percakapan', 500); }
    },
    async DELETE(request, { params }) {
      if (!owner(authenticate, request)) return error('Autentikasi diperlukan', 401);
      if (typeof params?.id !== 'string' || !/^[1-9]\d*$/.test(params.id) || !Number.isSafeInteger(Number(params.id))) return error('ID riwayat tidak valid', 400);
      try { const result = await query('DELETE FROM conversations WHERE id = $1', [Number(params.id)]); if (!result.rowCount) return error('Riwayat tidak ditemukan', 404); return NextResponse.json({ success: true }); } catch { return error('Gagal menghapus riwayat percakapan', 500); }
    },
  };
}
const handler = createHistoryHandler();
export const GET = handler.GET;
export const POST = handler.POST;
export const DELETE = handler.DELETE;
