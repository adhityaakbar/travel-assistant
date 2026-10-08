import { NextResponse } from 'next/server.js';
import { analyzeProductImage } from '../../../../server/ai/scanner.js';
import { query } from '../../../../server/db.js';
import { verifyToken } from '../../../../server/auth.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]*={0,2})$/;
const INSERT = `INSERT INTO scan_history (
  product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr,
  currency, marketplace, marketplace_url, tokopedia_url, shopee_url,
  confidence, estimate_note, is_estimate
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING id, product_name, brand, model, price_jpy, lowest_price_idr,
  average_price_idr, currency, marketplace, marketplace_url, tokopedia_url,
  shopee_url, confidence, estimate_note, is_estimate, created_at`;

function validateImageDataUrl(value) {
  if (typeof value !== 'string' || !value) return { status: 400, error: 'image_data_url wajib diisi' };
  const match = IMAGE_DATA_URL.exec(value);
  if (!match) return { status: 415, error: 'Format gambar harus JPEG, PNG, atau WebP' };
  const base64 = match[2];
  if (!base64 || base64.length % 4 !== 0) {
    return { status: 400, error: 'Data gambar base64 tidak valid' };
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const decodedBytes = (base64.length / 4) * 3 - padding;
  if (decodedBytes > MAX_IMAGE_BYTES) return { status: 413, error: 'Ukuran gambar maksimal 8 MB' };
  return null;
}

export function createAnalyzeHandler({ analyze = analyzeProductImage, query: runQuery = query, authenticate = verifyToken } = {}) {
  return async function POST(request) {
    try {
      const auth = authenticate(request);
      if (!auth || auth.role !== 'owner') throw new Error('unauthorized'); } catch {
      return NextResponse.json({ error: 'Autentikasi diperlukan' }, { status: 401 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON tidak valid' }, { status: 400 });
    }

    const validation = validateImageDataUrl(body?.image_data_url);
    if (validation) return NextResponse.json({ error: validation.error }, { status: validation.status });

    let analysis;
    try {
      analysis = await analyze({ imageDataUrl: body.image_data_url });
    } catch {
      return NextResponse.json({ error: 'Gagal menganalisis gambar' }, { status: 502 });
    }

    const values = [
      analysis.product_name, analysis.brand, analysis.model, analysis.price_jpy,
      analysis.lowest_price_idr, analysis.average_price_idr, analysis.currency,
      analysis.marketplace, analysis.marketplace_url, analysis.tokopedia_url,
      analysis.shopee_url, analysis.confidence, analysis.estimate_note, true,
    ];

    try {
      const result = await runQuery(INSERT, values);
      return NextResponse.json({ success: true, item: result.rows[0] }, { status: 201 });
    } catch {
      return NextResponse.json({ error: 'Gagal menyimpan hasil scan' }, { status: 500 });
    }
  };
}

export const POST = createAnalyzeHandler();
