
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const adminCompnayController = require('../controller/adminCompnayController');

async function testLifecycle() {
    const TEST_EMAIL = 'TestDelete@test.com';
    console.log(`🚀 Starting Lifecycle Test for: ${TEST_EMAIL}`);

    const prisma = getSharedPrismaClient();

    try {
        // [STEP 1] Cleanup before start (just in case)
        console.log('\n🧹 [STEP 1] Cleaning up any existing test data...');
        await prisma.company.deleteMany({
            where: { email: TEST_EMAIL }
        });

        // [STEP 2] Create Dummy Company
        console.log('\n✨ [STEP 2] Creating dummy company...');
        const newCompany = await prisma.company.create({
            data: {
                name: 'Test Deletion Corp',
                email: TEST_EMAIL,
                plan: 'BASIC'
            }
        });
        console.log(`✅ Created Company with ID: ${newCompany.id}`);

        // [STEP 3] Verify Existence
        const exists = await prisma.company.findUnique({ where: { id: newCompany.id } });
        if (!exists) throw new Error("Creation failed!");
        console.log('✅ Verified existence in DB.');

        // [STEP 4] Execute Delete using Controller Logic
        console.log('\n🗑️ [STEP 4] Executing Bulk Delete via Controller...');

        const req = {
            body: {
                companyIds: [newCompany.id]
            }
        };

        const res = {
            status: function (code) {
                console.log(`   > HTTP Status: ${code}`);
                return this;
            },
            json: function (data) {
                console.log(`   > Response: ${JSON.stringify(data)}`);
                return this;
            }
        };

        await adminCompnayController.bulkDeleteCompanies(req, res);

        // [STEP 5] Verify Deletion
        console.log('\n🔍 [STEP 5] Verifying deletion...');
        const check = await prisma.company.findUnique({ where: { id: newCompany.id } });

        if (!check) {
            console.log('\n🎉 SUCCESS! Company was successfully deleted from the database.');
        } else {
            console.error('\n❌ FAILED! Company still exists in the database.');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error);
    } finally {
        setTimeout(() => process.exit(0), 2000);
    }
}

testLifecycle();
