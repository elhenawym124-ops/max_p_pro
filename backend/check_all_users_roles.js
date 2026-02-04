const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function checkAllUsers() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log('🔍 فحص جميع المستخدمين في قاعدة البيانات...\n');

        // عدد جميع المستخدمين
        const totalUsers = await prisma.user.count();
        console.log(`📊 إجمالي المستخدمين: ${totalUsers}\n`);

        // جميع المستخدمين مع تفاصيلهم
        const allUsers = await prisma.user.findMany({
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

        // تحليل حسب role
        const byRole = {};
        allUsers.forEach(user => {
            const role = user.role || 'NULL';
            if (!byRole[role]) {
                byRole[role] = [];
            }
            byRole[role].push(user);
        });

        console.log('📊 التوزيع حسب Role:\n');
        Object.keys(byRole).forEach(role => {
            console.log(`   Role: ${role} - عدد المستخدمين: ${byRole[role].length}`);
            byRole[role].forEach((user, index) => {
                if (index < 5) { // Show first 5 of each role
                    console.log(`      ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
                    console.log(`         Company ID: ${user.companyId || 'NULL'}, Active: ${user.isActive}`);
                }
            });
            if (byRole[role].length > 5) {
                console.log(`      ... و ${byRole[role].length - 5} مستخدم آخر`);
            }
            console.log('');
        });

        // تحليل حسب companyId
        const byCompany = {};
        allUsers.forEach(user => {
            const company = user.companyId || 'NULL';
            if (!byCompany[company]) {
                byCompany[company] = [];
            }
            byCompany[company].push(user);
        });

        console.log('\n📊 التوزيع حسب Company ID:\n');
        Object.keys(byCompany).forEach(companyId => {
            console.log(`   Company ID: ${companyId} - عدد المستخدمين: ${byCompany[companyId].length}`);
            const superAdminsInCompany = byCompany[companyId].filter(u => u.role === 'SUPER_ADMIN');
            if (superAdminsInCompany.length > 0) {
                console.log(`      🔑 SUPER_ADMIN في هذا Company: ${superAdminsInCompany.length}`);
            }
        });

        // البحث عن SUPER_ADMIN بطرق مختلفة (case sensitive)
        console.log('\n🔍 البحث عن SUPER_ADMIN بطرق مختلفة:\n');
        const superAdmin1 = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
        const superAdmin2 = await prisma.user.count({ where: { role: { equals: 'SUPER_ADMIN', mode: 'insensitive' } } });
        console.log(`   role = 'SUPER_ADMIN': ${superAdmin1}`);
        console.log(`   role = 'SUPER_ADMIN' (case insensitive): ${superAdmin2}`);

        // عرض أول 20 مستخدم
        console.log('\n👥 أول 20 مستخدم:\n');
        allUsers.slice(0, 20).forEach((user, index) => {
            console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
            console.log(`   📧 ${user.email}`);
            console.log(`   🔑 Role: ${user.role || 'NULL'}`);
            console.log(`   🏢 Company ID: ${user.companyId || 'NULL'}`);
            console.log(`   ✅ Active: ${user.isActive}`);
            console.log('-'.repeat(80));
        });

    } catch (error) {
        console.error('❌ خطأ في فحص قاعدة البيانات:', error);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

checkAllUsers();

