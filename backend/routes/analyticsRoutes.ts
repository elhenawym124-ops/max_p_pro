import express from 'express';
import analyticsController from '../controller/AnalyticsController';
import { authenticateToken } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

// Public tracking endpoints (no authentication required)
router.post('/track/store-visit', analyticsController.trackStoreVisit);
router.post('/track/product-view', analyticsController.trackProductView);
router.post('/track/conversion', analyticsController.trackConversion);

// Protected analytics endpoints (authentication required)
router.get('/store', authenticateToken, analyticsController.getStoreAnalytics);
router.get('/products/top', authenticateToken, analyticsController.getTopProducts);

export default router;
