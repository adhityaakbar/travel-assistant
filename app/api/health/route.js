import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ status: 'ok', app: 'Travel Assistant Japan API', time: new Date().toISOString() });
}
