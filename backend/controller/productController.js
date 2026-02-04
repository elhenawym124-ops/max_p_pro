// Use shared database service instead of creating new PrismaClient
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry, safeQuery } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Create alias for executeWithRetry to match usage
const withRetry = executeWithRetry;

// ✅ Import EmbeddingHelper for generating product embeddings
const EmbeddingHelper = require('../services/embeddingHelper');
const ragService = require('../services/ragService'); // ✅ Import RAG Service for cache management
const { processImage, isProcessableImage } = require('../utils/imageProcessor');
const path = require('path');

const getAllProducts = async (req, res) => {
  try {
    console.log('📦 [PRODUCT-LOG] getAllProducts called');
    console.log('📦 [PRODUCT-LOG] Query params:', req.query);
    console.log('📦 [PRODUCT-LOG] User:', req.user ? { id: req.user.id, email: req.user.email, companyId: req.user.companyId, role: req.user.role } : 'No user');

    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Extract pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Extract sorting parameters
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    // Build orderBy object
    const orderBy = {};
    const validSortFields = ['name', 'price', 'stock', 'createdAt', 'updatedAt'];
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc'; // default
    }

    // Build filter object (Search)
    const where = { companyId };
    if (req.query.search) {
      where.name = {
        contains: req.query.search
      };
    }

    // 🔒 Security: If user is an AFFILIATE, only show products they have imported
    // EXCEPT if they are specifically requesting the marketplace view OR manual order view
    if (req.user.role === 'AFFILIATE' && req.query.marketplace !== 'true' && req.query.manualOrder !== 'true') {
      const affiliate = await getSharedPrismaClient().affiliate.findUnique({
        where: { userId: req.user.id }
      });

      if (affiliate) {
        where.affiliate_products = {
          some: {
            affiliateId: affiliate.id,
            isActive: true
          }
        };
      } else {
        // If not found as affiliate, show nothing
        where.id = 'none';
      }
    }

    // Get total count for pagination
    const total = await safeQuery(() =>
      getSharedPrismaClient().product.count({
        where: where
      })
    );

    //console.log('📦 Fetching products for company:', companyId);

    const products = await safeQuery(() =>
      getSharedPrismaClient().product.findMany({
        where: where, // فلترة بـ companyId + search + affiliate check
        include: {
          category: true, // تضمين بيانات الفئة
          productVariants: {
            where: { isActive: true },
            orderBy: [
              { type: 'asc' },
              { sortOrder: 'asc' }
            ]
          }
        },
        orderBy: orderBy,
        skip: skip,
        take: limit
      })
    );

    // Get platform margin settings for calculations
    const affiliateSettings = await safeQuery(() =>
      getSharedPrismaClient().affiliateSetting.findUnique({
        where: { companyId }
      })
    );

    // 🎯 If viewing manual order, try to fetch base markup for affiliate (regardless of role)
    let affiliateProductMap = {};
    if (req.query.manualOrder === 'true') {
      const affiliate = await safeQuery(() =>
        getSharedPrismaClient().affiliate.findUnique({
          where: { userId: req.user.id }
        })
      );

      if (affiliate) {
        const affiliateProducts = await safeQuery(() =>
          getSharedPrismaClient().affiliateProduct.findMany({
            where: {
              affiliateId: affiliate.id,
              productId: { in: products.map(p => p.id) }
            }
          })
        );

        // Map productId -> baseMarkup
        affiliateProductMap = affiliateProducts.reduce((acc, ap) => {
          acc[ap.productId] = Number(ap.markup);
          return acc;
        }, {});
      }
    }

    res.json({
      success: true,
      data: products.map(p => ({
        ...p,
        price: Number(p.price),
        cost: p.cost ? Number(p.cost) : 0,
        platformMarginType: affiliateSettings?.platformMarginType || 'FIXED',
        platformMarginValue: affiliateSettings?.platformMarginValue || 0,
        baseMarkup: affiliateProductMap[p.id] || 0, // 🎯 Base commission for affiliate
        variants: (p.productVariants || []).map(v => ({
          ...v,
          price: v.price ? Number(v.price) : 0,
          cost: v.cost ? Number(v.cost) : 0
        }))
      })),
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      },
      companyId: companyId,
      message: `تم جلب ${products.length} منتج للشركة`
    });
  } catch (error) {
    console.error('❌ [PRODUCT-ERROR] Error fetching products:', error);
    console.error('❌ [PRODUCT-ERROR] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المنتجات',
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const getCategory = async (req, res) => {
  try {
    //console.log('🔍 [server] GET /api/v1/products/categories');
    //console.log('🔍 [server] Request user:', req.user);
    //console.log('🔍 [server] Request headers:', req.headers);

    // 🔐 التحقق من المصادقة والشركة
    if (!req.user) {
      //console.log('❌ [server] No user found in request');
      return res.status(401).json({
        success: false,
        message: 'المصادقة مطلوبة للوصول لهذا المورد',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    const companyId = req.user?.companyId;
    if (!companyId) {
      //console.log('❌ [server] No companyId found for user:', req.user);
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    //console.log('🏢 [server] Loading categories for company:', companyId);

    const categories = await withRetry(() =>
      getSharedPrismaClient().category.findMany({
        where: { companyId }, // 🔐 فلترة بـ companyId من المستخدم المصادق عليه
        include: {
          _count: {
            select: { products: true }
          }
        },
        orderBy: { name: 'asc' }
      })
    );

    //console.log(`✅ [server] Found ${categories.length} categories for company ${companyId}`);
    res.json({
      success: true,
      data: categories,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ [server] Error getting categories:', error);
    console.error('❌ [server] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const createNewCategory = async (req, res) => {
  try {
    //console.log('🔍 [server] POST /api/v1/products/categories');
    //console.log('📤 [server] Request body:', req.body);

    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const {
      name,
      slug,
      description,
      image,
      parentId,
      isActive,
      sortOrder,
      displayType,
      metaTitle,
      metaDescription
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Generate slug if not provided
    const categorySlug = slug?.trim() || name.trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]/g, '')
      .replace(/--+/g, '-');

    // Check if category already exists in the same company
    const existingCategory = await getSharedPrismaClient().category.findFirst({
      where: {
        name: name.trim(),
        companyId // 🔐 فحص في نفس الشركة فقط
      }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists in your company'
      });
    }

    //console.log('📦 Creating category for company:', companyId);

    // Create new category
    const newCategory = await getSharedPrismaClient().category.create({
      data: {
        name: name.trim(),
        slug: categorySlug,
        description: description?.trim() || null,
        image: image || null,
        parentId: parentId || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
        displayType: displayType || 'default',
        metaTitle: metaTitle?.trim() || null,
        metaDescription: metaDescription?.trim() || null,
        companyId // 🔐 استخدام companyId من المستخدم المصادق عليه
      }
    });

    //console.log(`✅ [server] Created category: ${newCategory.name} for company ${companyId}`);
    res.status(201).json({
      success: true,
      data: newCategory,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ [server] Error creating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { id } = req.params;
    const {
      name,
      slug,
      description,
      image,
      parentId,
      isActive,
      sortOrder,
      displayType,
      metaTitle,
      metaDescription
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    // Check if category exists and belongs to the company
    const existingCategory = await getSharedPrismaClient().category.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Generate slug if not provided
    const categorySlug = slug?.trim() || name.trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]/g, '')
      .replace(/--+/g, '-');

    // Check if name is already taken by another category
    const duplicateCategory = await getSharedPrismaClient().category.findFirst({
      where: {
        name: name.trim(),
        companyId,
        id: { not: id }
      }
    });

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }

    // Update category
    const updatedCategory = await getSharedPrismaClient().category.update({
      where: { id },
      data: {
        name: name.trim(),
        slug: categorySlug,
        description: description?.trim() || null,
        image: image || null,
        parentId: parentId || null,
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
        displayType: displayType || 'default',
        metaTitle: metaTitle?.trim() || null,
        metaDescription: metaDescription?.trim() || null
      }
    });

    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('❌ [server] Error updating category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    //console.log(`🔍 [server] DELETE /api/v1/products/categories/${req.params.id}`);

    // 🔐 التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب للوصول لهذا المورد',
        code: 'COMPANY_ID_REQUIRED'
      });
    }

    const { id } = req.params;

    // Check if category exists and belongs to the company
    const existingCategory = await getSharedPrismaClient().category.findFirst({
      where: {
        id,
        companyId // 🔐 التأكد أن الفئة تنتمي لنفس الشركة
      }
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        error: 'Category not found or you do not have permission to delete it'
      });
    }

    // Check if category has products
    const productsCount = await getSharedPrismaClient().product.count({
      where: { categoryId: id }
    });

    if (productsCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${productsCount} products assigned to it.`
      });
    }

    // Check if category has subcategories
    const subcategoriesCount = await getSharedPrismaClient().category.count({
      where: { parentId: id }
    });

    if (subcategoriesCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${subcategoriesCount} subcategories.`
      });
    }

    // Delete category
    await getSharedPrismaClient().category.delete({
      where: { id }
    });

    //console.log(`✅ [server] Deleted category: ${existingCategory.name}`);
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('❌ [server] Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const getSingleProduct = async (req, res) => {
  try {
    //console.log(`🔍 [server] GET /api/v1/products/${req.params.id}`);

    const { id } = req.params;

    const product = await getSharedPrismaClient().product.findUnique({
      where: { id: id },
      include: {
        productVariants: {
          orderBy: { sortOrder: 'asc' }
        },
        category: true
      }
    });

    //console.log(`📊 [server] Product query result:`, {
    //   found: !!product,
    //   name: product?.name,
    //   variantsCount: product?.product_variants?.length || 0,
    //   categoryName: product?.category?.name
    // });

    if (!product) {
      //console.log(`❌ [server] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    //console.log(`✅ [server] Product found: ${product.name}`);
    res.json({
      success: true,
      data: {
        ...product,
        variants: product.productVariants || []
      }
    });
  } catch (error) {
    console.error(`❌ [server] Error getting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const updateSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - تسجيل الدخول مطلوب'
      });
    }

    // التحقق من أن المنتج موجود
    const existingProduct = await getSharedPrismaClient().product.findUnique({
      where: { id },
      select: { id: true, companyId: true, name: true }
    });

    if (!existingProduct) {
      console.error(`[PRODUCT-UPDATE] Product ${id} does not exist in database`);
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    const companyId = existingProduct.companyId;

    // التحقق من أن المستخدم لديه صلاحية على شركة المنتج
    // Super admin can access all products
    if (req.user.role === 'SUPER_ADMIN') {
      // Super admin has access to all products
    } else {
      // Check if user has access to the product's company
      const userCompany = await getSharedPrismaClient().userCompany.findFirst({
        where: {
          userId: userId,
          companyId: existingProduct.companyId,
          isActive: true
        }
      });

      if (!userCompany) {
        console.error(`[PRODUCT-UPDATE] User ${userId} does not have access to company ${existingProduct.companyId}`);
        return res.status(403).json({
          success: false,
          message: 'غير مصرح لك بالوصول إلى هذا المنتج'
        });
      }
    }

    const updateData = { ...req.body };

    // Handle images array - convert to JSON string if it's an array
    if (updateData.images && Array.isArray(updateData.images)) {
      updateData.images = JSON.stringify(updateData.images);
      //console.log(`📸 [server] Converted images array to JSON string`);
    }

    // Handle tags array - convert to JSON string if it's an array
    if (updateData.tags && Array.isArray(updateData.tags)) {
      updateData.tags = JSON.stringify(updateData.tags);
      //console.log(`🏷️ [server] Converted tags array to JSON string`);
    }

    // Handle dimensions object - convert to JSON string if it's an object
    if (updateData.dimensions && typeof updateData.dimensions === 'object') {
      updateData.dimensions = JSON.stringify(updateData.dimensions);
      //console.log(`📏 [server] Converted dimensions object to JSON string`);
    }

    // Ensure numeric fields are properly typed
    if (updateData.price !== undefined) {
      updateData.price = parseFloat(updateData.price);
    }
    if (updateData.stock !== undefined) {
      updateData.stock = parseInt(updateData.stock);
    }
    if (updateData.comparePrice !== undefined) {
      updateData.comparePrice = parseFloat(updateData.comparePrice);
    }
    if (updateData.cost !== undefined) {
      updateData.cost = parseFloat(updateData.cost);
    }

    // Handle trackInventory field
    if (updateData.trackInventory !== undefined) {
      updateData.trackInventory = Boolean(updateData.trackInventory);
      //console.log(`📦 [server] Track inventory: ${updateData.trackInventory}`);
    }

    // Handle hasPromotedAd field
    if (updateData.hasPromotedAd !== undefined) {
      updateData.hasPromotedAd = Boolean(updateData.hasPromotedAd);
      //console.log(`📢 [server] Has promoted ad: ${updateData.hasPromotedAd}`);
    }

    // Handle enableCheckoutForm and showAddToCartButton fields
    if (updateData.enableCheckoutForm !== undefined) {
      updateData.enableCheckoutForm = Boolean(updateData.enableCheckoutForm);
    }
    if (updateData.showAddToCartButton !== undefined) {
      updateData.showAddToCartButton = Boolean(updateData.showAddToCartButton);
    }

    // Handle sale dates - convert to Date objects if provided
    if (updateData.saleStartDate !== undefined) {
      updateData.saleStartDate = updateData.saleStartDate ? new Date(updateData.saleStartDate) : null;
    }
    if (updateData.saleEndDate !== undefined) {
      updateData.saleEndDate = updateData.saleEndDate ? new Date(updateData.saleEndDate) : null;
    }

    // Handle sizeGuide field - 📏 دليل المقاسات
    if (updateData.sizeGuide !== undefined) {
      updateData.sizeGuide = updateData.sizeGuide ? String(updateData.sizeGuide).trim() : null;
      //console.log(`📏 [server] Size guide: ${updateData.sizeGuide ? 'provided' : 'empty'}`);
    }

    // Handle Pre-order fields - 📦 الطلب المسبق
    if (updateData.isPreOrder !== undefined) {
      updateData.isPreOrder = Boolean(updateData.isPreOrder);
    }
    if (updateData.preOrderDate !== undefined) {
      updateData.preOrderDate = updateData.preOrderDate ? new Date(updateData.preOrderDate) : null;
    }
    if (updateData.preOrderMessage !== undefined) {
      updateData.preOrderMessage = updateData.preOrderMessage ? String(updateData.preOrderMessage).trim() : null;
    }

    // Handle category field - convert to categoryId for Prisma
    if (updateData.category !== undefined) {
      if (updateData.category && updateData.category.trim() !== '') {
        updateData.categoryId = updateData.category;
        //console.log(`🏷️ [server] Converted category to categoryId: ${updateData.categoryId}`);
      } else {
        // If category is empty string or null, set categoryId to null
        updateData.categoryId = null;
        //console.log(`🏷️ [server] Category is empty, setting categoryId to null`);
      }
      delete updateData.category;
    }

    // Handle slug update
    if (updateData.slug !== undefined) {
      if (updateData.slug && updateData.slug.trim() !== '') {
        const newSlug = updateData.slug.trim();

        // Ensure uniqueness
        const slugExists = await getSharedPrismaClient().product.findFirst({
          where: {
            slug: newSlug,
            companyId,
            id: { not: id }
          }
        });

        if (slugExists) {
          return res.status(400).json({
            success: false,
            message: 'رابط المنتج (slug) مستخدم بالفعل، يرجى اختيار رابط آخر'
          });
        }
        updateData.slug = newSlug;
      } else if (updateData.name || (existingProduct && existingProduct.name)) {
        // If slug is empty, try to generate it from the new name OR existing name
        const nameToUse = updateData.name || existingProduct.name;

        // Helper for transliteration (same as in createProduct)
        const arabicToFranco = {
          'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ء': 'a',
          'ب': 'b', 'ت': 't', 'ث': 'th',
          'ج': 'g', 'ح': '7', 'خ': 'kh',
          'د': 'd', 'ذ': 'dh',
          'ر': 'r', 'ز': 'z',
          'س': 's', 'ش': 'sh',
          'ص': 's', 'ض': 'd',
          'ط': 't', 'ظ': 'z',
          'ع': '3', 'غ': 'gh',
          'ف': 'f', 'ق': 'q',
          'ك': 'k', 'ل': 'l',
          'م': 'm', 'ن': 'n',
          'ه': 'h', 'ة': 'a', 'و': 'o', 'ؤ': 'o',
          'ي': 'y', 'ى': 'a', 'ئ': 'e'
        };

        const transliterateArabicToFranco = (text) => {
          return text.split('').map(char => arabicToFranco[char] || char).join('');
        };

        const transliterated = transliterateArabicToFranco(nameToUse);

        let generatedSlug = transliterated.trim().toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');

        if (!generatedSlug) {
          generatedSlug = `product-${Date.now()}`;
        }

        // Check uniqueness for generated slug
        const generatedSlugExists = await getSharedPrismaClient().product.findFirst({
          where: {
            slug: generatedSlug,
            companyId,
            id: { not: id }
          }
        });

        if (!generatedSlugExists) {
          updateData.slug = generatedSlug;
        } else {
          // If generated one exists, append timestamp
          updateData.slug = `${generatedSlug}-${Math.floor(Date.now() / 1000)}`;
        }
      } else {
        // If slug is empty and no name update, we could leave it as null, OR fetch existing name. 
        // Assuming simpler case first: logic above handles when name is part of update.
        // If users explicitly clear slug without changing name, maybe they WANT it null? 
        // But usually they want a valid slug. 
        // Let's stick to: if explicitly cleared (empty string) -> null (unless name update is present)
        // Actually, wait, if updateData.name IS NOT present, we can't generate a slug from it.
        updateData.slug = null;
      }
    }

    // Validate categoryId if provided
    if (updateData.categoryId) {
      try {
        const categoryExists = await getSharedPrismaClient().category.findUnique({
          where: { id: updateData.categoryId }
        });

        if (!categoryExists) {
          //console.log(`⚠️ [server] Category ${updateData.categoryId} not found, removing from update`);
          delete updateData.categoryId;
        }
      } catch (error) {
        //console.log(`⚠️ [server] Error checking category, removing from update:`, error.message);
        delete updateData.categoryId;
      }
    }

    // Validate companyId if provided
    if (updateData.companyId) {
      try {
        const companyExists = await getSharedPrismaClient().company.findUnique({
          where: { id: updateData.companyId }
        });

        if (!companyExists) {
          //console.log(`⚠️ [server] Company ${updateData.companyId} not found, removing from update`);
          delete updateData.companyId;
        }
      } catch (error) {
        //console.log(`⚠️ [server] Error checking company, removing from update:`, error.message);
        delete updateData.companyId;
      }
    }

    //console.log(`🔧 [server] Final update data:`, updateData);

    const product = await getSharedPrismaClient().product.update({
      where: { id: id },
      data: updateData,
      include: {
        category: true
      }
    });

    // ✅ Update embedding if product data changed (async, don't wait)
    // Pass companyId to enable automatic Key Rotation
    EmbeddingHelper.updateEmbeddingIfNeeded(
      product.id,
      updateData,
      existingProduct,
      companyId
    ).catch(err => {
      console.error(`❌ Failed to update embedding for product ${product.id}:`, err.message);
    });

    // 🔄 Update RAG Index for this specific product
    if (ragService) {
      if (typeof ragService.addOrUpdateProduct === 'function') {
        ragService.addOrUpdateProduct(product).catch(console.error);
      } else if (typeof ragService.clearCompanyProducts === 'function') {
        ragService.clearCompanyProducts(companyId);
      }
    }

    //console.log(`✅ [server] Product updated: ${product.name}`);
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error(`❌ [server] Error updating product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث المنتج - ' + (error.message || ''),
      error: error.message,
      details: error.stack
    });
  }
}

const deleteSingleProduct = async (req, res) => {
  try {
    //console.log(`🗑️ [server] DELETE /api/v1/products/${req.params.id}`);

    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[PRODUCT-DELETE] Missing companyId. req.user:`, req.user);
      }
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { id } = req.params;

    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PRODUCT-DELETE] Deleting product ${id} for company ${companyId}`);
    }

    // التحقق من أن المنتج ينتمي للشركة
    const existingProduct = await getSharedPrismaClient().product.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingProduct) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[PRODUCT-DELETE] Product ${id} not found or doesn't belong to company ${companyId}`);
      }
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود أو غير مصرح لك بالوصول إليه'
      });
    }

    await getSharedPrismaClient().product.delete({
      where: { id: id }
    });

    // 🔄 Remove from RAG Index
    if (ragService) {
      if (typeof ragService.removeProduct === 'function') {
        ragService.removeProduct(id);
      } else if (typeof ragService.clearCompanyProducts === 'function') {
        ragService.clearCompanyProducts(companyId);
      }
    }

    //console.log(`✅ [server] Product deleted: ${id}`);
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error(`❌ [server] Error deleting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const createProduct = async (req, res) => {
  try {
    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[PRODUCT-CREATE] Missing companyId. req.user:`, req.user);
      }
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PRODUCT-CREATE] Creating product for company ${companyId}`);
    }

    const { name, description, price, category, stock, sku, images, tags, hasPromotedAd } = req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required'
      });
    }

    // Generate unique SKU only if provided
    let productSku = sku || null;
    if (productSku) {
      // Ensure SKU is unique within the company
      let skuExists = await getSharedPrismaClient().product.findFirst({
        where: {
          sku: productSku,
          companyId // فحص SKU ضمن الشركة فقط
        }
      });
      if (skuExists) {
        return res.status(400).json({
          success: false,
          error: 'SKU already exists in your company. Please use a different SKU.'
        });
      }
    }

    // Generate or validate slug
    let productSlug = req.body.slug ? req.body.slug.trim() : null;
    if (!productSlug && name) {
      // 1. Transliterate first
      const transliterated = transliterateArabicToFranco(name);

      // 2. Generate slug
      productSlug = transliterated.trim().toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      if (!productSlug) {
        productSlug = `product-${Date.now()}`;
      }
    }

    if (productSlug) {
      const slugExists = await getSharedPrismaClient().product.findFirst({
        where: {
          slug: productSlug,
          companyId
        }
      });

      if (slugExists) {
        return res.status(400).json({
          success: false,
          error: 'Product URL (slug) already exists. Please use a different one.'
        });
      }
    }

    // معالجة الفئة - التحقق من وجودها
    let categoryId = null;
    if (category && category.trim() !== '') {
      const categoryExists = await getSharedPrismaClient().category.findFirst({
        where: {
          id: category,
          companyId
        }
      });
      if (categoryExists) {
        categoryId = category;
      }
    }

    const now = new Date();
    const product = await getSharedPrismaClient().product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        sku: productSku,
        stock: parseInt(stock) || 0,
        trackInventory: req.body.trackInventory !== undefined ? req.body.trackInventory : true,
        hasPromotedAd: hasPromotedAd !== undefined ? Boolean(hasPromotedAd) : false,
        slug: productSlug,
        companyId, // 
        categoryId, // 
        images: images ? JSON.stringify(images) : null,
        tags: tags ? JSON.stringify(tags) : null,
        enableCheckoutForm: req.body.enableCheckoutForm !== undefined ? Boolean(req.body.enableCheckoutForm) : true,
        showAddToCartButton: req.body.showAddToCartButton !== undefined ? Boolean(req.body.showAddToCartButton) : true,
        saleStartDate: req.body.saleStartDate ? new Date(req.body.saleStartDate) : null,
        saleEndDate: req.body.saleEndDate ? new Date(req.body.saleEndDate) : null,
        comparePrice: req.body.comparePrice ? parseFloat(req.body.comparePrice) : null,
        cost: req.body.cost ? parseFloat(req.body.cost) : null,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
        isFeatured: req.body.isFeatured !== undefined ? Boolean(req.body.isFeatured) : false,
        weight: req.body.weight ? parseFloat(req.body.weight) : null,
        dimensions: req.body.dimensions ? JSON.stringify(req.body.dimensions) : null,
        updatedAt: now
      },
      include: {
        category: true
      }
    });

    // ✅ Generate embedding for new product (async, don't wait)
    // Pass companyId to enable automatic Key Rotation
    EmbeddingHelper.generateAndSaveProductEmbedding(
      product.id,
      product.name,
      product.description,
      product.category?.name,
      companyId
    ).catch(err => {
      console.error(`❌ Failed to generate embedding for new product ${product.id}:`, err.message);
    });

    // 🔄 Add to RAG Index immediately
    if (ragService) {
      if (typeof ragService.addOrUpdateProduct === 'function') {
        // Fetch with category for better embedding context if needed, or just use what we have
        ragService.addOrUpdateProduct(product).catch(console.error);
      } else if (typeof ragService.clearCompanyProducts === 'function') {
        ragService.clearCompanyProducts(companyId);
      }
    }

    res.json({
      success: true,
      data: product,
      companyId: companyId
    });
  } catch (error) {
    console.error('❌ [server] Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء المنتج - ' + (error.message || ''),
      error: error.message
    });
  }
}

const deleteImageFromOneProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    //console.log(`🗑️ [IMAGE-DELETE] Removing image from product ${id}:`, imageUrl);

    if (!imageUrl) {
      //console.log('❌ [IMAGE-DELETE] Error: Image URL is required');
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
        message: 'رابط الصورة مطلوب'
      });
    }

    // Get current product
    const product = await getSharedPrismaClient().product.findUnique({
      where: { id: id }
    });

    if (!product) {
      //console.log(`❌ [IMAGE-DELETE] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'المنتج غير موجود'
      });
    }

    // Parse current images
    let currentImages = [];
    try {
      currentImages = JSON.parse(product.images || '[]');
    } catch (e) {
      //console.log('⚠️ [IMAGE-DELETE] Error parsing images, treating as empty array');
      currentImages = [];
    }

    // Remove image URL
    const initialCount = currentImages.length;
    currentImages = currentImages.filter(img => img !== imageUrl);
    const finalCount = currentImages.length;

    if (initialCount === finalCount) {
      //console.log(`ℹ️ [IMAGE-DELETE] Image URL not found in product images`);
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        message: 'الصورة غير موجودة'
      });
    }

    //console.log(`➖ [IMAGE-DELETE] Removed image. Images count: ${initialCount} → ${finalCount}`);

    // Update product in database
    const updatedProduct = await getSharedPrismaClient().product.update({
      where: { id: id },
      data: {
        images: JSON.stringify(currentImages)
      }
    });

    //console.log(`✅ [IMAGE-DELETE] Successfully removed image from product ${id}`);
    //console.log(`📊 [IMAGE-DELETE] Final images array:`, currentImages);

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(req.user?.companyId);
    }

    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح',
      data: {
        removedImageUrl: imageUrl,
        productId: id,
        remainingImages: currentImages.length,
        allImages: currentImages
      }
    });

  } catch (error) {
    console.error('❌ [IMAGE-DELETE] Error removing image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'خطأ في الخادم'
    });
  }
}

// Upload product images directly (multipart/form-data)
const uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى رفع صورة واحدة على الأقل'
      });
    }

    // Verify product exists and belongs to company
    const product = await getSharedPrismaClient().product.findFirst({
      where: { id, companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Parse current images
    let currentImages = [];
    try {
      currentImages = JSON.parse(product.images || '[]');
    } catch (e) {
      currentImages = [];
    }

    // Process and add uploaded images URLs
    const newImageUrls = [];
    for (const file of req.files) {
      let currentFilename = file.filename;
      if (isProcessableImage(file.mimetype)) {
        try {
          const processed = await processImage(file.path, path.dirname(file.path));
          currentFilename = processed.filename;
        } catch (procError) {
          console.error(`❌ [IMAGE-PROC] Error processing product image:`, procError.message);
        }
      }
      newImageUrls.push(`/uploads/products/${currentFilename}`);
    }

    currentImages.push(...newImageUrls);

    // Update product
    await getSharedPrismaClient().product.update({
      where: { id },
      data: {
        images: JSON.stringify(currentImages)
      }
    });

    // Generate full URLs
    const fullUrls = newImageUrls.map(url => `${req.protocol}://${req.get('host')}${url}`);

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
    }

    res.json({
      success: true,
      message: `تم رفع ${newImageUrls.length} صورة بنجاح`,
      data: {
        uploadedImages: fullUrls,
        totalImages: currentImages.length
      }
    });

  } catch (error) {
    console.error('Error uploading product images:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في رفع الصور'
    });
  }
};

const addImageToProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    //console.log(`➕ [IMAGE-ADD] Adding image to product ${id}:`, imageUrl);

    if (!imageUrl) {
      //console.log('❌ [IMAGE-ADD] Error: Image URL is required');
      return res.status(400).json({
        success: false,
        error: 'Image URL is required',
        message: 'رابط الصورة مطلوب'
      });
    }

    // Validate image URL
    try {
      new URL(imageUrl);
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      //console.log('❌ [IMAGE-ADD] Invalid image URL:', imageUrl);
      return res.status(400).json({
        success: false,
        error: 'Invalid image URL',
        message: 'رابط الصورة غير صالح'
      });
    }

    // Get current product
    const product = await getSharedPrismaClient().product.findUnique({
      where: { id: id }
    });

    if (!product) {
      //console.log(`❌ [IMAGE-ADD] Product not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'المنتج غير موجود'
      });
    }

    // Parse current images
    let currentImages = [];
    try {
      currentImages = JSON.parse(product.images || '[]');
    } catch (e) {
      //console.log('⚠️ [IMAGE-ADD] Error parsing images, treating as empty array');
      currentImages = [];
    }

    // Check if image already exists
    if (currentImages.includes(imageUrl)) {
      //console.log(`ℹ️ [IMAGE-ADD] Image URL already exists in product images`);
      return res.status(409).json({
        success: false,
        error: 'Image already exists',
        message: 'الصورة موجودة بالفعل'
      });
    }

    // Add new image URL
    currentImages.push(imageUrl);
    //console.log(`➕ [IMAGE-ADD] Added image. Images count: ${currentImages.length - 1} → ${currentImages.length}`);

    // Update product in database
    const updatedProduct = await getSharedPrismaClient().product.update({
      where: { id: id },
      data: {
        images: JSON.stringify(currentImages)
      }
    });

    //console.log(`✅ [IMAGE-ADD] Successfully added image to product ${id}`);
    //console.log(`📊 [IMAGE-ADD] Final images array:`, currentImages);

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(req.user?.companyId);
    }

    res.json({
      success: true,
      message: 'تم إضافة الصورة بنجاح',
      data: {
        addedImageUrl: imageUrl,
        productId: id,
        totalImages: currentImages.length,
        allImages: currentImages
      }
    });

  } catch (error) {
    console.error('❌ [IMAGE-ADD] Error adding image:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'خطأ في الخادم'
    });
  }
}

// Create product variant
const createProductVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة
    const product = await getSharedPrismaClient().product.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // إنشاء الـ variant
    const {
      name,
      type,
      sku,
      price,
      comparePrice,
      cost,
      images,
      stock,
      trackInventory,
      isActive,
      sortOrder,
      metadata
    } = req.body;

    // التحقق من البيانات المطلوبة
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'اسم المتغير مطلوب'
      });
    }

    // معالجة الصور - تحويل array إلى JSON string
    let imagesStr = null;
    if (images) {
      if (Array.isArray(images)) {
        imagesStr = JSON.stringify(images);
      } else if (typeof images === 'string') {
        imagesStr = images;
      }
    }

    // إنشاء الـ variant الجديد
    const variant = await getSharedPrismaClient().productVariant.create({
      data: {
        productId: id,
        name,
        type: type || 'color',
        sku,
        price: price ? parseFloat(price) : null,
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        cost: cost ? parseFloat(cost) : null,
        images: imagesStr,
        stock: stock !== undefined ? parseInt(stock) : 0,
        trackInventory: trackInventory !== undefined ? trackInventory : true,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
        metadata,
        updatedAt: new Date()
      }
    });

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
    }

    res.status(201).json({
      success: true,
      data: variant,
      message: 'تم إضافة المتغير بنجاح'
    });

  } catch (error) {
    console.error('Error creating product variant:', error);

    // التحقق من خطأ SKU المكرر
    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return res.status(400).json({
        success: false,
        message: 'رمز SKU موجود بالفعل'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة المتغير'
    });
  }
};

// Add image to product variant (receives imageUrl from frontend)
const addImageToVariantFromBody = async (req, res) => {
  try {
    const { id } = req.params;
    const { variantId, imageUrl } = req.body;
    const companyId = req.user?.companyId;

    console.log('🖼️ [VARIANT-IMAGE] Request:', {
      productId: id,
      variantId,
      imageUrl
    });

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    if (!variantId) {
      console.log('❌ [VARIANT-IMAGE] Missing variantId');
      return res.status(400).json({
        success: false,
        message: 'معرف المتغير مطلوب'
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة
    const product = await getSharedPrismaClient().product.findFirst({
      where: { id, companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Get the variant
    const variant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // Parse current images
    let currentImages = [];
    try {
      currentImages = JSON.parse(variant.images || '[]');
    } catch (e) {
      currentImages = [];
    }

    // Check if image already exists
    if (currentImages.includes(imageUrl)) {
      return res.status(409).json({
        success: false,
        message: 'الصورة موجودة بالفعل'
      });
    }

    // Add new image URL
    currentImages.push(imageUrl);

    // Update variant in database
    const updatedVariant = await getSharedPrismaClient().productVariant.update({
      where: { id: variantId },
      data: {
        images: JSON.stringify(currentImages)
      }
    });

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
    }

    res.json({
      success: true,
      message: 'تم إضافة الصورة بنجاح',
      data: {
        variantId: variantId,
        imageUrl: imageUrl,
        totalImages: currentImages.length,
        allImages: currentImages
      }
    });

  } catch (error) {
    console.error('Error adding image to variant:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الصورة'
    });
  }
};

// Add image to product variant
const addImageToVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const { imageUrl } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة مطلوب'
      });
    }

    // Validate image URL
    try {
      new URL(imageUrl);
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة غير صالح'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة
    const product = await getSharedPrismaClient().product.findFirst({
      where: { id, companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Get the variant
    const variant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // Parse current images
    let currentImages = [];
    try {
      currentImages = JSON.parse(variant.images || '[]');
    } catch (e) {
      currentImages = [];
    }

    // Check if image already exists
    if (currentImages.includes(imageUrl)) {
      return res.status(409).json({
        success: false,
        message: 'الصورة موجودة بالفعل'
      });
    }

    // Add new image URL
    currentImages.push(imageUrl);

    // Update variant in database
    const updatedVariant = await getSharedPrismaClient().productVariant.update({
      where: { id: variantId },
      data: {
        images: JSON.stringify(currentImages)
      }
    });

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
    }

    res.json({
      success: true,
      message: 'تم إضافة الصورة بنجاح',
      data: {
        addedImageUrl: imageUrl,
        variantId: variantId,
        totalImages: currentImages.length,
        allImages: currentImages
      }
    });

  } catch (error) {
    console.error('Error adding image to variant:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الصورة'
    });
  }
};

// Delete image from product variant
const deleteImageFromVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const { imageUrl } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'رابط الصورة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة
    const product = await getSharedPrismaClient().product.findFirst({
      where: { id, companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // Get the variant
    const variant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // Parse current images
    let currentImages = [];
    try {
      currentImages = JSON.parse(variant.images || '[]');
    } catch (e) {
      currentImages = [];
    }

    // Remove the image
    const imageIndex = currentImages.indexOf(imageUrl);
    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'الصورة غير موجودة'
      });
    }

    currentImages.splice(imageIndex, 1);

    // Update variant in database
    await getSharedPrismaClient().productVariant.update({
      where: { id: variantId },
      data: {
        images: JSON.stringify(currentImages)
      }
    });

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
    }

    res.json({
      success: true,
      message: 'تم حذف الصورة بنجاح',
      data: {
        deletedImageUrl: imageUrl,
        variantId: variantId,
        remainingImages: currentImages.length,
        allImages: currentImages
      }
    });

  } catch (error) {
    console.error('Error deleting image from variant:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الصورة'
    });
  }
};

// Update product variant
const updateProductVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة
    const product = await getSharedPrismaClient().product.findFirst({
      where: { id, companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // التحقق من أن الـ variant موجود
    const existingVariant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!existingVariant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // إعداد بيانات التحديث
    const {
      name,
      type,
      sku,
      price,
      comparePrice,
      cost,
      images,
      stock,
      trackInventory,
      isActive,
      sortOrder,
      metadata
    } = req.body;

    // معالجة الصور - تحويل array إلى JSON string
    let imagesStr = existingVariant.images;
    if (images !== undefined) {
      if (Array.isArray(images)) {
        imagesStr = JSON.stringify(images);
      } else if (typeof images === 'string') {
        imagesStr = images;
      }
    }

    // تحديث الـ variant
    const updatedVariant = await getSharedPrismaClient().productVariant.update({
      where: { id: variantId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(sku !== undefined && { sku }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(comparePrice !== undefined && { comparePrice: parseFloat(comparePrice) }),
        ...(cost !== undefined && { cost: parseFloat(cost) }),
        ...(images !== undefined && { images: imagesStr }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(trackInventory !== undefined && { trackInventory }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
        ...(metadata !== undefined && { metadata }),
        updatedAt: new Date()
      }
    });

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
    }

    res.json({
      success: true,
      data: updatedVariant,
      message: 'تم تحديث المتغير بنجاح'
    });

  } catch (error) {
    console.error('Error updating product variant:', error);

    // التحقق من خطأ SKU المكرر
    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return res.status(400).json({
        success: false,
        message: 'رمز SKU موجود بالفعل'
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث المتغير'
    });
  }
};

// Delete product variant
const deleteProductVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة
    const product = await getSharedPrismaClient().product.findFirst({
      where: { id, companyId }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // التحقق من أن الـ variant موجود
    const existingVariant = await getSharedPrismaClient().productVariant.findFirst({
      where: {
        id: variantId,
        productId: id
      }
    });

    if (!existingVariant) {
      return res.status(404).json({
        success: false,
        message: 'المتغير غير موجود'
      });
    }

    // حذف الـ variant
    await getSharedPrismaClient().productVariant.delete({
      where: { id: variantId }
    });

    // 🔄 Clear RAG cache to reflect deletion immediately
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
    }

    res.json({
      success: true,
      message: 'تم حذف المتغير بنجاح'
    });

  } catch (error) {
    console.error('Error deleting product variant:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المتغير'
    });
  }
};

// Delete all products for a company
const deleteAllProducts = async (req, res) => {
  try {
    console.log(`🗑️ [DELETE-ALL] Route called - Method: ${req.method}, Path: ${req.path}`);

    const companyId = req.user?.companyId;

    if (!companyId) {
      console.log(`❌ [DELETE-ALL] No companyId found`);
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    console.log(`🗑️ [DELETE-ALL] Deleting all products for company: ${companyId}`);

    const prisma = getSharedPrismaClient();

    // First, get all products for this company
    const productsToDelete = await prisma.product.findMany({
      where: { companyId },
      select: { id: true }
    });

    const productIds = productsToDelete.map(p => p.id);
    let deletedVariantsCount = 0;

    // Delete all variants first (if there are any products)
    if (productIds.length > 0) {
      const deletedVariants = await prisma.productVariant.deleteMany({
        where: {
          productId: { in: productIds }
        }
      });
      deletedVariantsCount = deletedVariants.count;
      console.log(`   ✅ Deleted ${deletedVariantsCount} variants`);
    }

    // Now delete all products
    const deletedProducts = await prisma.product.deleteMany({
      where: { companyId }
    });

    console.log(`   ✅ Deleted ${deletedProducts.count} products`);

    // 🔄 Clear RAG cache
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
    }

    res.json({
      success: true,
      message: `تم حذف ${deletedProducts.count} منتج و ${deletedVariantsCount} متغير بنجاح`,
      data: {
        deletedProductsCount: deletedProducts.count,
        deletedVariantsCount: deletedVariantsCount
      }
    });

  } catch (error) {
    console.error('❌ [DELETE-ALL] Error deleting all products:', error);
    console.error('❌ [DELETE-ALL] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف المنتجات',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get product variants
const getProductVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // التحقق من أن المنتج ينتمي للشركة
    const product = await getSharedPrismaClient().product.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود'
      });
    }

    // جلب الـ variants
    const variants = await getSharedPrismaClient().productVariant.findMany({
      where: {
        productId: id
      },
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: variants,
      message: `تم جلب ${variants.length} variant`
    });

  } catch (error) {
    console.error('Error fetching product variants:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب variants المنتج'
    });
  }
};

// ✅ NEW: Bulk Generate Embeddings
const generateEmbeddings = async (req, res) => {
  try {
    let companyId = req.user?.companyId;



    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Company ID required' });
    }

    console.log(`🚀 [EMBEDDINGS] Starting bulk generation for company: ${companyId}`);

    // 1. Initialize Multimodal Service
    // 1. Initialize Multimodal Service
    const multimodalService = require('../services/multimodalService');
    // const multimodalService = new MultimodalService(); // ❌ Fixed: It's already an instance
    const output = await multimodalService.initializeGemini(companyId);

    if (!output) {
      return res.status(500).json({ success: false, message: 'Failed to initialize AI Service (No Key?)' });
    }

    // 2. Fetch Products
    const products = await getSharedPrismaClient().product.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, description: true, productVariants: true }
    });

    console.log(`📦 [EMBEDDINGS] Found ${products.length} products to process.`);
    let updatedCount = 0;
    let errors = [];

    // 3. Process
    for (const product of products) {
      const textToEmbed = `${product.name} ${product.description || ''} ${product.productVariants?.map(v => v.name).join(' ') || ''}`.trim();
      if (!textToEmbed) continue;

      try {
        const embedding = await multimodalService.generateEmbedding(textToEmbed);

        await getSharedPrismaClient().product.update({
          where: { id: product.id },
          data: { embedding: JSON.stringify(embedding) }
        });
        updatedCount++;
        // Small delay to prevent rate limits
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error(`❌ [EMBEDDINGS] Failed for product ${product.id}:`, err.message);
        errors.push({ id: product.id, name: product.name, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${updatedCount}/${products.length} products.`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ [EMBEDDINGS] Fatal error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getCategory,
  createNewCategory,
  updateCategory,
  deleteCategory,
  getSingleProduct,
  updateSingleProduct,
  deleteSingleProduct,
  deleteAllProducts,
  createProduct,
  deleteImageFromOneProduct,
  uploadProductImages,
  addImageToProduct,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getProductVariants,
  addImageToVariant,
  addImageToVariantFromBody,
  deleteImageFromVariant,
  generateEmbeddings // ✅ Export new method
}
