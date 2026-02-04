const { PrismaClient } = require('./prisma/generated/mysql');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // Get first active company
    const company = await prisma.company.findFirst({
      where: { isActive: true }
    });
    
    if (!company) {
      console.log('❌ No active company found');
      return;
    }
    
    console.log('🏢 Using company:', company.name);
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'shrouk0@gmail.com' }
    });
    
    if (existingUser) {
      console.log('✅ User already exists, updating password...');
      await prisma.user.update({
        where: { email: 'shrouk0@gmail.com' },
        data: {
          password: hashedPassword,
          isActive: true
        }
      });
      console.log('✅ Password updated successfully');
    } else {
      console.log('📝 Creating new user...');
      const user = await prisma.user.create({
        data: {
          id: require('crypto').randomUUID(),
          email: 'shrouk0@gmail.com',
          password: hashedPassword,
          firstName: 'Shrouk',
          lastName: 'Test',
          role: 'OWNER',
          isActive: true,
          companyId: company.id,
          updatedAt: new Date()
        }
      });
      
      console.log('✅ User created successfully:', {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        companyId: user.companyId
      });
    }
    
    console.log('\n🔑 Login credentials:');
    console.log('Email: shrouk0@gmail.com');
    console.log('Password: 123456');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
