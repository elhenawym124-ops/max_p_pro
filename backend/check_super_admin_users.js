const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function checkSuperAdminUsers() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log('🔍 فحص قاعدة البيانات للمستخدمين السوبر أدمن...\n');

        // إحصائيات عامة
        const totalSuperAdmins = await prisma.user.count({
            where: { role: 'SUPER_ADMIN' }
        });

        console.log(`📊 إجمالي المستخدمين السوبر أدمن: ${totalSuperAdmins}\n`);

        // جميع السوبر أدمن مع تفاصيلهم
        const allSuperAdmins = await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                companyId: true,
                isActive: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log('👥 جميع المستخدمين السوبر أدمن:\n');
        console.log('='.repeat(100));

        allSuperAdmins.forEach((user, index) => {
            console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
            console.log(`   📧 البريد: ${user.email}`);
            console.log(`   🏢 Company ID: ${user.companyId || 'NULL (لا يوجد)'}`);
            console.log(`   ✅ الحالة: ${user.isActive ? 'نشط' : 'غير نشط'}`);
            console.log(`   📅 تاريخ الإنشاء: ${user.createdAt}`);
            console.log('-'.repeat(100));
        });

        // تحليل حسب companyId
        const byCompany = {};
        allSuperAdmins.forEach(user => {
            const company = user.companyId || 'NULL';
            if (!byCompany[company]) {
                byCompany[company] = [];
            }
            byCompany[company].push(user);
        });

        console.log('\n📊 التوزيع حسب Company ID:\n');
        Object.keys(byCompany).forEach(companyId => {
            console.log(`   Company ID: ${companyId} - عدد المستخدمين: ${byCompany[companyId].length}`);
            byCompany[companyId].forEach(user => {
                console.log(`      - ${user.firstName} ${user.lastName} (${user.email})`);
            });
        });

        // مستخدمين نشطين فقط
        const activeSuperAdmins = allSuperAdmins.filter(u => u.isActive);
        console.log(`\n✅ المستخدمين النشطين: ${activeSuperAdmins.length} من ${totalSuperAdmins}`);

        // مستخدمين غير نشطين
        const inactiveSuperAdmins = allSuperAdmins.filter(u => !u.isActive);
        console.log(`❌ المستخدمين غير النشطين: ${inactiveSuperAdmins.length} من ${totalSuperAdmins}\n`);

        // تحليل المشكلة
        console.log('\n🔍 تحليل المشكلة:\n');
        console.log('المشكلة في الكود: في ملف superAdminController.js');
        console.log('السطر 244-246 يقوم بفلترة المستخدمين حسب companyId:');
        console.log('   if (req.user && req.user.companyId) {');
        console.log('       where.companyId = req.user.companyId;');
        console.log('   }');
        console.log('\nهذا يعني أن المستخدمين السوبر أدمن الذين لديهم companyId مختلف');
        console.log('أو NULL لن يظهرون في القائمة.\n');

    } catch (error) {
        console.error('❌ خطأ في فحص قاعدة البيانات:', error);
    } finally {
        process.exit(0);
    }
}

checkSuperAdminUsers();

