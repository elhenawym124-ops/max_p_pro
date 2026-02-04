const express = require('express');
const router = express.Router();
const superAdminController = require('../controller/superAdminController');
const superAdminAiController = require('../controller/superAdminAiController');
const aiDevTaskController = require('../controller/aiDevTaskController');
const {
  authenticateToken,
  requireSuperAdmin,
  checkPermission,
  preventPrivilegeEscalation
} = require('../middleware/superAdminMiddleware');

// 🔐 All super admin routes require authentication + system access role
router.use(authenticateToken);
router.use(requireSuperAdmin);

// 📊 AI Logs & Stats
router.get('/ai-logs', checkPermission('canViewReports'), superAdminController.getAiLogs);
router.get('/key-stats', checkPermission('canViewReports'), superAdminController.getKeyUsageStats);
router.get('/image-statistics', checkPermission('canViewReports'), superAdminController.getImageStatistics);
router.get('/server-usage', checkPermission('canViewReports'), superAdminController.getServerDiskUsage);
router.post('/image-stats/compress', checkPermission('canManageSettings'), superAdminController.triggerImageCompression);
router.get('/image-stats/compress/status', checkPermission('canViewReports'), superAdminController.getImageCompressionStatus);
router.post('/image-stats/delete-old-chat-images', checkPermission('canManageSettings'), superAdminController.deleteOldChatImages);
router.post('/image-stats/delete-company-images', checkPermission('canManageSettings'), superAdminController.deleteCompanyImages);
router.get('/image-stats/orphaned-stats', checkPermission('canViewReports'), superAdminController.getOrphanedFilesStats);
router.post('/image-stats/cleanup-orphaned', checkPermission('canManageSettings'), superAdminController.performOrphanedCleanup);


// 👥 Super Admin Users Management - WITH privilege escalation prevention
router.get('/users', checkPermission('canViewAll'), superAdminController.getSuperAdminUsers);
router.post('/users', checkPermission('canCreate'), preventPrivilegeEscalation, superAdminController.createSuperAdminUser);
router.put('/users/:id', checkPermission('canEdit'), preventPrivilegeEscalation, superAdminController.updateSuperAdminUser);
router.delete('/users/:id', checkPermission('canDelete'), superAdminController.deleteSuperAdminUser);

// 📈 Dev Dashboard
router.get('/dev/dashboard', checkPermission('canViewReports'), superAdminController.getDevDashboard);
router.get('/dev/unified', checkPermission('canViewReports'), superAdminController.getDevUnified);

// 👤 Current User Permissions
router.get('/user/permissions', superAdminController.getCurrentUserPermissions);

// ⚙️ Dev System Settings
// GET: Allow all system users to read settings (needed for statuses/priorities in tasks)
// PUT: Only users with canManageTaskSettings can modify settings
router.get('/dev/settings', superAdminController.getDevSettings);
router.put('/dev/settings', checkPermission('canManageTaskSettings'), superAdminController.updateDevSettings);

// 📁 Projects - Protected with viewReports permission
router.get('/dev/projects', checkPermission('canViewReports'), superAdminController.getDevProjects);
router.get('/dev/projects/:id', checkPermission('canViewReports'), superAdminController.getDevProjectById);

// 📋 Tasks - Protected with appropriate permissions (viewScope handled in controller)
router.get('/dev/tasks', superAdminController.getDevTasks); // viewScope applied in controller
router.get('/dev/tasks/kanban', superAdminController.getDevKanbanTasks); // viewScope applied in controller
router.get('/dev/reports', checkPermission('canViewReports'), superAdminController.getDevReports);
router.post('/dev/tasks', checkPermission('canCreate'), superAdminController.createDevTask);
router.post('/dev/tasks/:id/duplicate', checkPermission('canCreate'), superAdminController.duplicateDevTask);
router.post('/dev/tasks/:id/comments', checkPermission('canComment'), superAdminController.addDevTaskComment);
router.put('/dev/tasks/:id', checkPermission('canEdit'), superAdminController.updateDevTask);
router.delete('/dev/tasks/:id', checkPermission('canDelete'), superAdminController.deleteDevTask);
router.get('/dev/tasks/:id', superAdminController.getDevTaskById); // viewScope checked in controller

// 👨‍💻 Team Management - Protected
router.get('/dev/team', superAdminController.getDevTeam);
router.post('/dev/team', checkPermission('canManageProjects'), superAdminController.createDevTeamMember);
router.put('/dev/team/:id', checkPermission('canManageProjects'), superAdminController.updateDevTeamMember);
router.delete('/dev/team/:id', checkPermission('canManageProjects'), superAdminController.deleteDevTeamMember);

// 🚀 Releases - Protected
router.get('/dev/releases', checkPermission('canViewReports'), superAdminController.getDevReleases);
router.get('/dev/releases/:id', checkPermission('canViewReports'), superAdminController.getDevReleaseById);

// Dev Tasks Interactive Features
router.post('/dev/tasks/:taskId/checklists', superAdminController.createDevTaskChecklist);

// AI Dev Tasks
router.post('/dev-tasks/analyze-error', aiDevTaskController.analyzeError);
router.post('/dev-tasks/generate-task', aiDevTaskController.generateTaskFromBrief);
router.post('/ai-chat', aiDevTaskController.chatWithSystemExpert);
router.get('/ai-chat/history', aiDevTaskController.getChatHistory); // New Route

// AI Provider Management
router.get('/ai/config', checkPermission('canAccessSettings'), superAdminAiController.getGlobalAIConfig);
router.post('/ai/config', checkPermission('canAccessSettings'), superAdminAiController.updateGlobalAIConfig);
router.get('/ai/keys', checkPermission('canAccessSettings'), superAdminAiController.getAllAIKeys);
router.post('/ai/keys', checkPermission('canAccessSettings'), superAdminAiController.addNewAIKey);
// Bulk operations MUST come BEFORE routes with :id to avoid matching conflicts
router.post('/ai/keys/bulk-delete', checkPermission('canAccessSettings'), superAdminAiController.bulkDeleteAIKeys);
router.post('/ai/keys/bulk-update-status', checkPermission('canAccessSettings'), superAdminAiController.bulkUpdateKeysActiveStatus);
// Individual key operations
router.delete('/ai/keys/:id', checkPermission('canAccessSettings'), superAdminAiController.deleteAIKey);
router.patch('/ai/keys/:id/active-status', checkPermission('canAccessSettings'), superAdminAiController.updateKeyActiveStatus);
router.post('/ai/keys/:id/active-model', checkPermission('canAccessSettings'), superAdminAiController.updateKeyActiveModel);
router.get('/ai/ollama/models', checkPermission('canAccessSettings'), superAdminAiController.getOllamaModels);

const { uploadDevTaskFile, uploadDevTaskFiles } = require('../middleware/devTaskUpload');
const timeTrackingController = require('../controller/timeTrackingController');

// Dev Tasks Interactive Features
router.post('/dev/tasks/:taskId/checklists', superAdminController.createDevTaskChecklist);
router.post('/dev/tasks/checklists/:checklistId/items', superAdminController.addDevTaskChecklistItem);
router.patch('/dev/tasks/checklist-items/:itemId', superAdminController.toggleDevTaskChecklistItem);
router.delete('/dev/tasks/checklist-items/:itemId', superAdminController.deleteDevTaskChecklistItem);
router.post('/dev/tasks/:taskId/time-logs', superAdminController.addDevTaskTimeLog);
router.delete('/dev/tasks/time-logs/:logId', superAdminController.deleteDevTaskTimeLog);
router.patch('/dev/tasks/time-logs/:logId', superAdminController.editDevTaskTimeLog);
router.post('/dev/tasks/:taskId/timer/start', superAdminController.startDevTaskTimer);
router.post('/dev/tasks/:taskId/timer/stop', superAdminController.stopDevTaskTimer);
router.post('/dev/tasks/:taskId/timer/pause', superAdminController.pauseDevTaskTimer);
router.post('/dev/tasks/:taskId/timer/resume', superAdminController.resumeDevTaskTimer);
router.get('/dev/timer/active', superAdminController.getActiveTimer);
router.get('/dev/timer/all-active', checkPermission('canViewReports'), superAdminController.getAllActiveTimers);
router.post('/dev/tasks/:taskId/subtasks', superAdminController.createDevTaskSubtask);
router.post('/dev/tasks/:taskId/attachments', uploadDevTaskFiles.array('files', 10), superAdminController.uploadDevTaskAttachments);
router.post('/dev/tasks/:taskId/attachment', uploadDevTaskFile.single('file'), superAdminController.uploadDevTaskAttachment);

// ⏱️ Time Tracking Dashboard - Protected with viewReports permission
router.get('/time-tracking/dashboard', checkPermission('canViewReports'), timeTrackingController.getDashboardStats);
router.get('/time-tracking/live', checkPermission('canViewReports'), timeTrackingController.getLiveActivity);
router.get('/time-tracking/logs', checkPermission('canViewReports'), timeTrackingController.getTimeLogs);
router.get('/time-tracking/members', checkPermission('canViewReports'), timeTrackingController.getMemberPerformance);
router.get('/time-tracking/members/:memberId', checkPermission('canViewReports'), timeTrackingController.getMemberDetail);
router.get('/time-tracking/analytics', checkPermission('canViewReports'), timeTrackingController.getAnalytics);
router.get('/time-tracking/export', checkPermission('canExport'), timeTrackingController.exportTimesheet);
router.delete('/dev/tasks/attachments/:attachmentId', superAdminController.deleteDevTaskAttachment);
router.patch('/dev/tasks/:taskId/status', checkPermission('canChangeStatus'), superAdminController.updateDevTaskStatus);

// Database Migration & Import Tool
const dbMigrationController = require('../controller/databaseMigrationController');
router.post('/db-migration/test-connection', dbMigrationController.testConnection);
router.post('/db-migration/start', dbMigrationController.startMigration);
router.get('/db-migration/status/:jobId', dbMigrationController.getStatus);

// Gamification
router.get('/dev/leaderboard', superAdminController.getLeaderboard);

// Escalation History
router.get('/dev/escalations', checkPermission('canViewReports'), superAdminController.getEscalationHistory);

module.exports = router;
