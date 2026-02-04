const express = require('express');
const router = express.Router();
const branchController = require('../controller/branchController');
const verifyToken = require("../utils/verifyToken")

/**
 * Branch Routes
 * All routes require authentication
 */

// Get all branches
router.get('/', verifyToken.authenticateToken, branchController.getBranches);

// Get active branches only
router.get('/active', verifyToken.authenticateToken, branchController.getActiveBranches);

// Get single branch by ID
router.get('/:id', verifyToken.authenticateToken, branchController.getBranchById);

// Create new branch
router.post('/', verifyToken.authenticateToken, branchController.createBranch);

// Update branch
router.put('/:id', verifyToken.authenticateToken, branchController.updateBranch);

// Toggle branch active status
router.patch('/:id/toggle-status',   verifyToken.authenticateToken, branchController.toggleBranchStatus);

// Delete branch
router.delete('/:id',  verifyToken.authenticateToken, branchController.deleteBranch);

module.exports = router;
