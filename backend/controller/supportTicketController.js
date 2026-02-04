const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { processImage, isProcessableImage } = require('../utils/imageProcessor');
const getPrisma = () => getSharedPrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/support');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مدعوم'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  }
});

// Convert category from frontend to Prisma enum
const mapCategory = (category) => {
  const mapping = {
    'technical': 'TECHNICAL',
    'billing': 'BILLING',
    'inquiry': 'INQUIRY',
    'suggestion': 'SUGGESTION',
    'complaint': 'COMPLAINT'
  };
  return mapping[category] || 'INQUIRY';
};

// Convert status from frontend to Prisma enum
const mapStatus = (status) => {
  const mapping = {
    'open': 'OPEN',
    'in_progress': 'IN_PROGRESS',
    'closed': 'CLOSED'
  };
  return mapping[status] || 'OPEN';
};

// Convert from Prisma enum to frontend
const mapCategoryToFrontend = (category) => {
  const mapping = {
    'TECHNICAL': 'technical',
    'BILLING': 'billing',
    'INQUIRY': 'inquiry',
    'SUGGESTION': 'suggestion',
    'COMPLAINT': 'complaint'
  };
  return mapping[category] || 'inquiry';
};

const mapStatusToFrontend = (status) => {
  const mapping = {
    'OPEN': 'open',
    'IN_PROGRESS': 'in_progress',
    'CLOSED': 'closed'
  };
  return mapping[status] || 'open';
};

const mapPriority = (priority) => {
  const mapping = {
    'low': 'LOW',
    'medium': 'MEDIUM',
    'high': 'HIGH',
    'critical': 'CRITICAL'
  };
  return mapping[priority] || 'MEDIUM';
};

const mapPriorityToFrontend = (priority) => {
  const mapping = {
    'LOW': 'low',
    'MEDIUM': 'medium',
    'HIGH': 'high',
    'CRITICAL': 'critical'
  };
  return mapping[priority] || 'medium';
};

// Generate unique ticket ID
const generateTicketId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
};

// Transform ticket for frontend
const transformTicket = (ticket) => {
  return {
    ...ticket,
    category: mapCategoryToFrontend(ticket.category),
    status: mapStatusToFrontend(ticket.status),
    userId: ticket.user ? {
      _id: ticket.user.id,
      name: `${ticket.user.firstName} ${ticket.user.lastName}`,
      email: ticket.user.email
    } : null,
    priority: mapPriorityToFrontend(ticket.priority),
    assignedTo: ticket.assignedUser ? {
      _id: ticket.assignedUser.id,
      name: `${ticket.assignedUser.firstName} ${ticket.assignedUser.lastName}`,
      email: ticket.assignedUser.email
    } : null
  };
};

// Create new ticket
const createTicket = async (req, res) => {
  try {
    const { subject, category, content } = req.body;
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Create ticket
    const ticket = await getPrisma().supportTicket.create({
      data: {
        ticketId: generateTicketId(),
        subject,
        description: content,
        category: mapCategory(category),
        status: 'OPEN',
        userId,
        companyId
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Create initial message
    await getPrisma().supportMessage.create({
      data: {
        content,
        isFromAdmin: false,
        ticketId: ticket.id,
        senderId: userId
      }
    });

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      const attachmentData = [];
      for (const file of req.files) {
        let currentFilename = file.filename;
        let currentSize = file.size;
        let currentMimetype = file.mimetype;

        if (isProcessableImage(file.mimetype)) {
          try {
            const processed = await processImage(file.path, path.dirname(file.path));
            currentFilename = processed.filename;
            currentSize = processed.size;
            currentMimetype = 'image/webp';
          } catch (procError) {
            console.error(`❌ [IMAGE-PROC] Error processing support ticket image:`, procError.message);
          }
        }

        attachmentData.push({
          filename: currentFilename,
          originalName: file.originalname,
          mimeType: currentMimetype,
          size: currentSize,
          url: `/uploads/support/${currentFilename}`,
          ticketId: ticket.id
        });
      }
      await getPrisma().supportAttachment.createMany({ data: attachmentData });
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء التذكرة بنجاح',
      ticket: transformTicket(ticket)
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إنشاء التذكرة',
      error: error.message
    });
  }
};

// Get user tickets
const getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, page = 1, limit = 10 } = req.query;

    const where = { userId };
    if (status) where.status = mapStatus(status);
    if (category) where.category = mapCategory(category);

    const [tickets, total] = await Promise.all([
      getPrisma().supportTicket.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          messages: { take: 1, orderBy: { createdAt: 'desc' } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      }),
      getPrisma().supportTicket.count({ where })
    ]);

    res.json({
      success: true,
      tickets: tickets.map(transformTicket),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التذاكر',
      error: error.message
    });
  }
};

// Get ticket details
const getTicketDetails = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';

    const where = isAdmin ? { ticketId } : { ticketId, userId };

    const ticket = await getPrisma().supportTicket.findFirst({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        messages: {
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, email: true }
            },
            attachments: true
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'التذكرة غير موجودة'
      });
    }

    // Filter internal messages for non-admin
    const filteredMessages = ticket.messages.filter(msg => {
      if (isAdmin) return true;
      return !msg.isInternal;
    });

    // Transform messages for frontend
    const transformedTicket = {
      ...transformTicket(ticket),
      messages: filteredMessages.map(msg => ({
        _id: msg.id,
        content: msg.content,
        senderType: msg.isFromAdmin ? 'admin' : 'user',
        isInternal: msg.isInternal,
        sender: msg.sender ? {
          _id: msg.sender.id,
          name: `${msg.sender.firstName} ${msg.sender.lastName}`,
          email: msg.sender.email
        } : null,
        attachments: msg.attachments,
        createdAt: msg.createdAt
      }))
    };

    res.json({
      success: true,
      ticket: transformedTicket
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تفاصيل التذكرة',
      error: error.message
    });
  }
};

// Add message to ticket
const addMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content, isInternal } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';

    const where = isAdmin ? { ticketId } : { ticketId, userId };

    const ticket = await getPrisma().supportTicket.findFirst({ where });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'التذكرة غير موجودة'
      });
    }

    // Create new message
    const message = await getPrisma().supportMessage.create({
      data: {
        content,
        isFromAdmin: isAdmin,
        isInternal: isAdmin && (isInternal === 'true' || isInternal === true),
        ticketId: ticket.id,
        senderId: userId
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      const attachmentData = [];
      for (const file of req.files) {
        let currentFilename = file.filename;
        let currentSize = file.size;
        let currentMimetype = file.mimetype;

        if (isProcessableImage(file.mimetype)) {
          try {
            const processed = await processImage(file.path, path.dirname(file.path));
            currentFilename = processed.filename;
            currentSize = processed.size;
            currentMimetype = 'image/webp';
          } catch (procError) {
            console.error(`❌ [IMAGE-PROC] Error processing support ticket image:`, procError.message);
          }
        }

        attachmentData.push({
          filename: currentFilename,
          originalName: file.originalname,
          mimeType: currentMimetype,
          size: currentSize,
          url: `/uploads/support/${currentFilename}`,
          messageId: message.id
        });
      }
      await getPrisma().supportAttachment.createMany({ data: attachmentData });
    }

    // Update ticket status if admin is replying
    if (isAdmin && ticket.status === 'OPEN') {
      await getPrisma().supportTicket.update({
        where: { id: ticket.id },
        data: { status: 'IN_PROGRESS' }
      });
    }

    res.json({
      success: true,
      message: 'تم إضافة الرد بنجاح'
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إضافة الرد',
      error: error.message
    });
  }
};

// Update ticket details (Admin only: Status, Priority, AssignedUser)
const updateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, assignedUserId } = req.body;

    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح لك بتحديث التذكرة'
      });
    }

    const ticket = await getPrisma().supportTicket.findFirst({ where: { ticketId } });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'التذكرة غير موجودة'
      });
    }

    const updateData = {};
    if (status) {
      updateData.status = mapStatus(status);
      if (status === 'closed') updateData.closedAt = new Date();
    }
    if (priority) updateData.priority = mapPriority(priority);
    if (assignedUserId) updateData.assignedUserId = assignedUserId;

    const updatedTicket = await getPrisma().supportTicket.update({
      where: { id: ticket.id },
      data: updateData,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'تم تحديث التذكرة بنجاح',
      ticket: transformTicket(updatedTicket)
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث التذكرة',
      error: error.message
    });
  }
};

// Rate ticket (User only, after closure)
const rateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.id;

    const ticket = await getPrisma().supportTicket.findFirst({
      where: { ticketId, userId }
    });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'التذكرة غير موجودة'
      });
    }

    if (ticket.status !== 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن تقييم التذكرة إلا بعد إغلاقها'
      });
    }

    const updatedTicket = await getPrisma().supportTicket.update({
      where: { id: ticket.id },
      data: { rating, feedback: feedback || null }
    });

    res.json({
      success: true,
      message: 'تم تقييم الخدمة بنجاح',
      ticket: transformTicket(updatedTicket)
    });
  } catch (error) {
    console.error('Error rating ticket:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تقييم الخدمة',
      error: error.message
    });
  }
};

// Get all tickets (Admin only)
const getAllTickets = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح لك بعرض جميع التذاكر'
      });
    }

    const { status, category, page = 1, limit = 10, search } = req.query;

    const where = {};
    if (status) where.status = mapStatus(status);
    if (category) where.category = mapCategory(category);
    if (search) {
      where.OR = [
        { ticketId: { contains: search } },
        { subject: { contains: search } }
      ];
    }

    const [tickets, total, openCount, inProgressCount, closedCount] = await Promise.all([
      getPrisma().supportTicket.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      }),
      getPrisma().supportTicket.count({ where }),
      getPrisma().supportTicket.count({ where: { status: 'OPEN' } }),
      getPrisma().supportTicket.count({ where: { status: 'IN_PROGRESS' } }),
      getPrisma().supportTicket.count({ where: { status: 'CLOSED' } })
    ]);

    // Format stats for frontend
    const stats = [
      { _id: 'open', count: openCount },
      { _id: 'in_progress', count: inProgressCount },
      { _id: 'closed', count: closedCount }
    ];

    res.json({
      success: true,
      tickets: tickets.map(transformTicket),
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all tickets:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب التذاكر',
      error: error.message
    });
  }
};


// Get specific user tickets (Admin History)
const getUserTicketHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { excludeTicketId } = req.query;

    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const where = { userId };
    if (excludeTicketId) {
      where.ticketId = { not: excludeTicketId };
    }

    const tickets = await getPrisma().supportTicket.findMany({
      where,
      select: {
        id: true,
        ticketId: true,
        subject: true,
        status: true,
        createdAt: true,
        priority: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    res.json({
      success: true,
      tickets: tickets.map(t => ({
        ...t,
        status: mapStatusToFrontend(t.status),
        priority: mapPriorityToFrontend(t.priority)
      }))
    });
  } catch (error) {
    console.error('Error fetching user history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user history' });
  }
};

// Get list of staff users for assignment
const getSupportStaff = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    console.log(' [DEBUG] getSupportStaff - isAdmin:', isAdmin);
    console.log(' [DEBUG] req.user:', req.user);
    const prisma = getPrisma();
    if (!prisma) {
      console.error(' [DEBUG] Prisma client is undefined!');
      throw new Error('Prisma client is undefined');
    }
    console.log(' [DEBUG] Prisma user model:', !!prisma.user);

    const staff = await getPrisma().user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'AGENT'] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      }
    });

    res.json({
      success: true,
      staff: staff.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Error fetching staff (detailed):', error);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch staff list', error: error.message });
    res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
};

module.exports = {
  upload,
  createTicket,
  getUserTickets,
  getTicketDetails,
  addMessage,
  updateTicket,
  updateTicketStatus: updateTicket, // Backward compatibility alias
  rateTicket,
  getAllTickets,
  getUserTicketHistory,
  getSupportStaff
};
