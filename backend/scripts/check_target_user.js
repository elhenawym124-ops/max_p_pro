
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const email = 'mokhtar@mokhtar.com';
  console.log(`Checking role for: ${email}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true
      }
    });

    if (!user) {
      console.log('User not found!');
    } else {
      console.log('User found:');
      console.log(`- ID: ${user.id}`);
      console.log(`- Role: ${user.role}`);
      console.log(`- IsActive: ${user.isActive}`);
      console.log(`- Company: ${user.company ? user.company.name : 'None'}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
