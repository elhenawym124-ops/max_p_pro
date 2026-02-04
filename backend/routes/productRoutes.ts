import { Router } from 'express';
import { ProductController } from '../controller/productController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '@/types/shared';
import upload from '../middleware/fileUpload';

const router = Router();
const productController = new ProductController();

// Authenticated routes
router.use(authenticateToken);

// Routes that require authentication (specific routes first)
router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);

// Admin & Manager routes (specific routes before parameterized ones)
router.post('/', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), upload.array('images', 5), productController.createProduct);
router.post('/categories', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.createCategory);
router.post('/categories/cleanup', requireRole(UserRole.COMPANY_ADMIN), productController.cleanupCategories);
router.put('/categories/:id', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.updateCategory);
router.delete('/categories/:id', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.deleteCategory);
router.put('/:id', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.updateProduct);
router.delete('/:id', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.deleteProduct);

// Public routes (parameterized routes last)
router.get('/:id', productController.getProduct);
router.put('/inventory/:id', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.updateInventory);
router.get('/low-stock', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.getLowStockProducts);
router.get('/analytics', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.getProductAnalytics);
router.get('/export', requireRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER), productController.exportProducts);

export default router;
