const express = require('express');
const router = express.Router();
const companiesController = require('../controller/companiesController');
const verifyToken = require("../utils/verifyToken")
const { cacheMiddleware } = require('../middleware/performanceOptimization');
const uploadCompanyLogo = require('../middleware/companyLogoUpload');

// Apply caching to frequently accessed company routes
router.get('/current', verifyToken.authenticateToken, cacheMiddleware(120000), companiesController.getCurrentCompany); // 2 minutes cache
router.get('/1', companiesController.REMOVEDDangerousFallbackEndpoint);
router.get('/:id/usage', cacheMiddleware(60000), companiesController.companyUsageEndpoint); // 1 minute cache
router.get('/1/usage-mock', companiesController.mockEndpoint);
router.get('/usage-safe', cacheMiddleware(60000), companiesController.safeUsageEndpoint); // 1 minute cache
router.get('/plans', cacheMiddleware(300000), companiesController.companyPlansEndpoint); // 5 minutes cache
router.get('/:id/info', verifyToken.authenticateToken, cacheMiddleware(120000), companiesController.getCompanyInfoEndpoint); // 2 minutes cache
router.put('/:companyId/currency', companiesController.updateCompanyCurrency);
////////////////////////////////////////////////////////////
router.get('/', companiesController.getAllCompanies);
router.get('/:id', verifyToken.authenticateToken, companiesController.getCompanyDetails);
router.post('/', companiesController.createNewCompany);
router.put('/:id', companiesController.updateCompany);
router.delete('/:id', companiesController.deleteCompany);
// ==================== COMPANY USERS MANAGEMENT ====================
router.get('/:companyId/users', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getCompanyUsers);
router.get('/:companyId/users/statistics', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getUsersStatistics);
router.get('/:companyId/users/:userId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getSingleUser);
router.post('/:companyId/users', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.createnewUserForCompany);
router.put('/:companyId/users/:userId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.updateUser);
router.delete('/:companyId/users/:userId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.deleteUser);

// ==================== USER PROFILE ====================
router.put('/profile/me', verifyToken.authenticateToken, companiesController.updateMyProfile);

// ==================== ROLES & PERMISSIONS MANAGEMENT ====================
router.post('/:companyId/roles', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.createCustomRole);
router.get('/:companyId/roles', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getCompanyRoles);
router.put('/:companyId/roles/:roleKey', companiesController.updateCustomRole);
router.delete('/:companyId/roles/:roleKey', companiesController.deleteCustomRole);

// ==================== OWNERSHIP MANAGEMENT ====================
router.post('/:companyId/transfer-ownership', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['OWNER']), companiesController.transferOwnership);

// ==================== USER INVITATIONS ROUTES ====================
router.get('/:companyId/invitations', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.getCompanyInvitations);
router.post('/:companyId/invitations', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.sendUserInvitation);

router.delete('/:companyId/invitations/:invitationId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, companiesController.cancelInvitation);

router.post('/:companyId/invitations/:invitationId', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.resendInvitation);


router.get('/frontend-safe/:id/usage', companiesController.FrontendSpecificSafeEndpoint);

// ==================== SUBDOMAIN / SLUG MANAGEMENT ====================
router.put('/:companyId/slug', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, verifyToken.requireRole(['COMPANY_ADMIN', 'OWNER']), companiesController.updateCompanySlug);
router.get('/slug/check-availability', companiesController.checkSlugAvailability);

// ==================== COMPANY LOGO UPLOAD ====================
router.post('/:companyId/logo', verifyToken.authenticateToken, verifyToken.requireCompanyAccess, uploadCompanyLogo.single('logo'), companiesController.uploadCompanyLogo);

module.exports = router;