
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompanyAIStatus() {
    try {
        console.log('🔍 Searching for company "شركة التسويق"...');

        // 1. Find the company
        const company = await prisma.company.findFirst({
            where: {
                name: {
                    contains: 'شركة التسويق' // Searching for the name shown in the screenshot
                }
            }
        });

        if (!company) {
            console.log('❌ Company "شركة التسويق" not found.');
            // Let's list a few companies to see if we can find a close match or if I need to search differently
            const companies = await prisma.company.findMany({ take: 5 });
            console.log('📋 First 5 companies in DB:', companies.map(c => ({ id: c.id, name: c.name })));
            return;
        }

        console.log(`✅ Found Company: ${company.name} (ID: ${company.id})`);

        // 2. Get AI Settings
        const aiSettings = await prisma.aiSettings.findUnique({
            where: {
                companyId: company.id
            }
        });

        if (!aiSettings) {
            console.log('⚠️ No AI Settings found for this company (using system defaults).');
        } else {
            console.log('🤖 AI Settings from Database:');
            console.log('-------------------------------------------');
            console.log(`Enabled (autoReplyEnabled): ${aiSettings.autoReplyEnabled}`);
            console.log(`Reply Mode:                 ${aiSettings.replyMode}`);
            console.log(`Confidence Threshold:       ${aiSettings.confidenceThreshold}`);
            console.log(`Updated At:                 ${aiSettings.updatedAt}`);
            console.log('-------------------------------------------');

            if (aiSettings.autoReplyEnabled) {
                console.log('🟢 CONCLUSION: AI IS ACTIVE in the database.');
            } else {
                console.log('🔴 CONCLUSION: AI IS DISABLED in the database.');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCompanyAIStatus();
