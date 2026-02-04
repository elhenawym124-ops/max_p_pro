const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 🎟️ سكريبت لإضافة كوبون تجريبي لشركة التسويق
 */

async function addTestCoupon() {
  try {
    console.log('🔍 البحث عن شركة التسويق...');
    
    // البحث عن الشركة
    const company = await prisma.company.findFirst({
      where: {
        name: {
          contains: 'التسويق'
        }
      }
    });

    if (!company) {
      console.error('❌ لم يتم العثور على شركة التسويق');
      console.log('💡 الشركات المتاحة:');
      const companies = await prisma.company.findMany({
        select: { id: true, name: true }
      });
      companies.forEach(c => console.log(`   - ${c.name} (${c.id})`));
      return;
    }

    console.log(`✅ تم العثور على الشركة: ${company.name} (${company.id})`);

    // إنشاء كوبونات تجريبية متنوعة
    const coupons = [
      {
        code: 'SUMMER2024',
        name: 'خصم الصيف 2024',
        description: 'خصم 20% على جميع المنتجات - عرض الصيف الحصري',
        type: 'PERCENTAGE',
        value: 20,
        minOrderAmount: 100,
        maxDiscountAmount: 200,
        usageLimit: 100,
        userUsageLimit: 1,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        isActive: true,
        customerSegments: JSON.stringify(['all'])
      },
      {
        code: 'NEWCUSTOMER50',
        name: 'خصم العملاء الجدد',
        description: 'خصم 50 جنيه للعملاء الجدد على أول طلب',
        type: 'FIXED',
        value: 50,
        minOrderAmount: 200,
        maxDiscountAmount: null,
        usageLimit: 50,
        userUsageLimit: 1,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        isActive: true,
        customerSegments: JSON.stringify(['new'])
      },
      {
        code: 'FREESHIP',
        name: 'شحن مجاني',
        description: 'شحن مجاني على جميع الطلبات فوق 300 جنيه',
        type: 'FREE_SHIPPING',
        value: 0,
        minOrderAmount: 300,
        maxDiscountAmount: null,
        usageLimit: null, // غير محدود
        userUsageLimit: null,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        isActive: true,
        customerSegments: JSON.stringify(['all'])
      },
      {
        code: 'VIP30',
        name: 'خصم VIP الحصري',
        description: 'خصم 30% حصري لعملاء VIP',
        type: 'PERCENTAGE',
        value: 30,
        minOrderAmount: 500,
        maxDiscountAmount: 500,
        usageLimit: 200,
        userUsageLimit: 5,
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2025-12-31'),
        isActive: true,
        customerSegments: JSON.stringify(['VIP'])
      },
      {
        code: 'FLASH100',
        name: 'عرض فلاش - خصم 100 جنيه',
        description: 'عرض محدود! خصم 100 جنيه على الطلبات فوق 500 جنيه',
        type: 'FIXED',
        value: 100,
        minOrderAmount: 500,
        maxDiscountAmount: null,
        usageLimit: 30,
        userUsageLimit: 1,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // أسبوع واحد
        isActive: true,
        customerSegments: JSON.stringify(['all'])
      }
    ];

    console.log('\n🎟️ إنشاء الكوبونات...\n');

    for (const couponData of coupons) {
      // التحقق من عدم وجود كوبون بنفس الكود
      const existing = await prisma.coupon.findFirst({
        where: {
          companyId: company.id,
          code: couponData.code
        }
      });

      if (existing) {
        console.log(`⚠️  الكوبون ${couponData.code} موجود بالفعل - تم التخطي`);
        continue;
      }

      const coupon = await prisma.coupon.create({
        data: {
          ...couponData,
          companyId: company.id
        }
      });

      console.log(`✅ تم إنشاء الكوبون: ${coupon.code}`);
      console.log(`   - الاسم: ${coupon.name}`);
      console.log(`   - النوع: ${coupon.type}`);
      console.log(`   - القيمة: ${coupon.value}`);
      console.log(`   - صالح حتى: ${coupon.validTo.toLocaleDateString('ar-EG')}`);
      console.log('');
    }

    console.log('✅ تم إنشاء جميع الكوبونات بنجاح!');
    console.log('\n📊 ملخص الكوبونات:');
    
    const allCoupons = await prisma.coupon.findMany({
      where: { companyId: company.id },
      select: {
        code: true,
        name: true,
        type: true,
        value: true,
        isActive: true,
        usageCount: true,
        usageLimit: true
      }
    });

    console.log(`\nإجمالي الكوبونات: ${allCoupons.length}\n`);
    allCoupons.forEach(c => {
      console.log(`🎟️  ${c.code} - ${c.name}`);
      console.log(`   النوع: ${c.type} | القيمة: ${c.value}`);
      console.log(`   الاستخدام: ${c.usageCount}/${c.usageLimit || '∞'} | الحالة: ${c.isActive ? '✅ نشط' : '❌ غير نشط'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
addTestCoupon();
