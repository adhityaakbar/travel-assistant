#!/bin/bash
set -e

APP_DIR="/apps/dev/TravelAssistant"
PM2_NAME="aitraveldev"

echo "==> Deploying local changes for $PM2_NAME..."
cd "$APP_DIR"

echo "==> Cleaning cache & building Next.js..."
rm -rf .next

# Pass environment variables if needed
APP_SECRET=${APP_SECRET:-guardian8} JWT_SECRET=${JWT_SECRET:-guardian8} npm run build

echo "==> Restarting PM2 process $PM2_NAME..."
PORT=3001 pm2 restart "$PM2_NAME" || PORT=3001 pm2 start npm --name "$PM2_NAME" -- start

echo "==> Deployment completed successfully!"
