import { NextResponse } from 'next/server.js';
import { query as defaultQuery } from '../../../../../server/db.js';
import { verifyToken } from '../../../../../server/auth.js';

const error = (message, status) => NextResponse.json({ error: message }, { status });
const owner = (authenticate, request) => { try { return authenticate(request)?.role === 'owner'; } catch { return false; } };

export function createScannerHistoryDeleteHandler({ query = defaultQuery, authenticate = verifyToken } = {}) {
  return async function DELETE(request, { params }) {
    if (!owner(authenticate, request)) return error('Autentikasi diperlukan', 401);
    const targetId = params?.id;
    if (!targetId || typeof targetId !== 'string') {
      return error('ID riwayat scanner tidak valid', 400);
    }
    try {
      let isDbDeleted = false;
      if (/^[1-9]\d*$/.test(targetId)) {
        try {
          const result = await query('DELETE FROM scan_history WHERE id = $1', [Number(targetId)]);
          if (result && result.rowCount > 0) isDbDeleted = true;
        } catch {}
      }
      let isMemDeleted = false;
      try {
        const { inMemoryScanHistory } = await import('../route.js');
        const idx = inMemoryScanHistory.findIndex(item => String(item.id) === String(targetId));
        if (idx !== -1) {
          inMemoryScanHistory.splice(idx, 1);
          isMemDeleted = true;
          try {
            const fs = await import('fs');
            const path = await import('path');
            const fallbackFile = path.join(process.cwd(), 'data', 'scan_history_fallback.json');
            fs.writeFileSync(fallbackFile, JSON.stringify(inMemoryScanHistory, null, 2), 'utf-8');
          } catch {}
        }
      } catch {}

      if (!isDbDeleted && !isMemDeleted) {
        return error('Riwayat scanner tidak ditemukan', 404);
      }
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: 'Gagal menghapus riwayat scanner', status: 500 });
    }
  };
}

const handler = createScannerHistoryDeleteHandler();
export const DELETE = handler;