const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

// ==================== نظام مهام التطوير للسوبر أدمن ====================

// ==================== Validation Helpers ====================
const validateEnum = (value, allowedValues, fieldName) => {
  if (value && !allowedValues.includes(value)) {
    throw new Error(`Invalid ${fieldName}: ${value}. Allowed values: ${allowedValues.join(', ')}`);
  }
  return true;
};

const sanitizeString = (str, maxLength = 10000) => {
  if (!str) return '';
  return str.trim().substring(0, maxLength);
};

const safeJsonParse = (jsonString, defaultValue = []) => {
  if (!jsonString) return defaultValue;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('Error parsing JSON:', e.message);
    return defaultValue;
  }
};

const validatePagination = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50)); // Max 100
  return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

// ==================== Team Management ====================

/**
 * Get all team members
 * GET /api/v1/super-admin/dev/team
 */
const getAllTeamMembers = async (req, res) => {
  try {
    console.log('👥 [DEV-TEAM] getAllTeamMembers called');
    const prisma = getSharedPrismaClient();

    const teamMembers = await safeQuery(async () => {
      return await prisma.devTeamMember.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              phone: true,
              isActive: true
            }
          },
          _count: {
            select: {
              assignedTasks: true,
              managedProjects: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    const formattedMembers = teamMembers.map(member => ({
      id: member.id,
      userId: member.userId,
      name: `${member.user.firstName} ${member.user.lastName}`,
      email: member.user.email,
      avatar: member.user.avatar,
      phone: member.user.phone,
      role: member.role,
      department: member.department,
      skills: member.skills ? (typeof member.skills === 'string' ? member.skills.split(',').map(s => s.trim()) : member.skills) : [],
      availability: member.availability,
      isActive: member.isActive && member.user.isActive,
      tasksCount: member._count.assignedTasks,
      projectsCount: member._count.managedProjects,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt
    }));

    res.status(200).json({
      success: true,
      message: 'Team members fetched successfully',
      data: formattedMembers
    });
  } catch (error) {
    console.error('❌ [DEV-TEAM] Error fetching team members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
};

/**
 * Get single team member by ID
 * GET /api/v1/super-admin/dev/team/:id
 */
const getTeamMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('👥 [DEV-TEAM] getTeamMemberById called for id:', id);
    const prisma = getSharedPrismaClient();

    const member = await safeQuery(async () => {
      return await prisma.devTeamMember.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              phone: true,
              isActive: true
            }
          },
          _count: {
            select: {
              assignedTasks: true,
              managedProjects: true
            }
          }
        }
      });
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    const formattedMember = {
      id: member.id,
      userId: member.userId,
      name: `${member.user.firstName} ${member.user.lastName}`,
      email: member.user.email,
      avatar: member.user.avatar,
      phone: member.user.phone,
      role: member.role,
      department: member.department,
      skills: member.skills ? (typeof member.skills === 'string' ? member.skills.split(',').map(s => s.trim()) : member.skills) : [],
      availability: member.availability,
      isActive: member.isActive && member.user.isActive,
      tasksCount: member._count.assignedTasks,
      projectsCount: member._count.managedProjects,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Team member fetched successfully',
      data: formattedMember
    });
  } catch (error) {
    console.error('❌ [DEV-TEAM] Error fetching team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team member',
      error: error.message
    });
  }
};

/**
 * Create new team member
 * POST /api/v1/super-admin/dev/team
 */
const createTeamMember = async (req, res) => {
  try {
    console.log('👥 [DEV-TEAM] createTeamMember called with data:', req.body);
    const { userId, role, department, skills, availability } = req.body;
    const prisma = getSharedPrismaClient();

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    // Check if user exists
    const user = await safeQuery(async () => {
      return await prisma.user.findUnique({
        where: { id: userId }
      });
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already a team member
    const existing = await safeQuery(async () => {
      return await prisma.devTeamMember.findUnique({
        where: { userId }
      });
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User is already a team member'
      });
    }

    // Validate role
    const allowedRoles = ['developer', 'designer', 'project_manager', 'qa', 'devops', 'tech_lead', 'product_manager'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed values: ${allowedRoles.join(', ')}`
      });
    }

    // Validate availability
    const allowedAvailability = ['available', 'busy', 'away', 'offline'];
    if (availability && !allowedAvailability.includes(availability)) {
      return res.status(400).json({
        success: false,
        message: `Invalid availability. Allowed values: ${allowedAvailability.join(', ')}`
      });
    }

    // Process skills
    let skillsStr = null;
    if (skills) {
      if (Array.isArray(skills)) {
        skillsStr = skills.join(',');
      } else if (typeof skills === 'string') {
        skillsStr = skills;
      }
    }

    const newMember = await safeQuery(async () => {
      return await prisma.devTeamMember.create({
        data: {
          userId,
          role: role || 'developer',
          department: department || null,
          skills: skillsStr,
          availability: availability || 'available',
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              phone: true
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Team member created successfully',
      data: {
        id: newMember.id,
        userId: newMember.userId,
        name: `${newMember.user.firstName} ${newMember.user.lastName}`,
        email: newMember.user.email,
        role: newMember.role,
        department: newMember.department,
        skills: newMember.skills ? newMember.skills.split(',').map(s => s.trim()) : [],
        availability: newMember.availability,
        isActive: newMember.isActive
      }
    });
  } catch (error) {
    console.error('❌ [DEV-TEAM] Error creating team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team member',
      error: error.message
    });
  }
};

/**
 * Update team member
 * PUT /api/v1/super-admin/dev/team/:id
 */
const updateTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, department, skills, availability, isActive } = req.body;
    console.log('👥 [DEV-TEAM] updateTeamMember called for id:', id, 'with data:', req.body);
    const prisma = getSharedPrismaClient();

    // Check if member exists
    const existing = await safeQuery(async () => {
      return await prisma.devTeamMember.findUnique({
        where: { id }
      });
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    // Validate role
    const allowedRoles = ['developer', 'designer', 'project_manager', 'qa', 'devops', 'tech_lead', 'product_manager'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed values: ${allowedRoles.join(', ')}`
      });
    }

    // Validate availability
    const allowedAvailability = ['available', 'busy', 'away', 'offline'];
    if (availability && !allowedAvailability.includes(availability)) {
      return res.status(400).json({
        success: false,
        message: `Invalid availability. Allowed values: ${allowedAvailability.join(', ')}`
      });
    }

    // Process skills
    let skillsStr = existing.skills;
    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        skillsStr = skills.join(',');
      } else if (typeof skills === 'string') {
        skillsStr = skills || null;
      } else if (skills === null) {
        skillsStr = null;
      }
    }

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department || null;
    if (skillsStr !== undefined) updateData.skills = skillsStr;
    if (availability !== undefined) updateData.availability = availability;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedMember = await safeQuery(async () => {
      return await prisma.devTeamMember.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              phone: true
            }
          }
        }
      });
    });

    res.status(200).json({
      success: true,
      message: 'Team member updated successfully',
      data: {
        id: updatedMember.id,
        userId: updatedMember.userId,
        name: `${updatedMember.user.firstName} ${updatedMember.user.lastName}`,
        email: updatedMember.user.email,
        role: updatedMember.role,
        department: updatedMember.department,
        skills: updatedMember.skills ? updatedMember.skills.split(',').map(s => s.trim()) : [],
        availability: updatedMember.availability,
        isActive: updatedMember.isActive
      }
    });
  } catch (error) {
    console.error('❌ [DEV-TEAM] Error updating team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team member',
      error: error.message
    });
  }
};

/**
 * Delete team member
 * DELETE /api/v1/super-admin/dev/team/:id
 */
const deleteTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('👥 [DEV-TEAM] deleteTeamMember called for id:', id);
    const prisma = getSharedPrismaClient();

    // Check if member exists
    const existing = await safeQuery(async () => {
      return await prisma.devTeamMember.findUnique({
        where: { id }
      });
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    await safeQuery(async () => {
      return await prisma.devTeamMember.delete({
        where: { id }
      });
    });

    res.status(200).json({
      success: true,
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('❌ [DEV-TEAM] Error deleting team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team member',
      error: error.message
    });
  }
};

// ==================== Projects Management ====================

/**
 * Get all projects
 * GET /api/v1/super-admin/dev/projects
 */
const getAllProjects = async (req, res) => {
  try {
    console.log('📂 [DEV-PROJECTS] getAllProjects called');
    const { status } = req.query;
    const prisma = getSharedPrismaClient();

    const where = {};
    if (status) {
      where.status = status;
    }

    const projects = await safeQuery(async () => {
      return await prisma.devProject.findMany({
        where,
        include: {
          manager: {
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
          _count: {
            select: {
              tasks: true,
              releases: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    // Get task counts for each project
    const projectIds = projects.map(p => p.id);
    const taskCounts = await Promise.all(projectIds.map(async (projectId) => {
      const [total, completed] = await Promise.all([
        safeQuery(async () => prisma.devTask.count({ where: { projectId } })),
        safeQuery(async () => prisma.devTask.count({ where: { projectId, status: 'DONE' } }))
      ]);
      return { projectId, total, completed };
    }));

    const taskCountsMap = taskCounts.reduce((acc, item) => {
      acc[item.projectId] = item;
      return acc;
    }, {});

    const formattedProjects = projects.map(project => {
      const counts = taskCountsMap[project.id] || { total: 0, completed: 0 };
      const totalTasks = counts.total;
      const completedTasks = counts.completed;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progress || 0;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        priority: project.priority,
        color: project.color,
        icon: project.icon,
        startDate: project.startDate,
        endDate: project.endDate,
        progress: progress,
        managerId: project.managerId,
        managerName: project.manager ? `${project.manager.user.firstName} ${project.manager.user.lastName}` : null,
        managerAvatar: project.manager?.user.avatar || null,
        tasksCount: project._count.tasks || 0,
        completedTasks: completedTasks,
        releasesCount: project._count.releases || 0,
        tags: project.tags ? (typeof project.tags === 'string' ? project.tags.split(',').map(t => t.trim()) : project.tags) : [],
        repository: project.repository,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };
    });

    res.status(200).json({
      success: true,
      message: 'Projects fetched successfully',
      data: formattedProjects
    });
  } catch (error) {
    console.error('❌ [DEV-PROJECTS] Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: error.message
    });
  }
};

/**
 * Create new project
 * POST /api/v1/super-admin/dev/projects
 */
const createProject = async (req, res) => {
  try {
    console.log('📂 [DEV-PROJECTS] createProject called with data:', req.body);
    const { name, description, priority, color, startDate, endDate, managerId, tags } = req.body;
    const prisma = getSharedPrismaClient();

    // Validation
    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: 'Name and description are required'
      });
    }

    // Validate priority
    const allowedPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed values: ${allowedPriorities.join(', ')}`
      });
    }

    // Validate manager if provided
    if (managerId) {
      const manager = await safeQuery(async () => {
        return await prisma.devTeamMember.findUnique({
          where: { id: managerId }
        });
      });

      if (!manager) {
        return res.status(404).json({
          success: false,
          message: 'Manager not found'
        });
      }
    }

    // Process tags
    let tagsStr = null;
    if (tags) {
      if (Array.isArray(tags)) {
        tagsStr = tags.join(',');
      } else if (typeof tags === 'string') {
        tagsStr = tags;
      }
    }

    const newProject = await safeQuery(async () => {
      return await prisma.devProject.create({
        data: {
          name: name.trim(),
          description: description.trim(),
          priority: priority || 'MEDIUM',
          color: color || '#6366f1',
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          managerId: managerId || null,
          tags: tagsStr,
          status: 'PLANNING',
          progress: 0
        },
        include: {
          manager: {
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
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
        status: newProject.status,
        priority: newProject.priority,
        color: newProject.color,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        managerId: newProject.managerId,
        managerName: newProject.manager ? `${newProject.manager.user.firstName} ${newProject.manager.user.lastName}` : null,
        tags: newProject.tags ? newProject.tags.split(',').map(t => t.trim()) : [],
        progress: newProject.progress
      }
    });
  } catch (error) {
    console.error('❌ [DEV-PROJECTS] Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message
    });
  }
};

/**
 * Delete project
 * DELETE /api/v1/super-admin/dev/projects/:id
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📂 [DEV-PROJECTS] deleteProject called for id:', id);
    const prisma = getSharedPrismaClient();

    // Check if project exists
    const existing = await safeQuery(async () => {
      return await prisma.devProject.findUnique({
        where: { id }
      });
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await safeQuery(async () => {
      return await prisma.devProject.delete({
        where: { id }
      });
    });

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('❌ [DEV-PROJECTS] Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project',
      error: error.message
    });
  }
};

// ==================== Releases Management ====================

/**
 * Get all releases
 * GET /api/v1/super-admin/dev/releases
 */
const getAllReleases = async (req, res) => {
  try {
    console.log('📦 [DEV-RELEASES] getAllReleases called');
    const { status, projectId } = req.query;
    const prisma = getSharedPrismaClient();

    const where = {};
    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const releases = await safeQuery(async () => {
      return await prisma.devRelease.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        orderBy: {
          releaseDate: 'desc'
        }
      });
    });

    const formattedReleases = releases.map(release => ({
      id: release.id,
      version: release.version,
      name: release.name,
      description: release.description,
      status: release.status,
      releaseDate: release.releaseDate,
      changelog: release.changelog,
      projectId: release.projectId,
      projectName: release.project?.name || null,
      projectColor: release.project?.color || null,
      tasksCount: release._count.tasks || 0,
      createdAt: release.createdAt,
      updatedAt: release.updatedAt
    }));

    res.status(200).json({
      success: true,
      message: 'Releases fetched successfully',
      data: formattedReleases
    });
  } catch (error) {
    console.error('❌ [DEV-RELEASES] Error fetching releases:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch releases',
      error: error.message
    });
  }
};
/**
 * Get all tasks
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

    // Handle status filter - if specific status is selected, use it; otherwise use excludeStatus
    if (status) {
      where.status = status;
      console.log('🔍 [DEV-TASKS] Filtering by status:', status);
    } else if (excludeStatus) {
      const excludeStatusUpper = excludeStatus.toUpperCase();
      console.log('🔍 [DEV-TASKS] Excluding status:', excludeStatusUpper);
      where.status = { not: excludeStatusUpper };
    }

    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (projectId) where.projectId = projectId;
    
    // Handle assigneeId - convert 'me' to actual teamMember.id
    if (assigneeId) {
      if (assigneeId === 'me') {
        const teamMember = await safeQuery(async () => {
          return await prisma.devTeamMember.findFirst({
            where: { userId: req.user.id }
          });
        });
        if (teamMember) {
          where.assigneeId = teamMember.id;
          console.log('🔍 [DEV-TASKS] Filtering by assigneeId (me):', teamMember.id);
        } else {
          // If user is not a team member, they should see no tasks
          where.assigneeId = 'none';
          console.log('🔍 [DEV-TASKS] User is not a team member, filtering by assigneeId: none');
        }
      } else {
        where.assigneeId = assigneeId;
        console.log('🔍 [DEV-TASKS] Filtering by assigneeId:', assigneeId);
      }
    }
    
    if (component) where.component = component;
    if (releaseId) where.releaseId = releaseId;
    
    console.log('🔍 [DEV-TASKS] Final where clause:', JSON.stringify(where, null, 2));

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
  getAllTeamMembers,
  getTeamMemberById,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getAllProjects,
  createProject,
  deleteProject,
  getAllReleases,
  getAllTasks
};