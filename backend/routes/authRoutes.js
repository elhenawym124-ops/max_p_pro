const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');

// Basic auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.me);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Multi-company routes (تعدد الشركات)
router.get('/companies', authController.getUserCompanies);                    // Get all companies for user
router.post('/switch-company/:companyId', authController.switchCompany);      // Switch to a different company
router.post('/user-company', authController.addUserToCompany);                // Add user to a company (Admin)
router.delete('/user-company/:userId/:companyId', authController.removeUserFromCompany); // Remove user from company
router.post('/set-primary-company', authController.setPrimaryCompany);         // Set user's primary company to system company (Super Admin)

module.exports = router;