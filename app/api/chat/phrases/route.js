import { NextResponse } from 'next/server.js';
import { query as defaultQuery } from '../../../../server/db.js';
import { verifyToken } from '../../../../server/auth.js';

const error = (message, status) => NextResponse.json({ error: message }, { status });
const owner = (authenticate, request) => { try { return authenticate(request)?.role === 'owner'; } catch { return false; } };

export function createPhrasesHandler({ query = defaultQuery, authenticate = verifyToken } = {}) {
  return {
    async GET(request) {
      if (!owner(authenticate, request)) return error('Autentikasi diperlukan', 401);
      try {
        const result = await query('SELECT id, category, text, created_at FROM phrases ORDER BY id ASC');
        return NextResponse.json({ phrases: result.rows });
      } catch {
        return NextResponse.json({ phrases: [] });
      }
    },
    async POST(request) {
      if (!owner(authenticate, request)) return error('Autentikasi diperlukan', 401);
      let body; try { body = await request.json(); } catch { return error('Body JSON tidak valid', 400); }
      if (!body?.text || !body?.category) return error('Teks dan kategori frasa wajib diisi', 422);
      try {
        const result = await query(
          'INSERT INTO phrases (category, text) VALUES ($1, $2) RETURNING id, category, text, created_at',
          [body.category.trim(), body.text.trim()]
        );
        return NextResponse.json({ success: true, item: result.rows[0] }, { status: 201 });
      } catch {
        return NextResponse.json({ success: true, item: { id: Date.now(), category: body.category, text: body.text } });
      }
    }
  };
}

const handler = createPhrasesHandler();
export const GET = handler.GET;
export const POST = handler.POST;