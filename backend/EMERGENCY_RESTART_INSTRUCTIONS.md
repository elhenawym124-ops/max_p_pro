# 🚨 Emergency Backend Restart Instructions

## Current Situation
- Backend is DOWN (502 Bad Gateway)
- GitHub Actions deployment is FAILING (SSH timeout)
- Manual intervention is REQUIRED

## Solution: Manual SSH Restart

### Step 1: Connect to Server
```bash
ssh your_username@maxp-ai.pro
# Or use the IP: ssh your_username@SERVER_IP
```

### Step 2: Navigate to Backend Directory
```bash
cd /var/www/backend2
```

### Step 3: Check Current PM2 Status
```bash
pm2 list
```

### Step 4: Emergency Restart
```bash
# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all

# Clear logs
pm2 flush

# Start fresh backend
NODE_ENV=production pm2 start server.js --name backend1

# Save PM2 configuration
pm2 save
```

### Step 5: Verify Backend is Running
```bash
# Check PM2 status
pm2 list

# Check logs
pm2 logs backend1 --lines 50

# Test health endpoint
curl https://maxp-ai.pro/api/v1/health
```

### Step 6: Test from Browser
Open: https://maxp-ai.pro/api/v1/health

If you see a response (not 502), the backend is working! ✅

---

## What Was Fixed in the Code

1. ✅ Added `getRewardStatistics` method to `rewardManagementService.js`
2. ✅ Added detailed logging to `rewardController.js`
3. ✅ Code tested locally - works perfectly
4. ✅ Emergency restart script added to workflow

## After Manual Restart

Once the backend is running again:
1. The rewards page should work: https://maxp-ai.pro/hr/rewards
2. No more 500 errors on statistics or records endpoints
3. All functionality should be restored

---

## Alternative: If You Can't SSH

If you don't have SSH access, you need to:
1. Contact your hosting provider
2. Ask them to restart the Node.js backend process
3. Or ask them to run: `pm2 restart all` in `/var/www/backend2`

---

## GitHub Actions Issue

The deployment is failing because:
- SSH connection timeout when trying to copy files
- This might be a temporary network issue
- Or the server firewall is blocking GitHub Actions IP

To fix deployment later:
1. Check server firewall settings
2. Verify SSH credentials in GitHub Secrets
3. Try deploying again after manual restart
