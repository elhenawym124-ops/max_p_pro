/**
 * سكريبت للبحث عن شركة معينة
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

async function findCompany(companyName) {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    console.log(`\n🔍 البحث عن الشركة: "${companyName}"\n`);
    
    // البحث بالاسم
    const companies = await getSharedPrismaClient().company.findMany({
      where: {
        name: {
          contains: companyName,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        plan: true,
        createdAt: true
      }
    });

    if (companies.length === 0) {
      console.log(`❌ لم يتم العثور على شركة بالاسم: "${companyName}"`);
      console.log(`\n📋 قائمة جميع الشركات المتاحة:`);
      
      const allCompanies = await getSharedPrismaClient().company.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          plan: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      allCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name} (${company.id})`);
        console.log(`   Email: ${company.email}`);
        console.log(`   Active: ${company.isActive ? '✅' : '❌'}`);
        console.log(`   Plan: ${company.plan}\n`);
      });

      return null;
    }

    console.log(`✅ تم العثور على ${companies.length} شركة:\n`);
    
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Email: ${company.email}`);
      console.log(`   Phone: ${company.phone || 'غير محدد'}`);
      console.log(`   Active: ${company.isActive ? '✅' : '❌'}`);
      console.log(`   Plan: ${company.plan}`);
      console.log(`   Created: ${new Date(company.createdAt).toLocaleString('ar-EG')}\n`);
    });

    // إرجاع أول شركة نشطة أو أول شركة
    const activeCompany = companies.find(c => c.isActive) || companies[0];
    
    if (activeCompany) {
      console.log(`\n✅ سيتم استخدام الشركة: ${activeCompany.name}`);
      console.log(`   Company ID: ${activeCompany.id}\n`);
      return activeCompany.id;
    }

    return companies[0]?.id || null;

  } catch (error) {
    console.error('❌ خطأ في البحث عن الشركة:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// تشغيل إذا كان مستدعى مباشرة
if (require.main === module) {
  const companyName = process.argv[2] || 'شركة التسويق';
  findCompany(companyName);
}

module.exports = findCompany;


