import { NextResponse } from 'next/server.js';
import { query } from '../../../../server/db.js';
import { verifyToken } from '../../../../server/auth.js';

const INSERT_WITH_IMAGE = `INSERT INTO scan_history (
  product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr,
  currency, marketplace, marketplace_url, tokopedia_url, shopee_url,
  confidence, estimate_note, is_estimate, latitude, longitude, location_name, image_url
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
RETURNING id, product_name, brand, model, price_jpy, lowest_price_idr,
  average_price_idr, currency, marketplace, marketplace_url, tokopedia_url,
  shopee_url, confidence, estimate_note, is_estimate, latitude, longitude, location_name, image_url, created_at`;

const INSERT_NO_IMAGE = `INSERT INTO scan_history (
  product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr,
  currency, marketplace, marketplace_url, tokopedia_url, shopee_url,
  confidence, estimate_note, is_estimate, latitude, longitude, location_name
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
RETURNING id, product_name, brand, model, price_jpy, lowest_price_idr,
  average_price_idr, currency, marketplace, marketplace_url, tokopedia_url,
  shopee_url, confidence, estimate_note, is_estimate, latitude, longitude, location_name, created_at`;

export let inMemoryScanHistory = [];

export function createHistoryHandler({ authenticate = verifyToken, query: runQuery = query } = {}) {
  return async function GET(request) {
    try {
      const auth = authenticate(request);
      if (!auth || auth.role !== 'owner') return NextResponse.json({ error: 'Autentikasi diperlukan' }, { status: 401 });
      try {
        let result;
        try {
          result = await runQuery(`SELECT id, product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr, currency, marketplace, marketplace_url, tokopedia_url, shopee_url, confidence, estimate_note, is_estimate, latitude, longitude, location_name, image_url, created_at FROM scan_history ORDER BY created_at DESC LIMIT 10`);
        } catch {
          result = await runQuery(`SELECT id, product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr, currency, marketplace, marketplace_url, tokopedia_url, shopee_url, confidence, estimate_note, is_estimate, latitude, longitude, location_name, created_at FROM scan_history ORDER BY created_at DESC LIMIT 10`);
        }
        const rows = result?.rows || [];
        const dbIds = new Set(rows.map(r => String(r.id)));
        const combined = [...rows, ...inMemoryScanHistory.filter(m => !dbIds.has(String(m.id)))];
        return NextResponse.json({ history: combined });
      } catch {
        return NextResponse.json({ history: inMemoryScanHistory });
      }
    } catch {
      return NextResponse.json({ error: 'Gagal memuat riwayat scan' }, { status: 500 });
    }
  };
}

export function createHistoryPostHandler({ authenticate = verifyToken, query: runQuery = query } = {}) {
  return async function POST(request) {
    try {
      const auth = authenticate(request);
      if (!auth || auth.role !== 'owner') return NextResponse.json({ error: 'Autentikasi diperlukan' }, { status: 401 });
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 });
      }
      if (!body?.product_name) {
        return NextResponse.json({ error: 'product_name wajib diisi' }, { status: 400 });
      }
      const valuesWithImage = [
        body.product_name, body.brand || null, body.model || null, body.price_jpy || null,
        body.lowest_price_idr || null, body.average_price_idr || null, body.currency || 'JPY',
        body.marketplace || null, body.marketplace_url || null, body.tokopedia_url || null,
        body.shopee_url || null, body.confidence || 0.9, body.estimate_note || null, true,
        body.latitude || null, body.longitude || null, body.location_name || null, body.image_url || null
      ];
      let savedItem;
      try {
        try {
          const result = await runQuery(INSERT_WITH_IMAGE, valuesWithImage);
          savedItem = result.rows[0];
        } catch {
          const result = await runQuery(INSERT_NO_IMAGE, valuesWithImage.slice(0, 17));
          savedItem = { ...result.rows[0], image_url: body.image_url || null };
        }
      } catch {
        savedItem = {
          id: `scan-${Date.now()}`,
          ...body,
          created_at: new Date().toISOString()
        };
      }
      inMemoryScanHistory.unshift(savedItem);
      return NextResponse.json({ success: true, item: savedItem }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Gagal menyimpan riwayat scan' }, { status: 500 });
    }
  };
}

export const GET = createHistoryHandler();
export const POST = createHistoryPostHandler();
