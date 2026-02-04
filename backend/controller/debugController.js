const processedMessages = new Map();
const aiAgentService = require('../services/aiAgentService');
const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const getDebugInfo = async (req, res) => {
  try {
    const queueStats = messageQueueManager.getQueueStats();
    const processedMessagesStats = {
      totalProcessedMessages: processedMessages.size,
      oldestMessage: Math.min(...Array.from(processedMessages.values())),
      newestMessage: Math.max(...Array.from(processedMessages.values()))
    };

    res.json({
      success: true,
      data: {
        queues: queueStats,
        processedMessages: processedMessagesStats,
        timestamp: new Date().toISOString()
      },
      message: 'حالة طوابير الرسائل'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'خطأ في جلب حالة الطوابير'
    });
  }
}

const getDebugAiErrors = async (req, res) => {
  try {
    const { companyId } = req.query;

    const errorStats = aiAgentService.errorHandler.getErrorStats(companyId);

    res.json({
      success: true,
      data: {
        ...errorStats,
        timestamp: new Date().toISOString(),
        companyFilter: companyId || 'all'
      },
      message: 'إحصائيات أخطاء الذكاء الاصطناعي'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'خطأ في جلب إحصائيات الأخطاء'
    });
  }
}

const postResetAiErrors = async (req, res) => {
  try {
    const { companyId } = req.body;

    aiAgentService.errorHandler.resetErrorStats(companyId);

    res.json({
      success: true,
      data: {
        resetTimestamp: new Date().toISOString(),
        companyFilter: companyId || 'all'
      },
      message: 'تم إعادة تعيين إحصائيات الأخطاء'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'خطأ في إعادة تعيين الإحصائيات'
    });
  }
}

const getDebugDataBase = async (req, res) => {
  try {
    const stats = {
      customers: await getSharedPrismaClient().customer.count(),
      conversations: await getSharedPrismaClient().conversation.count(),
      messages: await getSharedPrismaClient().message.count(),
      products: await getSharedPrismaClient().product.count(),
      facebookPages: await getSharedPrismaClient().facebookPage.count(),
      companies: await getSharedPrismaClient().company.count()
    };

    const facebookPages = await getSharedPrismaClient().facebookPage.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        status: true,
        companyId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const companies = await getSharedPrismaClient().company.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });

    res.json({
      success: true,
      data: {
        stats,
        facebookPages,
        companies,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

const getDebugEnv = async (req, res) => {
  try {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const dbUrl = process.env.DATABASE_URL || '';

    // Mask password in DB URL
    const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');

    let dbHost = 'Unknown';
    if (dbUrl.includes('@')) {
      const afterAt = dbUrl.split('@')[1];
      dbHost = afterAt.split('/')[0]; // simple parsing
    }

    // Determine implied .env file
    let impliedEnvFile = '.env (Default)';
    if (nodeEnv === 'production') {
      // Check if .env.production exists (mimicking server.js logic)
      const fs = require('fs');
      const path = require('path');
      const prodPath = path.join(__dirname, '../.env.production');
      if (fs.existsSync(prodPath)) {
        impliedEnvFile = '.env.production (Found & Loaded)';
      } else {
        impliedEnvFile = '.env (Fallback - .env.production missing)';
      }
    } else {
      impliedEnvFile = '.env (Development)';
    }

    const html = `
      <html>
        <head>
          <title>Environment Check</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
            .item { margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .label { font-weight: bold; color: #555; }
            .value { font-family: monospace; font-size: 1.1em; color: #000; }
            .status-ok { color: green; font-weight: bold; }
            .status-warn { color: orange; font-weight: bold; }
            h1 { color: #333; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Server Environment Status</h1>
            
            <div class="item">
              <div class="label">Node Environment (NODE_ENV)</div>
              <div class="value">${nodeEnv}</div>
            </div>

            <div class="item">
              <div class="label">Configuration File Rule</div>
              <div class="value">${impliedEnvFile}</div>
            </div>

            <div class="item">
              <div class="label">Database Host</div>
              <div class="value">${dbHost}</div>
            </div>

            <div class="item">
              <div class="label">Database URL (Masked)</div>
              <div class="value">${maskedDbUrl}</div>
            </div>

            <div class="item">
              <div class="label">Connection Goal</div>
              <div class="value">
                ${nodeEnv === 'production' ?
        '<span class="status-ok">Should be LOCAL (Production)</span>' :
        '<span class="status-warn">Should be REMOTE (Development)</span>'
      }
              </div>
            </div>

             <div class="item" style="text-align: center; border: none;">
              <small>Generated at: ${new Date().toISOString()}</small>
            </div>
          </div>
        </body>
      </html>
    `;

    // Force HTML content type
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
}

const getArchiveDbCheck = async (req, res) => {
  try {
    const archiveUrl = process.env.ARCHIVE_DATABASE_URL;

    if (!archiveUrl) {
      return res.status(404).json({
        success: false,
        message: 'ARCHIVE_DATABASE_URL is not defined in environment variables'
      });
    }

    const mysql = require('mysql2/promise');

    // Parse connection string to mask password for display
    const maskedUrl = archiveUrl.replace(/:([^:@]+)@/, ':****@');

    const start = Date.now();
    let connection;
    try {
      connection = await mysql.createConnection(archiveUrl);
      const [rows] = await connection.execute('SELECT 1 as val');
      const duration = Date.now() - start;
      await connection.end();

      res.json({
        success: true,
        message: 'Archive Database Connection Successful',
        data: {
          url: maskedUrl,
          duration: `${duration}ms`,
          result: rows[0].val,
          status: 'CONNECTED'
        }
      });
    } catch (connError) {
      res.status(500).json({
        success: false,
        message: 'Archive Database Connection Failed',
        error: connError.message,
        data: {
          url: maskedUrl,
          status: 'FAILED'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unexpected error during check',
      error: error.message
    });
  }
};

module.exports = { getDebugInfo, getDebugAiErrors, postResetAiErrors, getDebugDataBase, getDebugEnv, getArchiveDbCheck };
