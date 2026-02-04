const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function updateRole() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    const email = 'mokhtar@mokhtar.com';
    const newRole = 'SUPER_ADMIN';

    console.log(`\n🔄 Updating user role: ${email} → ${newRole}\n`);
    
    const updatedUser = await prisma.user.update({
        where: { email },
        data: { role: newRole }
    });

    console.log('✅ User role updated successfully!');
    console.log('📧 Email:', updatedUser.email);
    console.log('👤 Name:', updatedUser.firstName, updatedUser.lastName);
    console.log('🎭 New Role:', updatedUser.role);
    console.log('✅ Active:', updatedUser.isActive);

    process.exit(0);
}

updateRole().catch(console.error);
