const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

async function testAppInstall() {
  console.log('🧪 اختبار تثبيت التطبيق...\n');
  
  try {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    
    // 1. البحث عن التطبيق
    console.log('1️⃣ البحث عن التطبيق crm-basic...');
    const app = await prisma.marketplaceApp.findUnique({
      where: { slug: 'crm-basic' }
    });
    
    if (!app) {
      console.log('❌ التطبيق غير موجود! قم بتشغيل seed أولاً:');
      console.log('   node backend/prisma/seeds/marketplaceSeed_simple.js');
      process.exit(1);
    }
    
    console.log('✅ تم العثور على التطبيق:', app.name);
    console.log('   ID:', app.id);
    console.log('   Monthly Price:', app.monthlyPrice);
    console.log('   Trial Days:', app.trialDays);
    
    // 2. البحث عن الشركة
    console.log('\n2️⃣ البحث عن الشركة...');
    const companyId = '9e1ace1b-aa9b-4593-9e39-48802e235840';
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });
    
    if (!company) {
      console.log('❌ الشركة غير موجودة!');
      process.exit(1);
    }
    
    console.log('✅ تم العثور على الشركة:', company.name);
    
    // 3. التحقق من التثبيت السابق
    console.log('\n3️⃣ التحقق من التثبيت السابق...');
    const existing = await prisma.companyApp.findUnique({
      where: {
        companyId_appId: { companyId, appId: app.id }
      }
    });
    
    if (existing) {
      console.log('⚠️  التطبيق مثبت بالفعل!');
      console.log('   Status:', existing.status);
      console.log('   Trial Ends:', existing.trialEndsAt);
      console.log('\n   هل تريد حذفه وإعادة التثبيت؟ (y/n)');
      console.log('   قم بتشغيل: node backend/test-app-install.js --force');
      
      if (process.argv.includes('--force')) {
        console.log('\n🗑️  حذف التثبيت السابق...');
        await prisma.companyApp.delete({
          where: { id: existing.id }
        });
        console.log('✅ تم الحذف');
      } else {
        process.exit(0);
      }
    } else {
      console.log('✅ التطبيق غير مثبت');
    }
    
    // 4. محاولة التثبيت
    console.log('\n4️⃣ محاولة التثبيت...');
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + app.trialDays);
    
    console.log('   Creating with data:');
    console.log('   - id:', uuidv4());
    console.log('   - companyId:', companyId);
    console.log('   - appId:', app.id);
    console.log('   - status: TRIAL');
    console.log('   - trialEndsAt:', trialEndsAt);
    
    const installation = await prisma.$transaction(async (tx) => {
      // Create company app
      const companyApp = await tx.companyApp.create({
        data: {
          id: uuidv4(),
          companyId,
          appId: app.id,
          status: 'TRIAL',
          trialEndsAt
        }
      });
      
      console.log('✅ تم إنشاء CompanyApp:', companyApp.id);
      
      // Update install count
      await tx.marketplaceApp.update({
        where: { id: app.id },
        data: { installCount: { increment: 1 } }
      });
      
      console.log('✅ تم تحديث عداد التثبيت');
      
      // Create wallet if doesn't exist
      let wallet = await tx.companyWallet.findUnique({
        where: { companyId }
      });
      
      if (!wallet) {
        console.log('📝 إنشاء محفظة جديدة...');
        wallet = await tx.companyWallet.create({
          data: {
            id: uuidv4(),
            companyId,
            balance: 0,
            currency: 'EGP'
          }
        });
        console.log('✅ تم إنشاء المحفظة');
      } else {
        console.log('✅ المحفظة موجودة بالفعل');
      }
      
      return companyApp;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ تم التثبيت بنجاح!');
    console.log('='.repeat(60));
    console.log('\n📊 تفاصيل التثبيت:');
    console.log('   ID:', installation.id);
    console.log('   Status:', installation.status);
    console.log('   Trial Ends:', installation.trialEndsAt);
    console.log('\n💡 يمكنك الآن تجربة التطبيق من الواجهة الأمامية!');
    
  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error('\n📋 تفاصيل الخطأ:');
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testAppInstall();
