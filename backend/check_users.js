const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        companyId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('📋 Users in database:');
    console.log(JSON.stringify(users, null, 2));
    
    // Check specific user
    const testUser = await prisma.user.findUnique({
      where: { email: 'shrouk0@gmail.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        companyId: true,
        password: true
      }
    });
    
    console.log('\n🔍 Test user (shrouk0@gmail.com):');
    console.log(JSON.stringify(testUser, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
