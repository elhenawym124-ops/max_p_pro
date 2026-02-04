/**
 * سكريبت لعرض قائمة الشركات المتاحة للربط
 * Usage: node backend/scripts/listCompaniesForLink.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function listCompanies() {
  try {
    const prisma = getSharedPrismaClient();

    console.log('🔍 جاري جلب قائمة الشركات...\n');
    
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        isActive: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (companies.length === 0) {
      console.log('⚠️  لا توجد شركات في النظام');
      await prisma.$disconnect();
      return;
    }

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`📋 قائمة الشركات المتاحة (${companies.length} شركة)`);
    console.log('═══════════════════════════════════════════════════════════════════\n');

    companies.forEach((company, index) => {
      const status = company.isActive ? '✅ نشطة' : '❌ غير نشطة';
      const plan = company.plan || 'غير محدد';
      
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   🆔 ID: ${company.id}`);
      console.log(`   📧 Email: ${company.email || 'غير محدد'}`);
      console.log(`   🔗 Slug: ${company.slug || 'غير محدد'}`);
      console.log(`   📊 الحالة: ${status}`);
      console.log(`   💳 الخطة: ${plan}`);
      console.log(`   👥 عدد المستخدمين: ${company._count.users}`);
      console.log(`   📅 تاريخ الإنشاء: ${new Date(company.createdAt).toLocaleDateString('ar-EG')}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('\n💡 لتحويل مستخدم إلى COMPANY_ADMIN وربطه بشركة:');
    console.log('   node backend/scripts/setUserAsCompanyAdmin.js <email> <companyId>');
    console.log('\nمثال:');
    if (companies.length > 0) {
      console.log(`   node backend/scripts/setUserAsCompanyAdmin.js rewanhussirn@gmal.com ${companies[0].id}`);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

listCompanies();
