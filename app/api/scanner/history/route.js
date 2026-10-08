import { NextResponse } from 'next/server.js';
import { query } from '../../../../server/db.js';
import { verifyToken } from '../../../../server/auth.js';
import fs from 'fs';
import path from 'path';

const FALLBACK_FILE = path.join(process.cwd(), 'data', 'scan_history_fallback.json');

function loadFallbackFile() {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      const content = fs.readFileSync(FALLBACK_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch {}
  return [];
}

function saveFallbackFile(list) {
  try {
    const dir = path.dirname(FALLBACK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

export let inMemoryScanHistory = loadFallbackFile();

export function createHistoryHandler({ authenticate = verifyToken, query: runQuery = query } = {}) {
  return async function GET(request) {
    try {
      const auth = authenticate(request);
      if (!auth || auth.role !== 'owner') return NextResponse.json({ error: 'Autentikasi diperlukan' }, { status: 401 });
      try {
        try {
          await runQuery(`CREATE TABLE IF NOT EXISTS scan_history (
            id SERIAL PRIMARY KEY,
            product_name TEXT NOT NULL,
            brand TEXT,
            model TEXT,
            price_jpy NUMERIC,
            lowest_price_idr NUMERIC,
            average_price_idr NUMERIC,
            currency TEXT DEFAULT 'JPY',
            marketplace TEXT,
            marketplace_url TEXT,
            tokopedia_url TEXT,
            shopee_url TEXT,
            confidence NUMERIC,
            estimate_note TEXT,
            is_estimate BOOLEAN DEFAULT TRUE,
            latitude NUMERIC,
            longitude NUMERIC,
            location_name TEXT,
            image_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )`);
          await runQuery(`ALTER TABLE scan_history ADD COLUMN IF NOT EXISTS image_url TEXT`);
        } catch {}

        const url = new URL(request.url);
        const isAll = url.searchParams.get('all') === 'true';
        const reqLimit = parseInt(url.searchParams.get('limit') || '15', 10);
        const limitVal = isAll ? 100 : (isNaN(reqLimit) ? 15 : Math.min(reqLimit, 100));

        let result;
        try {
          result = await runQuery(`SELECT id, product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr, currency, marketplace, marketplace_url, tokopedia_url, shopee_url, confidence, estimate_note, is_estimate, latitude, longitude, location_name, image_url, created_at FROM scan_history ORDER BY created_at DESC LIMIT $1`, [limitVal]);
        } catch {
          result = await runQuery(`SELECT id, product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr, currency, marketplace, marketplace_url, tokopedia_url, shopee_url, confidence, estimate_note, is_estimate, latitude, longitude, location_name, created_at FROM scan_history ORDER BY created_at DESC LIMIT $1`, [limitVal]);
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
          await runQuery(`CREATE TABLE IF NOT EXISTS scan_history (
            id SERIAL PRIMARY KEY,
            product_name TEXT NOT NULL,
            brand TEXT,
            model TEXT,
            price_jpy NUMERIC,
            lowest_price_idr NUMERIC,
            average_price_idr NUMERIC,
            currency TEXT DEFAULT 'JPY',
            marketplace TEXT,
            marketplace_url TEXT,
            tokopedia_url TEXT,
            shopee_url TEXT,
            confidence NUMERIC,
            estimate_note TEXT,
            is_estimate BOOLEAN DEFAULT TRUE,
            latitude NUMERIC,
            longitude NUMERIC,
            location_name TEXT,
            image_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          )`);
          await runQuery(`ALTER TABLE scan_history ADD COLUMN IF NOT EXISTS image_url TEXT`);
        } catch {}

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
      saveFallbackFile(inMemoryScanHistory);
      return NextResponse.json({ success: true, item: savedItem }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Gagal menyimpan riwayat scan' }, { status: 500 });
    }
  };
}

export const GET = createHistoryHandler();
export const POST = createHistoryPostHandler();
