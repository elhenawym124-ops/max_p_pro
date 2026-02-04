/**
 * البحث عن شركة "شركة التسويق"
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

async function findCompany() {
  try {
    // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
    
    console.log('\n🔍 البحث عن شركة "شركة التسويق"...\n');

    // البحث بالاسم
    const companies = await getSharedPrismaClient().company.findMany({
      where: {
        OR: [
          { name: { contains: 'التسويق' } },
          { name: { contains: 'تسويق' } },
          { email: { contains: 'marketing' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        plan: true,
        createdAt: true
      }
    });

    if (companies.length === 0) {
      console.log('❌ لم يتم العثور على شركة "شركة التسويق"');
      console.log('\n📋 جميع الشركات الموجودة:\n');
      
      const allCompanies = await getSharedPrismaClient().company.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      allCompanies.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   Email: ${company.email}`);
        console.log(`   Active: ${company.isActive ? '✅' : '❌'}`);
        console.log('');
      });

      process.exit(1);
    }

    console.log(`✅ تم العثور على ${companies.length} شركة:\n`);
    
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ${company.name}`);
      console.log(`   ID: ${company.id}`);
      console.log(`   Email: ${company.email}`);
      console.log(`   Active: ${company.isActive ? '✅' : '❌'}`);
      console.log(`   Plan: ${company.plan}`);
      console.log(`   Created: ${new Date(company.createdAt).toLocaleDateString('ar-EG')}`);
      console.log('');
    });

    // استخدام أول شركة وجدناها
    const company = companies[0];
    console.log(`\n✅ سيتم استخدام الشركة: ${company.name} (${company.id})\n`);

    // التحقق من AI Settings
    const aiSettings = await getSharedPrismaClient().aiSettings.findUnique({
      where: { companyId: company.id }
    });

    if (!aiSettings) {
      console.log('⚠️  لا توجد AI Settings للشركة');
    } else {
      console.log('✅ AI Settings موجودة');
      console.log(`   - Auto Reply: ${aiSettings.autoReplyEnabled ? 'مفعل' : 'معطل'}`);
      console.log(`   - Reply Mode: ${aiSettings.replyMode}`);
    }

    // التحقق من Gemini Keys
    const geminiKeys = await getSharedPrismaClient().geminiKey.findMany({
      where: {
        companyId: company.id,
        isActive: true
      }
    });

    console.log(`\n${geminiKeys.length > 0 ? '✅' : '⚠️'} عدد مفاتيح Gemini النشطة: ${geminiKeys.length}`);
    
    if (geminiKeys.length > 0) {
      geminiKeys.forEach((key, index) => {
        console.log(`   ${index + 1}. ${key.model} - ${key.name}`);
      });
    }

    console.log(`\n📝 Company ID للاستخدام: ${company.id}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ خطأ:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

findCompany();


