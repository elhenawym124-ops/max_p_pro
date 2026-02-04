const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function seedTestData() {
    const companyId = '71ab1ca7-271d-4e3a-b77c-72a51ddff454';
    const prisma = getSharedPrismaClient();

    console.log('🌱 Seeding Asset Maintenance & Warranty test data...');

    // 1. Asset with expiring warranty (20 days from now)
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 20);

    const asset1 = await prisma.asset.create({
        data: {
            companyId,
            name: 'MacBook Pro M2 - Test Alert',
            code: 'TEST-WARRANTY-01',
            serialNumber: 'SN-WARR-001',
            status: 'IN_USE',
            warrantyEndDate: expiringDate,
            warrantyMonths: 12,
            warrantyProvider: 'Apple Egypt',
            purchaseDate: new Date(),
            purchaseValue: 85000,
            updatedAt: new Date()
        }
    });

    // 2. Asset with scheduled maintenance (5 days from now)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 5);

    const asset2 = await prisma.asset.create({
        data: {
            companyId,
            name: 'Projector Epson - Test Maint',
            code: 'TEST-MAINT-01',
            status: 'AVAILABLE',
            updatedAt: new Date()
        }
    });

    await prisma.assetMaintenance.create({
        data: {
            assetId: asset2.id,
            type: 'صيانة دورية',
            description: 'تبديل فلتر وفحص العدسة',
            status: 'SCHEDULED',
            startDate: scheduledDate,
            updatedAt: new Date()
        }
    });

    // 3. Asset with past maintenance history
    const asset3 = await prisma.asset.create({
        data: {
            companyId,
            name: 'Printer HP Laser',
            code: 'TEST-HISTORY-01',
            status: 'IN_USE',
            updatedAt: new Date()
        }
    });

    await prisma.assetMaintenance.create({
        data: {
            assetId: asset3.id,
            type: 'إصلاح عطل',
            description: 'عطل في بكر السحب',
            cost: 1500.50,
            status: 'COMPLETED',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            completionDate: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
            performedBy: 'ورشة التقنية',
            updatedAt: new Date()
        }
    });

    console.log('✅ Success! Test data generated.');
}

seedTestData();
