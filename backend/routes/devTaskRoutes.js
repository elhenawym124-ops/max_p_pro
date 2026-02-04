const express = require('express');
const router = express.Router();
const devTaskController = require('../controller/devTaskController_minimal');

// Team Management Routes
router.get('/team', devTaskController.getAllTeamMembers);
router.get('/team/:id', devTaskController.getTeamMemberById);
router.post('/team', devTaskController.createTeamMember);
router.put('/team/:id', devTaskController.updateTeamMember);
router.delete('/team/:id', devTaskController.deleteTeamMember);

// Projects Routes
router.get('/projects', devTaskController.getAllProjects);
router.post('/projects', devTaskController.createProject);
router.delete('/projects/:id', devTaskController.deleteProject);

// Releases Routes
router.get('/releases', devTaskController.getAllReleases);

// Tasks Routes
router.get('/tasks', devTaskController.getAllTasks);

router.get('/', (req, res) => {
    res.json({ message: 'Dev Tasks Route' });
});

module.exports = router;
