const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function applyTelegramSchema() {
    console.log('🚀 Starting Telegram Advanced Features Schema Application...');
    
    const prisma = new PrismaClient();
    
    try {
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'prisma', 'migrations', 'add_telegram_advanced_features.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Remove comments and split by semicolon
        const cleanedContent = sqlContent
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n')
            .replace(/\/\*[\s\S]*?\*\//g, '');
        
        const statements = cleanedContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.toUpperCase().includes('CREATE TABLE'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.includes('CREATE TABLE')) {
                const tableName = statement.match(/CREATE TABLE.*?`([^`]+)`/)?.[1];
                console.log(`\n[${i + 1}/${statements.length}] Creating table: ${tableName}...`);
            }
            
            try {
                await prisma.$executeRawUnsafe(statement + ';');
                console.log('✅ Success');
            } catch (error) {
                if (error.message.includes('already exists')) {
                    console.log('⚠️ Table already exists, skipping...');
                } else {
                    console.error('❌ Error:', error.message);
                }
            }
        }
        
        console.log('\n✅ Schema application completed!');
        
        // Verify tables were created
        console.log('\n🔍 Verifying tables...');
        const tables = [
            'telegram_auto_reply_rules',
            'telegram_bulk_messages',
            'telegram_bulk_message_logs',
            'telegram_scheduled_messages',
            'telegram_contacts',
            'telegram_groups',
            'telegram_forward_rules',
            'telegram_user_activity',
            'telegram_auto_reply_usage',
            'telegram_bot_metrics'
        ];
        
        for (const table of tables) {
            try {
                const result = await prisma.$queryRawUnsafe(`SHOW TABLES LIKE '${table}'`);
                if (result.length > 0) {
                    console.log(`✅ ${table}`);
                } else {
                    console.log(`❌ ${table} - NOT FOUND`);
                }
            } catch (error) {
                console.log(`❌ ${table} - Error: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await prisma.$disconnect();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
applyTelegramSchema()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Script failed:', error);
        process.exit(1);
    });
