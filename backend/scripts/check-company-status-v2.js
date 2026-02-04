
require('dotenv').config(); // Explicitly load .env
const { PrismaClient } = require('@prisma/client');

async function checkCompanyAIStatus() {
    const prisma = new PrismaClient();
    try {
        const dbUrl = process.env.DATABASE_URL || 'UNDEFINED';
        const isRemote = dbUrl.includes('92.113.22.70');
        console.log('🌍 Environment Check:');
        console.log(`   - DATABASE_URL Loaded: ${dbUrl !== 'UNDEFINED' ? 'YES' : 'NO'}`);
        console.log(`   - Target Host: ${isRemote ? 'REMOTE VPS (92.113.22.70)' : 'PROBABLY LOCAL'}`);

        console.log('\n🔍 Searching for company "شركة التسويق"...');

        const company = await prisma.company.findFirst({
            where: {
                name: { contains: 'شركة التسويق' }
            }
        });

        if (!company) {
            console.log('❌ Company "شركة التسويق" not found.');
            return;
        }

        console.log(`✅ Found Company: "${company.name}"`);
        console.log(`   - ID: ${company.id}`);

        const aiSettings = await prisma.aiSettings.findUnique({
            where: { companyId: company.id }
        });

        console.log('\n🤖 AI Settings Record:');
        if (!aiSettings) {
            console.log('⚠️ No AI Settings matched for this company ID.');
        } else {
            console.log('--------------------------------------------------');
            console.log(`   - autoReplyEnabled:   ${aiSettings.autoReplyEnabled}  <-- THE TOGGLE`);
            console.log(`   - replyMode:          ${aiSettings.replyMode}`);
            console.log(`   - Last Updated:       ${aiSettings.updatedAt}`);
            console.log('--------------------------------------------------');

            if (aiSettings.autoReplyEnabled) {
                console.log('\nResult: SYSTEM IS ON ✅');
            } else {
                console.log('\nResult: SYSTEM IS OFF ❌');
                // Check if there are ANY companies with AI enabled to debug
                const anyActive = await prisma.aiSettings.findFirst({ where: { autoReplyEnabled: true } });
                if (anyActive) {
                    console.log('   (Note: Found other companies with AI enabled, so DB is working)');
                }
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCompanyAIStatus();
