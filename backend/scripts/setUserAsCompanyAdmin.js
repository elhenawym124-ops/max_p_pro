/**
 * سكريبت لتحويل مستخدم إلى COMPANY_ADMIN وربطه بشركة
 * Usage: node backend/scripts/setUserAsCompanyAdmin.js <email> <companyId>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function setUserAsCompanyAdmin(email, companyId) {
  try {
    const prisma = getSharedPrismaClient();

    console.log('🔍 البحث عن المستخدم...');
    console.log(`   📧 Email: ${email}`);
    
    // البحث عن المستخدم
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { email: email.toLowerCase() }
        ]
      },
      include: {
        company: true
      }
    });

    if (!user) {
      console.error('❌ المستخدم غير موجود');
      console.error('💡 تأكد من البريد الإلكتروني الصحيح');
      process.exit(1);
    }

    console.log(`\n✅ تم العثور على المستخدم:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - الاسم: ${user.firstName} ${user.lastName}`);
    console.log(`   - البريد: ${user.email}`);
    console.log(`   - الدور الحالي: ${user.role}`);
    console.log(`   - الشركة الحالية: ${user.companyId ? user.company?.name || user.companyId : 'لا يوجد'}`);

    // التحقق من وجود الشركة
    console.log(`\n🔍 التحقق من الشركة...`);
    console.log(`   🆔 Company ID: ${companyId}`);
    
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        slug: true,
        isActive: true
      }
    });

    if (!company) {
      console.error(`❌ الشركة غير موجودة: ${companyId}`);
      console.error('💡 استخدم: node backend/scripts/listCompaniesForLink.js لعرض الشركات المتاحة');
      process.exit(1);
    }

    console.log(`✅ تم العثور على الشركة:`);
    console.log(`   - الاسم: ${company.name}`);
    console.log(`   - المعرف: ${company.id}`);
    console.log(`   - البريد: ${company.email || 'غير محدد'}`);
    console.log(`   - الحالة: ${company.isActive ? '✅ نشطة' : '❌ غير نشطة'}`);

    if (!company.isActive) {
      console.warn('\n⚠️  تحذير: الشركة غير نشطة. سيتم المتابعة رغم ذلك.');
    }

    // التحقق من وجود سجل في UserCompany
    console.log(`\n🔍 التحقق من سجل UserCompany...`);
    
    let userCompany = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: companyId
        }
      }
    });

    // تحديث أو إنشاء سجل UserCompany
    if (userCompany) {
      console.log('📝 تحديث سجل UserCompany الموجود...');
      userCompany = await prisma.userCompany.update({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: companyId
          }
        },
        data: {
          role: 'COMPANY_ADMIN',
          isActive: true,
          isDefault: true
        }
      });
      console.log('✅ تم تحديث سجل UserCompany');
    } else {
      console.log('➕ إنشاء سجل UserCompany جديد...');
      userCompany = await prisma.userCompany.create({
        data: {
          userId: user.id,
          companyId: companyId,
          role: 'COMPANY_ADMIN',
          isActive: true,
          isDefault: true
        }
      });
      console.log('✅ تم إنشاء سجل UserCompany');
    }

    // تحديث المستخدم
    console.log(`\n🔄 تحديث معلومات المستخدم...`);
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'COMPANY_ADMIN',
        companyId: companyId
      },
      include: {
        company: true,
        userCompanies: {
          where: { companyId: companyId },
          select: {
            role: true,
            isActive: true,
            isDefault: true
          }
        }
      }
    });

    console.log('\n✅ تم تحديث المستخدم بنجاح!');
    console.log(`\n📋 معلومات المستخدم المحدثة:`);
    console.log(`   - الاسم: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`   - البريد: ${updatedUser.email}`);
    console.log(`   - الدور: ${updatedUser.role} ✅`);
    console.log(`   - الشركة: ${updatedUser.company?.name || companyId}`);
    console.log(`   - معرف الشركة: ${updatedUser.companyId} ✅`);
    console.log(`\n📋 معلومات UserCompany:`);
    console.log(`   - الدور في الشركة: ${userCompany.role}`);
    console.log(`   - الحالة: ${userCompany.isActive ? 'نشط' : 'غير نشط'}`);
    console.log(`   - افتراضي: ${userCompany.isDefault ? 'نعم' : 'لا'}`);

    console.log('\n🎉 تمت العملية بنجاح!');
    console.log('\n📝 ملاحظات مهمة:');
    console.log('   1. يجب على المستخدم تسجيل الخروج والدخول مرة أخرى');
    console.log('   2. سيحصل على token جديد يتضمن role: COMPANY_ADMIN و companyId');
    console.log('   3. سيتمكن الآن من الوصول إلى صفحات الموارد البشرية');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ حدث خطأ:', error.message);
    if (error.code === 'P2002') {
      console.error('⚠️  خطأ: يوجد سجل UserCompany آخر بنفس البيانات');
    }
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// تنفيذ السكريبت
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ الاستخدام: node setUserAsCompanyAdmin.js <email> <companyId>');
  console.error('\nمثال:');
  console.error('  node setUserAsCompanyAdmin.js rewanhussirn@gmal.com cmk2c35mz0000u9jw1grb680g');
  console.error('\n💡 لعرض قائمة الشركات:');
  console.error('  node backend/scripts/listCompaniesForLink.js');
  process.exit(1);
}

const [email, companyId] = args;

setUserAsCompanyAdmin(email, companyId);
