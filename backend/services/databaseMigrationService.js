/**
 * 🚀 Database Migration Service
 * Handles the migration of development data from a remote MySQL database to the local one.
 */

const { PrismaClient } = require('@prisma/client');
const { getSharedPrismaClient } = require('./sharedDatabase');

// Active jobs in memory
const activeMigrationJobs = new Map();

// Job Status constants
const MIGRATION_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

/**
 * Creates a new migration job
 */
async function createMigrationJob(sourceConfig) {
    const jobId = `migration_${Date.now()}`;
    const job = {
        id: jobId,
        sourceConfig,
        status: MIGRATION_STATUS.PENDING,
        progress: {
            step: 'init',
            message: 'Initializing...',
            users: { total: 0, imported: 0, skipped: 0 },
            teamMembers: { total: 0, imported: 0, skipped: 0 },
            projects: { total: 0, imported: 0, skipped: 0 },
            releases: { total: 0, imported: 0, skipped: 0 },
            tasks: { total: 0, imported: 0, skipped: 0 },
            percentage: 0
        },
        logs: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };

    activeMigrationJobs.set(jobId, job);
    return job;
}

/**
 * Adds a log entry to a job
 */
function logToJob(job, message, level = 'info') {
    const logEntry = {
        timestamp: new Date(),
        message,
        level
    };
    job.logs.push(logEntry);
    if (job.logs.length > 500) job.logs.shift(); // Keep last 500 logs
    console.log(`[MigrationJob:${job.id}] [${level.toUpperCase()}] ${message}`);
}

/**
 * Starts the migration process
 */
async function startMigrationJob(jobId, io = null) {
    const job = activeMigrationJobs.get(jobId);
    if (!job) throw new Error('Migration job not found');
    if (job.status === MIGRATION_STATUS.RUNNING) throw new Error('Job is already running');

    job.status = MIGRATION_STATUS.RUNNING;
    job.updatedAt = new Date();

    // Run in background
    runMigration(job, io).catch(error => {
        job.status = MIGRATION_STATUS.FAILED;
        job.error = error.message;
        logToJob(job, `Fatal Error: ${error.message}`, 'error');
        if (io) emitUpdate(io, job);
    });

    return job;
}

/**
 * Core migration logic
 */
async function runMigration(job, io) {
    const localPrisma = getSharedPrismaClient();
    let remotePrisma = null;

    try {
        logToJob(job, 'Connecting to source database...');
        remotePrisma = new PrismaClient({
            datasources: {
                db: { url: job.sourceConfig.url }
            }
        });

        // Test connection
        await remotePrisma.$connect();
        logToJob(job, 'Connected to source database successfully.');

        // Step 1: Migrate Super Admin Users
        job.progress.step = 'users';
        emitUpdate(io, job);
        await migrateUsers(remotePrisma, localPrisma, job, io);

        // Step 2: Migrate Team Members
        job.progress.step = 'teamMembers';
        emitUpdate(io, job);
        await migrateTeamMembers(remotePrisma, localPrisma, job, io);

        // Step 3: Migrate Projects
        job.progress.step = 'projects';
        emitUpdate(io, job);
        await migrateProjects(remotePrisma, localPrisma, job, io);

        // Step 4: Migrate Releases
        job.progress.step = 'releases';
        emitUpdate(io, job);
        await migrateReleases(remotePrisma, localPrisma, job, io);

        // Step 5: Migrate Tasks
        job.progress.step = 'tasks';
        emitUpdate(io, job);
        await migrateTasks(remotePrisma, localPrisma, job, io);

        // Finalize
        job.status = MIGRATION_STATUS.COMPLETED;
        job.progress.percentage = 100;
        job.progress.message = 'Migration completed successfully.';
        logToJob(job, 'Migration finished.');
        emitUpdate(io, job);

    } catch (error) {
        throw error;
    } finally {
        if (remotePrisma) await remotePrisma.$disconnect();
    }
}

async function migrateUsers(remote, local, job, io) {
    logToJob(job, 'Starting users migration...');
    const remoteUsers = await remote.user.findMany({
        where: { role: 'SUPER_ADMIN' }
    });

    job.progress.users.total = remoteUsers.length;
    logToJob(job, `Found ${remoteUsers.length} Super Admin users.`);

    for (const rUser of remoteUsers) {
        const existing = await local.user.findUnique({ where: { email: rUser.email } });
        if (existing) {
            logToJob(job, `Skipping existing user: ${rUser.email}`);
            job.progress.users.skipped++;
        } else {
            const { id, ...userData } = rUser; // Exclude ID to allow local generation or use it if no conflicts
            await local.user.create({ data: userData });
            logToJob(job, `Imported user: ${rUser.email}`);
            job.progress.users.imported++;
        }
        emitUpdate(io, job);
    }
}

async function migrateTeamMembers(remote, local, job, io) {
    logToJob(job, 'Starting team members migration...');
    const remoteMembers = await remote.devTeamMember.findMany();
    job.progress.teamMembers.total = remoteMembers.length;

    for (const rMember of remoteMembers) {
        const exists = await local.devTeamMember.findUnique({ where: { userId: rMember.userId } });
        if (exists) {
            logToJob(job, `Skipping existing team member for user: ${rMember.userId}`);
            job.progress.teamMembers.skipped++;
        } else {
            // Ensure user exists first
            const userExists = await local.user.findUnique({ where: { id: rMember.userId } });
            if (userExists) {
                await local.devTeamMember.create({ data: rMember });
                logToJob(job, `Imported team member for user: ${rMember.userId}`);
                job.progress.teamMembers.imported++;
            } else {
                logToJob(job, `Warning: User ${rMember.userId} not found locally. Skipping team member.`, 'warn');
                job.progress.teamMembers.skipped++;
            }
        }
        emitUpdate(io, job);
    }
}

async function migrateProjects(remote, local, job, io) {
    logToJob(job, 'Starting projects migration...');
    const remoteProjects = await remote.devProject.findMany();
    job.progress.projects.total = remoteProjects.length;

    for (const rProj of remoteProjects) {
        const existing = await local.devProject.findUnique({ where: { id: rProj.id } });
        if (existing) {
            logToJob(job, `Skipping existing project: ${rProj.name}`);
            job.progress.projects.skipped++;
        } else {
            // Relationship checks
            const projData = { ...rProj };
            if (projData.managerId) {
                const mgrExists = await local.devTeamMember.findUnique({ where: { id: projData.managerId } });
                if (!mgrExists) {
                    logToJob(job, `Info: Manager ${projData.managerId} not found locally for project ${projData.name}. Unsetting.`, 'info');
                    projData.managerId = null;
                }
            }
            await local.devProject.create({ data: projData });
            logToJob(job, `Imported project: ${rProj.name}`);
            job.progress.projects.imported++;
        }
        emitUpdate(io, job);
    }
}

async function migrateReleases(remote, local, job, io) {
    logToJob(job, 'Starting releases migration...');
    const remoteReleases = await remote.devRelease.findMany();
    job.progress.releases.total = remoteReleases.length;

    for (const rRel of remoteReleases) {
        const existing = await local.devRelease.findUnique({ where: { id: rRel.id } });
        if (existing) {
            logToJob(job, `Skipping existing release: ${rRel.name}`);
            job.progress.releases.skipped++;
        } else {
            await local.devRelease.create({ data: rRel });
            logToJob(job, `Imported release: ${rRel.name}`);
            job.progress.releases.imported++;
        }
        emitUpdate(io, job);
    }
}

async function migrateTasks(remote, local, job, io) {
    logToJob(job, 'Starting tasks migration...');
    const remoteTasks = await remote.devTask.findMany();
    job.progress.tasks.total = remoteTasks.length;

    for (const rTask of remoteTasks) {
        const existing = await local.devTask.findUnique({ where: { id: rTask.id } });
        if (existing) {
            logToJob(job, `Skipping existing task: ${rTask.title}`);
            job.progress.tasks.skipped++;
        } else {
            const taskData = { ...rTask };
            // Relationship checks
            if (taskData.assigneeId) {
                const asgExists = await local.devTeamMember.findUnique({ where: { id: taskData.assigneeId } });
                if (!asgExists) taskData.assigneeId = null;
            }
            if (taskData.reporterId) {
                const rptExists = await local.devTeamMember.findUnique({ where: { id: taskData.reporterId } });
                if (!rptExists) {
                    logToJob(job, `Warning: Reporter ${taskData.reporterId} missing locally for task ${taskData.id}. Skipping.`, 'warn');
                    job.progress.tasks.skipped++;
                    continue;
                }
            }
            await local.devTask.create({ data: taskData });
            logToJob(job, `Imported task: ${rTask.title}`);
            job.progress.tasks.imported++;
        }
        emitUpdate(io, job);
    }
}

function emitUpdate(io, job) {
    if (io) {
        io.emit('migration_job_update', {
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            logs: job.logs.slice(-5) // Send only latest logs
        });
    }
}

function getJobStatus(jobId) {
    return activeMigrationJobs.get(jobId) || null;
}

module.exports = {
    createMigrationJob,
    startMigrationJob,
    getJobStatus,
    MIGRATION_STATUS
};
