/**
 * 🚀 Import Job Routes
 * API endpoints للتحكم بمهام الاستيراد في الخلفية
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const importJobService = require('../services/importJobService');

// الحصول على Socket.IO من الـ app
let io = null;

/**
 * تعيين Socket.IO instance
 */
router.setSocketIO = function(socketIO) {
  io = socketIO;
  console.log('✅ [IMPORT-ROUTES] Socket.IO connected');
};

/**
 * POST /api/v1/import-jobs/start
 * بدء مهمة استيراد جديدة
 */
router.post('/start', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { type, batchSize, status, dateFrom, dateTo, duplicateAction } = req.body;

    console.log(`🚀 [IMPORT-JOB] Starting new import job for company ${companyId}`);

    // إنشاء المهمة
    const job = await importJobService.createImportJob(companyId, {
      type: type || 'orders',
      batchSize: batchSize || 100,
      status: status || 'any',
      dateFrom,
      dateTo,
      duplicateAction: duplicateAction || 'skip'
    });

    // بدء التنفيذ في الخلفية
    await importJobService.startImportJob(job.id, io);

    res.json({
      success: true,
      message: 'تم بدء مهمة الاستيراد في الخلفية',
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress
      }
    });

  } catch (error) {
    console.error('❌ [IMPORT-JOB] Error starting job:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/v1/import-jobs/status/:jobId
 * الحصول على حالة مهمة معينة
 */
router.get('/status/:jobId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = importJobService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    // التحقق من الصلاحية
    if (job.companyId !== req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه المهمة'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error
      }
    });

  } catch (error) {
    console.error('❌ [IMPORT-JOB] Error getting status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/v1/import-jobs/list
 * الحصول على جميع مهام الشركة
 */
router.get('/list', verifyToken.authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const jobs = importJobService.getCompanyJobs(companyId);

    res.json({
      success: true,
      data: jobs.map(job => ({
        jobId: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        error: job.error
      }))
    });

  } catch (error) {
    console.error('❌ [IMPORT-JOB] Error listing jobs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/v1/import-jobs/pause/:jobId
 * إيقاف مؤقت للمهمة
 */
router.post('/pause/:jobId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = importJobService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    if (job.companyId !== req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه المهمة'
      });
    }

    const paused = importJobService.pauseJob(jobId);

    res.json({
      success: paused,
      message: paused ? 'تم إيقاف المهمة مؤقتاً' : 'لا يمكن إيقاف المهمة',
      data: {
        jobId,
        status: job.status,
        progress: job.progress
      }
    });

  } catch (error) {
    console.error('❌ [IMPORT-JOB] Error pausing job:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/v1/import-jobs/resume/:jobId
 * استئناف المهمة
 */
router.post('/resume/:jobId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = importJobService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    if (job.companyId !== req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه المهمة'
      });
    }

    const resumed = await importJobService.resumeJob(jobId, io);

    res.json({
      success: resumed,
      message: resumed ? 'تم استئناف المهمة' : 'لا يمكن استئناف المهمة',
      data: {
        jobId,
        status: job.status,
        progress: job.progress
      }
    });

  } catch (error) {
    console.error('❌ [IMPORT-JOB] Error resuming job:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/v1/import-jobs/cancel/:jobId
 * إلغاء المهمة
 */
router.post('/cancel/:jobId', verifyToken.authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = importJobService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'المهمة غير موجودة'
      });
    }

    if (job.companyId !== req.user.companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول لهذه المهمة'
      });
    }

    const cancelled = importJobService.cancelJob(jobId);

    res.json({
      success: cancelled,
      message: cancelled ? 'تم إلغاء المهمة' : 'لا يمكن إلغاء المهمة',
      data: {
        jobId,
        status: job.status
      }
    });

  } catch (error) {
    console.error('❌ [IMPORT-JOB] Error cancelling job:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
