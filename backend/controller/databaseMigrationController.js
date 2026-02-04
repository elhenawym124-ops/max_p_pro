/**
 * 🚀 Database Migration Controller
 * Handles HTTP requests for the database migration tool.
 */

const migrationService = require('../services/databaseMigrationService');

/**
 * POST /api/v1/super-admin/database-migration/test-connection
 * Tests the source database connection
 */
async function testConnection(req, res) {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, message: 'Source database URL is required' });
        }

        const { PrismaClient } = require('@prisma/client');
        const tempPrisma = new PrismaClient({
            datasources: { db: { url } }
        });

        await tempPrisma.$connect();
        await tempPrisma.$disconnect();

        res.json({ success: true, message: 'Connection successful' });
    } catch (error) {
        console.error('❌ [MigrationController] Connection test failed:', error);
        res.status(500).json({ success: false, message: `Connection failed: ${error.message}` });
    }
}

/**
 * POST /api/v1/super-admin/database-migration/start
 * Starts a new migration job
 */
async function startMigration(req, res) {
    try {
        const { url } = req.body;
        const io = req.app.get('socketio');

        if (!url) {
            return res.status(400).json({ success: false, message: 'Source database URL is required' });
        }

        const job = await migrationService.createMigrationJob({ url });
        await migrationService.startMigrationJob(job.id, io);

        res.json({
            success: true,
            data: {
                jobId: job.id,
                status: job.status
            }
        });
    } catch (error) {
        console.error('❌ [MigrationController] Failed to start migration:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

/**
 * GET /api/v1/super-admin/database-migration/status/:jobId
 * Gets the status of a migration job
 */
async function getStatus(req, res) {
    try {
        const { jobId } = req.params;
        const job = migrationService.getJobStatus(jobId);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        res.json({
            success: true,
            data: job
        });
    } catch (error) {
        console.error('❌ [MigrationController] Failed to get status:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    testConnection,
    startMigration,
    getStatus
};
