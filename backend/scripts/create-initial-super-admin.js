/**
 * Create Initial Super Admin Script
 * 
 * This script creates the initial super admin user for the system.
 * Run this script once during initial setup:
 * 
 * Usage: node backend/scripts/create-initial-super-admin.js
 * 
 * Or with custom data:
 * node backend/scripts/create-initial-super-admin.js --email=admin@example.com --password=SecurePass123! --firstName=مدير --lastName=النظام
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');

const prisma = getSharedPrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

async function createInitialSuperAdmin() {
  try {
    console.log('🚀 [CREATE-SUPER-ADMIN] Starting initial super admin creation...\n');

    // Get parameters from command line or use defaults
    const email = getArg('email', 'superadmin@system.com');
    const password = getArg('password', 'SuperAdmin123!');
    const firstName = getArg('firstName', 'مدير');
    const lastName = getArg('lastName', 'النظام');

    // Check if super admin already exists
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingSuperAdmin) {
      console.log('⚠️  [CREATE-SUPER-ADMIN] Super admin already exists in the system!\n');
      console.log('📧 Email:', existingSuperAdmin.email);
      console.log('👤 Name:', `${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      console.log('🔑 Role:', existingSuperAdmin.role);
      console.log('✅ Status:', existingSuperAdmin.isActive ? 'Active' : 'Inactive');
      console.log('\n💡 To reset password, use: node backend/reset_super_admin_password.js');
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Hash password
    console.log('🔐 [CREATE-SUPER-ADMIN] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create super admin
    console.log('👤 [CREATE-SUPER-ADMIN] Creating super admin user...');
    const superAdmin = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        role: 'SUPER_ADMIN',
        isActive: true,
        isEmailVerified: true,
        companyId: null
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log('\n✅ [CREATE-SUPER-ADMIN] Super admin created successfully!\n');
    console.log('📋 User Details:');
    console.log('   ID:', superAdmin.id);
    console.log('   Email:', superAdmin.email);
    console.log('   Name:', `${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log('   Role:', superAdmin.role);
    console.log('   Status:', superAdmin.isActive ? 'Active' : 'Inactive');
    console.log('   Created:', superAdmin.createdAt);
    console.log('\n🔑 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n🌐 Login URL:');
    console.log('   http://localhost:3000/super-admin/login');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('   Use the Super Admin Users Management page to update the password.\n');

  } catch (error) {
    console.error('\n❌ [CREATE-SUPER-ADMIN] Error creating super admin:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createInitialSuperAdmin();

