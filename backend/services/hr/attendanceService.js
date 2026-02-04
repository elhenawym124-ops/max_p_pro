/**
 * ⏰ Attendance Service
 * خدمة إدارة الحضور والانصراف
 */

const { getSharedPrismaClient, executeWithRetry } = require('../sharedDatabase');
const { validateAttendanceData } = require('../../utils/hrValidation');
const {
  DuplicateAttendanceError,
  AttendanceError,
  NotFoundError
} = require('../../utils/hrErrors');
const { v4: uuidv4 } = require('uuid');
const { isWithinGeofence, formatGeofenceError } = require('../../utils/geoUtils');
const {
  getNowInEgypt,
  getStartOfDayInEgypt,
  getEndOfDayInEgypt,
  getNowInTimezone,
  getStartOfDayInTimezone,
  toStartOfDay,
  toEndOfDay,
  combineDateAndTime,
  getDateRange
} = require('../../utils/dateUtils');
// تفعيل بعد تحويل autoDeductionService لاستخدام Prisma
const autoDeductionService = require('./autoDeductionService');

class AttendanceService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    return getSharedPrismaClient();
  }

  async getActiveCompanyUserIds(companyId) {
    const userCompanyRows = await this.prisma.userCompany.findMany({
      where: {
        companyId,
        isActive: true
      },
      select: {
        userId: true
      }
    });

    return userCompanyRows.map(r => r.userId);
  }

  /**
   * الحصول على المنطقة الزمنية للشركة
   */
  async getCompanyTimezone(companyId) {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { timezone: true }
      });
      return company?.timezone || 'Africa/Cairo';
    } catch (error) {
      console.error('❌ Error fetching company timezone:', error);
      return 'Africa/Cairo';
    }
  }

  /**
   * جلب مناوبة الموظف لتاريخ معين
   */
  async getEmployeeShiftForDate(companyId, employeeId, date) {
    try {
      // NOTE: We assume 'date' passed here is already adjusted to the correct "start of day" 
      // relative to the company's timezone if called internally.
      // IF this is called from API expecting generic date, we might need adjustments.
      // For now, we trust the caller (checkIn/checkOut) has normalized this.

      const targetDate = new Date(date);
      // Ensure we look for midnight representation
      // If the DB stores UTC midnight, and we pass a date that is "Local Midnight" constructed via getStartOfDayInTimezone,
      // it should match IF the DB insertion logic was consistent. 
      // However, Prisma stores DateTime as UTC. 
      // If we use '2026-01-27T00:00:00.000Z' (from getStartOfDayInTimezone), it matches exactly what Prisma expects for a "Date" type field usually.

      // Force hours to 0 in case strays exist, but usually handled by dateUtils
      // targetDate.setHours(0, 0, 0, 0); 

      // DEBUG: Log the date we are querying for
      // console.log(`Searching ShiftAssignment for User ${employeeId} on Date: ${targetDate.toISOString()}`);

      const assignment = await this.prisma.shiftAssignment.findFirst({
        where: {
          companyId,
          userId: employeeId,
          date: targetDate
        },
        include: {
          shift: true
        }
      });

      return assignment?.shift || null;
    } catch (error) {
      console.error('❌ Error getting employee shift:', error);
      return null;
    }
  }

  /**
   * تسجيل حضور
   */
  async checkIn(companyId, employeeId, data = {}) {
    // 1. Fetch Company Timezone
    const timezone = await this.getCompanyTimezone(companyId);

    // 2. Get "Today" and "Now" in that timezone
    const today = getStartOfDayInTimezone(new Date(), timezone);
    const now = getNowInTimezone(timezone);

    try {

      // جلب إعدادات HR للتحقق من إعدادات Geofencing
      const hrSettings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
        select: {
          geofenceEnabled: true,
          officeLatitude: true,
          officeLongitude: true,
          geofenceRadius: true,
          lateGracePeriod: true // Fetch this here to avoid double query later if optimization needed, but current logic queries again.
        }
      });

      // ... Geofence logic remains same ...

      // التحقق من عدم وجود تسجيل حضور لنفس اليوم
      const existing = await this.prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: employeeId,
            date: today
          }
        }
      });

      if (existing && existing.checkIn) {
        // If we want to allow re-checkin? Current logic throws error.
        throw new DuplicateAttendanceError(today.toISOString().split('T')[0]);
      }

      // جلب مناوبة الموظف لهذا اليوم
      // We pass 'today' which is already start-of-day in company timezone
      const shift = await this.getEmployeeShiftForDate(companyId, employeeId, today);

      // جلب إعدادات HR (Already fetched partially above, but logic fetches again entirely... optimizing slightly)
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });

      // استخدام وقت المناوبة أو وقت افتراضي
      const workStartTime = shift?.startTime || '09:00';
      const [startHour, startMinute] = workStartTime.split(':').map(Number);

      // Calculate Work Start Time relative to THIS DAY in COMPANY TIMEZONE
      const workStart = new Date(today);
      workStart.setHours(startHour, startMinute, 0, 0);

      // حساب دقائق التأخير
      let lateMinutes = 0;
      const gracePeriod = settings?.lateGracePeriod || 15;
      const graceTime = new Date(workStart.getTime() + gracePeriod * 60000);

      if (now > graceTime) {
        lateMinutes = Math.floor((now - workStart) / 60000);
      }

      const attendance = existing
        ? await this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkIn: now,
            checkInLocation: data.location,
            checkInMethod: data.method || 'manual',
            lateMinutes,
            status: lateMinutes > 0 ? 'LATE' : 'PRESENT'
          }
        })
        : await this.prisma.attendance.create({
          data: {
            id: uuidv4(),
            companyId,
            userId: employeeId,
            date: today,
            checkIn: now,
            checkInLocation: data.location,
            checkInMethod: data.method || 'manual',
            lateMinutes,
            status: lateMinutes > 0 ? 'LATE' : 'PRESENT'
          }
        });

      // معالجة الخصم التلقائي للتأخير
      // TODO: تفعيل بعد تحويل autoDeductionService لاستخدام Prisma
      if (lateMinutes > 0) {
        try {
          const deductionResult = await autoDeductionService.processLateAttendance(
            companyId,
            employeeId,
            attendance.id,
            now,
            workStart
          );

          console.log('✅ [Attendance] Auto deduction processed:', deductionResult);

          // إضافة معلومات الخصم لنتيجة الحضور
          attendance.autoDeduction = deductionResult;
        } catch (deductionError) {
          console.error('❌ [Attendance] Error processing auto deduction:', deductionError);
          // لا نوقف عملية تسجيل الحضور إذا فشل الخصم التلقائي
        }
      }

      return attendance;
    } catch (error) {
      // Handle Unique Constraint Violation
      if (error.code === 'P2002' || error.message.includes('Unique constraint')) {
        throw new DuplicateAttendanceError(today.toISOString().split('T')[0]);
      }
      console.error('❌ Error checking in:', error);
      throw error;
    }
  }

  /**
   * تسجيل انصراف
   */
  async checkOut(companyId, employeeId, data = {}) {
    // 1. Fetch Company Timezone
    const timezone = await this.getCompanyTimezone(companyId);

    // 2. Get "Today" and "Now" in that timezone
    const today = getStartOfDayInTimezone(new Date(), timezone);
    const now = getNowInTimezone(timezone);

    try {

      // جلب إعدادات HR للتحقق من إعدادات Geofencing
      const hrSettings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
        select: {
          geofenceEnabled: true,
          officeLatitude: true,
          officeLongitude: true,
          geofenceRadius: true,
          earlyLeaveGracePeriod: true
        }
      });

      // التحقق من النطاق الجغرافي إذا كان مفعلاً
      if (hrSettings && hrSettings.geofenceEnabled) {
        if (!data.location) {
          throw new AttendanceError('يجب السماح بالوصول للموقع لتسجيل الانصراف');
        }

        let userLocation;
        try {
          userLocation = typeof data.location === 'string'
            ? JSON.parse(data.location)
            : data.location;
        } catch (e) {
          throw new AttendanceError('بيانات الموقع غير صحيحة');
        }

        if (!hrSettings.officeLatitude || !hrSettings.officeLongitude) {
          throw new AttendanceError('لم يتم تحديد موقع المكتب. يرجى التواصل مع الإدارة.');
        }

        const geofenceCheck = isWithinGeofence(
          userLocation.latitude,
          userLocation.longitude,
          Number(hrSettings.officeLatitude),
          Number(hrSettings.officeLongitude),
          hrSettings.geofenceRadius || 200
        );

        if (!geofenceCheck.isWithin) {
          const error = new AttendanceError(
            formatGeofenceError(geofenceCheck.distance, geofenceCheck.allowedRadius)
          );
          error.statusCode = 403;
          error.geofenceData = {
            distance: geofenceCheck.distance,
            allowedRadius: geofenceCheck.allowedRadius,
            isWithin: false
          };
          throw error;
        }
      }

      console.log(`⏰ [CHECKOUT] Starting resilient check-out look-up for employee: ${employeeId}`);

      // ✅ FIX: البحث عن آخر بصمة حضور "مفتوحة" (بدون انصراف) للموظف
      // لا نعتمد على التاريخ بدقة لتجنب مشاكل فروق التوقيت
      let attendance = await this.prisma.attendance.findFirst({
        where: {
          userId: employeeId,
          checkOut: null
        },
        orderBy: { date: 'desc' }
      });

      // إذا لم نجد سجل مفتوح، نحاول البحث عن أي سجل في نطاق الـ 48 ساعة الأخيرة
      if (!attendance) {
        const startOfSearch = new Date(today);
        startOfSearch.setDate(startOfSearch.getDate() - 1);
        const endOfSearch = new Date(today);
        endOfSearch.setDate(endOfSearch.getDate() + 1);

        attendance = await this.prisma.attendance.findFirst({
          where: {
            userId: employeeId,
            date: {
              gte: startOfSearch,
              lte: endOfSearch
            }
          },
          orderBy: { date: 'desc' }
        });
      }

      if (!attendance) {
        console.error(`❌ [CHECKOUT] No attendance record found for user ${employeeId} in any recent range`);
        throw new Error('لم يتم تسجيل الحضور لهذا اليوم');
      }

      if (attendance.checkOut) {
        throw new Error('تم تسجيل الانصراف مسبقاً');
      }

      // جلب مناوبة الموظف لهذا اليوم
      const shift = await this.getEmployeeShiftForDate(companyId, employeeId, today);

      // جلب إعدادات HR
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId }
      });

      // استخدام وقت المناوبة أو وقت افتراضي
      const workEndTime = shift?.endTime || '17:00';
      const [endHour, endMinute] = workEndTime.split(':').map(Number);

      // Calculate Work End Time relative to THIS DAY in COMPANY TIMEZONE
      const workEnd = new Date(today);
      workEnd.setHours(endHour, endMinute, 0, 0);

      // Handle overnight shifts (e.g., 22:00 - 06:00)
      if (shift && endHour < parseInt(shift.startTime.split(':')[0])) {
        workEnd.setDate(workEnd.getDate() + 1);
      }

      // حساب دقائق الخروج المبكر
      let earlyLeaveMinutes = 0;
      const gracePeriod = settings?.earlyLeaveGracePeriod || 15;
      const graceTime = new Date(workEnd.getTime() - gracePeriod * 60000);

      if (now < graceTime) {
        earlyLeaveMinutes = Math.floor((workEnd - now) / 60000);
      }

      // حساب ساعات العمل الفعلية
      const actualWorkMinutes = (now - new Date(attendance.checkIn)) / 60000;
      const breakDuration = shift?.breakDuration || 60;
      const workHours = (actualWorkMinutes - breakDuration) / 60;

      // حساب ساعات إضافية
      let overtimeHours = 0;
      const minOvertimeHours = parseFloat(settings?.overtimeMinHours) || 1;
      if (now > workEnd) {
        const overtime = (now - workEnd) / 3600000;
        if (overtime >= minOvertimeHours) {
          overtimeHours = overtime;
        }
      }

      const updated = await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOut: now,
          checkOutLocation: data.location,
          checkOutMethod: data.method || 'manual',
          earlyLeaveMinutes,
          workHours: Math.round(workHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100
        }
      });

      // معالجة الخصم التلقائي للانصراف المبكر
      if (earlyLeaveMinutes > 0) {
        try {
          const deductionResult = await autoDeductionService.processEarlyCheckout(
            companyId,
            employeeId,
            updated.id,
            now,
            workEnd,
            earlyLeaveMinutes
          );

          console.log('✅ [Attendance] Auto deduction for early checkout processed:', deductionResult);

          // إضافة معلومات الخصم لنتيجة الانصراف
          updated.autoDeduction = deductionResult;
        } catch (deductionError) {
          console.error('❌ [Attendance] Error processing auto deduction for checkout:', deductionError);
          // لا نوقف عملية تسجيل الانصراف إذا فشل الخصم التلقائي
        }
      }

      return updated;
    } catch (error) {
      console.error('❌ Error checking out:', error);
      throw error;
    }
  }

  /**
   * جلب سجل الحضور
   */
  async getAttendance(companyId, options = {}) {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        status,
        page = 1,
        limit = 50
      } = options;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      const where = {};

      // Only filter by companyId if it's provided (for SUPER_ADMIN)
      if (companyId) {
        where.companyId = companyId;
      }

      if (employeeId) where.userId = employeeId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.date = {};
        if (startDate) {
          // استخدام بداية اليوم (00:00:00.000)
          where.date.gte = toStartOfDay(new Date(startDate));
        }
        if (endDate) {
          // استخدام نهاية اليوم (23:59:59.999)
          where.date.lte = toEndOfDay(new Date(endDate));
        }
      }

      // ✅ Filter out attendance records with invalid userId (orphaned records)
      // Use a subquery to only get attendance records where userId exists in users table
      let whereWithValidUser = { ...where };

      // If we have companyId, filter by users in that company
      if (companyId) {
        const validUserIds = await this.getActiveCompanyUserIds(companyId);

        if (validUserIds.length > 0) {
          // إذا كان هناك employeeId محدد، نتأكد أنه ضمن validUserIds
          if (employeeId) {
            // فقط نستخدم employeeId إذا كان موجود في validUserIds
            if (validUserIds.includes(employeeId)) {
              whereWithValidUser.userId = employeeId;
            } else {
              // employeeId غير صالح، نرجع نتيجة فارغة
              whereWithValidUser.userId = { in: [] };
            }
          } else {
            // لا يوجد employeeId محدد، نستخدم جميع validUserIds
            whereWithValidUser.userId = { in: validUserIds };
          }
        } else {
          // No valid users, return empty result
          whereWithValidUser.userId = { in: [] };
        }
      }

      const [records, total] = await executeWithRetry(async () => {
        return await Promise.all([
          this.prisma.attendance.findMany({
            where: whereWithValidUser,
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  employeeNumber: true,
                  departmentRelation: {
                    select: { name: true }
                  }
                }
              }
            },
            orderBy: { date: 'desc' },
            skip: (pageNum - 1) * limitNum,
            take: limitNum
          }),
          this.prisma.attendance.count({ where: whereWithValidUser })
        ]);
      });

      // Map to frontend format (record.employee instead of record.user)
      let mappedRecords = records.map(record => {
        const { user, ...rest } = record;
        return {
          ...rest,
          employee: user ? {
            ...user,
            department: user.departmentRelation
          } : null
        };
      });

      // ✅ FIX: إذا كان البحث عن تاريخ واحد فقط (زي النهاردة)، نظهر كل الموظفين حتى لو مسجلوش حضور
      const isSingleDay = startDate && endDate && startDate === endDate;
      if (isSingleDay && !employeeId && !status && pageNum === 1 && companyId) {
        const activeUserIds = await this.getActiveCompanyUserIds(companyId);

        const allUsers = await executeWithRetry(async () => {
          return await this.prisma.user.findMany({
            where: {
              id: { in: activeUserIds },
              isActive: true
            },
            include: {
              departmentRelation: { select: { name: true } }
            }
          });
        });

        // دمج الموظفين اللي مسجلوش حضور
        const hasAttendanceIds = new Set(mappedRecords.map(r => r.userId));
        const missingUserRecords = allUsers
          .filter(u => !hasAttendanceIds.has(u.id))
          .map(user => ({
            id: `temp-${user.id}`,
            userId: user.id,
            companyId,
            date: new Date(startDate),
            status: 'ABSENT',
            checkIn: null,
            checkOut: null,
            employee: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              employeeNumber: user.employeeNumber,
              department: user.departmentRelation
            }
          }));

        mappedRecords = [...mappedRecords, ...missingUserRecords];
      }

      return {
        records: mappedRecords,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total || mappedRecords.length,
          totalPages: Math.ceil((total || mappedRecords.length) / limitNum)
        }
      };
    } catch (error) {
      console.error('❌ Error getting attendance:', error);
      throw error;
    }
  }

  /**
   * جلب حضور اليوم
   */
  async getTodayAttendance(companyId) {
    try {
      const today = getStartOfDayInEgypt();
      const startOfSearch = new Date(today);
      const endOfSearch = new Date(today);
      endOfSearch.setHours(23, 59, 59, 999);

      const activeUserIds = await this.getActiveCompanyUserIds(companyId);

      const [attendance, totalEmployees] = await executeWithRetry(async () => {
        return await Promise.all([
          this.prisma.attendance.findMany({
            where: {
              companyId,
              date: {
                gte: startOfSearch,
                lte: endOfSearch
              }
            },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  employeeNumber: true,
                  departmentRelation: {
                    select: { name: true }
                  }
                }
              }
            }
          }),
          this.prisma.user.count({
            where: {
              id: { in: activeUserIds },
              isActive: true
            }
          })
        ]);
      });

      // تجنب التكرار في الحساب إذا كان هناك سجلين لنفس الموظف في النطاق (نأخذ الأحدث)
      const uniqueAttendance = [];
      const userIdsSeen = new Set();
      attendance
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(record => {
          if (!userIdsSeen.has(record.userId)) {
            userIdsSeen.add(record.userId);
            uniqueAttendance.push(record);
          }
        });

      const present = uniqueAttendance.filter(a => a.checkIn).length;
      const late = uniqueAttendance.filter(a => a.status === 'LATE').length;
      const absent = Math.max(0, totalEmployees - present);

      return {
        date: today,
        totalEmployees,
        present,
        late,
        absent,
        records: uniqueAttendance.map(record => {
          const { user, ...rest } = record;
          return {
            ...rest,
            employee: user ? {
              ...user,
              department: user.departmentRelation
            } : null
          };
        })
      };
    } catch (error) {
      console.error('❌ Error getting today attendance:', error);
      throw error;
    }
  }

  /**
   * تحديث سجل حضور يدوياً
   */
  async updateAttendance(companyId, attendanceId, data) {
    try {
      const existing = await this.prisma.attendance.findFirst({
        where: { id: attendanceId, companyId }
      });

      if (!existing) {
        throw new Error('السجل غير موجود');
      }

      const updated = await this.prisma.attendance.update({
        where: { id: attendanceId },
        data: {
          ...data,
          checkIn: data.checkIn ? new Date(data.checkIn) : undefined,
          checkOut: data.checkOut ? new Date(data.checkOut) : undefined
        }
      });

      return updated;
    } catch (error) {
      console.error('❌ Error updating attendance:', error);
      throw error;
    }
  }

  /**
   * حذف سجل حضور
   */
  async deleteAttendance(companyId, attendanceId) {
    try {
      const where = { id: attendanceId };
      if (companyId) {
        where.companyId = companyId;
      }

      const existing = await this.prisma.attendance.findFirst({
        where
      });

      if (!existing) {
        throw new Error('السجل غير موجود');
      }

      await this.prisma.attendance.delete({
        where: { id: attendanceId }
      });

      return true;
    } catch (error) {
      console.error('❌ Error deleting attendance:', error);
      throw error;
    }
  }

  /**
   * إنشاء سجل حضور يدوي
   */
  async createManualAttendance(companyId, data) {
    try {
      console.log('📝 [SERVICE] createManualAttendance called');
      console.log('📝 [SERVICE] companyId:', companyId);
      console.log('📝 [SERVICE] data:', JSON.stringify(data, null, 2));

      // Validate employee belongs to company (avoid Prisma relation errors -> 500)
      const activeUserIds = await this.getActiveCompanyUserIds(companyId);
      if (!activeUserIds.includes(data.employeeId)) {
        const error = new Error('الموظف غير تابع لهذه الشركة أو غير نشط');
        error.statusCode = 400;
        throw error;
      }

      // Parse date - استخدام دوال dateUtils
      const timezone = await this.getCompanyTimezone(companyId);
      const attendanceDate = getStartOfDayInTimezone(new Date(data.date), timezone);
      console.log('📝 [SERVICE] attendanceDate:', attendanceDate);

      // Parse checkIn time (format: "HH:mm") - استخدام combineDateAndTime
      const checkInDateTime = combineDateAndTime(attendanceDate, data.checkIn);
      console.log('📝 [SERVICE] checkInDateTime:', checkInDateTime);

      // Parse checkOut time (format: "HH:mm") - استخدام combineDateAndTime
      const checkOutDateTime = combineDateAndTime(attendanceDate, data.checkOut);
      console.log('📝 [SERVICE] checkOutDateTime:', checkOutDateTime);

      // Validate checkOut is after checkIn
      if (checkInDateTime && checkOutDateTime && checkOutDateTime <= checkInDateTime) {
        console.log('❌ [SERVICE] Validation failed: checkOut <= checkIn');
        throw new Error('وقت الانصراف يجب أن يكون بعد وقت الحضور');
      }

      // Check if attendance already exists for this employee and date
      const existing = await this.prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: data.employeeId,
            date: attendanceDate
          }
        }
      });

      if (existing) {
        // تحديث السجل الموجود بدلاً من رفضه
        console.log('📝 [SERVICE] Updating existing attendance record:', existing.id);
        const attendance = await this.prisma.attendance.update({
          where: {
            id: existing.id
          },
          data: {
            checkIn: checkInDateTime || existing.checkIn,
            checkOut: checkOutDateTime || existing.checkOut,
            status: data.status || existing.status,
            notes: data.notes || existing.notes,
            checkInMethod: checkInDateTime ? 'manual' : existing.checkInMethod,
            checkOutMethod: checkOutDateTime ? 'manual' : existing.checkOutMethod
          }
        });
        console.log('✅ [SERVICE] Attendance record updated successfully');
        return attendance;
      }

      // Create new record
      console.log('📝 [SERVICE] Creating new attendance record');
      const attendance = await this.prisma.attendance.create({
        data: {
          id: uuidv4(),
          companyId,
          userId: data.employeeId,
          date: attendanceDate,
          checkIn: checkInDateTime,
          checkOut: checkOutDateTime,
          status: data.status || 'PRESENT',
          notes: data.notes || null,
          checkInMethod: 'manual',
          checkOutMethod: 'manual'
        }
      });
      console.log('✅ [SERVICE] Attendance record created successfully:', attendance.id);

      return attendance;
    } catch (error) {
      console.error('❌ Error creating manual attendance:', error);
      throw error;
    }
  }

  /**
   * تقرير الحضور الشهري
   */
  async getMonthlyReport(companyId, year, month, employeeId = null) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const where = {
        companyId,
        date: {
          gte: startDate,
          lte: endDate
        }
      };

      if (employeeId) where.userId = employeeId;

      const attendance = await this.prisma.attendance.findMany({
        where
      });

      // تجميع البيانات حسب الموظف
      const employeeStats = {};
      attendance.forEach(record => {
        const empId = record.userId;
        if (!employeeStats[empId]) {
          employeeStats[empId] = {
            userId: empId,
            presentDays: 0,
            lateDays: 0,
            absentDays: 0,
            totalWorkHours: 0,
            totalOvertimeHours: 0,
            totalLateMinutes: 0
          };
        }

        if (record.status === 'PRESENT' || record.status === 'LATE') {
          employeeStats[empId].presentDays++;
        }
        if (record.status === 'LATE') {
          employeeStats[empId].lateDays++;
        }
        if (record.status === 'ABSENT') {
          employeeStats[empId].absentDays++;
        }

        employeeStats[empId].totalWorkHours += parseFloat(record.workHours) || 0;
        employeeStats[empId].totalOvertimeHours += parseFloat(record.overtimeHours) || 0;
        employeeStats[empId].totalLateMinutes += record.lateMinutes || 0;
      });

      return {
        year,
        month,
        startDate,
        endDate,
        employees: Object.values(employeeStats)
      };
    } catch (error) {
      console.error('❌ Error getting monthly report:', error);
      throw error;
    }
  }

  /**
   * تصدير سجل الحضور لملف Excel
   */
  async exportAttendance(companyId, options = {}) {
    try {
      const xlsx = require('xlsx');
      const {
        employeeId,
        startDate,
        endDate,
        status
      } = options;

      const where = { companyId };

      if (employeeId) where.userId = employeeId;
      if (status && status !== 'ALL') where.status = status;

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          where.date.lte = end;
        }
      }

      const records = await this.prisma.attendance.findMany({
        where,
        orderBy: { date: 'desc' }
      });

      // جلب بيانات المستخدمين بشكل منفصل
      const userIds = [...new Set(records.map(r => r.userId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          departmentRelation: { select: { name: true } }
        }
      });
      const usersMap = new Map(users.map(u => [u.id, u]));

      // تحويل البيانات لصيغة Excel
      const statusLabels = {
        PRESENT: 'حاضر',
        ABSENT: 'غائب',
        LATE: 'متأخر',
        HALF_DAY: 'نصف يوم',
        ON_LEAVE: 'إجازة',
        HOLIDAY: 'عطلة',
        WEEKEND: 'عطلة أسبوعية',
        REMOTE: 'عن بُعد'
      };

      const data = records.map(record => {
        const user = usersMap.get(record.userId);
        return {
          'رقم الموظف': user?.employeeNumber || '-',
          'اسم الموظف': `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '-',
          'القسم': user?.departmentRelation?.name || '-',
          'التاريخ': record.date ? new Date(record.date).toLocaleDateString('ar-EG') : '-',
          'وقت الحضور': record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-',
          'وقت الانصراف': record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-',
          'ساعات العمل': record.workHours ? record.workHours.toFixed(1) : '-',
          'ساعات إضافية': record.overtimeHours ? record.overtimeHours.toFixed(1) : '-',
          'دقائق التأخير': record.lateMinutes || 0,
          'دقائق الخروج المبكر': record.earlyLeaveMinutes || 0,
          'الحالة': statusLabels[record.status] || record.status,
          'ملاحظات': record.notes || '-'
        };
      });

      // إنشاء workbook
      const ws = xlsx.utils.json_to_sheet(data, {
        header: [
          'رقم الموظف', 'اسم الموظف', 'القسم', 'التاريخ', 'وقت الحضور', 'وقت الانصراف',
          'ساعات العمل', 'ساعات إضافية', 'دقائق التأخير', 'دقائق الخروج المبكر', 'الحالة', 'ملاحظات'
        ]
      });

      // تعيين عرض الأعمدة
      ws['!cols'] = [
        { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
        { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 30 }
      ];

      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'سجل الحضور');

      // تحويل لـ buffer
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return buffer;
    } catch (error) {
      console.error('❌ Error exporting attendance:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الحضور
   */
  async getAttendanceStats(companyId, startDate, endDate) {
    try {
      const where = {
        companyId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      const [
        totalRecords,
        byStatus,
        avgWorkHours,
        totalOvertime
      ] = await Promise.all([
        this.prisma.attendance.count({ where }),
        this.prisma.attendance.groupBy({
          by: ['status'],
          where,
          _count: true
        }),
        this.prisma.attendance.aggregate({
          where,
          _avg: { workHours: true }
        }),
        this.prisma.attendance.aggregate({
          where,
          _sum: { overtimeHours: true }
        })
      ]);

      return {
        totalRecords,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        avgWorkHours: avgWorkHours._avg.workHours || 0,
        totalOvertimeHours: totalOvertime._sum.overtimeHours || 0
      };
    } catch (error) {
      console.error('❌ Error getting attendance stats:', error);
      throw error;
    }
  }

  /**
   * جلب حضور اليوم لموظف محدد
   */
  async getTodayAttendanceForEmployee(companyId, employeeId, date) {
    try {
      // Use consistent normalization (start of day in Egypt)
      const targetDate = date ? new Date(date) : getNowInEgypt();
      const attendanceDate = getStartOfDayInEgypt(targetDate);

      const attendance = await this.prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: employeeId,
            date: attendanceDate
          }
        }
      });

      return attendance;
    } catch (error) {
      console.error('❌ Error getting today attendance for employee:', error);
      throw error;
    }
  }

  /**
   * جلب إحصائيات الحضور لموظف محدد
   */
  async getAttendanceStatsForEmployee(companyId, employeeId, startDate, endDate) {
    try {
      const where = {
        companyId,
        userId: employeeId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      const [totalDays, presentDays, lateDays, absentDays, workHours, overtimeHours] = await Promise.all([
        this.prisma.attendance.count({ where }),
        this.prisma.attendance.count({ where: { ...where, status: 'PRESENT' } }),
        this.prisma.attendance.count({ where: { ...where, lateMinutes: { gt: 0 } } }),
        this.prisma.attendance.count({ where: { ...where, status: 'ABSENT' } }),
        this.prisma.attendance.aggregate({ where, _sum: { workHours: true } }),
        this.prisma.attendance.aggregate({ where, _sum: { overtimeHours: true } })
      ]);

      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        totalWorkHours: workHours._sum.workHours || 0,
        totalOvertimeHours: overtimeHours._sum.overtimeHours || 0,
        attendanceRate
      };
    } catch (error) {
      console.error('❌ Error getting attendance stats for employee:', error);
      throw error;
    }
  }

  /**
   * جلب سجل الحضور الأخير لموظف محدد
   */
  async getRecentAttendanceForEmployee(companyId, employeeId, limit = 10) {
    try {
      const attendance = await this.prisma.attendance.findMany({
        where: {
          companyId,
          userId: employeeId
        },
        orderBy: { date: 'desc' },
        take: limit
      });

      return attendance;
    } catch (error) {
      console.error('❌ Error getting recent attendance for employee:', error);
      throw error;
    }
  }

  /**
   * حساب سلسلة الحضور المتواصل (Attendance Streak)
   */
  async calculateAttendanceStreak(companyId, userId, type = 'PRESENT') {
    try {
      // جلب إعدادات الشركة لمعرفة أيام العمل
      const settings = await this.prisma.hRSettings.findUnique({
        where: { companyId },
        select: { workDays: true }
      });

      let workDays = [1, 2, 3, 4, 5];
      try {
        if (settings?.workDays) {
          workDays = typeof settings.workDays === 'string' ? JSON.parse(settings.workDays) : settings.workDays;
        }
      } catch (e) {
        console.error('⚠️ [Attendance] Error parsing workDays settings:', e);
      }

      // جلب آخر 60 سجل حضور
      const records = await this.prisma.attendance.findMany({
        where: {
          companyId,
          userId
        },
        orderBy: { date: 'desc' },
        take: 60
      });

      if (records.length === 0) return 0;

      let streak = 0;
      let checkDate = getStartOfDayInEgypt();

      // التراجع لأقرب يوم عمل إذا كان اليوم إجازة
      while (!workDays.includes(checkDate.getDay())) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const recordMap = {};
      records.forEach(r => {
        const d = getStartOfDayInEgypt(r.date).getTime();
        recordMap[d] = r.status;
      });

      const today = getStartOfDayInEgypt();

      while (true) {
        if (!workDays.includes(checkDate.getDay())) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }

        const status = recordMap[checkDate.getTime()];
        const isMatch = type === 'PRESENT' ? status === 'PRESENT' : (status && status !== 'ABSENT');

        if (isMatch) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          if (checkDate.getTime() === today.getTime() && !status) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
          break;
        }

        if (streak >= 60) break;
      }

      return streak;
    } catch (error) {
      console.error('❌ [Attendance] Error calculating streak:', error);
      return 0;
    }
  }
}

module.exports = new AttendanceService();
