const express = require('express');
const router = express.Router();
const projectController = require('../controller/projectController');
const verifyToken = require('../utils/verifyToken');

// Apply authentication middleware to all routes
router.use(verifyToken.authenticateToken);

// Project routes
router.get('/', projectController.getAllProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/tasks', projectController.getProjectTasks);

module.exports = router;