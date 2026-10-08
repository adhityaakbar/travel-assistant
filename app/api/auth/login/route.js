import { NextResponse } from 'next/server';
import { createToken } from '../../../../server/auth.js';

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Payload tidak valid' }, { status: 400 });
  }
  const { secret } = body || {};
  if (!secret) return NextResponse.json({ error: 'Secret wajib diisi' }, { status: 400 });

  const token = createToken(secret);
  if (!token) return NextResponse.json({ error: 'Secret salah' }, { status: 401 });

  return NextResponse.json({ success: true, message: 'Login berhasil', token, user: { role: 'owner' } });
}
