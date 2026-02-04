#!/usr/bin/env node

/**
 * Script to check user and company data
 * Usage: node scripts/check_user_company_data.js mokhtar@mokhtar.com
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80));
}

async function main() {
  const email = process.argv[2] || 'mokhtar@mokhtar.com';
  
  log(`\n🔍 Fetching data for: ${email}\n`, 'yellow');

  try {
    // Fetch user with all related data
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        company: true,
        userCompanies: {
          include: {
            company: true
          }
        }
      }
    });

    if (!user) {
      log(`❌ User not found: ${email}`, 'red');
      process.exit(1);
    }

    // Print User Info
    printSection('👤 USER INFORMATION');
    console.log({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    });

    // Print Main Company
    printSection('🏢 MAIN COMPANY (Primary)');
    if (user.company) {
      console.log({
        id: user.company.id,
        name: user.company.name,
        email: user.company.email,
        slug: user.company.slug,
        customDomain: user.company.customDomain || '❌ NOT SET',
        plan: user.company.plan,
        currency: user.company.currency,
        isActive: user.company.isActive,
        sidebarLayout: user.company.sidebarLayout,
        logo: user.company.logo ? '✅ Has logo' : '❌ No logo',
        createdAt: user.company.createdAt
      });
    } else {
      log('❌ No main company assigned', 'red');
    }

    // Print All Companies (from userCompanies)
    printSection('🏢 ALL COMPANIES (Multi-Company Access)');
    if (user.userCompanies && user.userCompanies.length > 0) {
      log(`Total companies: ${user.userCompanies.length}\n`, 'green');
      
      user.userCompanies.forEach((uc, index) => {
        log(`\n📍 Company ${index + 1}:`, 'magenta');
        console.log({
          companyId: uc.companyId,
          name: uc.company.name,
          slug: uc.company.slug,
          customDomain: uc.company.customDomain || '❌ NOT SET',
          role: uc.role,
          isDefault: uc.isDefault,
          isActive: uc.isActive,
          joinedAt: uc.joinedAt
        });
      });
    } else {
      log('❌ No companies in userCompanies table', 'yellow');
    }

    // Summary
    printSection('📊 SUMMARY');
    const hasCustomDomain = user.company?.customDomain;
    const companiesWithDomain = user.userCompanies?.filter(uc => uc.company.customDomain).length || 0;
    
    console.log({
      'Main Company Has Custom Domain': hasCustomDomain ? `✅ ${user.company.customDomain}` : '❌ Not set',
      'Total Companies': user.userCompanies?.length || 0,
      'Companies with Custom Domain': companiesWithDomain,
      'Current Slug': user.company?.slug || 'N/A',
      'Expected Subdomain URL': user.company?.slug ? `https://${user.company.slug}.maxp-ai.pro/shop` : 'N/A',
      'Custom Domain URL': hasCustomDomain ? `https://${user.company.customDomain}/shop` : 'N/A'
    });

    // Check if customDomain column exists
    printSection('🔧 DATABASE SCHEMA CHECK');
    const tableInfo = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'companies'
      AND COLUMN_NAME IN ('slug', 'customDomain');
    `;
    
    log('\nColumns in companies table:', 'cyan');
    console.table(tableInfo);

    log('\n✅ Data fetch completed successfully!\n', 'green');

  } catch (error) {
    log('\n❌ Error fetching data:', 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
