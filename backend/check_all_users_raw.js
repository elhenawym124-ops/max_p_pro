const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function checkAllUsersRaw() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log('🔍 فحص جميع المستخدمين في قاعدة البيانات...\n');

        // استخدام استعلام SQL مباشر لتجنب مشكلة Enum
        const allUsers = await prisma.$queryRaw`
            SELECT 
                id,
                firstName,
                lastName,
                email,
                role,
                companyId,
                isActive,
                createdAt
            FROM User
            ORDER BY createdAt DESC
        `;

        const totalUsers = allUsers.length;
        console.log(`📊 إجمالي المستخدمين: ${totalUsers}\n`);

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
        Object.keys(byRole).sort().forEach(role => {
            console.log(`   🔑 Role: "${role}" - عدد المستخدمين: ${byRole[role].length}`);
            const superAdminUsers = byRole[role].slice(0, 10);
            superAdminUsers.forEach((user, index) => {
                console.log(`      ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
                console.log(`         Company ID: ${user.companyId || 'NULL'}, Active: ${user.isActive ? 'نشط' : 'غير نشط'}`);
            });
            if (byRole[role].length > 10) {
                console.log(`      ... و ${byRole[role].length - 10} مستخدم آخر`);
            }
            console.log('');
        });

        // البحث عن SUPER_ADMIN
        const superAdminUsers = allUsers.filter(u => 
            u.role === 'SUPER_ADMIN' || 
            u.role === 'super_admin' || 
            u.role === 'Super_Admin' ||
            (u.role && u.role.toLowerCase().includes('super'))
        );

        console.log('\n👑 المستخدمين السوبر أدمن:\n');
        if (superAdminUsers.length === 0) {
            console.log('   ❌ لا يوجد مستخدمين سوبر أدمن في قاعدة البيانات\n');
        } else {
            console.log(`   📊 العدد الإجمالي: ${superAdminUsers.length}\n`);
            superAdminUsers.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.firstName} ${user.lastName}`);
                console.log(`      📧 ${user.email}`);
                console.log(`      🔑 Role: "${user.role}"`);
                console.log(`      🏢 Company ID: ${user.companyId || 'NULL'}`);
                console.log(`      ✅ Active: ${user.isActive ? 'نشط' : 'غير نشط'}`);
                console.log(`      📅 تاريخ الإنشاء: ${user.createdAt}`);
                console.log('-'.repeat(80));
            });
        }

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
        Object.keys(byCompany).sort().forEach(companyId => {
            const superAdminsInCompany = byCompany[companyId].filter(u => 
                u.role === 'SUPER_ADMIN' || 
                u.role === 'super_admin' || 
                u.role === 'Super_Admin'
            );
            console.log(`   Company ID: ${companyId || 'NULL'} - إجمالي: ${byCompany[companyId].length}`);
            if (superAdminsInCompany.length > 0) {
                console.log(`      👑 SUPER_ADMIN في هذا Company: ${superAdminsInCompany.length}`);
                superAdminsInCompany.forEach(user => {
                    console.log(`         - ${user.firstName} ${user.lastName} (${user.email})`);
                });
            }
            console.log('');
        });

        // تحليل المشكلة
        console.log('\n🔍 تحليل المشكلة في الكود:\n');
        console.log('في ملف backend/controllers/superAdminController.js');
        console.log('السطر 244-246 يقوم بفلترة المستخدمين حسب companyId:');
        console.log('   if (req.user && req.user.companyId) {');
        console.log('       where.companyId = req.user.companyId;');
        console.log('   }');
        console.log('\nهذا يعني أن:');
        console.log('   1. المستخدمين السوبر أدمن الذين لديهم companyId مختلف لن يظهرون');
        console.log('   2. المستخدمين السوبر أدمن الذين لديهم companyId = NULL لن يظهرون');
        console.log('   3. فقط المستخدمين الذين لديهم نفس companyId سيظهرون\n');

    } catch (error) {
        console.error('❌ خطأ في فحص قاعدة البيانات:', error);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

checkAllUsersRaw();

