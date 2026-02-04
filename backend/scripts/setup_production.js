#!/usr/bin/env node

/**
 * 🔧 Production Setup Script
 * This script sets up production environment after deployment
 * 
 * Usage: node backend/scripts/setup_production.js
 * 
 * This script will:
 * 1. Fix production roles (replace old roles with new ones)
 * 2. Backfill completed tasks XP
 * 3. Fix leaderboard levels
 */

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
    {
        name: 'Fix Production Roles',
        file: path.join(__dirname, 'fix_production_roles.js'),
        description: 'Replace old roles (developer, manager, admin) with new production roles'
    },
    {
        name: 'Backfill Completed Tasks XP',
        file: path.join(__dirname, 'backfill_completed_tasks_xp.js'),
        description: 'Calculate and award XP for all existing completed tasks'
    },
    {
        name: 'Fix Leaderboard Levels',
        file: path.join(__dirname, 'fix_leaderboard_levels.js'),
        description: 'Recalculate all member levels based on XP'
    }
];

async function runSetup() {
    console.log('🚀 Starting Production Setup...\n');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        console.log(`📋 Step ${i + 1}/${scripts.length}: ${script.name}`);
        console.log(`   ${script.description}\n`);

        try {
            execSync(`node "${script.file}"`, {
                stdio: 'inherit',
                cwd: path.join(__dirname, '../..')
            });
            console.log(`\n✅ ${script.name} completed successfully\n`);
            successCount++;
        } catch (error) {
            console.error(`\n❌ Error running ${script.name}:`, error.message);
            console.log(`⚠️  Continuing with next script...\n`);
            errorCount++;
        }
    }

    console.log('📊 Setup Summary:');
    console.log(`   ✅ Successful: ${successCount}/${scripts.length}`);
    console.log(`   ❌ Errors: ${errorCount}/${scripts.length}\n`);

    if (errorCount === 0) {
        console.log('✅ Production setup completed successfully!\n');
        console.log('📝 Next steps:');
        console.log('   1. Restart your backend server');
        console.log('   2. Check that roles are correct in /super-admin/dev-settings');
        console.log('   3. Check that leaderboard shows correct XP and levels\n');
        process.exit(0);
    } else {
        console.log('⚠️  Production setup completed with errors.\n');
        console.log('Please review the errors above and fix them manually.\n');
        process.exit(1);
    }
}

// Run setup
runSetup().catch(error => {
    console.error('❌ Fatal error during setup:', error);
    process.exit(1);
});
