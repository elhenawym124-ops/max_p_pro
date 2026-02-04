const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function checkSuperAdmins() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log('🔍 فحص قاعدة البيانات للمستخدمين السوبر أدمن...\n');

        // استخدام Prisma findMany مع استعلام بسيط
        // سنستخدم $queryRawUnsafe لتجنب مشكلة enum
        const users = await prisma.$queryRawUnsafe(`
            SELECT 
                id,
                firstName,
                lastName,
                email,
                role,
                companyId,
                isActive,
                createdAt
            FROM users
            WHERE role = 'SUPER_ADMIN'
            ORDER BY createdAt DESC
        `);

        console.log(`📊 إجمالي المستخدمين السوبر أدمن: ${users.length}\n`);

        if (users.length === 0) {
            console.log('❌ لا يوجد مستخدمين سوبر أدمن في قاعدة البيانات\n');
            console.log('💡 نصيحة: تأكد من أن المستخدمين لديهم role = "SUPER_ADMIN" في قاعدة البيانات\n');
        } else {
            console.log('👥 جميع المستخدمين السوبر أدمن:\n');
            console.log('='.repeat(100));

            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
                console.log(`   📧 البريد: ${user.email}`);
                console.log(`   🔑 Role: "${user.role}"`);
                console.log(`   🏢 Company ID: ${user.companyId || 'NULL (لا يوجد)'}`);
                console.log(`   ✅ الحالة: ${user.isActive ? 'نشط' : 'غير نشط'}`);
                console.log(`   📅 تاريخ الإنشاء: ${new Date(user.createdAt).toLocaleString('ar-EG')}`);
                console.log('-'.repeat(100));
            });

            // تحليل حسب companyId
            const byCompany = {};
            users.forEach(user => {
                const company = user.companyId || 'NULL';
                if (!byCompany[company]) {
                    byCompany[company] = [];
                }
                byCompany[company].push(user);
            });

            console.log('\n📊 التوزيع حسب Company ID:\n');
            Object.keys(byCompany).forEach(companyId => {
                console.log(`   Company ID: ${companyId === 'NULL' ? 'NULL (لا يوجد)' : companyId}`);
                console.log(`   عدد المستخدمين: ${byCompany[companyId].length}`);
                byCompany[companyId].forEach(user => {
                    console.log(`      - ${user.firstName} ${user.lastName} (${user.email})`);
                });
                console.log('');
            });

            // إحصائيات
            const activeUsers = users.filter(u => u.isActive);
            const inactiveUsers = users.filter(u => !u.isActive);
            const usersWithCompany = users.filter(u => u.companyId);
            const usersWithoutCompany = users.filter(u => !u.companyId);

            console.log('\n📈 إحصائيات:\n');
            console.log(`   ✅ المستخدمين النشطين: ${activeUsers.length} من ${users.length}`);
            console.log(`   ❌ المستخدمين غير النشطين: ${inactiveUsers.length} من ${users.length}`);
            console.log(`   🏢 المستخدمين مع Company ID: ${usersWithCompany.length} من ${users.length}`);
            console.log(`   🚫 المستخدمين بدون Company ID: ${usersWithoutCompany.length} من ${users.length}\n`);
        }

        // أيضاً، دعنا نتحقق من جميع المستخدمين الذين لديهم role يحتوي على "super" أو "admin"
        console.log('\n🔍 البحث عن مستخدمين بأدوار مشابهة:\n');
        const similarUsers = await prisma.$queryRawUnsafe(`
            SELECT 
                id,
                firstName,
                lastName,
                email,
                role,
                companyId,
                isActive
            FROM users
            WHERE role LIKE '%SUPER%' 
               OR role LIKE '%super%'
               OR role LIKE '%ADMIN%'
               OR role LIKE '%admin%'
               OR role LIKE '%Admin%'
            ORDER BY role, createdAt DESC
        `);

        if (similarUsers.length > 0) {
            console.log(`   وجدنا ${similarUsers.length} مستخدم بأدوار مشابهة:\n`);
            const byRole = {};
            similarUsers.forEach(user => {
                const role = user.role || 'NULL';
                if (!byRole[role]) {
                    byRole[role] = [];
                }
                byRole[role].push(user);
            });
            Object.keys(byRole).forEach(role => {
                console.log(`   Role: "${role}" - العدد: ${byRole[role].length}`);
                byRole[role].forEach(user => {
                    console.log(`      - ${user.firstName} ${user.lastName} (${user.email})`);
                });
                console.log('');
            });
        } else {
            console.log('   لا يوجد مستخدمين بأدوار مشابهة\n');
        }

        console.log('\n✅ تم الانتهاء من الفحص\n');

    } catch (error) {
        console.error('❌ خطأ في فحص قاعدة البيانات:', error);
        console.error('Error details:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack.substring(0, 500));
        }
    } finally {
        process.exit(0);
    }
}

checkSuperAdmins();

