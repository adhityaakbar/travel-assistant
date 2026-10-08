import { NextResponse } from 'next/server.js';
import { query } from '../../../../server/db.js';
import { verifyToken } from '../../../../server/auth.js';

export function createHistoryHandler({ authenticate = verifyToken, query: runQuery = query } = {}) {
  return async function GET(request) {
    try {
      const auth = authenticate(request);
      if (!auth || auth.role !== 'owner') return NextResponse.json({ error: 'Autentikasi diperlukan' }, { status: 401 });
      const result = await runQuery(`SELECT id, product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr, currency, marketplace, marketplace_url, tokopedia_url, shopee_url, confidence, estimate_note, is_estimate, created_at FROM scan_history ORDER BY created_at DESC LIMIT 10`);
      return NextResponse.json({ history: result.rows });
    } catch {
      return NextResponse.json({ error: 'Gagal memuat riwayat scan' }, { status: 500 });
    }
  };
}

export const GET = createHistoryHandler();

export async function POST() {
  return NextResponse.json({ error: 'Gunakan /api/scanner/analyze untuk menyimpan hasil scan' }, { status: 405 });
}
