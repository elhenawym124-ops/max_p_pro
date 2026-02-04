const { initializeSharedDatabase, getSharedPrismaClient } = require('../services/sharedDatabase');
const ragAnalyticsController = require('../controller/ragAnalyticsController');

// Mock Request and Response
function createMockReq(companyId) {
    return {
        user: { companyId },
        query: {}
    };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        data: null,
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            this.data = data;
            return this;
        }
    };
    return res;
}

async function verify() {
    console.log('🔄 Initializing database...');
    await initializeSharedDatabase();

    const companyId = 'company_A'; // Replace with a known active company ID if needed, or 'company_A' is usually the test one
    // Check if company exists or just use an existing one found in db
    const prisma = getSharedPrismaClient();
    const company = await prisma.company.findFirst();
    const targetCompanyId = company ? company.id : 'company_A';
    console.log(`🎯 Testing with Company ID: ${targetCompanyId}`);

    console.log('\n--- Testing getSearchStats ---');
    const reqStats = createMockReq(targetCompanyId);
    const resStats = createMockRes();
    await ragAnalyticsController.getSearchStats(reqStats, resStats);
    console.log(`Status: ${resStats.statusCode}`);
    console.log('Data keys:', Object.keys(resStats.data));
    if (resStats.data.success) {
        console.log('✅ Stats Success');
        console.log('Total Searches:', resStats.data.data.totalSearches);
    } else {
        console.error('❌ Stats Failed', resStats.data);
    }

    console.log('\n--- Testing getFailedSearches ---');
    const reqFailed = createMockReq(targetCompanyId);
    const resFailed = createMockRes();
    await ragAnalyticsController.getFailedSearches(reqFailed, resFailed);
    console.log(`Status: ${resFailed.statusCode}`);
    if (resFailed.data.success) {
        console.log('✅ Failed Searches Success');
        console.log('Count:', resFailed.data.data.length);
    } else {
        console.error('❌ Failed Searches Failed', resFailed.data);
    }

    console.log('\n--- Testing getTopSearchTerms ---');
    const reqTerms = createMockReq(targetCompanyId);
    const resTerms = createMockRes();
    await ragAnalyticsController.getTopSearchTerms(reqTerms, resTerms);
    console.log(`Status: ${resTerms.statusCode}`);
    if (resTerms.data.success) {
        console.log('✅ Top Terms Success');
        console.log('Count:', resTerms.data.data.length);
    } else {
        console.error('❌ Top Terms Failed', resTerms.data);
    }

    process.exit(0);
}

verify().catch(err => {
    console.error('❌ Verification Error:', err);
    process.exit(1);
});
