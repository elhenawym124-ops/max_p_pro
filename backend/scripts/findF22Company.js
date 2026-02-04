const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCompanyAndUser() {
  try {
    console.log('🔍 Searching for company f22...');
    
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: 'f22' } },
          { name: { contains: 'F22' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`\n📊 Found ${companies.length} companies:`);
    companies.forEach(c => {
      console.log(`  - ${c.name} (${c.id})`);
    });
    
    console.log('\n🔍 Searching for user shroukk...');
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: 'shrouk' } },
          { email: { contains: 'shrouk' } }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true
      }
    });
    
    console.log(`\n👤 Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`  - ${u.firstName} ${u.lastName} (${u.email}) - Company: ${u.companyId}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCompanyAndUser();
