#!/usr/bin/env bash
set -e

echo "🧹 Clearing stale .next cache and stopping existing dev servers..."
pkill -f "next dev" 2>/dev/null || true
rm -rf .next

echo "📦 Rebuilding Next.js assets fresh..."
npm run build

mkdir -p .next certificates
if [ ! -f certificates/cert.pem ] || [ ! -f certificates/key.pem ]; then
  echo "🔑 Generating SSL certificates for HTTPS..."
  IP_MAC=$(ifconfig en0 | grep "inet " | awk '{print $2}' || echo "")
  mkcert -cert-file certificates/cert.pem -key-file certificates/key.pem aitravel.aneta.my.id localhost 127.0.0.1 $IP_MAC
fi

echo "🚀 Starting fresh dev server in background on https://localhost:3000 ..."
nohup npm run dev:https -- -p 3000 > dev.log 2>&1 &
echo "✅ Dev server started in background (PID $!). Logs: dev.log"
