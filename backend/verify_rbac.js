
const { getSharedPrismaClient } = require('./services/sharedDatabase');
const { requireSuperAdmin, checkPermission } = require('./middleware/superAdminMiddleware');

async function testSecurity() {
    console.log('🧪 Starting Security Verification...');

    const mockRes = {
        status: function (code) {
            this.statusCode = code;
            return this;
        },
        json: function (data) {
            this.data = data;
            return this;
        }
    };

    const next = () => { console.log('   ✅ Next() called - ACCESS GRANTED'); return true; };

    const testCases = [
        { name: 'Unauthorized Role (Client Agent)', user: { role: 'AGENT' }, expectedStatus: 403 },
        { name: 'Authorized Role (Project Manager)', user: { role: 'Project Manager' }, expectedStatus: undefined },
        { name: 'Authorized Role (SUPER_ADMIN)', user: { role: 'SUPER_ADMIN' }, expectedStatus: undefined },
        { name: 'Granular Permission - Allowed (Project Manager canViewAll)', user: { role: 'Project Manager' }, permission: 'canViewAll', expectedStatus: undefined },
        { name: 'Granular Permission - Denied (Developer canDelete)', user: { role: 'Developer' }, permission: 'canDelete', expectedStatus: 403 }
    ];

    for (const tc of testCases) {
        console.log(`\nTesting: ${tc.name}`);
        const req = { user: tc.user };
        const res = Object.assign({}, mockRes);
        res.statusCode = undefined;

        try {
            if (tc.permission) {
                const middleware = checkPermission(tc.permission);
                await middleware(req, res, next);
            } else {
                await requireSuperAdmin(req, res, next);
            }

            if (tc.expectedStatus && res.statusCode !== tc.expectedStatus) {
                console.error(`   ❌ FAILED: Expected ${tc.expectedStatus}, got ${res.statusCode}`);
            } else if (!tc.expectedStatus && res.statusCode) {
                console.error(`   ❌ FAILED: Expected success, got ${res.statusCode} (${JSON.stringify(res.data)})`);
            } else {
                console.log(`   ✨ PASSED`);
            }
        } catch (e) {
            console.error(`   💥 ERROR: ${e.message}`);
        }
    }
}

testSecurity().then(() => process.exit(0));
