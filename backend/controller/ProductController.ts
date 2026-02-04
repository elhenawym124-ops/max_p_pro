import { Request, Response } from 'express';
import { BaseController } from '../../../shared/base/BaseController';
import { ProductService } from '../services/ProductService';
import { ValidationError } from '../../../shared/errors/AppError';
import { enhancedLogger } from '../../../shared/utils/logger';
// import { AuthenticatedRequest } from '../../auth/middleware/authMiddleware';
interface AuthenticatedRequest extends Request {
  user?: any;
  companyId?: string;
}

/**
 * Product Controller
 * 
 * Handles all product-related HTTP requests including:
 * - Product CRUD operations
 * - Product search and filtering
 * - Category management
 * - Inventory management
 * - Product analytics
 */
export class ProductController extends BaseController {
  private productService: ProductService;

  constructor() {
    super();
    this.productService = new ProductService();
  }

  /**
   * Get all products with pagination and filtering
   * GET /api/v1/products
   */
  getProducts = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const paginationParams = this.getPaginationParams(req);
    const filterParams = this.getFilterParams(req);

    // Add company filter
    const filters = {
      ...filterParams,
      companyId: user.companyId,
    };

    const products = await this.productService.getProducts(filters, paginationParams);
    const total = await this.productService.getProductsCount(filters);

    this.successWithPagination(
      res,
      products,
      {
        page: paginationParams.page || 1,
        limit: paginationParams.limit || 10,
        total,
      },
      'Products retrieved successfully'
    );
  });

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  getProduct = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const { id } = req.params;

    const product = await this.productService.getProductById(id, user.companyId);

    this.success(res, product, 'Product retrieved successfully');
  });

  /**
   * Create new product
   * POST /api/v1/products
   */
  createProduct = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    
    // Only managers and admins can create products
    this.requireRole(req, ['COMPANY_ADMIN', 'MANAGER']);

    const { 
      name, 
      description, 
      price, 
      comparePrice,
      cost,
      sku, 
      categoryId, 
      images, 
      tags, 
      stock,
      lowStockThreshold,
      trackQuantity,
      isActive,
      weight,
      dimensions,
      seoTitle,
      seoDescription,
      variants
    } = req.body;

    // Validate required fields
    this.validateRequiredFields(req.body, ['name', 'price', 'categoryId']);

    // Validate price
    if (price <= 0) {
      throw new ValidationError('Price must be greater than 0');
    }

    // Sanitize inputs
    const productData = {
      name: this.sanitizeInput(name),
      description: description ? this.sanitizeInput(description) : undefined,
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : undefined,
      cost: cost ? parseFloat(cost) : undefined,
      sku: sku ? this.sanitizeInput(sku) : undefined,
      categoryId,
      images: JSON.stringify((req.files as Express.Multer.File[])?.map(file => `/uploads/products/${file.filename}`) || []),
      tags: tags ? JSON.stringify(tags) : undefined,
      stock: stock ? parseInt(stock) : 0,
      lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold) : 5,
      trackQuantity: trackQuantity !== undefined ? trackQuantity : true,
      isActive: isActive !== undefined ? isActive : true,
      weight: weight ? parseFloat(weight) : undefined,
      dimensions: dimensions ? JSON.stringify(dimensions) : undefined,
      seoTitle: seoTitle ? this.sanitizeInput(seoTitle) : undefined,
      seoDescription: seoDescription ? this.sanitizeInput(seoDescription) : undefined,
      companyId: user.companyId,
    };

    const product = await this.productService.createProduct(productData, variants);

    enhancedLogger.business('product_created', {
      productId: product.id,
      companyId: user.companyId,
      createdBy: user.id,
    });

    this.success(res, product, 'Product created successfully', 201);
  });

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  updateProduct = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const { id } = req.params;
    
    // Only managers and admins can update products
    this.requireRole(req, ['COMPANY_ADMIN', 'MANAGER']);

    const { 
      name, 
      description, 
      price, 
      comparePrice,
      cost,
      sku, 
      categoryId, 
      images, 
      tags, 
      stock,
      lowStockThreshold,
      trackQuantity,
      isActive,
      enableCheckoutForm,
      weight,
      dimensions,
      seoTitle,
      seoDescription
    } = req.body;

    // Sanitize inputs
    const updateData: any = {};
    if (name) updateData.name = this.sanitizeInput(name);
    if (description !== undefined) updateData.description = description ? this.sanitizeInput(description) : null;
    if (price !== undefined) {
      if (price <= 0) throw new ValidationError('Price must be greater than 0');
      updateData.price = parseFloat(price);
    }
    if (comparePrice !== undefined) updateData.comparePrice = comparePrice ? parseFloat(comparePrice) : null;
    if (cost !== undefined) updateData.cost = cost ? parseFloat(cost) : null;
    if (sku !== undefined) updateData.sku = sku ? this.sanitizeInput(sku) : null;
    if (categoryId) updateData.categoryId = categoryId;
    if (images !== undefined) updateData.images = images ? JSON.stringify(images) : null;
    if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseInt(lowStockThreshold);
    if (trackQuantity !== undefined) updateData.trackQuantity = trackQuantity;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (enableCheckoutForm !== undefined) updateData.enableCheckoutForm = enableCheckoutForm;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (dimensions !== undefined) updateData.dimensions = dimensions ? JSON.stringify(dimensions) : null;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle ? this.sanitizeInput(seoTitle) : null;
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription ? this.sanitizeInput(seoDescription) : null;

    const product = await this.productService.updateProduct(id, updateData, user.companyId);

    enhancedLogger.business('product_updated', {
      productId: id,
      companyId: user.companyId,
      updatedBy: user.id,
      updatedFields: Object.keys(updateData),
    });

    this.success(res, product, 'Product updated successfully');
  });

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  deleteProduct = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const { id } = req.params;
    
    // Only admins can delete products
    this.requireRole(req, ['COMPANY_ADMIN']);

    await this.productService.deleteProduct(id, user.companyId);

    enhancedLogger.business('product_deleted', {
      productId: id,
      companyId: user.companyId,
      deletedBy: user.id,
    });

    this.success(res, null, 'Product deleted successfully');
  });

  /**
   * Search products
   * GET /api/v1/products/search
   */
  searchProducts = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      throw new ValidationError('Search query is required');
    }

    const searchQuery = this.sanitizeInput(q);
    const products = await this.productService.searchProducts(searchQuery, user.companyId);

    this.success(res, products, 'Search results retrieved successfully');
  });

  /**
   * Get product categories
   * GET /api/v1/products/categories
   */
  getCategories = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);

    //console.log('🔍 Getting categories for company:', user.companyId);

    const categories = await this.productService.getCategories(user.companyId);

    //console.log('📦 Categories found:', categories.length);

    this.success(res, categories, 'Categories retrieved successfully');
  });

  /**
   * Create product category
   * POST /api/v1/products/categories
   */
  createCategory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    
    // Only managers and admins can create categories
    this.requireRole(req, ['COMPANY_ADMIN', 'MANAGER']);

    const { name, description, parentId } = req.body;

    this.validateRequiredFields(req.body, ['name']);

    const categoryData = {
      name: this.sanitizeInput(name),
      description: description ? this.sanitizeInput(description) : undefined,
      parentId: parentId || undefined,
      companyId: user.companyId,
    };

    const category = await this.productService.createCategory(categoryData);

    enhancedLogger.business('category_created', {
      categoryId: category.id,
      companyId: user.companyId,
      createdBy: user.id,
    });

    this.success(res, category, 'Category created successfully', 201);
  });

  /**
   * Update product category
   * PUT /api/v1/products/categories/:id
   */
  updateCategory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);

    // Only managers and admins can update categories
    this.requireRole(req, ['COMPANY_ADMIN', 'MANAGER']);

    const { id } = req.params;
    const { name, description, parentId } = req.body;

    this.validateRequiredFields(req.body, ['name']);

    const categoryData = {
      name: this.sanitizeInput(name),
      description: description ? this.sanitizeInput(description) : undefined,
      parentId: parentId || undefined,
    };

    const category = await this.productService.updateCategory(id, categoryData, user.companyId);

    enhancedLogger.business('category_updated', {
      categoryId: id,
      companyId: user.companyId,
      updatedBy: user.id,
    });

    this.success(res, category, 'Category updated successfully');
  });

  /**
   * Delete product category
   * DELETE /api/v1/products/categories/:id
   */
  deleteCategory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);

    // Only managers and admins can delete categories
    this.requireRole(req, ['COMPANY_ADMIN', 'MANAGER']);

    const { id } = req.params;

    await this.productService.deleteCategory(id, user.companyId);

    enhancedLogger.business('category_deleted', {
      categoryId: id,
      companyId: user.companyId,
      deletedBy: user.id,
    });

    this.success(res, null, 'Category deleted successfully');
  });

  /**
   * Cleanup duplicate categories
   * POST /api/v1/products/categories/cleanup
   */
  cleanupCategories = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);

    // Only admins can cleanup categories
    this.requireRole(req, ['COMPANY_ADMIN']);

    const result = await this.productService.cleanupCategories(user.companyId);

    enhancedLogger.business('categories_cleaned', {
      companyId: user.companyId,
      cleanedBy: user.id,
      deletedCount: result.deletedCount,
    });

    this.success(res, result, 'Categories cleaned up successfully');
  });

  /**
   * Update inventory
   * PUT /api/v1/products/:id/inventory
   */
  updateInventory = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const { id } = req.params;
    const { stock, operation = 'set' } = req.body;

    this.validateRequiredFields(req.body, ['stock']);

    if (!['set', 'add', 'subtract'].includes(operation)) {
      throw new ValidationError('Operation must be set, add, or subtract');
    }

    const product = await this.productService.updateInventory(
      id,
      parseInt(stock),
      operation,
      user.companyId,
      user.id
    );

    enhancedLogger.business('inventory_updated', {
      productId: id,
      operation,
      stock: parseInt(stock),
      companyId: user.companyId,
      updatedBy: user.id,
    });

    this.success(res, product, 'Inventory updated successfully');
  });

  /**
   * Get low stock products
   * GET /api/v1/products/low-stock
   */
  getLowStockProducts = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);

    const products = await this.productService.getLowStockProducts(user.companyId);

    this.success(res, products, 'Low stock products retrieved successfully');
  });

  /**
   * Get product analytics
   * GET /api/v1/products/analytics
   */
  getProductAnalytics = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const { dateFrom, dateTo } = req.query;

    const analytics = await this.productService.getProductAnalytics(
      user.companyId,
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    this.success(res, analytics, 'Product analytics retrieved successfully');
  });

  /**
   * Export products
   * GET /api/v1/products/export
   */
  exportProducts = this.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = this.getAuthenticatedUser(req);
    const filterParams = this.getFilterParams(req);
    const { format = 'csv' } = req.query;

    const filters = {
      ...filterParams,
      companyId: user.companyId,
    };

    const exportData = await this.productService.exportProducts(filters, format as string);

    enhancedLogger.business('products_exported', {
      companyId: user.companyId,
      exportedBy: user.id,
      format,
      count: exportData.count,
    });

    // Set appropriate headers for file download
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=products.${format}`);

    res.send(exportData.data);
  });
}
