const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function createSuperAdmin() {
  try {
    console.log('🔧 Initializing database...');
    await initializeSharedDatabase();
    
    const prisma = getSharedPrismaClient();
    
    // Super Admin credentials
    const email = 'admin@superadmin.com';
    const password = 'Admin@123456';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('🔍 Checking if Super Admin already exists...');
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      console.log('⚠️  Super Admin already exists with email:', email);
      console.log('📧 Email:', email);
      console.log('🔑 Password: Admin@123456');
      return;
    }
    
    console.log('👤 Creating Super Admin user...');
    const superAdmin = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: email,
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        isEmailVerified: true,
        timezone: 'Africa/Cairo',
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Super Admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('🔑 Password: Admin@123456');
    console.log('👤 User ID:', superAdmin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🌐 You can now login at: http://localhost:3000/auth/login');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error creating Super Admin:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createSuperAdmin();
