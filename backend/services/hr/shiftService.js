/**
 * 🕐 Shift Service
 * خدمة إدارة المناوبات
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

class ShiftService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  /**
   * التحقق من صحة الوقت
   */
  isValidTime(time) {
    if (!time) return false;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * حساب ساعات العمل
   */
  calculateWorkHours(startTime, endTime, breakDuration) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let startTotal = startHour * 60 + startMin;
    let endTotal = endHour * 60 + endMin;
    
    if (endTotal < startTotal) endTotal += 24 * 60;
    
    const totalMinutes = endTotal - startTotal - breakDuration;
    return totalMinutes / 60;
  }

  /**
   * التحقق من صحة بيانات المناوبة
   */
  validateShiftData(data) {
    const errors = [];

    if (!data.name || !data.name.trim()) {
      errors.push('اسم المناوبة مطلوب');
    }

    if (!this.isValidTime(data.startTime)) {
      errors.push('وقت البدء غير صحيح');
    }

    if (!this.isValidTime(data.endTime)) {
      errors.push('وقت الانتهاء غير صحيح');
    }

    const breakDuration = data.breakDuration || 0;
    if (breakDuration < 0 || breakDuration > 480) {
      errors.push('مدة الراحة يجب أن تكون بين 0 و 480 دقيقة');
    }

    if (this.isValidTime(data.startTime) && this.isValidTime(data.endTime)) {
      const hours = this.calculateWorkHours(data.startTime, data.endTime, breakDuration);
      if (hours <= 0) {
        errors.push('ساعات العمل يجب أن تكون أكبر من صفر');
      }
      if (hours > 24) {
        errors.push('ساعات العمل لا يمكن أن تتجاوز 24 ساعة');
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors.join(', '));
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * إنشاء مناوبة جديدة
   */
  async createShift(companyId, data) {
    try {
      // Validation
      this.validateShiftData(data);

      const shift = await this.prisma.shift.create({
        data: {
          companyId,
          name: data.name.trim(),
          startTime: data.startTime,
          endTime: data.endTime,
          breakDuration: data.breakDuration || 60,
          color: data.color || '#3B82F6',
          isActive: data.isActive !== undefined ? data.isActive : true
        }
      });

      return shift;
    } catch (error) {
      console.error('❌ Error creating shift:', error);
      throw error;
    }
  }

  /**
   * جلب جميع المناوبات
   */
  async getShifts(companyId, options = {}) {
    try {
      const { includeInactive } = options;

      const where = { companyId };
      if (!includeInactive) {
        where.isActive = true;
      }

      const shifts = await this.prisma.shift.findMany({
        where,
        include: {
          _count: {
            select: {
              assignments: true
            }
          }
        },
        orderBy: { startTime: 'asc' }
      });

      return shifts;
    } catch (error) {
      console.error('❌ Error getting shifts:', error);
      throw error;
    }
  }

  /**
   * جلب مناوبة بالـ ID
   */
  async getShiftById(companyId, shiftId) {
    try {
      const shift = await this.prisma.shift.findFirst({
        where: { id: shiftId, companyId },
        include: {
          assignments: {
            take: 10,
            orderBy: { date: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true
                }
              }
            }
          }
        }
      });

      if (!shift) {
        throw new Error('المناوبة غير موجودة');
      }

      return shift;
    } catch (error) {
      console.error('❌ Error getting shift:', error);
      throw error;
    }
  }

  /**
   * تحديث مناوبة
   */
  async updateShift(companyId, shiftId, data) {
    try {
      const existing = await this.prisma.shift.findFirst({
        where: { id: shiftId, companyId }
      });

      if (!existing) {
        const error = new Error('المناوبة غير موجودة');
        error.statusCode = 404;
        throw error;
      }

      // التحقق من تعطيل مناوبة فيها تعيينات مستقبلية
      if (data.isActive === false && existing.isActive === true) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const futureAssignments = await this.prisma.shiftAssignment.count({
          where: {
            shiftId,
            companyId,
            date: { gte: today }
          }
        });

        if (futureAssignments > 0) {
          const error = new Error(
            `تحذير: المناوبة تحتوي على ${futureAssignments} تعيين مستقبلي. تعطيل المناوبة لن يلغي التعيينات الموجودة.`
          );
          error.statusCode = 409;
          error.warningOnly = true; // Flag to indicate this is a warning
          throw error;
        }
      }

      // Validate only if relevant fields are being updated
      if (data.name || data.startTime || data.endTime || data.breakDuration !== undefined) {
        const dataToValidate = {
          name: data.name || existing.name,
          startTime: data.startTime || existing.startTime,
          endTime: data.endTime || existing.endTime,
          breakDuration: data.breakDuration !== undefined ? data.breakDuration : existing.breakDuration
        };
        this.validateShiftData(dataToValidate);
      }

      // Trim name if provided
      if (data.name) {
        data.name = data.name.trim();
      }

      const shift = await this.prisma.shift.update({
        where: { id: shiftId },
        data
      });

      return shift;
    } catch (error) {
      console.error('❌ Error updating shift:', error);
      throw error;
    }
  }

  /**
   * حذف مناوبة
   */
  async deleteShift(companyId, shiftId) {
    try {
      const existing = await this.prisma.shift.findFirst({
        where: { id: shiftId, companyId }
      });

      if (!existing) {
        throw new Error('المناوبة غير موجودة');
      }

      // التحقق من وجود تعيينات مستقبلية
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureAssignments = await this.prisma.shiftAssignment.count({
        where: {
          shiftId,
          companyId,
          date: { gte: today }
        }
      });

      if (futureAssignments > 0) {
        const error = new Error(
          `لا يمكن حذف المناوبة لأنها تحتوي على ${futureAssignments} تعيين مستقبلي. يرجى حذف التعيينات أولاً.`
        );
        error.statusCode = 409;
        throw error;
      }

      await this.prisma.shift.delete({
        where: { id: shiftId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting shift:', error);
      throw error;
    }
  }

  /**
   * التحقق من تعارض المناوبات
   */
  async checkShiftConflict(companyId, userId, shiftId, date) {
    // Get the shift we want to assign
    const newShift = await this.prisma.shift.findFirst({
      where: { id: shiftId, companyId }
    });

    if (!newShift) return null;

    // Get all assignments for this user on this date
    const existingAssignments = await this.prisma.shiftAssignment.findMany({
      where: {
        userId,
        companyId,
        date: new Date(date)
      },
      include: {
        shift: true
      }
    });

    // Check for time conflicts
    for (const assignment of existingAssignments) {
      const existingShift = assignment.shift;
      
      // Parse times (format: "HH:MM")
      const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes; // Convert to minutes
      };

      const newStart = parseTime(newShift.startTime);
      const newEnd = parseTime(newShift.endTime);
      const existingStart = parseTime(existingShift.startTime);
      const existingEnd = parseTime(existingShift.endTime);

      // Handle overnight shifts
      const newEndAdjusted = newEnd < newStart ? newEnd + 1440 : newEnd;
      const existingEndAdjusted = existingEnd < existingStart ? existingEnd + 1440 : existingEnd;

      // Check for overlap
      const hasConflict = (
        (newStart >= existingStart && newStart < existingEndAdjusted) ||
        (newEndAdjusted > existingStart && newEndAdjusted <= existingEndAdjusted) ||
        (newStart <= existingStart && newEndAdjusted >= existingEndAdjusted)
      );

      if (hasConflict) {
        return {
          conflict: true,
          existingShift: existingShift.name,
          existingTime: `${existingShift.startTime} - ${existingShift.endTime}`,
          newTime: `${newShift.startTime} - ${newShift.endTime}`
        };
      }
    }

    return null;
  }

  /**
   * تعيين موظف لمناوبة
   */
  async assignShift(companyId, userId, shiftId, date) {
    try {
      // التحقق من وجود الموظف والمناوبة
      const [user, shift] = await Promise.all([
        this.prisma.user.findFirst({ where: { id: userId, companyId } }),
        this.prisma.shift.findFirst({ where: { id: shiftId, companyId } })
      ]);

      if (!user) throw new Error('الموظف غير موجود');
      if (!shift) throw new Error('المناوبة غير موجودة');

      // التحقق من أن المناوبة نشطة
      if (!shift.isActive) {
        const error = new Error('لا يمكن التعيين في مناوبة معطلة');
        error.statusCode = 400;
        throw error;
      }

      // التحقق من صحة التاريخ
      const assignmentDate = new Date(date);
      assignmentDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // منع التعيين لتاريخ ماضي
      if (assignmentDate < today) {
        const error = new Error('لا يمكن التعيين لتاريخ ماضي');
        error.statusCode = 400;
        throw error;
      }

      // حد أقصى للتعيينات المستقبلية (سنة واحدة)
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 365);
      maxDate.setHours(0, 0, 0, 0);

      if (assignmentDate > maxDate) {
        const error = new Error('لا يمكن التعيين لأكثر من سنة مقدماً');
        error.statusCode = 400;
        throw error;
      }

      // التحقق من تعارض الأوقات
      const conflict = await this.checkShiftConflict(companyId, userId, shiftId, date);
      if (conflict) {
        const error = new Error(
          `الموظف ${user.firstName} ${user.lastName} معيّن بالفعل في "${conflict.existingShift}" (${conflict.existingTime}) والتي تتعارض مع المناوبة الجديدة (${conflict.newTime})`
        );
        error.statusCode = 409; // Conflict
        throw error;
      }

      const assignment = await this.prisma.shiftAssignment.create({
        data: {
          companyId,
          userId,
          shiftId,
          date: new Date(date)
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true
            }
          },
          shift: true
        }
      });

      return assignment;
    } catch (error) {
      console.error('❌ Error assigning shift:', error);
      throw error;
    }
  }

  /**
   * جلب تعيينات موظف
   */
  async getEmployeeAssignments(companyId, userId, options = {}) {
    try {
      const { startDate, endDate } = options;

      const where = {
        companyId,
        userId
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const assignments = await this.prisma.shiftAssignment.findMany({
        where,
        include: {
          shift: true
        },
        orderBy: { date: 'desc' }
      });

      return assignments;
    } catch (error) {
      console.error('❌ Error getting assignments:', error);
      throw error;
    }
  }

  /**
   * حذف تعيين مناوبة
   */
  async removeAssignment(companyId, assignmentId) {
    try {
      // Try to find with companyId first
      let existing = await this.prisma.shiftAssignment.findFirst({
        where: { id: assignmentId, companyId }
      });

      // If not found, try without companyId (for old/corrupted records)
      if (!existing) {
        existing = await this.prisma.shiftAssignment.findUnique({
          where: { id: assignmentId }
        });
      }

      if (!existing) {
        throw new Error('التعيين غير موجود');
      }

      // Verify it belongs to this company before deleting
      if (existing.companyId !== companyId) {
        throw new Error('غير مصرح لك بحذف هذا التعيين');
      }

      await this.prisma.shiftAssignment.delete({
        where: { id: assignmentId }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error removing assignment:', error);
      throw error;
    }
  }

  /**
   * تعيين جماعي - عدة موظفين في عدة تواريخ
   */
  async bulkAssignShift(companyId, shiftId, employeeIds, dates) {
    const results = {
      success: [],
      failed: [],
      total: 0
    };

    try {
      // Verify shift exists and is active
      const shift = await this.prisma.shift.findFirst({
        where: { id: shiftId, companyId }
      });

      if (!shift) {
        throw new Error('المناوبة غير موجودة');
      }

      if (!shift.isActive) {
        throw new Error('لا يمكن التعيين في مناوبة معطلة');
      }

      // Process each employee-date combination
      for (const employeeId of employeeIds) {
        const user = await this.prisma.user.findFirst({
          where: { id: employeeId, companyId }
        });

        if (!user) {
          results.failed.push({
            employeeId,
            error: 'الموظف غير موجود'
          });
          continue;
        }

        for (const date of dates) {
          results.total++;

          try {
            // Check for conflicts
            const conflict = await this.checkShiftConflict(companyId, employeeId, shiftId, date);
            if (conflict) {
              results.failed.push({
                employeeId,
                employeeName: `${user.firstName} ${user.lastName}`,
                date,
                error: `تعارض مع "${conflict.existingShift}"`
              });
              continue;
            }

            // Create assignment
            await this.prisma.shiftAssignment.create({
              data: {
                companyId,
                userId: employeeId,
                shiftId,
                date: new Date(date)
              }
            });

            results.success.push({
              employeeId,
              employeeName: `${user.firstName} ${user.lastName}`,
              date
            });
          } catch (error) {
            results.failed.push({
              employeeId,
              employeeName: `${user.firstName} ${user.lastName}`,
              date,
              error: error.message
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Error in bulk assignment:', error);
      throw error;
    }
  }

  /**
   * جلب إحصائيات المناوبات
   */
  async getShiftStats(companyId, options = {}) {
    try {
      const { startDate, endDate } = options;

      const where = { companyId };
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const [totalShifts, activeShifts, totalAssignments, byShift] = await Promise.all([
        this.prisma.shift.count({ where: { companyId } }),
        this.prisma.shift.count({ where: { companyId, isActive: true } }),
        this.prisma.shiftAssignment.count({ where }),
        this.prisma.shiftAssignment.groupBy({
          by: ['shiftId'],
          where,
          _count: true
        })
      ]);

      return {
        totalShifts,
        activeShifts,
        totalAssignments,
        byShift
      };
    } catch (error) {
      console.error('❌ Error getting shift stats:', error);
      throw error;
    }
  }
}

module.exports = new ShiftService();

















































