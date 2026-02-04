const { getSharedPrismaClient } = require('../services/sharedDatabase');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

async function checkMarketingCompany() {
  try {
    console.log('🔍 البحث عن شركة "شركة التسويق"...\n');

    // البحث عن الشركة بالاسم
    const company = await getSharedPrismaClient().company.findFirst({
      where: {
        name: {
          contains: 'التسويق'
        }
      },
      include: {
        _count: {
          select: {
            products: true,
            branches: true,
            shippingZones: true,
            customers: true,
            orders: true,
            conversations: true
          }
        }
      }
    });

    if (!company) {
      console.log('❌ لم يتم العثور على شركة "شركة التسويق"');
      return;
    }

    console.log('✅ تم العثور على الشركة!\n');
    console.log('📋 معلومات الشركة:');
    console.log('=====================================');
    console.log(`🆔 المعرف: ${company.id}`);
    console.log(`🏢 الاسم: ${company.name}`);
    console.log(`📧 البريد الإلكتروني: ${company.email || 'غير محدد'}`);
    console.log(`📞 الهاتف: ${company.phone || 'غير محدد'}`);
    console.log(`🌐 الموقع: ${company.website || 'غير محدد'}`);
    console.log(`📍 العنوان: ${company.address || 'غير محدد'}`);
    console.log(`💼 الخطة: ${company.plan || 'غير محدد'}`);
    console.log(`✅ نشطة: ${company.isActive ? 'نعم' : 'لا'}`);
    console.log(`📅 تاريخ الإنشاء: ${company.createdAt}`);
    console.log(`📅 آخر تحديث: ${company.updatedAt}`);
    console.log('\n📊 الإحصائيات:');
    console.log(`   - المنتجات: ${company._count.products}`);
    console.log(`   - الفروع: ${company._count.branches}`);
    console.log(`   - مناطق الشحن: ${company._count.shippingZones}`);
    console.log(`   - العملاء: ${company._count.customers}`);
    console.log(`   - الطلبات: ${company._count.orders}`);
    console.log(`   - المحادثات: ${company._count.conversations}`);

    // جلب المنتجات
    console.log('\n\n📦 المنتجات:');
    console.log('=====================================');
    const products = await getSharedPrismaClient().product.findMany({
      where: {
        companyId: company.id,
        isActive: true
      },
      include: {
        category: {
          select: {
            name: true
          }
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            name: true,
            price: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // أول 50 منتج
    });

    if (products.length === 0) {
      console.log('❌ لا توجد منتجات نشطة');
    } else {
      console.log(`✅ تم العثور على ${products.length} منتج نشط (عرض أول 50):\n`);
      products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   🆔 المعرف: ${product.id}`);
        console.log(`   💰 السعر: ${product.price} جنيه`);
        console.log(`   📦 المخزون: ${product.stock || 0}`);
        console.log(`   📂 الفئة: ${product.category?.name || 'غير محدد'}`);
        if (product.variants && product.variants.length > 0) {
          console.log(`   🔄 المتغيرات: ${product.variants.length}`);
          product.variants.forEach(v => {
            console.log(`      - ${v.type}: ${v.value} (${v.price} جنيه)`);
          });
        }
        console.log('');
      });
    }

    // جلب الفروع
    console.log('\n\n🏪 الفروع:');
    console.log('=====================================');
    const branches = await getSharedPrismaClient().branch.findMany({
      where: {
        companyId: company.id
      },
      orderBy: { createdAt: 'desc' }
    });

    if (branches.length === 0) {
      console.log('❌ لا توجد فروع');
    } else {
      console.log(`✅ تم العثور على ${branches.length} فرع:\n`);
      branches.forEach((branch, index) => {
        console.log(`${index + 1}. ${branch.name}`);
        console.log(`   🆔 المعرف: ${branch.id}`);
        console.log(`   📍 العنوان: ${branch.address || 'غير محدد'}`);
        console.log(`   🏙️ المدينة: ${branch.city || 'غير محدد'}`);
        console.log(`   📞 الهاتف: ${branch.phone}`);
        console.log(`   📧 البريد: ${branch.email || 'غير محدد'}`);
        console.log(`   ⏰ ساعات العمل: ${branch.workingHours || 'غير محدد'}`);
        console.log(`   ✅ نشط: ${branch.isActive ? 'نعم' : 'لا'}`);
        console.log('');
      });
    }

    // جلب مناطق الشحن
    console.log('\n\n🚚 مناطق الشحن:');
    console.log('=====================================');
    const shippingZones = await getSharedPrismaClient().shippingZone.findMany({
      where: {
        companyId: company.id
      },
      orderBy: { createdAt: 'desc' }
    });

    if (shippingZones.length === 0) {
      console.log('❌ لا توجد مناطق شحن');
    } else {
      console.log(`✅ تم العثور على ${shippingZones.length} منطقة شحن:\n`);
      shippingZones.forEach((zone, index) => {
        console.log(`${index + 1}. منطقة شحن #${index + 1}`);
        console.log(`   🆔 المعرف: ${zone.id}`);
        console.log(`   📍 المحافظات: ${Array.isArray(zone.governorates) ? zone.governorates.join(', ') : JSON.stringify(zone.governorates)}`);
        console.log(`   💰 السعر: ${zone.price} جنيه`);
        console.log(`   ⏰ مدة التوصيل: ${zone.deliveryTime}`);
        console.log(`   ✅ نشط: ${zone.isActive ? 'نعم' : 'لا'}`);
        console.log('');
      });
    }

    // ملخص
    console.log('\n\n📊 الملخص:');
    console.log('=====================================');
    console.log(`🏢 الشركة: ${company.name}`);
    console.log(`📦 المنتجات النشطة: ${products.length}`);
    console.log(`🏪 الفروع: ${branches.length}`);
    console.log(`🚚 مناطق الشحن: ${shippingZones.length}`);
    console.log(`👥 العملاء: ${company._count.customers}`);
    console.log(`📦 الطلبات: ${company._count.orders}`);
    console.log(`💬 المحادثات: ${company._count.conversations}`);

  } catch (error) {
    console.error('❌ خطأ في جلب المعلومات:', error);
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

// تشغيل السكريبت
checkMarketingCompany();


