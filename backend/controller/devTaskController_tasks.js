const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

// ==================== نظام مهام التطوير للسوبر أدمن ====================

// ==================== Validation Helpers ====================
const validatePagination = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

// ==================== Tasks Management ====================

/**
 * Get all tasks with filters
 * GET /api/v1/super-admin/dev/tasks
 */
const getAllTasks = async (req, res) => {
  try {
    console.log('📋 [DEV-TASKS] getAllTasks called with query:', req.query);
    const { 
      page = 1, 
      limit = 20, 
      search, 
      status, 
      priority, 
      type, 
      projectId, 
      assigneeId, 
      component,
      releaseId,
      dueDateFrom,
      dueDateTo,
      tags,
      excludeStatus,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const prisma = getSharedPrismaClient();
    const { pageNum, limitNum, skip } = validatePagination(page, limit);

    // Build where clause
    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (projectId) where.projectId = projectId;
    if (assigneeId) where.assigneeId = assigneeId;
    if (component) where.component = component;
    if (releaseId) where.releaseId = releaseId;

    // Exclude status (for hiding completed tasks)
    if (excludeStatus) {
      where.status = { not: excludeStatus };
    }

    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      where.tags = { hasSome: tagArray };
    }

    // Get total count
    const total = await safeQuery(async () => {
      return await prisma.devTask.count({ where });
    });

    // Get tasks
    const tasks = await safeQuery(async () => {
      return await prisma.devTask.findMany({
        where,
        include: {
          assignee: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            }
          },
          reporter: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          project: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          release: {
            select: {
              id: true,
              version: true
            }
          },
          _count: {
            select: {
              comments: true,
              attachments: true,
              subtasks: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limitNum
      });
    });

    // Format response
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      status: task.status,
      priority: task.priority,
      component: task.component,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee ? `${task.assignee.user.firstName} ${task.assignee.user.lastName}` : null,
      assigneeAvatar: task.assignee?.user.avatar || null,
      reporterName: `${task.reporter.firstName} ${task.reporter.lastName}`,
      projectId: task.projectId,
      projectName: task.project?.name || null,
      projectColor: task.project?.color || null,
      releaseId: task.releaseId,
      releaseVersion: task.release?.version || null,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      progress: task.progress || 0,
      tags: task.tags || [],
      commentsCount: task._count.comments,
      attachmentsCount: task._count.attachments,
      subtasksCount: task._count.subtasks,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      message: 'Tasks fetched successfully',
      data: formattedTasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('❌ [DEV-TASKS] Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

module.exports = {
  getAllTasks
};
