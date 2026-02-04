#!/bin/bash

# Script للنشر على السيرفر
# Usage: ./deploy.sh [server_user@server_host]

set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Server info (يمكن تمريرها كمعامل)
SERVER=${1:-"root@153.92.223.119"}
DEPLOY_PATH="/var/www"

echo -e "${YELLOW}📦 Building Frontend...${NC}"
cd frontend
npm ci
npm run build
cd ..

echo -e "${YELLOW}📤 Copying files to server...${NC}"
# نسخ الملفات المبنية
scp -r frontend/dist $SERVER:$DEPLOY_PATH/frontend2/
scp -r backend $SERVER:$DEPLOY_PATH/backend2

echo -e "${YELLOW}🔧 Installing dependencies on server...${NC}"
ssh $SERVER << 'ENDSSH'
cd /var/www/backend2
npm ci --only=production
echo "🔄 Generating Prisma Client..."
npx prisma generate
ENDSSH

echo -e "${YELLOW}🔄 Restarting services...${NC}"
ssh $SERVER << 'ENDSSH'
cd /var/www/

# إذا كنت تستخدم PM2
if command -v pm2 &> /dev/null; then
    # Start or reload using the ecosystem file to ensure environment variables are applied
    pm2 startOrReload ecosystem.config.js --env production
fi

# إذا كنت تستخدم Docker
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
fi

ENDSSH

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"

شششششششئسث