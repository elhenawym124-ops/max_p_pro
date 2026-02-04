/**
 * مسارات إعدادات الأولوية
 * Priority Settings Routes
 */

const express = require('express');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
// ❌ REMOVED: ConflictDetectionService - Pattern System removed

/**
 * GET /api/v1/priority-settings/:companyId
 * الحصول على إعدادات الأولوية للشركة
 */
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    
    //console.log(`📊 [API] Getting priority settings for company: ${companyId}`);
    
    const aiSettings = await getSharedPrismaClient().aiSettings.findFirst({
      where: { companyId }
    });
    
    if (!aiSettings) {
      return res.status(404).json({
        success: false,
        error: 'Company AI settings not found'
      });
    }
    
    const prioritySettings = {
      promptPriority: aiSettings.promptPriority || 'high',
      enforcePersonality: aiSettings.enforcePersonality !== false,
      enforceLanguageStyle: aiSettings.enforceLanguageStyle !== false
    };
    
    res.json({
      success: true,
      data: prioritySettings
    });
    
  } catch (error) {
    console.error('❌ [API] Error getting priority settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get priority settings'
    });
  }
});

/**
 * PUT /api/v1/priority-settings/:companyId
 * تحديث إعدادات الأولوية للشركة
 */
router.put('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const {
      promptPriority,
      enforcePersonality,
      enforceLanguageStyle
    } = req.body;
    
    //console.log(`💾 [API] Updating priority settings for company: ${companyId}`);
    
    // التحقق من صحة القيم
    const validPromptPriorities = ['high', 'medium', 'low'];
    
    if (promptPriority && !validPromptPriorities.includes(promptPriority)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promptPriority value'
      });
    }
    
    // تحديث الإعدادات
    const updatedSettings = await getSharedPrismaClient().aiSettings.update({
      where: { companyId },
      data: {
        promptPriority: promptPriority || undefined,
        enforcePersonality: enforcePersonality !== undefined ? enforcePersonality : undefined,
        enforceLanguageStyle: enforceLanguageStyle !== undefined ? enforceLanguageStyle : undefined,
        updatedAt: new Date()
      }
    });
    
    //console.log('✅ [API] Priority settings updated successfully');
    
    res.json({
      success: true,
      data: {
        promptPriority: updatedSettings.promptPriority,
        enforcePersonality: updatedSettings.enforcePersonality,
        enforceLanguageStyle: updatedSettings.enforceLanguageStyle
      },
      message: 'Priority settings updated successfully'
    });
    
  } catch (error) {
    console.error('❌ [API] Error updating priority settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update priority settings'
    });
  }
});

// ❌ REMOVED: test-conflict, conflict-reports endpoints - Pattern System removed

module.exports = router;

