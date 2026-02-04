const { getSharedPrismaClient, safeQuery, executeWithRetry } = require('../services/sharedDatabase');
const bcrypt = require('bcryptjs');
const devSettingsService = require('../services/devSettingsService');
const { getViewScopeFilter, logPermissionChange, getRoleLevel, normalizeRole } = require('../middleware/superAdminMiddleware');
const activityLogger = require('../services/activityLogger');

// ... (existing code)
