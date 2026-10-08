import { NextResponse } from 'next/server.js';
import { translateText as defaultTranslate } from '../../../../server/ai/translate.js';
import { verifyToken } from '../../../../server/auth.js';

const error = (message, status) => NextResponse.json({ error: message }, { status });
const valid = (value) => typeof value === 'string' && value.trim();

export function createTranslateHandler({ authenticate = verifyToken, translate = defaultTranslate } = {}) {
  return { async POST(request) {
    try { if (authenticate(request)?.role !== 'owner') return error('Autentikasi diperlukan', 401); } catch { return error('Autentikasi diperlukan', 401); }
    let body; try { body = await request.json(); } catch { return error('Body JSON tidak valid', 400); }
    if (!valid(body?.text) || !valid(body?.source_language) || !valid(body?.target_language)) return error('Teks dan bahasa wajib diisi', 422);
    try {
      const translation = await translate({ text: body.text.trim(), sourceLanguage: body.source_language.trim(), targetLanguage: body.target_language.trim() });
      if (!valid(translation)) return error('Terjemahan kosong', 502);
      return NextResponse.json({ success: true, translation: translation.trim(), source_language: body.source_language.trim(), target_language: body.target_language.trim() });
    } catch { return error('Gagal menerjemahkan teks', 502); }
  } };
}
export const POST = createTranslateHandler().POST;
