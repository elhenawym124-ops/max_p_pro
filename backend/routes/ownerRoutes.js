/**
 * Owner Routes
 * Routes for multi-company management (OWNER role only)
 */

const express = require('express');
const router = express.Router();
const ownerController = require('../controller/ownerController');
const { requireAuth } = require('../middleware/auth');

// Middleware to ensure user is OWNER of at least one company
const requireOwnerRole = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'يجب تسجيل الدخول أولاً'
        });
    }

    // OWNER role or SUPER_ADMIN can access
    if (req.user.role === 'OWNER' || req.user.role === 'SUPER_ADMIN') {
        return next();
    }

    // Check if user is OWNER in any company
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const ownerCompanies = await prisma.userCompany.findFirst({
        where: {
            userId: req.user.id,
            role: 'OWNER',
            isActive: true
        }
    });

    if (!ownerCompanies) {
        return res.status(403).json({
            success: false,
            message: 'هذه الخدمة متاحة لمالكي الشركات فقط'
        });
    }

    next();
};

// Apply authentication to all routes
router.use(requireAuth);
router.use(requireOwnerRole);

// Dashboard & Companies
router.get('/companies', ownerController.getOwnerCompanies);
router.get('/dashboard', ownerController.getOwnerDashboard);
router.post('/companies', ownerController.createOwnerCompany);

// Users Management
router.get('/users', ownerController.getOwnerUsers);

// Reports
router.get('/reports/sales', ownerController.getOwnerSalesReport);
router.get('/reports/attendance', ownerController.getOwnerAttendanceReport);
router.get('/reports/today-attendance', ownerController.getOwnerTodayAttendance);

// Company Orders Details
router.get('/companies/:companyId/orders', ownerController.getCompanyOrdersDetails);

module.exports = router;
