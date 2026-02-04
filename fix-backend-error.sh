#!/bin/bash

# Script to diagnose and fix backend1 error on production server
# Usage: ./fix-backend-error.sh

set -e

echo "🔍 Starting Backend Diagnostic and Fix Script..."
echo "================================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check disk space
echo -e "\n${BLUE}📊 Step 1: Checking Disk Space...${NC}"
df -h | grep -E "Filesystem|/$"
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
echo -e "Disk usage: ${DISK_USAGE}%"

if [ $DISK_USAGE -gt 95 ]; then
    echo -e "${RED}⚠️  CRITICAL: Disk is ${DISK_USAGE}% full!${NC}"
    echo -e "${YELLOW}Cleaning up...${NC}"
    
    # Check PM2 logs size
    echo -e "\n${BLUE}📋 PM2 Logs Size:${NC}"
    du -sh /root/.pm2/logs/ 2>/dev/null || echo "No PM2 logs found"
    
    # Clean PM2 logs
    echo -e "${YELLOW}Flushing PM2 logs...${NC}"
    pm2 flush
    
    # Clean system logs
    echo -e "${YELLOW}Cleaning system logs...${NC}"
    journalctl --vacuum-time=7d 2>/dev/null || echo "journalctl not available"
    
    # Clean apt cache
    echo -e "${YELLOW}Cleaning apt cache...${NC}"
    apt-get clean 2>/dev/null || echo "apt-get not available"
    
    # Clean npm cache
    echo -e "${YELLOW}Cleaning npm cache...${NC}"
    npm cache clean --force 2>/dev/null || echo "npm cache already clean"
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
    
    # Check disk space again
    DISK_USAGE_AFTER=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    echo -e "Disk usage after cleanup: ${DISK_USAGE_AFTER}%"
fi

# Step 2: Check PM2 status
echo -e "\n${BLUE}📋 Step 2: Checking PM2 Status...${NC}"
pm2 list

# Step 3: Get backend logs
echo -e "\n${BLUE}📜 Step 3: Checking Backend Logs (last 50 lines)...${NC}"
pm2 logs backend1 --lines 50 --nostream 2>/dev/null || echo "No logs available"

# Step 4: Check backend directory
echo -e "\n${BLUE}📁 Step 4: Checking Backend Directory...${NC}"
if [ -d "/var/www/backend2" ]; then
    cd /var/www/backend2
    echo "✅ Backend directory exists"
    
    # Check .env file
    if [ -f ".env" ]; then
        echo "✅ .env file exists"
        echo -e "\n${BLUE}First 10 lines of .env:${NC}"
        head -10 .env | grep -v "PASSWORD\|SECRET\|KEY" || echo ".env file is empty or only contains secrets"
    else
        echo -e "${RED}❌ .env file NOT found${NC}"
        
        # Check for .env.production
        if [ -f ".env.production" ]; then
            echo -e "${YELLOW}Found .env.production, copying to .env...${NC}"
            cp .env.production .env
            echo "✅ .env created from .env.production"
        else
            echo -e "${RED}❌ .env.production also NOT found${NC}"
            echo -e "${YELLOW}⚠️  You need to create .env file manually${NC}"
        fi
    fi
    
    # Check node_modules
    if [ -d "node_modules" ]; then
        echo "✅ node_modules exists"
    else
        echo -e "${RED}❌ node_modules NOT found${NC}"
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm ci --only=production || npm install --only=production
    fi
    
    # Check Prisma Client
    if [ -d "node_modules/@prisma/client" ]; then
        echo "✅ Prisma Client exists"
    else
        echo -e "${RED}❌ Prisma Client NOT found${NC}"
        echo -e "${YELLOW}Generating Prisma Client...${NC}"
        npx prisma generate
    fi
    
    # Check server.js
    if [ -f "server.js" ]; then
        echo "✅ server.js exists"
    else
        echo -e "${RED}❌ server.js NOT found${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Backend directory NOT found at /var/www/backend2${NC}"
    exit 1
fi

# Step 5: Stop and delete old process
echo -e "\n${BLUE}🛑 Step 5: Stopping Old Backend Process...${NC}"
pm2 delete backend1 2>/dev/null || echo "No existing backend1 process to delete"
pm2 delete 0 2>/dev/null || echo "No process with ID 0 to delete"

# Wait a bit
sleep 2

# Step 6: Start fresh backend process
echo -e "\n${BLUE}🚀 Step 6: Starting Fresh Backend Process...${NC}"
cd /var/www/backend2
NODE_ENV=production pm2 start server.js --name backend1 --max-memory-restart 1G

# Wait for startup
echo -e "${YELLOW}Waiting 5 seconds for backend to start...${NC}"
sleep 5

# Step 7: Check status
echo -e "\n${BLUE}✅ Step 7: Final Status Check...${NC}"
pm2 list

# Step 8: Show recent logs
echo -e "\n${BLUE}📜 Step 8: Recent Logs (last 30 lines)...${NC}"
pm2 logs backend1 --lines 30 --nostream

# Step 9: Test if backend is responding
echo -e "\n${BLUE}🧪 Step 9: Testing Backend Health...${NC}"
sleep 2
curl -s https://maxp-ai.pro/health || curl -s https://maxp-ai.pro/api/health || echo "Health check endpoint not available"

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Diagnostic and Fix Script Completed!${NC}"
echo -e "${GREEN}================================================${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Check the logs above for any errors"
echo "2. If backend is still errored, check the .env file configuration"
echo "3. Verify database connection is working"
echo "4. Run: pm2 logs backend1 --lines 100"

echo -e "\n${BLUE}Useful Commands:${NC}"
echo "- pm2 list                    # Check PM2 status"
echo "- pm2 logs backend1           # View live logs"
echo "- pm2 restart backend1        # Restart backend"
echo "- pm2 monit                   # Monitor resources"
echo "- df -h                       # Check disk space"
