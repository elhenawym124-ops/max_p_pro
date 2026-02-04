/**
 * Facebook Catalog Controller
 * 
 * Controller للتعامل مع طلبات Facebook Product Catalog Management
 */

const FacebookCatalogService = require('../services/facebookCatalogService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * جلب Access Token للشركة
 */
async function getCompanyAdsAccessToken(companyId) {
  try {
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { 
        facebookAdsAccessToken: true,
        facebookUserAccessToken: true
      }
    });

    return company?.facebookAdsAccessToken || company?.facebookUserAccessToken || null;
  } catch (error) {
    console.error('❌ Error getting company access token:', error);
    return null;
  }
}

/**
 * جلب Business ID للشركة (من Facebook Page أو Ad Account)
 */
async function getCompanyBusinessId(companyId) {
  try {
    // محاولة الحصول من Ad Account
    const adAccount = await getSharedPrismaClient().facebookAdAccount.findFirst({
      where: { companyId, isActive: true },
      select: { accountId: true }
    });

    if (adAccount) {
      // يمكن الحصول على Business ID من Ad Account
      // هذا يحتاج API call إضافي
      return null; // سيتم التعامل معه لاحقاً
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting business ID:', error);
    return null;
  }
}

/**
 * ============================================
 * Catalog Controllers
 * ============================================
 */

/**
 * جلب جميع Catalogs
 */
exports.getCatalogs = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { businessId } = req.query;

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found. Please connect your Facebook account first.'
      });
    }

    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'Business ID is required'
      });
    }

    const catalogService = new FacebookCatalogService(accessToken);
    const result = await catalogService.getCatalogs(businessId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // حفظ/تحديث في قاعدة البيانات
    for (const catalogData of result.data) {
      // البحث أولاً عن Catalog موجود
      const existing = await getSharedPrismaClient().facebookProductCatalog.findFirst({
        where: {
          companyId,
          facebookCatalogId: catalogData.id
        }
      });

      if (existing) {
        await getSharedPrismaClient().facebookProductCatalog.update({
          where: { id: existing.id },
          data: {
            name: catalogData.name,
            lastSyncAt: new Date(),
            totalProducts: catalogData.product_count || 0
          }
        });
      } else {
        await getSharedPrismaClient().facebookProductCatalog.create({
          data: {
            companyId,
            name: catalogData.name,
            facebookCatalogId: catalogData.id,
            catalogType: catalogData.vertical?.toUpperCase() || 'PRODUCTS',
            status: 'ACTIVE',
            isActive: true,
            totalProducts: catalogData.product_count || 0,
            lastSyncAt: new Date()
          }
        });
      }
    }

    // جلب من قاعدة البيانات
    const savedCatalogs = await getSharedPrismaClient().facebookProductCatalog.findMany({
      where: { companyId },
      include: {
        products: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: savedCatalogs
    });
  } catch (error) {
    console.error('❌ Error fetching catalogs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch catalogs'
    });
  }
};

/**
 * إنشاء Catalog جديد
 */
exports.createCatalog = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, businessId, catalogType, adAccountId } = req.body;

    if (!name || !businessId) {
      return res.status(400).json({
        success: false,
        error: 'Name and Business ID are required'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const catalogService = new FacebookCatalogService(accessToken);
    const result = await catalogService.createCatalog({
      name,
      businessId,
      catalogType: catalogType || 'PRODUCTS'
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // حفظ في قاعدة البيانات
    const catalog = await getSharedPrismaClient().facebookProductCatalog.create({
      data: {
        companyId,
        adAccountId: adAccountId || null,
        name,
        facebookCatalogId: result.catalogId,
        catalogType: catalogType || 'PRODUCTS',
        status: 'ACTIVE',
        isActive: true,
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS'
      },
      include: {
        products: true,
        feeds: true
      }
    });

    res.json({
      success: true,
      data: catalog
    });
  } catch (error) {
    console.error('❌ Error creating catalog:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create catalog'
    });
  }
};

/**
 * جلب Catalog واحد
 */
exports.getCatalog = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const catalog = await getSharedPrismaClient().facebookProductCatalog.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        products: {
          orderBy: { createdAt: 'desc' }
        },
        feeds: {
          orderBy: { createdAt: 'desc' }
        },
        dynamicAds: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!catalog) {
      return res.status(404).json({
        success: false,
        error: 'Catalog not found'
      });
    }

    // تحديث معلومات Catalog من Facebook
    if (catalog.facebookCatalogId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const catalogService = new FacebookCatalogService(accessToken);
        const result = await catalogService.getCatalog(catalog.facebookCatalogId);

        if (result.success) {
          // تحديث في قاعدة البيانات
          await getSharedPrismaClient().facebookProductCatalog.update({
            where: { id },
            data: {
              totalProducts: result.data.product_count || 0,
              lastSyncAt: new Date(),
              lastSyncStatus: 'SUCCESS'
            }
          });
        }
      }
    }

    const updatedCatalog = await getSharedPrismaClient().facebookProductCatalog.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { createdAt: 'desc' }
        },
        feeds: {
          orderBy: { createdAt: 'desc' }
        },
        dynamicAds: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    res.json({
      success: true,
      data: updatedCatalog
    });
  } catch (error) {
    console.error('❌ Error fetching catalog:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch catalog'
    });
  }
};

/**
 * حذف Catalog
 */
exports.deleteCatalog = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const catalog = await getSharedPrismaClient().facebookProductCatalog.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!catalog) {
      return res.status(404).json({
        success: false,
        error: 'Catalog not found'
      });
    }

    // حذف من Facebook
    if (catalog.facebookCatalogId) {
      const accessToken = await getCompanyAdsAccessToken(companyId);
      if (accessToken) {
        const catalogService = new FacebookCatalogService(accessToken);
        await catalogService.deleteCatalog(catalog.facebookCatalogId);
      }
    }

    // حذف من قاعدة البيانات
    await getSharedPrismaClient().facebookProductCatalog.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Catalog deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting catalog:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete catalog'
    });
  }
};

/**
 * ============================================
 * Product Controllers
 * ============================================
 */

/**
 * Sync Products مع Catalog
 */
exports.syncProducts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { catalogId } = req.params;
    const { productIds, syncAll = false } = req.body;

    const catalog = await getSharedPrismaClient().facebookProductCatalog.findFirst({
      where: {
        id: catalogId,
        companyId
      }
    });

    if (!catalog || !catalog.facebookCatalogId) {
      return res.status(404).json({
        success: false,
        error: 'Catalog not found or not synced with Facebook'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    // جلب المنتجات من النظام
    const where = syncAll 
      ? { companyId, isActive: true }
      : { companyId, id: { in: productIds || [] }, isActive: true };

    const products = await getSharedPrismaClient().product.findMany({
      where,
      include: {
        category: true,
        product_variants: true
      }
    });

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No products found to sync'
      });
    }

    const catalogService = new FacebookCatalogService(accessToken);
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // تحديث حالة Sync
    await getSharedPrismaClient().facebookProductCatalog.update({
      where: { id: catalogId },
      data: {
        lastSyncStatus: 'IN_PROGRESS',
        lastSyncAt: new Date()
      }
    });

    // رفع المنتجات
    for (const product of products) {
      try {
        // تحضير بيانات المنتج
        const productData = {
          name: product.name,
          description: product.description || '',
          imageUrl: product.images ? JSON.parse(product.images)[0] : null,
          linkUrl: `${process.env.FRONTEND_URL || 'https://yourstore.com'}/shop/${product.slug || product.id}`,
          brand: product.company?.name || '',
          category: product.category?.name || '',
          price: parseFloat(product.price),
          currency: product.company?.currency || 'EGP',
          availability: product.stock > 0 ? 'in stock' : 'out of stock',
          retailerId: product.sku || product.id,
          additionalImages: product.images ? JSON.parse(product.images).slice(1, 4) : []
        };

        const result = await catalogService.uploadProduct(
          catalog.facebookCatalogId,
          productData
        );

        if (result.success) {
          // حفظ/تحديث في قاعدة البيانات
          const existing = await getSharedPrismaClient().facebookCatalogProduct.findFirst({
            where: {
              catalogId,
              productId: product.id
            }
          });

          if (existing) {
            await getSharedPrismaClient().facebookCatalogProduct.update({
              where: { id: existing.id },
              data: {
                facebookProductId: result.productId,
                syncStatus: 'SYNCED',
                lastSyncedAt: new Date(),
                price: product.price,
                availability: product.stock > 0 ? 'in stock' : 'out of stock',
                inventory: product.stock
              }
            });
          } else {
            await getSharedPrismaClient().facebookCatalogProduct.create({
              data: {
                catalogId,
                productId: product.id,
                name: product.name,
                description: product.description,
                brand: product.company?.name || '',
                category: product.category?.name || '',
                sku: product.sku,
                price: product.price,
                currency: product.company?.currency || 'EGP',
                availability: product.stock > 0 ? 'in stock' : 'out of stock',
                inventory: product.stock,
                imageUrl: product.images ? JSON.parse(product.images)[0] : null,
                linkUrl: `${process.env.FRONTEND_URL || 'https://yourstore.com'}/shop/${product.slug || product.id}`,
                facebookProductId: result.productId,
                syncStatus: 'SYNCED',
                lastSyncedAt: new Date()
              }
            });
          }

          successCount++;
        } else {
          failCount++;
          errors.push({
            productId: product.id,
            productName: product.name,
            error: result.error
          });
        }
      } catch (error) {
        failCount++;
        errors.push({
          productId: product.id,
          productName: product.name,
          error: error.message
        });
      }
    }

    // تحديث حالة Sync
    await getSharedPrismaClient().facebookProductCatalog.update({
      where: { id: catalogId },
      data: {
        lastSyncStatus: failCount === 0 ? 'SUCCESS' : 'FAILED',
        lastSyncAt: new Date(),
        syncedProducts: successCount,
        totalProducts: products.length
      }
    });

    res.json({
      success: true,
      data: {
        total: products.length,
        successful: successCount,
        failed: failCount,
        errors: errors.slice(0, 10) // أول 10 أخطاء فقط
      }
    });
  } catch (error) {
    console.error('❌ Error syncing products:', error);
    
    // تحديث حالة Sync
    try {
      await getSharedPrismaClient().facebookProductCatalog.update({
        where: { id: req.params.catalogId },
        data: {
          lastSyncStatus: 'FAILED'
        }
      });
    } catch (e) {
      console.error('Error updating sync status:', e);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync products'
    });
  }
};

/**
 * جلب المنتجات في Catalog
 */
exports.getCatalogProducts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { catalogId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const catalog = await getSharedPrismaClient().facebookProductCatalog.findFirst({
      where: {
        id: catalogId,
        companyId
      }
    });

    if (!catalog) {
      return res.status(404).json({
        success: false,
        error: 'Catalog not found'
      });
    }

    const products = await getSharedPrismaClient().facebookCatalogProduct.findMany({
      where: { catalogId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            images: true
          }
        }
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await getSharedPrismaClient().facebookCatalogProduct.count({
      where: { catalogId }
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching catalog products:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch catalog products'
    });
  }
};

/**
 * جلب Product Sets للـ Catalog
 */
exports.getProductSets = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { catalogId } = req.params;

    const catalog = await getSharedPrismaClient().facebookProductCatalog.findFirst({
      where: {
        id: catalogId,
        companyId
      }
    });

    if (!catalog || !catalog.facebookCatalogId) {
      return res.status(404).json({
        success: false,
        error: 'Catalog not found or not synced with Facebook'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const catalogService = new FacebookCatalogService(accessToken);
    const result = await catalogService.getProductSets(catalog.facebookCatalogId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('❌ Error fetching product sets:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch product sets'
    });
  }
};

/**
 * إنشاء Product Set
 */
exports.createProductSet = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { catalogId } = req.params;
    const { name, productIds, filter } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const catalog = await getSharedPrismaClient().facebookProductCatalog.findFirst({
      where: {
        id: catalogId,
        companyId
      }
    });

    if (!catalog || !catalog.facebookCatalogId) {
      return res.status(404).json({
        success: false,
        error: 'Catalog not found or not synced with Facebook'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    const catalogService = new FacebookCatalogService(accessToken);
    const result = await catalogService.createProductSet(catalog.facebookCatalogId, {
      name,
      productIds,
      filter
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        productSetId: result.productSetId,
        ...result.data
      }
    });
  } catch (error) {
    console.error('❌ Error creating product set:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create product set'
    });
  }
};

/**
 * ============================================
 * Dynamic Ads Controllers
 * ============================================
 */

/**
 * إنشاء Dynamic Product Ad
 */
exports.createDynamicAd = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { adSetId } = req.params;
    const {
      name,
      catalogId,
      productSetId,
      templateUrl,
      status = 'PAUSED',
      headline,
      description,
      callToAction = 'SHOP_NOW'
    } = req.body;

    if (!name || !catalogId || !productSetId) {
      return res.status(400).json({
        success: false,
        error: 'Name, catalogId, and productSetId are required'
      });
    }

    // التحقق من Catalog
    const catalog = await getSharedPrismaClient().facebookProductCatalog.findFirst({
      where: {
        id: catalogId,
        companyId
      }
    });

    if (!catalog || !catalog.facebookCatalogId) {
      return res.status(404).json({
        success: false,
        error: 'Catalog not found or not synced with Facebook'
      });
    }

    // التحقق من AdSet
    const adSet = await getSharedPrismaClient().facebookAdSet.findFirst({
      where: {
        id: adSetId,
        companyId: req.user.companyId
      },
      include: {
        campaign: {
          include: {
            adAccount: true
          }
        }
      }
    });

    if (!adSet || !adSet.facebookAdSetId) {
      return res.status(404).json({
        success: false,
        error: 'AdSet not found or not synced with Facebook'
      });
    }

    const accessToken = await getCompanyAdsAccessToken(companyId);
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Facebook Access Token not found'
      });
    }

    // إنشاء Dynamic Ad في Facebook
    const catalogService = new FacebookCatalogService(accessToken);
    const result = await catalogService.createDynamicAd(adSet.facebookAdSetId, {
      name,
      catalogId: catalog.facebookCatalogId,
      productSetId,
      templateUrl,
      status,
      headline,
      description,
      callToAction
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    // حفظ في قاعدة البيانات
    const dynamicAd = await getSharedPrismaClient().facebookDynamicAd.create({
      data: {
        companyId,
        catalogId,
        adSetId,
        name,
        status,
        facebookAdId: result.adId,
        productSetId,
        templateUrl,
        headline,
        description,
        callToAction,
        lastSyncAt: new Date()
      },
      include: {
        catalog: true,
        adSet: true
      }
    });

    res.json({
      success: true,
      data: dynamicAd
    });
  } catch (error) {
    console.error('❌ Error creating dynamic ad:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create dynamic ad'
    });
  }
};

module.exports = exports;


