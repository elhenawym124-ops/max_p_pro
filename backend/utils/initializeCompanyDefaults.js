const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

/**
 * Initialize default store pages for a new company
 * This should be called automatically when a new company is created
 */
async function initializeDefaultStorePages(companyId) {
  try {
    console.log(`📄 [INIT] Initializing default store pages for company: ${companyId}`);

    // Check if pages already exist
    const existingPages = await executeWithRetry(async () => {
      const prisma = getSharedPrismaClient();
      return await prisma.storePage.count({
        where: { companyId }
      });
    });

    if (existingPages > 0) {
      console.log(`⚠️ [INIT] Company ${companyId} already has ${existingPages} pages, skipping initialization`);
      return { success: false, message: 'Pages already exist' };
    }

    // Default pages content - مناسب للسوق المصري 100%
    const defaultPages = [
      {
        title: 'سياسة الشحن والتوصيل',
        slug: 'shipping-policy',
        pageType: 'SHIPPING_POLICY',
        content: `<h2>سياسة الشحن والتوصيل</h2>
<p>نوفر خدمة التوصيل لجميع محافظات جمهورية مصر العربية.</p>

<h3>مدة التوصيل</h3>
<ul>
  <li><strong>القاهرة والجيزة:</strong> 1-3 أيام عمل</li>
  <li><strong>الإسكندرية والدلتا:</strong> 2-4 أيام عمل</li>
  <li><strong>باقي المحافظات:</strong> 3-7 أيام عمل</li>
</ul>

<h3>تكلفة الشحن</h3>
<ul>
  <li>شحن مجاني للطلبات فوق <strong>500 جنيه</strong> (القاهرة والجيزة)</li>
  <li>شحن مجاني للطلبات فوق <strong>750 جنيه</strong> (باقي المحافظات)</li>
  <li>رسوم الشحن: 35-70 جنيه حسب المحافظة</li>
</ul>

<p><strong>ملاحظة:</strong> أيام العمل من السبت إلى الخميس (الجمعة إجازة)</p>`,
        order: 1,
        showInFooter: true,
        isActive: true
      },
      {
        title: 'سياسة الإرجاع والاستبدال',
        slug: 'return-policy',
        pageType: 'RETURN_POLICY',
        content: `<h2>سياسة الإرجاع والاستبدال</h2>
<p>رضاك يهمنا! نوفر لك إمكانية إرجاع أو استبدال المنتجات بكل سهولة.</p>

<h3>مدة الإرجاع والاستبدال</h3>
<ul>
  <li>يمكنك إرجاع أو استبدال المنتج خلال <strong>14 يوم</strong> من تاريخ الاستلام</li>
  <li>يجب أن يكون المنتج في حالته الأصلية دون استخدام</li>
</ul>`,
        order: 2,
        showInFooter: true,
        isActive: true
      },
      {
        title: 'طرق الدفع المتاحة',
        slug: 'payment-methods',
        pageType: 'PAYMENT_METHODS',
        content: `<h2>طرق الدفع المتاحة</h2>
<p>نوفر لك عدة طرق دفع آمنة ومريحة.</p>

<h3>💵 الدفع عند الاستلام</h3>
<p>ادفع نقداً للمندوب عند استلام طلبك.</p>

<h3>💳 البطاقات الائتمانية</h3>
<ul>
  <li>Visa</li>
  <li>Mastercard</li>
  <li>Meeza (ميزة)</li>
</ul>`,
        order: 3,
        showInFooter: true,
        isActive: true
      }
    ];

    // Create all default pages
    const createdPagesCount = await executeWithRetry(async () => {
      const prisma = getSharedPrismaClient();
      const result = await prisma.storePage.createMany({
        data: defaultPages.map(page => ({
          ...page,
          companyId
        }))
      });
      return result.count;
    });

    console.log(`✅ [INIT] Created ${createdPagesCount} default pages for company ${companyId}`);

    return {
      success: true,
      count: createdPagesCount,
      message: `تم إنشاء ${createdPagesCount} صفحات افتراضية`
    };
  } catch (error) {
    console.error(`❌ [INIT] Error initializing default pages for company ${companyId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initializeDefaultStorePages
};
