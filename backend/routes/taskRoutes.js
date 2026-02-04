const express = require('express');
const router = express.Router();
const taskController = require('../controller/taskController');
const verifyToken = require('../utils/verifyToken');

// Apply authentication middleware to all routes
router.use(verifyToken.authenticateToken);

// ==================== Templates Routes (MUST be before /:id) ====================
router.get('/templates', taskController.getTemplates);
router.post('/templates', taskController.createTemplate);
router.put('/templates/:id', taskController.updateTemplate);
router.delete('/templates/:id', taskController.deleteTemplate);

// ==================== Categories Routes (MUST be before /:id) ====================
router.get('/categories/list', taskController.getCategories);
router.post('/categories', taskController.createCategory);
router.put('/categories/:id', taskController.updateCategory);
router.delete('/categories/:id', taskController.deleteCategory);

// ==================== Task Routes ====================
router.get('/', taskController.getAllTasks);
router.get('/my-tasks', taskController.getMyTasks);
router.get('/assigned-by-me', taskController.getTasksAssignedByMe);
router.get('/company-users', taskController.getCompanyUsers);
router.get('/dashboard-stats', taskController.getDashboardStats);
router.get('/kanban', taskController.getKanbanTasks);
router.get('/running-timer', taskController.getRunningTimer);
router.get('/notifications', taskController.getNotifications);
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTaskById);
router.get('/:id/details', taskController.getTaskDetails);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.put('/:id/status', taskController.updateTaskStatus);
router.put('/:id/order', taskController.updateTaskOrder);

// ==================== Subtasks Routes ====================
router.get('/:parentTaskId/subtasks', taskController.getSubtasks);
router.post('/:parentTaskId/subtasks', taskController.createSubtask);

// ==================== Comments Routes ====================
router.get('/:taskId/comments', taskController.getComments);
router.post('/:taskId/comments', taskController.addComment);
router.put('/comments/:commentId', taskController.updateComment);
router.delete('/comments/:commentId', taskController.deleteComment);

// ==================== Time Tracking Routes ====================
router.get('/:taskId/time-entries', taskController.getTimeEntries);
router.post('/:taskId/time-entries', taskController.addManualTimeEntry);
router.post('/:taskId/time-tracking/start', taskController.startTimeTracking);
router.put('/time-tracking/:entryId/stop', taskController.stopTimeTracking);

// ==================== Activity Log Routes ====================
router.get('/:taskId/activities', taskController.getTaskActivities);

// ==================== Watchers Routes ====================
router.get('/:taskId/watchers', taskController.getWatchers);
router.post('/:taskId/watchers', taskController.addWatcher);
router.delete('/:taskId/watchers/:watcherUserId', taskController.removeWatcher);

// ==================== Notifications Routes ====================
router.put('/notifications/:notificationId/read', taskController.markNotificationAsRead);
router.put('/notifications/read-all', taskController.markAllNotificationsAsRead);

// ==================== Attachments Routes ====================
router.get('/:taskId/attachments', taskController.getAttachments);
router.post('/:taskId/attachments', taskController.addAttachment);
router.delete('/attachments/:attachmentId', taskController.deleteAttachment);

// ==================== Checklists Routes ====================
router.get('/:taskId/checklists', taskController.getChecklists);
router.post('/:taskId/checklists', taskController.createChecklist);
router.delete('/checklists/:checklistId', taskController.deleteChecklist);
router.post('/checklists/:checklistId/items', taskController.addChecklistItem);
router.put('/checklists/items/:itemId', taskController.updateChecklistItem);
router.delete('/checklists/items/:itemId', taskController.deleteChecklistItem);

// ==================== Dependencies Routes ====================
router.get('/:taskId/dependencies', taskController.getDependencies);
router.post('/:taskId/dependencies', taskController.addDependency);
router.delete('/dependencies/:dependencyId', taskController.removeDependency);

module.exports = router;