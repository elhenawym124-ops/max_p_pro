/**
 * تغيير نوع حقل usage من VARCHAR(191) إلى TEXT
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function fixUsageColumnType() {
    try {
        console.log('\n🔧 ========== تغيير نوع حقل usage إلى TEXT ==========\n');

        // التحقق من اسم الجدول الحقيقي أولاً
        console.log('🔍 التحقق من اسم الجدول...');
        
        const tables = await getSharedPrismaClient().$queryRaw`
            SHOW TABLES LIKE '%gemini%key%model%'
        `;
        
        console.log('📋 الجداول الموجودة:', tables);
        
        let tableName = null;
        if (Array.isArray(tables) && tables.length > 0) {
            const firstTable = tables[0];
            tableName = Object.values(firstTable)[0];
            console.log(`✅ اسم الجدول: ${tableName}`);
        } else {
            // محاولة الأسماء الشائعة
            const commonNames = ['gemini_key_models', 'geminiKeyModels', 'GeminiKeyModel'];
            for (const name of commonNames) {
                try {
                    await getSharedPrismaClient().$queryRaw`SELECT 1 FROM ${getSharedPrismaClient().$queryRawUnsafe(name)} LIMIT 1`;
                    tableName = name;
                    break;
                } catch (e) {
                    // continue
                }
            }
        }
        
        if (!tableName) {
            console.error('❌ لم يتم العثور على جدول gemini_key_models');
            return;
        }

        // تغيير نوع العمود من VARCHAR(191) إلى TEXT
        console.log(`🔧 تغيير نوع حقل usage في الجدول: ${tableName}...`);
        
        await getSharedPrismaClient().$executeRawUnsafe(`
            ALTER TABLE \`${tableName}\` 
            MODIFY COLUMN \`usage\` TEXT NOT NULL
        `);

        console.log('✅ تم تغيير نوع حقل usage إلى TEXT بنجاح\n');

        console.log('✅ ========== انتهى الإصلاح ==========\n');

    } catch (error) {
        console.error('❌ خطأ:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

fixUsageColumnType();


