#!/usr/bin/env bash
set -e

echo "🧹 Clearing stale .next cache and stopping existing dev servers..."
pkill -f "next dev" 2>/dev/null || true
rm -rf .next

echo "📦 Rebuilding Next.js assets fresh..."
npm run build

echo "🚀 Starting fresh dev server in background on http://localhost:3000 ..."
nohup npm run dev -- -p 3000 > .next/dev.log 2>&1 &
echo "✅ Dev server started in background (PID $!). Logs: .next/dev.log"
