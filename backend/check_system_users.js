const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const devSettingsService = require('./services/devSettingsService');

async function checkSystemUsers() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        console.log('🔍 فحص قاعدة البيانات لمستخدمي النظام (System Users)...\n');

        // Get system roles from settings (same as getSuperAdminUsers)
        let systemRoles = ['SUPER_ADMIN', 'Project Manager', 'Team Lead', 'Developer', 'Tester', 'Agent', 'AGENT'];
        try {
            const settings = await devSettingsService.getSettings();
            if (settings.permissions) {
                const dynamicRoles = Object.keys(settings.permissions);
                systemRoles = ['SUPER_ADMIN', ...dynamicRoles];
            }
        } catch (e) {
            console.warn('⚠️ Could not load dynamic roles, using defaults');
        }

        console.log('🔑 System Roles:', systemRoles.join(', '), '\n');

        // Query system users (same logic as getSuperAdminUsers)
        const where = {
            OR: [
                { role: 'SUPER_ADMIN' },
                { department: { not: null } },
                { role: { in: systemRoles.filter(r => r !== 'SUPER_ADMIN') } }
            ]
        };

        const systemUsers = await prisma.$queryRawUnsafe(`
            SELECT 
                id,
                firstName,
                lastName,
                email,
                role,
                companyId,
                department,
                isActive,
                createdAt
            FROM users
            WHERE role = 'SUPER_ADMIN'
               OR department IS NOT NULL
               OR role IN ('${systemRoles.filter(r => r !== 'SUPER_ADMIN').join("','")}')
            ORDER BY createdAt DESC
        `);

        const totalSystemUsers = systemUsers.length;
        console.log(`📊 إجمالي مستخدمي النظام (System Users): ${totalSystemUsers}\n`);

        if (totalSystemUsers === 0) {
            console.log('❌ لا يوجد مستخدمين نظام في قاعدة البيانات\n');
        } else {
            console.log('👥 جميع مستخدمي النظام:\n');
            console.log('='.repeat(100));

            systemUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
                console.log(`   📧 البريد: ${user.email}`);
                console.log(`   🔑 Role: "${user.role}"`);
                console.log(`   🏢 Company ID: ${user.companyId || 'NULL (لا يوجد)'}`);
                console.log(`   📁 Department: ${user.department || 'NULL (لا يوجد)'}`);
                console.log(`   ✅ الحالة: ${user.isActive ? 'نشط' : 'غير نشط'}`);
                console.log(`   📅 تاريخ الإنشاء: ${new Date(user.createdAt).toLocaleString('ar-EG')}`);
                console.log('-'.repeat(100));
            });

            // تحليل حسب role
            const byRole = {};
            systemUsers.forEach(user => {
                const role = user.role || 'NULL';
                if (!byRole[role]) {
                    byRole[role] = [];
                }
                byRole[role].push(user);
            });

            console.log('\n📊 التوزيع حسب Role:\n');
            Object.keys(byRole).sort().forEach(role => {
                console.log(`   🔑 Role: "${role}" - العدد: ${byRole[role].length}`);
                byRole[role].forEach(user => {
                    console.log(`      - ${user.firstName} ${user.lastName} (${user.email})`);
                });
                console.log('');
            });

            // إحصائيات
            const activeUsers = systemUsers.filter(u => u.isActive);
            const inactiveUsers = systemUsers.filter(u => !u.isActive);
            const usersWithDepartment = systemUsers.filter(u => u.department);
            const usersWithoutDepartment = systemUsers.filter(u => !u.department);

            console.log('\n📈 إحصائيات:\n');
            console.log(`   ✅ المستخدمين النشطين: ${activeUsers.length} من ${totalSystemUsers}`);
            console.log(`   ❌ المستخدمين غير النشطين: ${inactiveUsers.length} من ${totalSystemUsers}`);
            console.log(`   📁 المستخدمين مع Department: ${usersWithDepartment.length} من ${totalSystemUsers}`);
            console.log(`   🚫 المستخدمين بدون Department: ${usersWithoutDepartment.length} من ${totalSystemUsers}\n`);
        }

        // مقارنة مع COMPANY_ADMIN
        console.log('\n🔍 مقارنة مع COMPANY_ADMIN:\n');
        const companyAdmins = await prisma.$queryRawUnsafe(`
            SELECT COUNT(*) as count
            FROM users
            WHERE role = 'COMPANY_ADMIN'
        `);
        console.log(`   📊 COMPANY_ADMIN users: ${companyAdmins[0].count}`);
        console.log(`   ℹ️ ملاحظة: COMPANY_ADMIN ليسوا system users، هم مدراء شركات\n`);

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

checkSystemUsers();

