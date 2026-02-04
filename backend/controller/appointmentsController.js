const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { v4: uuidv4 } = require('uuid');

// Get all appointments with filters
const getAllAppointments = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const { status, staffId, type, dateFrom, dateTo } = req.query;
    
    const where = { companyId };
    
    if (status) where.status = status;
    if (staffId) where.staffId = staffId;
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.appointmentDate = {};
      if (dateFrom) where.appointmentDate.gte = new Date(dateFrom);
      if (dateTo) where.appointmentDate.lte = new Date(dateTo);
    }

    const appointments = await getSharedPrismaClient().appointment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        appointmentDate: 'desc'
      }
    });

    // Format appointments for frontend
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment.id,
      customerId: appointment.customerId || '',
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      staffId: appointment.staffId,
      staffName: appointment.staffName,
      title: appointment.title,
      description: appointment.description,
      appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
      startTime: appointment.startTime,
      endTime: appointment.endTime || '',
      duration: appointment.duration,
      status: appointment.status,
      type: appointment.type,
      location: appointment.location,
      meetingLink: appointment.meetingLink,
      notes: appointment.notes,
      createdAt: appointment.createdAt.toISOString()
    }));

    res.json({
      success: true,
      data: formattedAppointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب المواعيد'
    });
  }
};

// Get available time slots
const getAvailableSlots = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح بالوصول'
      });
    }

    const { staffId, date } = req.query;
    
    if (!staffId || !date) {
      return res.status(400).json({
        success: false,
        error: 'معرف الموظف والتاريخ مطلوبان'
      });
    }

    // Get existing appointments for this staff and date
    const existingAppointments = await getSharedPrismaClient().appointment.findMany({
      where: {
        companyId,
        staffId,
        appointmentDate: new Date(date),
        status: {
          notIn: ['cancelled', 'no_show']
        }
      },
      select: {
        startTime: true,
        endTime: true,
        duration: true
      }
    });

    // Generate time slots (9 AM to 5 PM, 30-minute intervals)
    const slots = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Calculate end time (30 minutes later)
        const endHour = minute + 30 >= 60 ? hour + 1 : hour;
        const endMinute = (minute + 30) % 60;
        const endTimeString = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // Check if slot is available
        const isAvailable = !existingAppointments.some(apt => {
          return apt.startTime === timeString || 
                 (apt.endTime && apt.endTime > timeString && apt.startTime < endTimeString);
        });

        slots.push({
          startTime: timeString,
          endTime: endTimeString,
          duration: 30,
          available: isAvailable
        });
      }
    }

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الأوقات المتاحة'
    });
  }
};

// Create new appointment
const createAppointment = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    const {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      staffId,
      staffName,
      title,
      description,
      appointmentDate,
      startTime,
      type,
      location,
      meetingLink,
      notes
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'العنوان مطلوب'
      });
    }
    
    if (!appointmentDate) {
      return res.status(400).json({
        success: false,
        error: 'التاريخ مطلوب'
      });
    }
    
    if (!startTime) {
      return res.status(400).json({
        success: false,
        error: 'الوقت مطلوب'
      });
    }
    
    if (!staffId || !staffId.trim()) {
      return res.status(400).json({
        success: false,
        error: 'معرف الموظف مطلوب'
      });
    }
    
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'اسم العميل مطلوب'
      });
    }

    // Calculate end time (default 30 minutes)
    const duration = 30;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const endMinutes = startMinute + duration;
    const endHour = startHour + Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

    // Check if slot is already booked
    const existingAppointment = await getSharedPrismaClient().appointment.findFirst({
      where: {
        companyId,
        staffId,
        appointmentDate: new Date(appointmentDate),
        startTime,
        status: {
          notIn: ['cancelled', 'no_show']
        }
      }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        error: 'هذا الوقت محجوز بالفعل'
      });
    }

    // Verify customer exists if customerId is provided and valid
    let validCustomerId = null;
    if (customerId && customerId.trim() !== '' && customerId !== '1' && customerId !== '0') {
      const customer = await getSharedPrismaClient().customer.findFirst({
        where: {
          id: customerId,
          companyId: companyId
        }
      });
      
      if (customer) {
        validCustomerId = customerId;
        // Use customer data if not provided
        if (!customerName || customerName.trim() === '') {
          customerName = `${customer.firstName} ${customer.lastName}`.trim();
        }
        if (!customerEmail || customerEmail.trim() === '') {
          customerEmail = customer.email || null;
        }
        if (!customerPhone || customerPhone.trim() === '') {
          customerPhone = customer.phone || null;
        }
      } else {
        // Customer not found, set customerId to null
        console.warn(`Customer ${customerId} not found for company ${companyId}, creating appointment without customer relation`);
        validCustomerId = null;
      }
    }

    // Get staff name if not provided
    let finalStaffName = staffName;
    if (!finalStaffName || finalStaffName.trim() === '') {
      const staff = await getSharedPrismaClient().user.findFirst({
        where: {
          id: staffId,
          companyId: companyId
        },
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      });
      
      if (staff) {
        finalStaffName = `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email || 'موظف';
      } else {
        finalStaffName = 'موظف';
      }
    }

    // Prepare appointment data
    const appointmentData = {
      id: uuidv4(),
      companyId,
      customerId: validCustomerId,
      customerName: customerName.trim(),
      customerEmail: customerEmail && customerEmail.trim() !== '' ? customerEmail.trim() : null,
      customerPhone: customerPhone && customerPhone.trim() !== '' ? customerPhone.trim() : null,
      staffId,
      staffName: finalStaffName,
      title: title.trim(),
      description: description && description.trim() !== '' ? description.trim() : null,
      appointmentDate: new Date(appointmentDate),
      startTime,
      endTime,
      duration,
      status: 'pending',
      type: type || 'consultation',
      location: location && location.trim() !== '' ? location.trim() : null,
      meetingLink: meetingLink && meetingLink.trim() !== '' ? meetingLink.trim() : null,
      notes: notes && notes.trim() !== '' ? notes.trim() : null
    };

    // Create appointment
    const appointment = await getSharedPrismaClient().appointment.create({
      data: appointmentData,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Format response
    const formattedAppointment = {
      id: appointment.id,
      customerId: appointment.customerId || '',
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      staffId: appointment.staffId,
      staffName: appointment.staffName,
      title: appointment.title,
      description: appointment.description,
      appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration,
      status: appointment.status,
      type: appointment.type,
      location: appointment.location,
      meetingLink: appointment.meetingLink,
      notes: appointment.notes,
      createdAt: appointment.createdAt.toISOString()
    };

    res.json({
      success: true,
      data: formattedAppointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في حجز الموعد'
    });
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'غير مصرح بالوصول'
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'الحالة مطلوبة'
      });
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'حالة غير صالحة'
      });
    }

    // Verify appointment belongs to company
    const existingAppointment = await getSharedPrismaClient().appointment.findFirst({
      where: {
        id,
        companyId
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'الموعد غير موجود'
      });
    }

    // Update appointment
    const appointment = await getSharedPrismaClient().appointment.update({
      where: { id },
      data: {
        status,
        notes: notes !== undefined ? notes : existingAppointment.notes
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // Format response
    const formattedAppointment = {
      id: appointment.id,
      customerId: appointment.customerId || '',
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail,
      customerPhone: appointment.customerPhone,
      staffId: appointment.staffId,
      staffName: appointment.staffName,
      title: appointment.title,
      description: appointment.description,
      appointmentDate: appointment.appointmentDate.toISOString().split('T')[0],
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration,
      status: appointment.status,
      type: appointment.type,
      location: appointment.location,
      meetingLink: appointment.meetingLink,
      notes: appointment.notes,
      createdAt: appointment.createdAt.toISOString()
    };

    res.json({
      success: true,
      data: formattedAppointment
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث حالة الموعد'
    });
  }
};

module.exports = {
  getAllAppointments,
  getAvailableSlots,
  createAppointment,
  updateAppointmentStatus
};

