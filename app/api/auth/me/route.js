import { NextResponse } from 'next/server';
import { verifyToken } from '../../../../server/auth.js';

export function GET(request) {
  try {
    const user = verifyToken(request);
    if (!user) return NextResponse.json({ error: 'Token autentikasi tidak ditemukan' }, { status: 401 });
    return NextResponse.json({ user: { role: user.role || 'owner' } });
  } catch {
    return NextResponse.json({ error: 'Sesi kedaluwarsa atau token tidak valid' }, { status: 403 });
  }
}
