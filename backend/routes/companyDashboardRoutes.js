const express = require('express');
const router = express.Router();
const companyDashboardController = require('../controller/companyDashboardController');
const companyLinksController = require('../controller/companyLinksController');
const verifyToken = require("../utils/verifyToken")

router.get('/', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companyDashboardController.companyDashboardOverview)
router.get('/dashboard', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companyDashboardController.companyDashboardOverview) // Alias for compatibility

router.get('/settings', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companyDashboardController.companySettings)

router.put('/settings', verifyToken.authenticateToken, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companyDashboardController.updateCompanySettings)

// Update AI Keys setting (useCentralKeys)
router.put('/settings/ai-keys', verifyToken.authenticateToken, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companyDashboardController.updateAIKeysSetting)

// ==================== COMPANY LINKS ROUTES ====================

router.get('/links', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companyDashboardController.getCompanyLinks)
router.post('/links', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companyDashboardController.createCompanyLink)
router.put('/links/:linkId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companyDashboardController.updateCompanyLink)
router.delete('/links/:linkId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companyDashboardController.deleteCompanyLink)
router.get('/links/:linkId/password', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companyDashboardController.getCompanyLinkPassword)

// ==================== PLAN LIMITS ROUTES ====================

router.get('/limits', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companyDashboardController.checkPlanLimits)

router.post('/limits/check', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companyDashboardController.checkSpecificLimit)
router.post('/limits/check', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companyDashboardController.checkMultipleLimits)

// ==================== COMPANY LINKS ROUTES ====================

router.get('/links', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companyLinksController.listCompanyLinks);

router.post(
  '/links',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER', 'SUPER_ADMIN']),
  companyLinksController.createCompanyLink
);

router.put(
  '/links/:id',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER', 'SUPER_ADMIN']),
  companyLinksController.updateCompanyLink
);

router.delete(
  '/links/:id',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER', 'SUPER_ADMIN']),
  companyLinksController.deleteCompanyLink
);

router.get(
  '/links/:id/password',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER', 'SUPER_ADMIN']),
  companyLinksController.getCompanyLinkPassword
);

router.get(
  '/links/share-token',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER', 'SUPER_ADMIN']),
  companyLinksController.getCompanyLinksShareToken
);

router.post(
  '/links/share-token',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER', 'SUPER_ADMIN']),
  companyLinksController.generateCompanyLinksShareToken
);

router.delete(
  '/links/share-token',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER', 'SUPER_ADMIN']),
  companyLinksController.revokeCompanyLinksShareToken
);
module.exports = router;