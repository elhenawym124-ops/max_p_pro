const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const axios = require('axios');
const WalletService = require('../services/walletService');

const getAllCustomer = async (req, res) => {
  try {
    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Pagination & Filtering parameters
    // استخدام page و limit من الـ query أو القيم الافتراضية
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    const statusFilter = req.query.status;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    // بناء شرط البحث
    const where = { companyId };

    // 🕵️ Affiliate Filtering Logic
    let affiliateId = req.query.affiliateId;

    if (req.user.role === 'AGENT') {
      const prisma = getSharedPrismaClient();
      const affiliate = await prisma.affiliate.findUnique({
        where: { userId: req.user.id }
      });
      if (affiliate) {
        affiliateId = affiliate.id;
        // Agents only see customers they referred
        where.affiliateReferrals = {
          some: { affiliateId: affiliate.id }
        };
      } else {
        // Secure fallback
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page, limit, pages: 0 },
          message: 'لا يوجد مسوق مرتبط بهذا الحساب'
        });
      }
    } else if (affiliateId) {
      // Admins can filter by specific affiliate
      where.affiliateReferrals = {
        some: { affiliateId: affiliateId }
      };
    }

    // إضافة فلتر البحث النصي
    if (searchQuery) {
      where.OR = [
        { firstName: { contains: searchQuery } },
        { lastName: { contains: searchQuery } },
        { email: { contains: searchQuery } },
        { phone: { contains: searchQuery } }
      ];
    }

    // إضافة فلتر الحالة
    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    // تنفيذ الاستعلام مع الترقيم
    const [customers, total] = await Promise.all([
      getSharedPrismaClient().customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: skip,
        include: {
          _count: {
            select: {
              conversations: true,
              orders: true
            }
          }
        }
      }),
      getSharedPrismaClient().customer.count({ where })
    ]);

    // حساب معلومات الترقيم
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      message: `تم جلب ${customers.length} عميل للشركة`
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب العملاء',
      error: error.message
    });
  }
};

const deleteAllConversations = async (req, res) => {
  try {
    // 🔒 Security Check: Strict Admin Only
    // هذه عملية خطيرة جداً ويجب تقييدها
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;

    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإجراء هذا الحذف الشامل'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة للحذف'
      });
    }

    // ✅ FIX: Delete only for specific company
    const deleted = await getSharedPrismaClient().conversation.deleteMany({
      where: { companyId: companyId }
    });

    console.log(`🗑️ Deleted ${deleted.count} conversations for company ${companyId} by ${req.user.email}`);

    res.json({
      success: true,
      deletedCount: deleted.count,
      message: `تم مسح ${deleted.count} محادثة لهذه الشركة فقط`
    });
  } catch (error) {
    console.error('❌ Error deleting conversations:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مسح المحادثات'
    });
  }
};

// 🗑️ مسح عملاء الشركة فقط (محمية)
const deleteAllCustomers = async (req, res) => {
  try {
    // 🔒 Security Check: Strict Admin Only
    const userRole = req.user?.role;
    const companyId = req.user?.companyId;

    // فقط مدير النظام أو مدير الشركة يمكنه الحذف
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بإجراء هذا الحذف الشامل - يتطلب صلاحيات مدير'
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'يجب تحديد الشركة للحذف'
      });
    }

    // ✅ FIX: Delete only for specific company
    const deleted = await getSharedPrismaClient().customer.deleteMany({
      where: { companyId: companyId }
    });

    console.log(`🗑️ Deleted ${deleted.count} customers for company ${companyId} by ${req.user.email}`);

    res.json({
      success: true,
      deletedCount: deleted.count,
      message: `تم مسح ${deleted.count} عميل لهذه الشركة فقط`
    });
  } catch (error) {
    console.error('❌ Error deleting customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مسح العملاء'
    });
  }
};


// 🚫 حظر عميل على صفحة فيس بوك معينة
const blockCustomerOnPage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId, pageId, reason } = req.body;

    if (!customerId || !pageId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل ومعرف الصفحة مطلوبان'
      });
    }

    // التحقق من وجود العميل والشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true, facebookId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    // التحقق من وجود صفحة الفيس بوك
    const facebookPage = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId },
      select: { id: true, companyId: true, pageAccessToken: true }
    });

    if (!facebookPage) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الفيس بوك غير موجودة'
      });
    }

    if (facebookPage.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الصفحة'
      });
    }

    // التحقق من عدم وجود حظر سابق
    const existingBlock = await getSharedPrismaClient().blockedCustomerOnPage.findFirst({
      where: {
        facebookPageId: facebookPage.id,
        customerId: customerId
      }
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: 'العميل محظور بالفعل على هذه الصفحة'
      });
    }

    // التحقق من وجود facebookId
    if (!customer.facebookId) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن حظر العميل - معرف الفيسبوك غير موجود'
      });
    }

    // 🚫 التواصل مع Facebook API لحظر المستخدم من الصفحة مباشرة
    let facebookBlockResult = null;
    const facebookUserId = customer.facebookId;

    if (facebookUserId && facebookPage.pageAccessToken) {
      try {
        console.log(`🚫 [FB-API] Blocking user ${facebookUserId} on Facebook page ${pageId} via Graph API...`);

        // استخدام Facebook Graph API لحظر المستخدم
        const fbResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/blocked`,
          {
            user: facebookUserId
          },
          {
            params: {
              access_token: facebookPage.pageAccessToken
            },
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        facebookBlockResult = {
          success: true,
          facebookResponse: fbResponse.data
        };
        console.log(`✅ [FB-API] User blocked successfully on Facebook page:`, fbResponse.data);
      } catch (fbError) {
        console.error(`❌ [FB-API] Error blocking user on Facebook:`, fbError.response?.data || fbError.message);
        facebookBlockResult = {
          success: false,
          error: fbError.response?.data || fbError.message
        };
        // نستمر في حفظ الحظر في قاعدة البيانات حتى لو فشل Facebook API
      }
    } else {
      console.log(`⚠️ [FB-API] Cannot block on Facebook: missing facebookId (${!!facebookUserId}) or pageAccessToken (${!!facebookPage.pageAccessToken})`);
    }

    // إنشاء الحظر في قاعدة البيانات
    const blocked = await getSharedPrismaClient().blockedCustomerOnPage.create({
      data: {
        facebookPageId: facebookPage.id,
        pageId: pageId,
        customerId: customer.id,
        facebookId: customer.facebookId,
        blockedBy: userId || null,
        reason: reason || null,
        updatedAt: new Date(),
        metadata: facebookBlockResult ? JSON.stringify(facebookBlockResult) : null // حفظ نتيجة Facebook API
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            facebookId: true
          }
        },
        facebookPage: {
          select: {
            pageId: true,
            pageName: true
          }
        }
      }
    });

    console.log(`🚫 [BLOCK] Customer ${customer.id} blocked on page ${pageId} by user ${userId}`);

    res.json({
      success: true,
      data: blocked,
      message: 'تم حظر العميل على الصفحة بنجاح'
    });
  } catch (error) {
    console.error('❌ Error blocking customer:', error);

    // معالجة أخطاء Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'العميل محظور بالفعل على هذه الصفحة'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في حظر العميل',
      error: error.message
    });
  }
};

// ✅ إلغاء حظر عميل على صفحة فيس بوك معينة
const unblockCustomerOnPage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId, pageId } = req.body;

    if (!customerId || !pageId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل ومعرف الصفحة مطلوبان'
      });
    }

    // التحقق من وجود صفحة الفيس بوك
    const facebookPage = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId },
      select: { id: true, companyId: true, pageAccessToken: true }
    });

    if (!facebookPage) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الفيس بوك غير موجودة'
      });
    }

    if (facebookPage.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الصفحة'
      });
    }

    // البحث عن الحظر وحذفه
    const blocked = await getSharedPrismaClient().blockedCustomerOnPage.findFirst({
      where: {
        facebookPageId: facebookPage.id,
        customerId: customerId
      },
      include: {
        customer: {
          select: {
            facebookId: true
          }
        }
      }
    });

    if (!blocked) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير محظور على هذه الصفحة'
      });
    }

    // ✅ التواصل مع Facebook API لإلغاء حظر المستخدم من الصفحة مباشرة
    const facebookUserId = blocked.customer?.facebookId || blocked.facebookId;
    let facebookUnblockResult = null;

    if (facebookUserId && facebookPage.pageAccessToken) {
      try {
        console.log(`✅ [FB-API] Unblocking user ${facebookUserId} on Facebook page ${pageId} via Graph API...`);

        // استخدام Facebook Graph API لإلغاء حظر المستخدم
        const fbResponse = await axios.delete(
          `https://graph.facebook.com/v18.0/${pageId}/blocked/${facebookUserId}`,
          {
            params: {
              access_token: facebookPage.pageAccessToken
            },
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        facebookUnblockResult = {
          success: true,
          facebookResponse: fbResponse.data
        };
        console.log(`✅ [FB-API] User unblocked successfully on Facebook page`);
      } catch (fbError) {
        console.error(`❌ [FB-API] Error unblocking user on Facebook:`, fbError.response?.data || fbError.message);
        facebookUnblockResult = {
          success: false,
          error: fbError.response?.data || fbError.message
        };
        // نستمر في حذف الحظر من قاعدة البيانات حتى لو فشل Facebook API
      }
    } else {
      console.log(`⚠️ [FB-API] Cannot unblock on Facebook: missing facebookId (${!!facebookUserId}) or pageAccessToken (${!!facebookPage.pageAccessToken})`);
    }

    // حذف الحظر من قاعدة البيانات
    await getSharedPrismaClient().blockedCustomerOnPage.delete({
      where: { id: blocked.id }
    });

    console.log(`✅ [UNBLOCK] Customer ${customerId} unblocked on page ${pageId}`);

    res.json({
      success: true,
      message: 'تم إلغاء حظر العميل على الصفحة بنجاح'
    });
  } catch (error) {
    console.error('❌ Error unblocking customer:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إلغاء حظر العميل',
      error: error.message
    });
  }
};

// 📋 جلب قائمة العملاء المحظورين على صفحة معينة
const getBlockedCustomersOnPage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { pageId } = req.params;

    if (!pageId) {
      return res.status(400).json({
        success: false,
        message: 'معرف الصفحة مطلوب'
      });
    }

    // التحقق من وجود صفحة الفيس بوك
    const facebookPage = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId },
      select: { id: true, companyId: true }
    });

    if (!facebookPage) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الفيس بوك غير موجودة'
      });
    }

    if (facebookPage.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الصفحة'
      });
    }

    // جلب العملاء المحظورين
    const blockedCustomers = await getSharedPrismaClient().blockedCustomerOnPage.findMany({
      where: {
        facebookPageId: facebookPage.id
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            facebookId: true,
            avatar: true
          }
        }
      },
      orderBy: {
        blockedAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: blockedCustomers,
      count: blockedCustomers.length,
      message: `تم جلب ${blockedCustomers.length} عميل محظور`
    });
  } catch (error) {
    console.error('❌ Error fetching blocked customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب العملاء المحظورين',
      error: error.message
    });
  }
};

// 🔍 التحقق من حالة حظر عميل على صفحة معينة
const checkCustomerBlockStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId, pageId } = req.query;

    console.log(`🔍 [BLOCK-CHECK] Checking status for Customer: ${customerId}, Page: ${pageId}, Company: ${companyId}`);

    if (!customerId || !pageId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل ومعرف الصفحة مطلوبان'
      });
    }

    // التحقق من وجود صفحة الفيس بوك
    const facebookPage = await getSharedPrismaClient().facebookPage.findUnique({
      where: { pageId: pageId },
      select: { id: true, companyId: true }
    });

    if (!facebookPage) {
      return res.status(404).json({
        success: false,
        message: 'صفحة الفيس بوك غير موجودة'
      });
    }

    if (facebookPage.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الصفحة'
      });
    }

    // البحث عن الحظر
    const blocked = await getSharedPrismaClient().blockedCustomerOnPage.findFirst({
      where: {
        facebookPageId: facebookPage.id,
        customerId: customerId
      },
      include: {
        customers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            facebookId: true
          }
        }
      }
    });

    console.log(`✅ [BLOCK-CHECK] Found block record:`, blocked ? 'YES' : 'NO');

    res.json({
      success: true,
      isBlocked: !!blocked,
      data: blocked || null
    });
  } catch (error) {
    console.error('❌ Error checking block status:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في التحقق من حالة الحظر',
      error: error.message
    });
  }
};

// جلب طلبات العميل
const getCustomerOrders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل مطلوب'
      });
    }

    // التحقق من أن العميل ينتمي للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    // جلب طلبات العميل
    const orders = await getSharedPrismaClient().order.findMany({
      where: {
        customerId: customerId,
        companyId: companyId
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // تحويل البيانات للصيغة المطلوبة
    const formattedOrders = orders.map(order => {
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status.toLowerCase(),
        total: parseFloat(order.total),
        createdAt: order.createdAt,
        items: order.orderItems.map(item => {
          let image = null;
          try {
            if (item.product?.images) {
              const images = JSON.parse(item.product.images);
              if (Array.isArray(images) && images.length > 0) {
                image = images[0];
              }
            }
          } catch (e) {
            console.warn(`⚠️ [ORDER-ITEM] Failed to parse images for product ${item.product?.id}:`, e.message);
          }

          return {
            name: item.product?.name || 'منتج غير معروف',
            quantity: item.quantity,
            price: parseFloat(item.price),
            image: image
          };
        })
      };
    });

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('❌ Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب طلبات العميل',
      error: error.message
    });
  }
};

// 📊 جلب سجل نشاطات العميل
const getCustomerActivity = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل مطلوب'
      });
    }

    // التحقق من أن العميل ينتمي للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    // جلب آخر المحادثات
    const conversations = await getSharedPrismaClient().conversation.findMany({
      where: {
        customerId: customerId,
        companyId: companyId
      },
      select: {
        id: true,
        channel: true,
        lastMessageAt: true,
        createdAt: true
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 10
    });

    // جلب آخر الطلبات
    const orders = await getSharedPrismaClient().order.findMany({
      where: {
        customerId: customerId,
        companyId: companyId
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // دمج النشاطات وترتيبها حسب التاريخ
    const activities = [
      ...conversations.map(conv => ({
        type: 'conversation',
        id: conv.id,
        platform: conv.channel,
        timestamp: conv.lastMessageAt || conv.createdAt,
        data: conv
      })),
      ...orders.map(order => ({
        type: 'order',
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: parseFloat(order.total),
        timestamp: order.createdAt,
        data: order
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('❌ Error fetching customer activity:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب سجل النشاطات',
      error: error.message
    });
  }
};

// 📝 جلب ملاحظات العميل
const getCustomerNotes = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل مطلوب'
      });
    }

    // التحقق من أن العميل ينتمي للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    const notes = await getSharedPrismaClient().customerNote.findMany({
      where: { customerId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: notes
    });

  } catch (error) {
    console.error('❌ Error fetching customer notes:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الملاحظات',
      error: error.message
    });
  }
};

// 📝 إضافة ملاحظة جديدة
const addCustomerNote = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const authorId = req.user?.userId || req.user?.id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;
    const { content } = req.body;

    if (!customerId || !content) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل ونص الملاحظة مطلوبان'
      });
    }

    // التحقق من أن العميل ينتمي للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    const note = await getSharedPrismaClient().customerNote.create({
      data: {
        customerId,
        authorId,
        content
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: note,
      message: 'تم إضافة الملاحظة بنجاح'
    });

  } catch (error) {
    console.error('❌ Error adding customer note:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الملاحظة',
      error: error.message
    });
  }
};

// 🗑️ حذف ملاحظة
const deleteCustomerNote = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.userId || req.user?.id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { noteId } = req.params;

    const note = await getSharedPrismaClient().customerNote.findUnique({
      where: { id: noteId },
      include: {
        customer: {
          select: { companyId: true }
        }
      }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'الملاحظة غير موجودة'
      });
    }

    if (note.customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه الملاحظة'
      });
    }

    await getSharedPrismaClient().customerNote.delete({
      where: { id: noteId }
    });

    res.json({
      success: true,
      message: 'تم حذف الملاحظة بنجاح'
    });

  } catch (error) {
    console.error('❌ Error deleting customer note:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الملاحظة',
      error: error.message
    });
  }
};


// تفاصيل العميل الكاملة (للصفحة التفصيلية)
const getCustomerDetails = async (req, res) => {
  try {
    const { customerId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // جلب بيانات العميل مع الإحصائيات
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      include: {
        _count: {
          select: {
            orders: true,
            conversations: true
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذا العميل'
      });
    }

    // جلب آخر الطلبات
    const recentOrders = await getSharedPrismaClient().order.findMany({
      where: { customerId, companyId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true
      }
    });

    // جلب آخر المحادثات
    const recentConversations = await getSharedPrismaClient().conversation.findMany({
      where: { customerId, companyId },
      orderBy: { lastMessageAt: 'desc' },
      take: 10,
      select: {
        id: true,
        channel: true,
        status: true,
        lastMessageAt: true,
        createdAt: true
      }
    });

    // جلب الملاحظات
    const notes = await getSharedPrismaClient().customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    // حساب إجمالي المشتريات
    const ordersAggregate = await getSharedPrismaClient().order.aggregate({
      where: { customerId, companyId },
      _sum: { total: true },
      _count: true
    });

    // بناء الـ Activity Timeline (دمج وترتيب)
    const activities = [
      ...recentOrders.map(o => ({
        type: 'order',
        id: o.id,
        title: `طلب #${o.orderNumber}`,
        status: o.status,
        value: parseFloat(o.total || 0),
        timestamp: o.createdAt
      })),
      ...recentConversations.map(c => ({
        type: 'conversation',
        id: c.id,
        title: `محادثة ${c.channel}`,
        status: c.status,
        timestamp: c.lastMessageAt || c.createdAt
      })),
      ...notes.map(n => ({
        type: 'note',
        id: n.id,
        title: 'ملاحظة',
        content: n.content?.substring(0, 100),
        author: n.author ? `${n.author.firstName} ${n.author.lastName}` : 'غير معروف',
        timestamp: n.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);

    // الرد بكل البيانات
    res.json({
      success: true,
      data: {
        customer,
        stats: {
          ordersCount: customer._count?.orders || 0,
          conversationsCount: customer._count?.conversations || 0,
          totalSpent: parseFloat(ordersAggregate._sum?.total || 0),
          averageOrderValue: ordersAggregate._count > 0
            ? parseFloat(ordersAggregate._sum?.total || 0) / ordersAggregate._count
            : 0
        },
        recentOrders,
        recentConversations,
        notes,
        activities
      }
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب بيانات العميل',
      error: error.message
    });
  }
};

// 🔍 البحث عن عملاء
const searchCustomers = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { q } = req.query;
    if (!q) {
      return res.json({
        success: true,
        data: [],
        message: 'نص البحث فارغ'
      });
    }

    const customers = await getSharedPrismaClient().customer.findMany({
      where: {
        companyId,
        OR: [
          { phone: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } }
        ]
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: customers,
      message: `تم العثور على ${customers.length} عميل`
    });
  } catch (error) {
    console.error('❌ Error searching customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في البحث عن العملاء',
      error: error.message
    });
  }
};
// 📥 استيراد عملاء من CSV (JSON array)
const importCustomersFromCSV = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // فقط المديرين يمكنهم الاستيراد
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN' && userRole !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك باستيراد العملاء - يتطلب صلاحيات مدير'
      });
    }

    const { customers } = req.body;

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'لا توجد بيانات عملاء للاستيراد'
      });
    }

    // معالجة البيانات وإضافة companyId
    const customersToCreate = customers.map(c => ({
      firstName: c.firstName || c.first_name || c.name?.split(' ')[0] || 'غير معروف',
      lastName: c.lastName || c.last_name || c.name?.split(' ').slice(1).join(' ') || '',
      email: c.email || null,
      phone: c.phone || c.mobile || null,
      address: c.address || null,
      city: c.city || null,
      country: c.country || null,
      status: c.status || 'LEAD',
      tags: c.tags || [],
      notes: c.notes || null,
      companyId
    }));

    // إنشاء العملاء بالجملة
    const result = await getSharedPrismaClient().customer.createMany({
      data: customersToCreate,
      skipDuplicates: true
    });

    console.log(`📥 Imported ${result.count} customers for company ${companyId}`);

    // إنشاء محافظ للعملاء الجدد
    try {
      const createdCustomers = await getSharedPrismaClient().customer.findMany({
        where: { companyId },
        select: { id: true }
      });

      for (const customer of createdCustomers) {
        await WalletService.createWallet(customer.id, companyId);
      }

      console.log(`💰 Created wallets for ${createdCustomers.length} customers`);
    } catch (walletError) {
      console.error('❌ Error creating wallets:', walletError);
      // لا نمنع العملية إذا فشلت المحافظ
    }

    res.json({
      success: true,
      importedCount: result.count,
      message: `تم استيراد ${result.count} عميل بنجاح`
    });
  } catch (error) {
    console.error('❌ Error importing customers:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في استيراد العملاء',
      error: error.message
    });
  }
};

// 🗑️ حذف عميل محدد
const deleteCustomer = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const userRole = req.user?.role;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // فقط المديرين يمكنهم الحذف
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN' && userRole !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف العملاء - يتطلب صلاحيات مدير'
      });
    }

    const { customerId } = req.params;

    // التحقق من وجود العميل وانتمائه للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true, firstName: true, lastName: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بحذف هذا العميل'
      });
    }

    // حذف العميل (Cascade سيحذف الملاحظات والمحادثات المرتبطة)
    await getSharedPrismaClient().customer.delete({
      where: { id: customerId }
    });

    console.log(`🗑️ Customer ${customer.firstName} ${customer.lastName} deleted by user from company ${companyId}`);

    res.json({
      success: true,
      message: 'تم حذف العميل بنجاح'
    });

  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف العميل',
      error: error.message
    });
  }
};

// 🏷️ تحديث علامات العميل
const updateCustomerTags = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;
    const { tags } = req.body;

    // التحقق من وجود العميل وانتمائه للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بتعديل هذا العميل'
      });
    }

    // تحديث العلامات (تخزينها كـ JSON string)
    const tagsString = Array.isArray(tags) ? JSON.stringify(tags) : tags;

    const updatedCustomer = await getSharedPrismaClient().customer.update({
      where: { id: customerId },
      data: { tags: tagsString }
    });

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'تم تحديث العلامات بنجاح'
    });

  } catch (error) {
    console.error('❌ Error updating customer tags:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث العلامات',
      error: error.message
    });
  }
};



// ✏️ تحديث بيانات العميل
const updateCustomer = async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { customerId } = req.params;
    const { firstName, lastName, email, phone, address, city, country, status, notes } = req.body;

    // التحقق من وجود العميل وانتمائه للشركة
    const customer = await getSharedPrismaClient().customer.findUnique({
      where: { id: customerId },
      select: { id: true, companyId: true }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'العميل غير موجود'
      });
    }

    if (customer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بتعديل هذا العميل'
      });
    }

    // تحديث بيانات العميل
    const updatedCustomer = await getSharedPrismaClient().customer.update({
      where: { id: customerId },
      data: {
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        country: country || null,
        status: status || 'LEAD',
        notes: notes || null,
        updatedAt: new Date()
      }
    });

    console.log(`✏️ Customer ${firstName} ${lastName} updated by user from company ${companyId}`);

    res.json({
      success: true,
      data: updatedCustomer,
      message: 'تم تحديث بيانات العميل بنجاح'
    });

  } catch (error) {
    console.error('❌ Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث بيانات العميل',
      error: error.message
    });
  }
};

module.exports = {
  getAllCustomer,
  deleteAllConversations,
  deleteAllCustomers,
  blockCustomerOnPage,
  unblockCustomerOnPage,
  getBlockedCustomersOnPage,
  checkCustomerBlockStatus,
  getCustomerOrders,
  getCustomerActivity,
  getCustomerNotes,
  addCustomerNote,
  deleteCustomerNote,
  getCustomerDetails,
  searchCustomers,
  importCustomersFromCSV,
  deleteCustomer,
  updateCustomerTags,
  updateCustomer
};
