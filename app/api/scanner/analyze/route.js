import { NextResponse } from 'next/server.js';
import { analyzeProductImage } from '../../../../server/ai/scanner.js';
import { verifyToken } from '../../../../server/auth.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]*={0,2})$/;

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

export function createAnalyzeHandler({ analyze = analyzeProductImage, authenticate = verifyToken } = {}) {
  return async function POST(request) {
    let auth = null;
    try {
      auth = authenticate(request);
    } catch {
      auth = null;
    }
    if (!auth || auth.role !== 'owner') {
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

    const lat = body?.latitude != null ? Number(body.latitude) : null;
    const lng = body?.longitude != null ? Number(body.longitude) : null;
    const locName = body?.location_name || (lat && lng ? `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})` : null);

    const item = {
      id: `scan-${Date.now()}`,
      product_name: analysis.product_name,
      brand: analysis.brand,
      model: analysis.model,
      price_jpy: analysis.price_jpy,
      lowest_price_idr: analysis.lowest_price_idr,
      average_price_idr: analysis.average_price_idr,
      currency: analysis.currency || 'JPY',
      marketplace: analysis.marketplace,
      marketplace_url: analysis.marketplace_url,
      tokopedia_url: analysis.tokopedia_url,
      shopee_url: analysis.shopee_url,
      confidence: analysis.confidence,
      estimate_note: analysis.estimate_note,
      is_estimate: true,
      latitude: lat,
      longitude: lng,
      location_name: locName,
      created_at: new Date().toISOString()
    };

    return NextResponse.json({ success: true, item }, { status: 200 });
  };
}

export const POST = createAnalyzeHandler();
