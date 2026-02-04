// Use shared database service instead of creating new PrismaClient
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Create alias for executeWithRetry to match usage
const withRetry = executeWithRetry;

// ✅ Import EmbeddingHelper for generating product embeddings
const EmbeddingHelper = require('../services/embeddingHelper');
const ragService = require('../services/ragService'); // ✅ Import RAG Service for cache management

const getAllProducts = async (req, res) => {
  try {
    console.log('📦 [PRODUCT-CONTROLLER] getAllProducts called');
    console.log('📦 [PRODUCT-CONTROLLER] User:', req.user ? { id: req.user.id, email: req.user.email, companyId: req.user.companyId, role: req.user.role } : 'No user');
    console.log('📦 [PRODUCT-CONTROLLER] Query:', req.query);

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

    // Get total count for pagination
    const total = await getSharedPrismaClient().product.count({
      where: { companyId }
    });

    //console.log('📦 Fetching products for company:', companyId);

    const products = await getSharedPrismaClient().product.findMany({
      where: { companyId }, // فلترة بـ companyId
      include: {
        category: true, // تضمين بيانات الفئة
        product_variants: {
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
    });

    res.json({
      success: true,
      data: products,
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
    console.error('❌ [PRODUCT-CONTROLLER] Error fetching products:', error);
    console.error('❌ [PRODUCT-CONTROLLER] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المنتجات',
      error: error.message,
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
        product_variants: {
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
      data: product
    });
  } catch (error) {
    console.error(`❌ [server] Error getting product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
