const express = require('express');
const router = express.Router();
const adminCompnayController = require('../controller/adminCompnayController');
const companiesController = require('../controller/companiesController'); // Use existing controller
const verifyToken = require("../utils/verifyToken")

// Get statistics (for Super Admin dashboard)
router.get('/statistics', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getStatistics);

// Get all companies (for Super Admin dashboard)
router.get('/', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getAllCompanies);

// Bulk update AI engine for all companies
router.put('/bulk/ai-engine', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.bulkUpdateAIEngine);

// General Bulk Operations
router.post('/bulk-delete', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.bulkDeleteCompanies);
router.put('/bulk-status', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.bulkUpdateCompanyStatus);

router.get('/:companyId', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getCompanyDetails);

router.post('/', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.createNewCompany);

router.put('/:companyId', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.updateCompany);

router.delete('/:companyId', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.deleteCompany);

// Get Facebook pages for a company
router.get('/:companyId/facebook-pages', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.getCompanyFacebookPages);

// Login as company admin
router.post('/:companyId/login-as-admin', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.loginAsCompanyAdmin);

// Get Company Users (Reuse companiesController)
router.get('/:companyId/users', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, companiesController.getCompanyUsers);


// Transfer ownership
router.post('/:companyId/transfer-ownership', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.forceTransferOwnership);

// Add employee to company
router.post('/:companyId/employees', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, adminCompnayController.addEmployeeToCompany);

// Delete user from company
router.delete('/:companyId/users/:userId', verifyToken.authenticateToken, verifyToken.requireSuperAdmin, companiesController.deleteUser);

module.exports = router;