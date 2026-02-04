#!/bin/bash

# 🔧 Production Setup Script
# This script sets up production environment after deployment
# Usage: bash backend/scripts/setup_production.sh

echo "🚀 Starting Production Setup..."
echo ""

# Step 1: Fix Production Roles
echo "📋 Step 1: Fixing Production Roles..."
node backend/scripts/fix_production_roles.js
if [ $? -eq 0 ]; then
    echo "✅ Production roles fixed successfully"
else
    echo "❌ Error fixing production roles"
    exit 1
fi

echo ""

# Step 2: Backfill Completed Tasks XP
echo "🎮 Step 2: Backfilling Completed Tasks XP..."
node backend/scripts/backfill_completed_tasks_xp.js
if [ $? -eq 0 ]; then
    echo "✅ Completed tasks XP backfilled successfully"
else
    echo "❌ Error backfilling completed tasks XP"
    exit 1
fi

echo ""

# Step 3: Fix Leaderboard Levels
echo "🏆 Step 3: Fixing Leaderboard Levels..."
node backend/scripts/fix_leaderboard_levels.js
if [ $? -eq 0 ]; then
    echo "✅ Leaderboard levels fixed successfully"
else
    echo "❌ Error fixing leaderboard levels"
    exit 1
fi

echo ""
echo "✅ Production setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Restart your backend server"
echo "   2. Check that roles are correct in /super-admin/dev-settings"
echo "   3. Check that leaderboard shows correct XP and levels"
echo ""
