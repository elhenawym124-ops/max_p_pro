/**
 * 🔄 Script لنقل بيانات المصادقة من ملفات JSON إلى قاعدة البيانات
 * 
 * هذا السكريبت ينقل:
 * - creds.json -> authState.creds
 * - session-*.json -> authState.keys.session
 * - pre-key-*.json -> authState.keys['pre-key']
 * - sender-key-*.json -> authState.keys['sender-key']
 * 
 * الاستخدام:
 * node backend/scripts/migrateAuthStateToDatabase.js [sessionId]
 * 
 * إذا لم يتم تحديد sessionId، سيتم نقل جميع الجلسات
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const SESSIONS_DIR = path.join(__dirname, '../data/whatsapp-sessions');

/**
 * قراءة ملف JSON
 */
async function readJsonFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Error reading file ${filePath}:`, error.message);
        return null;
    }
}

/**
 * نقل بيانات جلسة واحدة
 */
async function migrateSession(sessionId) {
    console.log(`\n🔄 Migrating session: ${sessionId}`);
    
    const sessionPath = path.join(SESSIONS_DIR, sessionId);
    
    // التحقق من وجود المجلد
    if (!fsSync.existsSync(sessionPath)) {
        console.log(`⚠️ Session directory not found: ${sessionPath}`);
        return false;
    }

    // قراءة جميع الملفات
    const files = await fs.readdir(sessionPath);
    console.log(`📂 Found ${files.length} files`);

    let authState = {
        creds: null,
        keys: {}
    };

    // قراءة creds.json
    const credsPath = path.join(sessionPath, 'creds.json');
    if (fsSync.existsSync(credsPath)) {
        const creds = await readJsonFile(credsPath);
        if (creds) {
            authState.creds = creds;
            console.log('✅ Loaded creds.json');
        }
    }

    // قراءة session-*.json
    const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.json'));
    if (sessionFiles.length > 0) {
        authState.keys['session'] = {};
        for (const file of sessionFiles) {
            const filePath = path.join(sessionPath, file);
            const data = await readJsonFile(filePath);
            if (data) {
                // استخراج ID من اسم الملف: session-{id}.json
                const id = file.replace('session-', '').replace('.json', '');
                authState.keys['session'][id] = data;
            }
        }
        console.log(`✅ Loaded ${sessionFiles.length} session files`);
    }

    // قراءة pre-key-*.json
    const preKeyFiles = files.filter(f => f.startsWith('pre-key-') && f.endsWith('.json'));
    if (preKeyFiles.length > 0) {
        authState.keys['pre-key'] = {};
        for (const file of preKeyFiles) {
            const filePath = path.join(sessionPath, file);
            const data = await readJsonFile(filePath);
            if (data) {
                // استخراج ID من اسم الملف: pre-key-{id}.json
                const id = file.replace('pre-key-', '').replace('.json', '');
                authState.keys['pre-key'][id] = data;
            }
        }
        console.log(`✅ Loaded ${preKeyFiles.length} pre-key files`);
    }

    // قراءة sender-key-*.json
    const senderKeyFiles = files.filter(f => f.startsWith('sender-key-') && f.endsWith('.json'));
    if (senderKeyFiles.length > 0) {
        authState.keys['sender-key'] = {};
        for (const file of senderKeyFiles) {
            const filePath = path.join(sessionPath, file);
            const data = await readJsonFile(filePath);
            if (data) {
                // استخراج ID من اسم الملف: sender-key-{id}.json
                const id = file.replace('sender-key-', '').replace('.json', '');
                authState.keys['sender-key'][id] = data;
            }
        }
        console.log(`✅ Loaded ${senderKeyFiles.length} sender-key files`);
    }

    // قراءة app-state-sync-key-*.json (إن وجد)
    const appStateFiles = files.filter(f => f.startsWith('app-state-sync-key-') && f.endsWith('.json'));
    if (appStateFiles.length > 0) {
        authState.keys['app-state-sync-key'] = {};
        for (const file of appStateFiles) {
            const filePath = path.join(sessionPath, file);
            const data = await readJsonFile(filePath);
            if (data) {
                const id = file.replace('app-state-sync-key-', '').replace('.json', '');
                authState.keys['app-state-sync-key'][id] = data;
            }
        }
        console.log(`✅ Loaded ${appStateFiles.length} app-state-sync-key files`);
    }

    // حفظ في قاعدة البيانات
    try {
        await getSharedPrismaClient().whatsAppSession.update({
            where: { id: sessionId },
            data: {
                authState: JSON.stringify(authState),
                updatedAt: new Date()
            }
        });
        console.log(`✅ Successfully migrated session ${sessionId} to database`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving to database:`, error.message);
        return false;
    }
}

/**
 * الدالة الرئيسية
 */
async function main() {
    try {
        console.log('🚀 Starting migration from files to database...\n');

        const sessionId = process.argv[2];

        if (sessionId) {
            // نقل جلسة واحدة
            await migrateSession(sessionId);
        } else {
            // نقل جميع الجلسات
            const sessions = await getSharedPrismaClient().whatsAppSession.findMany({
                select: { id: true, name: true }
            });

            console.log(`📋 Found ${sessions.length} sessions to migrate\n`);

            let successCount = 0;
            let failCount = 0;

            for (const session of sessions) {
                const success = await migrateSession(session.id);
                if (success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            console.log(`\n📊 Migration Summary:`);
            console.log(`✅ Success: ${successCount}`);
            console.log(`❌ Failed: ${failCount}`);
            console.log(`📁 Total: ${sessions.length}`);
        }

    } catch (error) {
        console.error('❌ Migration error:', error);
    } finally {
        await getSharedPrismaClient().$disconnect();
    }
}

// تشغيل السكريبت
if (require.main === module) {
    main();
}

module.exports = { migrateSession };



