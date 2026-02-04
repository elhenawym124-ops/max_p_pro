const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

// Helper function to convert status to uppercase
const normalizeStatus = (status) => {
  if (!status) return null;
  return status.toUpperCase();
};

// Helper function to convert priority to uppercase
const normalizePriority = (priority) => {
  if (!priority) return 'MEDIUM';
  return priority.toUpperCase();
};

const taskController = {
  // Get all tasks with filtering
  // Get all tasks with filtering
getAllTasks: async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب'
      });
    }

    // Build filter conditions
    const where = {
      companyId,
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(priority && { priority }),
      ...(assignedTo && { assignedTo })
    };

    // Get tasks with project and user information
    const tasks = await getSharedPrismaClient().task.findMany({
      where,
      include: {
        project: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format response
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      projectId: task.projectId,
      projectName: task.project?.name || 'مشروع غير محدد',
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assignedTo: task.assignedTo,
      assignedToName: task.assignee
        ? `${task.assignee.firstName} ${task.assignee.lastName}`
        : 'غير محدد',
      createdBy: task.createdBy,
      createdByName: task.creator
        ? `${task.creator.firstName} ${task.creator.lastName}`
        : 'غير محدد',
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      progress: task.progress,
      tags: task.tags || [],
      dependencies: task.dependencies || [],
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));

    res.json({
      success: true,
      data: formattedTasks
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المهام'
    });
  }
},

  // Create new task
  createTask: async (req, res) => {
    try {
      const {
        projectId,
        title,
        description,
        priority,
        type = 'general',
        assignedTo,
        dueDate,
        estimatedHours = 0,
        tags = []
      } = req.body;

      const companyId = req.user?.companyId;
      const createdBy = req.user?.userId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مطلوب'
        });
      }

      if (!createdBy) {
        return res.status(403).json({
          success: false,
          message: 'معرف المستخدم مطلوب'
        });
      }

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'العنوان والوصف مطلوبان'
        });
      }

      // التحقق من أن المستخدم المحدد موجود في نفس الشركة
      const finalAssignedTo = assignedTo || createdBy;
      if (finalAssignedTo !== createdBy) {
        const assignedUser = await getSharedPrismaClient().user.findFirst({
          where: {
            id: finalAssignedTo,
            companyId: companyId,
            isActive: true
          }
        });

        if (!assignedUser) {
          return res.status(400).json({
            success: false,
            error: 'المستخدم المحدد غير موجود أو غير نشط في الشركة'
          });
        }
      }

      const newTask = await getSharedPrismaClient().task.create({
        data: {
          id: uuidv4(),
          companyId,
          projectId: projectId || null,
          title,
          description,
          status: 'PENDING',
          priority: normalizePriority(priority),
          type,
          assignedTo: assignedTo || createdBy,
          createdBy,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours,
          actualHours: 0,
          progress: 0,
          tags: tags && Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null,
          dependencies: null,
          updatedAt: new Date()
        },
        include: {
          project: {
            select: {
              name: true
            }
          },
          assignee: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          creator: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: {
          id: newTask.id,
          projectId: newTask.projectId,
          projectName: newTask.project?.name || 'مشروع غير محدد',
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          type: newTask.type,
          assignedTo: newTask.assignedTo,
          assignedToName: newTask.assignee
            ? `${newTask.assignee.firstName} ${newTask.assignee.lastName}`
            : 'غير محدد',
          createdBy: newTask.createdBy,
          createdByName: newTask.creator
            ? `${newTask.creator.firstName} ${newTask.creator.lastName}`
            : 'غير محدد',
          dueDate: newTask.dueDate,
          estimatedHours: newTask.estimatedHours,
          actualHours: newTask.actualHours,
          progress: newTask.progress,
          tags: newTask.tags || [],
          dependencies: newTask.dependencies || [],
          createdAt: newTask.createdAt,
          updatedAt: newTask.updatedAt
        },
        message: 'تم إنشاء المهمة بنجاح'
      });

    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في إنشاء المهمة'
      });
    }
  },

  // Get task by ID
  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const task = await getSharedPrismaClient().task.findFirst({
        where: {
          id,
          companyId
        },
        include: {
          project: {
            select: {
              name: true
            }
          },
          assignee: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          creator: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      res.json({
        success: true,
        data: {
          id: task.id,
          projectId: task.projectId,
          projectName: task.project?.name || 'مشروع غير محدد',
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          type: task.type,
          assignedTo: task.assignedTo,
          assignedToName: task.assignee
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : 'غير محدد',
          createdBy: task.createdBy,
          createdByName: task.creator
            ? `${task.creator.firstName} ${task.creator.lastName}`
            : 'غير محدد',
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          progress: task.progress,
          tags: task.tags || [],
          dependencies: task.dependencies || [],
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }
      });

    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب المهمة'
      });
    }
  },

  // Update task
  updateTask: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        priority,
        type,
        assignedTo,
        dueDate,
        estimatedHours,
        actualHours,
        progress,
        tags,
        categoryId
      } = req.body;
      const companyId = req.user.companyId;

      // التحقق من أن المستخدم المحدد موجود في نفس الشركة (إذا تم تحديث assignedTo)
      if (assignedTo) {
        const assignedUser = await getSharedPrismaClient().user.findFirst({
          where: {
            id: assignedTo,
            companyId: companyId,
            isActive: true
          }
        });

        if (!assignedUser) {
          return res.status(400).json({
            success: false,
            error: 'المستخدم المحدد غير موجود أو غير نشط في الشركة'
          });
        }
      }

      const updatedTask = await getSharedPrismaClient().task.updateMany({
        where: {
          id,
          companyId
        },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(priority && { priority: normalizePriority(priority) }),
          ...(type && { type }),
          ...(assignedTo && { assignedTo }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(estimatedHours !== undefined && { estimatedHours }),
          ...(actualHours !== undefined && { actualHours }),
          ...(progress !== undefined && { progress }),
          ...(tags && { tags }),
          ...(categoryId !== undefined && { categoryId: categoryId || null })
        }
      });

      if (updatedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      // Get updated task with relations
      const task = await getSharedPrismaClient().task.findFirst({
        where: { id, companyId },
        include: {
          project: { select: { name: true } },
          assignee: { 
            select: { 
              firstName: true,
              lastName: true
            } 
          },
          creator: { 
            select: { 
              firstName: true,
              lastName: true
            } 
          }
        }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      res.json({
        success: true,
        data: {
          id: task.id,
          projectId: task.projectId,
          projectName: task.project?.name || 'مشروع غير محدد',
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          type: task.type,
          assignedTo: task.assignedTo,
          assignedToName: task.assignee
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : 'غير محدد',
          createdBy: task.createdBy,
          createdByName: task.creator
            ? `${task.creator.firstName} ${task.creator.lastName}`
            : 'غير محدد',
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          progress: task.progress,
          tags: task.tags || [],
          dependencies: task.dependencies || [],
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        },
        message: 'تم تحديث المهمة بنجاح'
      });

    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في تحديث المهمة'
      });
    }
  },

  // Update task status
  updateTaskStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status, progress } = req.body;
      const companyId = req.user.companyId;

      const normalizedStatus = normalizeStatus(status);
      const updateData = { status: normalizedStatus };
      if (progress !== undefined) {
        updateData.progress = progress;
      }

      // If completing task, set progress to 100
      if (normalizedStatus === 'COMPLETED') {
        updateData.progress = 100;
      }

      const updatedTask = await getSharedPrismaClient().task.updateMany({
        where: {
          id,
          companyId
        },
        data: updateData
      });

      if (updatedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      // Get updated task with relations
      const task = await getSharedPrismaClient().task.findFirst({
        where: { id, companyId },
        include: {
          project: { select: { name: true } },
          assignee: { 
            select: { 
              firstName: true,
              lastName: true
            } 
          },
          creator: { 
            select: { 
              firstName: true,
              lastName: true
            } 
          }
        }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      res.json({
        success: true,
        data: {
          id: task.id,
          projectId: task.projectId,
          projectName: task.project?.name || 'مشروع غير محدد',
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          type: task.type,
          assignedTo: task.assignedTo,
          assignedToName: task.assignee
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : 'غير محدد',
          createdBy: task.createdBy,
          createdByName: task.creator
            ? `${task.creator.firstName} ${task.creator.lastName}`
            : 'غير محدد',
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          progress: task.progress,
          tags: task.tags || [],
          dependencies: task.dependencies || [],
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        },
        message: 'تم تحديث حالة المهمة بنجاح'
      });

    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في تحديث حالة المهمة'
      });
    }
  },

  // Delete task
  deleteTask: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const deletedTask = await getSharedPrismaClient().task.deleteMany({
        where: {
          id,
          companyId
        }
      });

      if (deletedTask.count === 0) {
        return res.status(404).json({
          success: false,
          error: 'المهمة غير موجودة'
        });
      }

      res.json({
        success: true,
        message: 'تم حذف المهمة بنجاح'
      });

    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في حذف المهمة'
      });
    }
  },

  // Get my tasks (tasks assigned to current user)
  getMyTasks: async (req, res) => {
    try {
      const { projectId, status, priority } = req.query;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مطلوب'
        });
      }

      // Build filter conditions
      const where = {
        companyId,
        assignedTo: userId,
        ...(projectId && { projectId }),
        ...(status && { status }),
        ...(priority && { priority })
      };

      // Get tasks with project and user information
      const tasks = await getSharedPrismaClient().task.findMany({
        where,
        include: {
          project: {
            select: {
              name: true
            }
          },
          assignee: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          creator: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Format response
      const formattedTasks = tasks.map(task => ({
        id: task.id,
        projectId: task.projectId,
        projectName: task.project?.name || 'مشروع غير محدد',
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        type: task.type,
        assignedTo: task.assignedTo,
        assignedToName: task.assignee
          ? `${task.assignee.firstName} ${task.assignee.lastName}`
          : 'غير محدد',
        createdBy: task.createdBy,
        createdByName: task.creator
          ? `${task.creator.firstName} ${task.creator.lastName}`
          : 'غير محدد',
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        progress: task.progress,
        tags: task.tags || [],
        dependencies: task.dependencies || [],
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));

      res.json({
        success: true,
        data: formattedTasks
      });

    } catch (error) {
      console.error('Error fetching my tasks:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب المهام'
      });
    }
  },

  // Get tasks assigned by me (tasks created by current user)
  getTasksAssignedByMe: async (req, res) => {
    try {
      const { projectId, status, priority, assignedTo } = req.query;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مطلوب'
        });
      }

      // Build filter conditions
      const where = {
        companyId,
        createdBy: userId,
        ...(projectId && { projectId }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedTo && { assignedTo })
      };

      // Get tasks with project and user information
      const tasks = await getSharedPrismaClient().task.findMany({
        where,
        include: {
          project: {
            select: {
              name: true
            }
          },
          assignee: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          creator: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Format response
      const formattedTasks = tasks.map(task => ({
        id: task.id,
        projectId: task.projectId,
        projectName: task.project?.name || 'مشروع غير محدد',
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        type: task.type,
        assignedTo: task.assignedTo,
        assignedToName: task.assignee
          ? `${task.assignee.firstName} ${task.assignee.lastName}`
          : 'غير محدد',
        createdBy: task.createdBy,
        createdByName: task.creator
          ? `${task.creator.firstName} ${task.creator.lastName}`
          : 'غير محدد',
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        progress: task.progress,
        tags: task.tags || [],
        dependencies: task.dependencies || [],
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      }));

      res.json({
        success: true,
        data: formattedTasks
      });

    } catch (error) {
      console.error('Error fetching tasks assigned by me:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب المهام'
      });
    }
  },

  // Get company users (for task assignment)
  getCompanyUsers: async (req, res) => {
    try {
      const companyId = req.user.companyId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مطلوب'
        });
      }

      // Get all active users in the company
      const users = await getSharedPrismaClient().user.findMany({
        where: {
          companyId: companyId,
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true
        },
        orderBy: [
          { role: 'asc' }, // COMPANY_ADMIN first
          { firstName: 'asc' }
        ]
      });

      // Format response
      const formattedUsers = users.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }));

      res.json({
        success: true,
        data: formattedUsers
      });

    } catch (error) {
      console.error('Error fetching company users:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب المستخدمين'
      });
    }
  },

  // Get dashboard statistics
  getDashboardStats: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      if (!companyId) {
        return res.status(403).json({
          success: false,
          message: 'معرف الشركة مطلوب'
        });
      }

      // Get all tasks for the company
      const allTasks = await getSharedPrismaClient().task.findMany({
        where: { companyId },
        include: {
          project: { select: { name: true, status: true } }
        }
      });

      // Get user's tasks
      const myTasks = allTasks.filter(t => t.assignedTo === userId);

      // Calculate statistics
      const stats = {
        totalTasks: allTasks.length,
        myTasks: myTasks.length,
        tasksByStatus: {
          pending: allTasks.filter(t => t.status === 'PENDING').length,
          inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
          completed: allTasks.filter(t => t.status === 'COMPLETED').length,
          cancelled: allTasks.filter(t => t.status === 'CANCELLED').length
        },
        myTasksByStatus: {
          pending: myTasks.filter(t => t.status === 'PENDING').length,
          inProgress: myTasks.filter(t => t.status === 'IN_PROGRESS').length,
          completed: myTasks.filter(t => t.status === 'COMPLETED').length,
          cancelled: myTasks.filter(t => t.status === 'CANCELLED').length
        },
        tasksByPriority: {
          urgent: allTasks.filter(t => t.priority === 'URGENT').length,
          high: allTasks.filter(t => t.priority === 'HIGH').length,
          medium: allTasks.filter(t => t.priority === 'MEDIUM').length,
          low: allTasks.filter(t => t.priority === 'LOW').length
        },
        overdueTasks: allTasks.filter(t => 
          t.dueDate && 
          new Date(t.dueDate) < new Date() && 
          t.status !== 'COMPLETED' && 
          t.status !== 'CANCELLED'
        ).length,
        myOverdueTasks: myTasks.filter(t => 
          t.dueDate && 
          new Date(t.dueDate) < new Date() && 
          t.status !== 'COMPLETED' && 
          t.status !== 'CANCELLED'
        ).length,
        completionRate: allTasks.length > 0 
          ? Math.round((allTasks.filter(t => t.status === 'COMPLETED').length / allTasks.length) * 100)
          : 0,
        myCompletionRate: myTasks.length > 0
          ? Math.round((myTasks.filter(t => t.status === 'COMPLETED').length / myTasks.length) * 100)
          : 0
      };

      // Get project statistics
      const allProjects = await getSharedPrismaClient().project.findMany({
        where: { companyId },
        include: {
          tasks: true
        }
      });

      const projectStats = {
        totalProjects: allProjects.length,
        activeProjects: allProjects.filter(p => p.status === 'ACTIVE').length,
        completedProjects: allProjects.filter(p => p.status === 'COMPLETED').length,
        planningProjects: allProjects.filter(p => p.status === 'PLANNING').length,
        onHoldProjects: allProjects.filter(p => p.status === 'ON_HOLD').length,
        averageProgress: allProjects.length > 0
          ? Math.round(allProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / allProjects.length)
          : 0,
        totalBudget: allProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
        totalSpent: allProjects.reduce((sum, p) => sum + (p.spentBudget || 0), 0)
      };

      // Get recent activities (last 10 tasks)
      const recentTasks = await getSharedPrismaClient().task.findMany({
        where: { companyId },
        include: {
          project: { select: { name: true } },
          assignee: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      res.json({
        success: true,
        data: {
          tasks: stats,
          projects: projectStats,
          recentTasks: recentTasks.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            projectName: task.project?.name || 'بدون مشروع',
            assignedToName: task.assignee
              ? `${task.assignee.firstName} ${task.assignee.lastName}`
              : 'غير محدد',
            createdAt: task.createdAt
          }))
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'فشل في جلب الإحصائيات'
      });
    }
  },

  // ==================== المهام الفرعية (Subtasks) ====================
  
  createSubtask: async (req, res) => {
    try {
      const { parentTaskId } = req.params;
      const { title, description, priority, assignedTo, dueDate, estimatedHours } = req.body;
      const companyId = req.user.companyId;
      const createdBy = req.user.userId;

      const parentTask = await getSharedPrismaClient().task.findFirst({
        where: { id: parentTaskId, companyId }
      });

      if (!parentTask) {
        return res.status(404).json({ success: false, error: 'المهمة الأب غير موجودة' });
      }

      const subtask = await getSharedPrismaClient().task.create({
        data: {
          id: uuidv4(),
          companyId,
          projectId: parentTask.projectId,
          parentTaskId,
          title,
          description: description || '',
          status: 'PENDING',
          priority: normalizePriority(priority),
          type: 'general',
          assignedTo: assignedTo || createdBy,
          createdBy,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours: estimatedHours || 0,
          actualHours: 0,
          progress: 0,
          tags: null,
          dependencies: null,
          updatedAt: new Date()
        },
        include: {
          assignee: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true } }
        }
      });

      await getSharedPrismaClient().taskActivity.create({
        data: { taskId: parentTaskId, userId: createdBy, action: 'subtask_created', description: `تم إنشاء مهمة فرعية: ${title}`, companyId }
      });

      res.json({ success: true, data: subtask, message: 'تم إنشاء المهمة الفرعية بنجاح' });
    } catch (error) {
      console.error('Error creating subtask:', error);
      res.status(500).json({ success: false, error: 'فشل في إنشاء المهمة الفرعية' });
    }
  },

  getSubtasks: async (req, res) => {
    try {
      const { parentTaskId } = req.params;
      const companyId = req.user.companyId;

      const subtasks = await getSharedPrismaClient().task.findMany({
        where: { parentTaskId, companyId },
        include: {
          assignee: { select: { firstName: true, lastName: true } },
          creator: { select: { firstName: true, lastName: true } }
        },
        orderBy: { order: 'asc' }
      });

      res.json({ success: true, data: subtasks });
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب المهام الفرعية' });
    }
  },

  // ==================== التعليقات (Comments) ====================
  
  addComment: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { content, parentCommentId, mentions } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const task = await getSharedPrismaClient().task.findFirst({ where: { id: taskId, companyId } });
      if (!task) {
        return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
      }

      const comment = await getSharedPrismaClient().taskComment.create({
        data: {
          taskId, userId, content,
          parentCommentId: parentCommentId || null,
          mentions: mentions || [],
          companyId
        },
        include: {
          users: { select: { firstName: true, lastName: true, avatar: true } },
          replies: { include: { users: { select: { firstName: true, lastName: true, avatar: true } } } }
        }
      });

      await getSharedPrismaClient().taskActivity.create({
        data: { taskId, userId, action: 'commented', description: 'تم إضافة تعليق', companyId }
      });

      if (mentions && mentions.length > 0) {
        const notifications = mentions.map(mentionedUserId => ({
          userId: mentionedUserId, taskId, type: 'mention',
          title: 'تم ذكرك في تعليق', message: content.substring(0, 100),
          link: `/tasks/${taskId}`, companyId
        }));
        await getSharedPrismaClient().taskNotification.createMany({ data: notifications });
      }

      res.json({ success: true, data: comment, message: 'تم إضافة التعليق بنجاح' });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ success: false, error: 'فشل في إضافة التعليق' });
    }
  },

  getComments: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const comments = await getSharedPrismaClient().taskComment.findMany({
        where: { taskId, companyId, parentCommentId: null },
        include: {
          users: { select: { firstName: true, lastName: true, avatar: true } },
          replies: {
            include: { users: { select: { firstName: true, lastName: true, avatar: true } } },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: comments });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب التعليقات' });
    }
  },

  updateComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const { content } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const comment = await getSharedPrismaClient().taskComment.findFirst({ where: { id: commentId, companyId, userId } });
      if (!comment) {
        return res.status(404).json({ success: false, error: 'التعليق غير موجود أو ليس لديك صلاحية تعديله' });
      }

      const updatedComment = await getSharedPrismaClient().taskComment.update({
        where: { id: commentId },
        data: { content, isEdited: true, editedAt: new Date() },
        include: { users: { select: { firstName: true, lastName: true, avatar: true } } }
      });

      res.json({ success: true, data: updatedComment, message: 'تم تعديل التعليق بنجاح' });
    } catch (error) {
      console.error('Error updating comment:', error);
      res.status(500).json({ success: false, error: 'فشل في تعديل التعليق' });
    }
  },

  deleteComment: async (req, res) => {
    try {
      const { commentId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const comment = await getSharedPrismaClient().taskComment.findFirst({ where: { id: commentId, companyId, userId } });
      if (!comment) {
        return res.status(404).json({ success: false, error: 'التعليق غير موجود أو ليس لديك صلاحية حذفه' });
      }

      await getSharedPrismaClient().taskComment.delete({ where: { id: commentId } });
      res.json({ success: true, message: 'تم حذف التعليق بنجاح' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ success: false, error: 'فشل في حذف التعليق' });
    }
  },

  // ==================== تتبع الوقت (Time Tracking) ====================
  
  startTimeTracking: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { description, isBillable, hourlyRate } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const runningEntry = await getSharedPrismaClient().timeEntry.findFirst({ where: { userId, companyId, isRunning: true } });
      if (runningEntry) {
        return res.status(400).json({ success: false, error: 'يوجد مؤقت يعمل بالفعل. يرجى إيقافه أولاً' });
      }

      const timeEntry = await getSharedPrismaClient().timeEntry.create({
        data: {
          taskId, userId, startTime: new Date(),
          description: description || '', isBillable: isBillable || false,
          hourlyRate: hourlyRate || null, isRunning: true, companyId
        },
        include: { task: { select: { title: true } } }
      });

      res.json({ success: true, data: timeEntry, message: 'تم بدء تتبع الوقت' });
    } catch (error) {
      console.error('Error starting time tracking:', error);
      res.status(500).json({ success: false, error: 'فشل في بدء تتبع الوقت' });
    }
  },

  stopTimeTracking: async (req, res) => {
    try {
      const { entryId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const timeEntry = await getSharedPrismaClient().timeEntry.findFirst({ where: { id: entryId, userId, companyId, isRunning: true } });
      if (!timeEntry) {
        return res.status(404).json({ success: false, error: 'سجل الوقت غير موجود أو متوقف بالفعل' });
      }

      const endTime = new Date();
      const duration = Math.round((endTime - timeEntry.startTime) / 60000);

      const updatedEntry = await getSharedPrismaClient().timeEntry.update({
        where: { id: entryId },
        data: { endTime, duration, isRunning: false },
        include: { task: { select: { title: true } } }
      });

      await getSharedPrismaClient().task.update({
        where: { id: timeEntry.taskId },
        data: { actualHours: { increment: Math.round(duration / 60) } }
      });

      res.json({ success: true, data: updatedEntry, message: `تم إيقاف تتبع الوقت. المدة: ${duration} دقيقة` });
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      res.status(500).json({ success: false, error: 'فشل في إيقاف تتبع الوقت' });
    }
  },

  addManualTimeEntry: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { startTime, endTime, duration, description, isBillable, hourlyRate } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const calculatedDuration = duration || Math.round((new Date(endTime) - new Date(startTime)) / 60000);

      const timeEntry = await getSharedPrismaClient().timeEntry.create({
        data: {
          taskId, userId, startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          duration: calculatedDuration, description: description || '',
          isBillable: isBillable || false, hourlyRate: hourlyRate || null,
          isRunning: false, companyId
        },
        include: { task: { select: { title: true } } }
      });

      await getSharedPrismaClient().task.update({
        where: { id: taskId },
        data: { actualHours: { increment: Math.round(calculatedDuration / 60) } }
      });

      res.json({ success: true, data: timeEntry, message: 'تم إضافة سجل الوقت بنجاح' });
    } catch (error) {
      console.error('Error adding manual time entry:', error);
      res.status(500).json({ success: false, error: 'فشل في إضافة سجل الوقت' });
    }
  },

  getTimeEntries: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const timeEntries = await getSharedPrismaClient().timeEntry.findMany({
        where: { taskId, companyId },
        include: { users: { select: { firstName: true, lastName: true } } },
        orderBy: { startTime: 'desc' }
      });

      const totalMinutes = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);

      res.json({
        success: true,
        data: { entries: timeEntries, totalMinutes, totalHours: Math.round(totalMinutes / 60 * 100) / 100 }
      });
    } catch (error) {
      console.error('Error fetching time entries:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب سجلات الوقت' });
    }
  },

  getRunningTimer: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const runningEntry = await getSharedPrismaClient().timeEntry.findFirst({
        where: { userId, companyId, isRunning: true },
        include: { task: { select: { id: true, title: true } } }
      });

      res.json({ success: true, data: runningEntry });
    } catch (error) {
      console.error('Error fetching running timer:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب المؤقت الجاري' });
    }
  },

  // ==================== سجل النشاطات (Activity Log) ====================
  
  getTaskActivities: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const activities = await getSharedPrismaClient().taskActivity.findMany({
        where: { taskId, companyId },
        include: { users: { select: { firstName: true, lastName: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      res.json({ success: true, data: activities });
    } catch (error) {
      console.error('Error fetching task activities:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب سجل النشاطات' });
    }
  },

  // ==================== المتابعون (Watchers) ====================
  
  addWatcher: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { userId: watcherUserId } = req.body;
      const companyId = req.user.companyId;

      const watcher = await getSharedPrismaClient().taskWatcher.create({
        data: { taskId, userId: watcherUserId, companyId },
        include: { users: { select: { firstName: true, lastName: true } } }
      });

      res.json({ success: true, data: watcher, message: 'تم إضافة المتابع بنجاح' });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'المستخدم يتابع هذه المهمة بالفعل' });
      }
      console.error('Error adding watcher:', error);
      res.status(500).json({ success: false, error: 'فشل في إضافة المتابع' });
    }
  },

  removeWatcher: async (req, res) => {
    try {
      const { taskId, watcherUserId } = req.params;
      const companyId = req.user.companyId;

      await getSharedPrismaClient().taskWatcher.deleteMany({ where: { taskId, userId: watcherUserId, companyId } });
      res.json({ success: true, message: 'تم إزالة المتابع بنجاح' });
    } catch (error) {
      console.error('Error removing watcher:', error);
      res.status(500).json({ success: false, error: 'فشل في إزالة المتابع' });
    }
  },

  getWatchers: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const watchers = await getSharedPrismaClient().taskWatcher.findMany({
        where: { taskId, companyId },
        include: { users: { select: { id: true, firstName: true, lastName: true, avatar: true } } }
      });

      res.json({ success: true, data: watchers.map(w => w.users) });
    } catch (error) {
      console.error('Error fetching watchers:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب المتابعين' });
    }
  },

  // ==================== الإشعارات (Notifications) ====================
  
  getNotifications: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.userId;
      const { unreadOnly } = req.query;

      const where = { userId, companyId };
      if (unreadOnly === 'true') where.isRead = false;

      const notifications = await getSharedPrismaClient().taskNotification.findMany({
        where, orderBy: { createdAt: 'desc' }, take: 50
      });

      const unreadCount = await getSharedPrismaClient().taskNotification.count({
        where: { userId, companyId, isRead: false }
      });

      res.json({ success: true, data: { notifications, unreadCount } });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب الإشعارات' });
    }
  },

  markNotificationAsRead: async (req, res) => {
    try {
      const { notificationId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      await getSharedPrismaClient().taskNotification.updateMany({
        where: { id: notificationId, userId, companyId },
        data: { isRead: true, readAt: new Date() }
      });

      res.json({ success: true, message: 'تم تحديد الإشعار كمقروء' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ success: false, error: 'فشل في تحديث الإشعار' });
    }
  },

  markAllNotificationsAsRead: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      await getSharedPrismaClient().taskNotification.updateMany({
        where: { userId, companyId, isRead: false },
        data: { isRead: true, readAt: new Date() }
      });

      res.json({ success: true, message: 'تم تحديد كل الإشعارات كمقروءة' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ success: false, error: 'فشل في تحديث الإشعارات' });
    }
  },

  // ==================== Kanban Board ====================
  
  getKanbanTasks: async (req, res) => {
    try {
      const { projectId } = req.query;
      const companyId = req.user.companyId;

      const where = { companyId, parentTaskId: null };
      if (projectId) where.projectId = projectId;

      const tasks = await getSharedPrismaClient().task.findMany({
        where,
        include: {
          assignee: { select: { firstName: true, lastName: true, avatar: true } },
          subTasks: { select: { id: true, status: true } },
          _count: { select: { task_comments: true, task_attachments: true } }
        },
        orderBy: { order: 'asc' }
      });

      const kanbanData = { PENDING: [], IN_PROGRESS: [], COMPLETED: [], CANCELLED: [] };

      tasks.forEach(task => {
        const formattedTask = {
          ...task,
          subtasksCount: task.subTasks ? task.subTasks.length : 0,
          completedSubtasks: task.subTasks ? task.subTasks.filter(s => s.status === 'COMPLETED').length : 0,
          commentsCount: task._count ? (task._count.task_comments || 0) : 0,
          attachmentsCount: task._count ? (task._count.task_attachments || 0) : 0
        };
        delete formattedTask.subTasks;
        delete formattedTask._count;
        
        if (kanbanData[task.status]) kanbanData[task.status].push(formattedTask);
      });

      res.json({ success: true, data: kanbanData });
    } catch (error) {
      console.error('Error fetching kanban tasks:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب مهام Kanban' });
    }
  },

  updateTaskOrder: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { newStatus, newOrder } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const task = await getSharedPrismaClient().task.findFirst({ where: { id: taskId, companyId } });
      if (!task) {
        return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
      }

      const oldStatus = task.status;

      const updatedTask = await getSharedPrismaClient().task.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          order: newOrder,
          ...(newStatus === 'COMPLETED' && { completedDate: new Date(), progress: 100 }),
          ...(newStatus !== 'COMPLETED' && oldStatus === 'COMPLETED' && { completedDate: null })
        }
      });

      if (oldStatus !== newStatus) {
        await getSharedPrismaClient().taskActivity.create({
          data: { taskId, userId, action: 'status_changed', field: 'status', oldValue: oldStatus, newValue: newStatus, companyId }
        });
      }

      res.json({ success: true, data: updatedTask, message: 'تم تحديث ترتيب المهمة' });
    } catch (error) {
      console.error('Error updating task order:', error);
      res.status(500).json({ success: false, error: 'فشل في تحديث ترتيب المهمة' });
    }
  },

  // ==================== تفاصيل المهمة الكاملة ====================
  
  getTaskDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const companyId = req.user.companyId;

      const task = await getSharedPrismaClient().task.findFirst({
        where: { id, companyId },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          creator: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          parentTask: { select: { id: true, title: true } },
          subTasks: {
            include: { assignee: { select: { firstName: true, lastName: true } } },
            orderBy: { order: 'asc' }
          },
          task_comments: {
            where: { parentCommentId: null },
            include: {
              users: { select: { firstName: true, lastName: true, avatar: true } },
              replies: { include: { users: { select: { firstName: true, lastName: true, avatar: true } } } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          task_attachments: {
            include: { users: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' }
          },
          time_entries: {
            include: { users: { select: { firstName: true, lastName: true } } },
            orderBy: { startTime: 'desc' },
            take: 10
          },
          task_watchers: {
            include: { users: { select: { id: true, firstName: true, lastName: true, avatar: true } } }
          },
          task_activities: {
            include: { users: { select: { firstName: true, lastName: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20
          }
        }
      });

      if (!task) {
        return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
      }

      const totalMinutes = task.time_entries ? task.time_entries.reduce((sum, entry) => sum + (entry.duration || 0), 0) : 0;

      res.json({
        success: true,
        data: {
          ...task,
          totalTimeMinutes: totalMinutes,
          totalTimeHours: Math.round(totalMinutes / 60 * 100) / 100,
          watchersList: task.task_watchers ? task.task_watchers.map(w => w.users) : [],
          comments: task.task_comments || [],
          attachments: task.task_attachments || [],
          activities: task.task_activities || [],
          subTasks: task.subTasks || []
        }
      });
    } catch (error) {
      console.error('Error fetching task details:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب تفاصيل المهمة' });
    }
  },

  // ==================== المرفقات (Attachments) ====================

  // جلب مرفقات المهمة
  getAttachments: async (req, res) => {
    try {
      const { taskId } = req.params;
      const companyId = req.user.companyId;

      const attachments = await getSharedPrismaClient().taskAttachment.findMany({
        where: { taskId, companyId },
        include: {
          users: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: attachments });
    } catch (error) {
      console.error('Error fetching attachments:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب المرفقات' });
    }
  },

  // إضافة مرفق
  addAttachment: async (req, res) => {
    try {
      const { taskId } = req.params;
      const { fileName, originalName, fileSize, fileType, filePath } = req.body;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const task = await getSharedPrismaClient().task.findFirst({
        where: { id: taskId, companyId }
      });

      if (!task) {
        return res.status(404).json({ success: false, error: 'المهمة غير موجودة' });
      }

      const attachment = await getSharedPrismaClient().taskAttachment.create({
        data: {
          taskId,
          userId,
          fileName,
          originalName,
          fileSize,
          fileType,
          filePath,
          companyId
        },
        include: {
          users: { select: { firstName: true, lastName: true } }
        }
      });

      // تسجيل النشاط
      await getSharedPrismaClient().taskActivity.create({
        data: {
          taskId,
          userId,
          action: 'attachment_added',
          description: `تم إضافة مرفق: ${originalName}`,
          companyId
        }
      });

      res.json({ success: true, data: attachment, message: 'تم إضافة المرفق بنجاح' });
    } catch (error) {
      console.error('Error adding attachment:', error);
      res.status(500).json({ success: false, error: 'فشل في إضافة المرفق' });
    }
  },

  // حذف مرفق
  deleteAttachment: async (req, res) => {
    try {
      const { attachmentId } = req.params;
      const companyId = req.user.companyId;
      const userId = req.user.userId;

      const attachment = await getSharedPrismaClient().taskAttachment.findFirst({
        where: { id: attachmentId, companyId }
      });

      if (!attachment) {
        return res.status(404).json({ success: false, error: 'المرفق غير موجود' });
      }

      // التحقق من صلاحية الحذف (صاحب المرفق فقط)
      if (attachment.userId !== userId) {
        return res.status(403).json({ success: false, error: 'لا يمكنك حذف هذا المرفق' });
      }

      await getSharedPrismaClient().taskAttachment.delete({
        where: { id: attachmentId }
      });

      // تسجيل النشاط
      await getSharedPrismaClient().taskActivity.create({
        data: {
          taskId: attachment.taskId,
          userId,
          action: 'attachment_deleted',
          description: `تم حذف مرفق: ${attachment.originalName}`,
          companyId
        }
      });

      res.json({ success: true, message: 'تم حذف المرفق بنجاح' });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      res.status(500).json({ success: false, error: 'فشل في حذف المرفق' });
    }
  },

  // ==================== Task Categories ====================

  // جلب جميع الأقسام
  getCategories: async (req, res) => {
    try {
      const companyId = req.user.companyId;

      const categories = await getSharedPrismaClient().taskCategory.findMany({
        where: { companyId },
        include: {
          _count: {
            select: { tasks: true }
          }
        },
        orderBy: { order: 'asc' }
      });

      res.json({ 
        success: true, 
        data: categories.map(cat => ({
          ...cat,
          taskCount: cat._count.tasks
        }))
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب الأقسام' });
    }
  },

  // إنشاء قسم جديد
  createCategory: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { name, description, color, icon } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'اسم القسم مطلوب' });
      }

      // التحقق من عدم وجود قسم بنفس الاسم
      const existingCategory = await getSharedPrismaClient().taskCategory.findFirst({
        where: { companyId, name }
      });

      if (existingCategory) {
        return res.status(400).json({ success: false, error: 'يوجد قسم بنفس الاسم' });
      }

      // الحصول على أعلى ترتيب
      const maxOrder = await getSharedPrismaClient().taskCategory.aggregate({
        where: { companyId },
        _max: { order: true }
      });

      const category = await getSharedPrismaClient().taskCategory.create({
        data: {
          name,
          description: description || null,
          color: color || '#6366f1',
          icon: icon || null,
          order: (maxOrder._max.order || 0) + 1,
          companyId
        }
      });

      res.status(201).json({ success: true, data: category });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ success: false, error: 'فشل في إنشاء القسم' });
    }
  },

  // تحديث قسم
  updateCategory: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const { name, description, color, icon, isActive, order } = req.body;

      const category = await getSharedPrismaClient().taskCategory.findFirst({
        where: { id, companyId }
      });

      if (!category) {
        return res.status(404).json({ success: false, error: 'القسم غير موجود' });
      }

      // التحقق من عدم وجود قسم آخر بنفس الاسم
      if (name && name !== category.name) {
        const existingCategory = await getSharedPrismaClient().taskCategory.findFirst({
          where: { companyId, name, id: { not: id } }
        });
        if (existingCategory) {
          return res.status(400).json({ success: false, error: 'يوجد قسم آخر بنفس الاسم' });
        }
      }

      const updatedCategory = await getSharedPrismaClient().taskCategory.update({
        where: { id },
        data: {
          name: name || category.name,
          description: description !== undefined ? description : category.description,
          color: color || category.color,
          icon: icon !== undefined ? icon : category.icon,
          isActive: isActive !== undefined ? isActive : category.isActive,
          order: order !== undefined ? order : category.order
        }
      });

      res.json({ success: true, data: updatedCategory });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ success: false, error: 'فشل في تحديث القسم' });
    }
  },

  // حذف قسم
  deleteCategory: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      const category = await getSharedPrismaClient().taskCategory.findFirst({
        where: { id, companyId },
        include: { _count: { select: { tasks: true } } }
      });

      if (!category) {
        return res.status(404).json({ success: false, error: 'القسم غير موجود' });
      }

      // إزالة القسم من المهام المرتبطة
      await getSharedPrismaClient().task.updateMany({
        where: { categoryId: id },
        data: { categoryId: null }
      });

      await getSharedPrismaClient().taskCategory.delete({
        where: { id }
      });

      res.json({ success: true, message: 'تم حذف القسم بنجاح' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ success: false, error: 'فشل في حذف القسم' });
    }
  },

  // ==================== Templates ====================
  
  // جلب جميع القوالب
  getTemplates: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const templates = await getSharedPrismaClient().taskTemplate.findMany({
        where: { companyId },
        include: {
          users: {
            select: { id: true, firstName: true, lastName: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب القوالب' });
    }
  },

  // إنشاء قالب جديد
  createTemplate: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id;
      const { name, description, defaultPriority, type, estimatedHours, tags, checklist, isPublic } = req.body;

      const template = await getSharedPrismaClient().taskTemplate.create({
        data: {
          id: uuidv4(),
          name,
          description,
          defaultPriority: normalizePriority(defaultPriority),
          type: type || 'general',
          estimatedHours: estimatedHours || 0,
          tags: tags && Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null,
          checklist: checklist && Array.isArray(checklist) && checklist.length > 0 ? JSON.stringify(checklist) : null,
          isPublic: isPublic || false,
          createdBy: userId,
          companyId,
          updatedAt: new Date()
        }
      });
      res.json({ success: true, data: template });
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ success: false, error: 'فشل في إنشاء القالب' });
    }
  },

  // تحديث قالب
  updateTemplate: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;
      const { name, description, defaultPriority, type, estimatedHours, tags, checklist, isPublic } = req.body;

      const updateData = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(defaultPriority && { defaultPriority: normalizePriority(defaultPriority) }),
        ...(type && { type }),
        ...(estimatedHours !== undefined && { estimatedHours }),
        ...(isPublic !== undefined && { isPublic }),
        ...(tags !== undefined && { 
          tags: tags && Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags) : null 
        }),
        ...(checklist !== undefined && { 
          checklist: checklist && Array.isArray(checklist) && checklist.length > 0 ? JSON.stringify(checklist) : null 
        })
      };

      const template = await getSharedPrismaClient().taskTemplate.updateMany({
        where: { id, companyId },
        data: updateData
      });
      res.json({ success: true, data: template });
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ success: false, error: 'فشل في تحديث القالب' });
    }
  },

  // حذف قالب
  deleteTemplate: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { id } = req.params;

      await getSharedPrismaClient().taskTemplate.deleteMany({
        where: { id, companyId }
      });
      res.json({ success: true, message: 'تم حذف القالب بنجاح' });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ success: false, error: 'فشل في حذف القالب' });
    }
  },

  // ==================== Checklists ====================
  
  // جلب قوائم التحقق للمهمة
  getChecklists: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { taskId } = req.params;

      const checklists = await getSharedPrismaClient().taskChecklist.findMany({
        where: { taskId, companyId },
        include: {
          items: {
            orderBy: { position: 'asc' },
            include: {
              completedUser: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          }
        },
        orderBy: { position: 'asc' }
      });
      res.json({ success: true, data: checklists });
    } catch (error) {
      console.error('Error fetching checklists:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب قوائم التحقق' });
    }
  },

  // إنشاء قائمة تحقق
  createChecklist: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { taskId } = req.params;
      const { title } = req.body;

      // Get max position
      const maxPosition = await getSharedPrismaClient().taskChecklist.aggregate({
        where: { taskId, companyId },
        _max: { position: true }
      });

      const checklist = await getSharedPrismaClient().taskChecklist.create({
        data: {
          taskId,
          title,
          position: (maxPosition._max.position || 0) + 1,
          companyId
        },
        include: { items: true }
      });
      res.json({ success: true, data: checklist });
    } catch (error) {
      console.error('Error creating checklist:', error);
      res.status(500).json({ success: false, error: 'فشل في إنشاء قائمة التحقق' });
    }
  },

  // حذف قائمة تحقق
  deleteChecklist: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { checklistId } = req.params;

      await getSharedPrismaClient().taskChecklist.deleteMany({
        where: { id: checklistId, companyId }
      });
      res.json({ success: true, message: 'تم حذف قائمة التحقق' });
    } catch (error) {
      console.error('Error deleting checklist:', error);
      res.status(500).json({ success: false, error: 'فشل في حذف قائمة التحقق' });
    }
  },

  // إضافة عنصر لقائمة التحقق
  addChecklistItem: async (req, res) => {
    try {
      const { checklistId } = req.params;
      const { content } = req.body;

      // Get max position
      const maxPosition = await getSharedPrismaClient().taskChecklistItem.aggregate({
        where: { checklistId },
        _max: { position: true }
      });

      const item = await getSharedPrismaClient().taskChecklistItem.create({
        data: {
          checklistId,
          content,
          position: (maxPosition._max.position || 0) + 1
        }
      });
      res.json({ success: true, data: item });
    } catch (error) {
      console.error('Error adding checklist item:', error);
      res.status(500).json({ success: false, error: 'فشل في إضافة العنصر' });
    }
  },

  // تحديث عنصر قائمة التحقق
  updateChecklistItem: async (req, res) => {
    try {
      const { itemId } = req.params;
      const { content, isCompleted } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (isCompleted !== undefined) {
        updateData.isCompleted = isCompleted;
        updateData.completedAt = isCompleted ? new Date() : null;
        updateData.completedBy = isCompleted ? userId : null;
      }

      const item = await getSharedPrismaClient().taskChecklistItem.update({
        where: { id: itemId },
        data: updateData
      });
      res.json({ success: true, data: item });
    } catch (error) {
      console.error('Error updating checklist item:', error);
      res.status(500).json({ success: false, error: 'فشل في تحديث العنصر' });
    }
  },

  // حذف عنصر قائمة التحقق
  deleteChecklistItem: async (req, res) => {
    try {
      const { itemId } = req.params;

      await getSharedPrismaClient().taskChecklistItem.delete({
        where: { id: itemId }
      });
      res.json({ success: true, message: 'تم حذف العنصر' });
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      res.status(500).json({ success: false, error: 'فشل في حذف العنصر' });
    }
  },

  // ==================== Dependencies ====================
  
  // جلب تبعيات المهمة
  getDependencies: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { taskId } = req.params;

      const dependencies = await getSharedPrismaClient().taskDependency.findMany({
        where: { 
          OR: [
            { taskId, companyId },
            { dependsOnId: taskId, companyId }
          ]
        },
        include: {
          task: {
            select: { id: true, title: true, status: true, priority: true }
          },
          dependsOn: {
            select: { id: true, title: true, status: true, priority: true }
          }
        }
      });
      res.json({ success: true, data: dependencies });
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      res.status(500).json({ success: false, error: 'فشل في جلب التبعيات' });
    }
  },

  // إضافة تبعية
  addDependency: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { taskId } = req.params;
      const { dependsOnId, type } = req.body;

      // Check if dependency already exists
      const existing = await getSharedPrismaClient().taskDependency.findFirst({
        where: { taskId, dependsOnId, companyId }
      });

      if (existing) {
        return res.status(400).json({ success: false, error: 'التبعية موجودة بالفعل' });
      }

      const dependency = await getSharedPrismaClient().taskDependency.create({
        data: {
          taskId,
          dependsOnId,
          type: type || 'blocked_by',
          companyId
        },
        include: {
          task: {
            select: { id: true, title: true, status: true, priority: true }
          },
          dependsOn: {
            select: { id: true, title: true, status: true, priority: true }
          }
        }
      });
      res.json({ success: true, data: dependency });
    } catch (error) {
      console.error('Error adding dependency:', error);
      res.status(500).json({ success: false, error: 'فشل في إضافة التبعية' });
    }
  },

  // حذف تبعية
  removeDependency: async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { dependencyId } = req.params;

      await getSharedPrismaClient().taskDependency.deleteMany({
        where: { id: dependencyId, companyId }
      });
      res.json({ success: true, message: 'تم حذف التبعية' });
    } catch (error) {
      console.error('Error removing dependency:', error);
      res.status(500).json({ success: false, error: 'فشل في حذف التبعية' });
    }
  }
};

module.exports = taskController;
