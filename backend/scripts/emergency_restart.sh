#!/bin/bash
# Emergency Backend Restart Script
# This script will forcefully restart the backend on production

echo "🚨 EMERGENCY BACKEND RESTART"
echo "================================"

cd /var/www/backend2

echo "📋 Current PM2 Status:"
pm2 list

echo ""
echo "🔄 Stopping all backend processes..."
pm2 stop all

echo ""
echo "🗑️ Deleting all backend processes..."
pm2 delete all

echo ""
echo "🧹 Clearing PM2 logs..."
pm2 flush

echo ""
echo "🆕 Starting fresh backend process..."
NODE_ENV=production pm2 start server.js --name backend1

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "📋 Final PM2 Status:"
pm2 list

echo ""
echo "📊 Backend Logs (last 20 lines):"
pm2 logs backend1 --lines 20 --nostream

echo ""
echo "✅ Emergency restart completed!"
