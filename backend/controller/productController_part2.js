
const updateSingleProduct = async(req , res)=>{
      try {
    //console.log(`🔄 [server] PATCH /api/v1/products/${req.params.id}`, req.body);

    // التحقق من المصادقة والشركة
    const companyId = req.user?.companyId;
    if (!companyId) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[PRODUCT-UPDATE] Missing companyId. req.user:`, req.user);
      }
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { id } = req.params;
    
    // Debug logging (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[PRODUCT-UPDATE] Updating product ${id} for company ${companyId}`);
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
        console.error(`[PRODUCT-UPDATE] Product ${id} not found or doesn't belong to company ${companyId}`);
      }
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود أو غير مصرح لك بالوصول إليه'
      });
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

    // 🔄 Clear RAG cache to reflect updates immediately
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
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
      error: error.message,
      details: error.stack
    });
  }
}

const deleteSingleProduct = async(req , res)=>{
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

    // 🔄 Clear RAG cache to reflect deletion immediately
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
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

const createProduct = async(req , res)=>{
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

    const product = await getSharedPrismaClient().product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        sku: productSku,
        stock: parseInt(stock) || 0,
        trackInventory: req.body.trackInventory !== undefined ? req.body.trackInventory : true,
        hasPromotedAd: hasPromotedAd !== undefined ? Boolean(hasPromotedAd) : false,
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
        dimensions: req.body.dimensions ? JSON.stringify(req.body.dimensions) : null
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

    // 🔄 Clear RAG cache to reflect new product immediately
    if (ragService && typeof ragService.clearCompanyProducts === 'function') {
      ragService.clearCompanyProducts(companyId);
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
      error: error.message
    });
  }
}

const deleteImageFromOneProduct = async(req , res)=>{
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
const uploadProductImages = async(req, res) => {
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

    // Add uploaded images URLs
    const newImageUrls = req.files.map(file => `/uploads/products/${file.filename}`);
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

const addImageToProduct = async(req , res)=>{
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
        metadata
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
        ...(metadata !== undefined && { metadata })
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
  deleteImageFromVariant
}
