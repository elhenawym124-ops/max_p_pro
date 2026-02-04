/**
 * 👤 Employee Service
 * خدمة إدارة الموظفين
 */

const { getSharedPrismaClient, executeWithRetry } = require('../sharedDatabase');
const { validateEmployeeData } = require('../../utils/hrValidation');
const {
  NotFoundError,
  ConflictError,
  EmployeeError
} = require('../../utils/hrErrors');

class EmployeeService {
  constructor() {
    // Don't initialize prisma here - get it dynamically
  }

  get prisma() {
    const client = getSharedPrismaClient();
    if (!client) {
      throw new Error('Prisma client is not initialized. Please ensure database is initialized.');
    }
    return client;
  }

  /**
   * إنشاء موظف جديد
   */
  async createEmployee(companyId, data) {
    // ✅ Log incoming data from frontend for debugging
    console.log('📥 [HR] Received employee data from frontend:', JSON.stringify({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      departmentId: data.departmentId,
      positionId: data.positionId,
      hireDate: data.hireDate,
      contractType: data.contractType,
      baseSalary: data.baseSalary,
      employeeNumber: data.employeeNumber,
      // Extra fields (not in User model - will be ignored)
      mobile: data.mobile,
      password: data.password ? '***' : undefined,
      role: data.role,
      nationalId: data.nationalId,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      address: data.address,
      city: data.city,
      country: data.country
    }, null, 2));

    // التحقق من صحة البيانات
    validateEmployeeData(data);

    // ✅ Check if email exists in User table and link if found, or create User if email provided
    let linkedUserId = data.userId || null;
    if (data.email && !linkedUserId) {
      const emailLower = data.email.toLowerCase();

      // Normalize the email in data to lowercase for storage
      data.email = emailLower;

      // Check if User exists with this email
      const existingUser = await this.prisma.user.findFirst({
        where: { email: emailLower }
      });

      if (existingUser) {
        // ✅ Check if this user is already linked to an employee in *this* company
        if (existingUser.companyId === companyId || existingUser.employeeNumber) {
          // User is already in this company or has an employee number here
          // We should check UserCompany specifically for this company
          const userCompany = await this.prisma.userCompany.findUnique({
            where: {
              userId_companyId: {
                userId: existingUser.id,
                companyId: companyId
              }
            }
          });

          if (userCompany && existingUser.employeeNumber && existingUser.companyId === companyId) {
            throw new ConflictError(`هذا الموظف موجود بالفعل في هذه الشركة`);
          }
        }

        // Link existing User to this company if not already linked
        linkedUserId = existingUser.id;
        console.log(`✅ [HR] Linking existing User (${existingUser.email}) to company ${companyId}`);

        // Ensure UserCompany record exists
        await this.prisma.userCompany.upsert({
          where: {
            userId_companyId: {
              userId: existingUser.id,
              companyId: companyId
            }
          },
          update: { isActive: true },
          create: {
            userId: existingUser.id,
            companyId: companyId,
            role: data.role || 'AGENT',
            isActive: true,
            isDefault: false
          }
        });
      } else {
        // ✅ Create User automatically for new Employee (Completely new user)
        const bcrypt = require('bcryptjs');

        let passwordToUse;
        let isTemporaryPassword = false;

        if (data.password && data.password.trim() !== '') {
          passwordToUse = await bcrypt.hash(data.password, 12);
          console.log('✅ [HR] Using password from frontend for new User');
        } else {
          const tempPassword = Math.random().toString(36).slice(-12);
          passwordToUse = await bcrypt.hash(tempPassword, 12);
          isTemporaryPassword = true;
          console.log('✅ [HR] Generated temporary password for new User');
        }

        try {
          const newUser = await this.prisma.user.create({
            data: {
              email: emailLower,
              password: passwordToUse,
              firstName: data.firstName,
              lastName: data.lastName,
              phone: data.phone || null,
              role: data.role || 'AGENT',
              isActive: true,
              companyId: companyId
            }
          });

          linkedUserId = newUser.id;

          // Create UserCompany record
          await this.prisma.userCompany.create({
            data: {
              userId: newUser.id,
              companyId: companyId,
              role: data.role || 'AGENT',
              isActive: true,
              isDefault: true
            }
          });

          console.log(`✅ [HR] Created User (${newUser.email}) and UserCompany record.`);
        } catch (userError) {
          console.error(`❌ [HR] Failed to create User for Employee:`, userError.message);
          throw new Error(`فشل إنشاء حساب المستخدم للموظف: ${userError.message}`);
        }
      }
    }

    // Note: nationalId is not in User model, so we skip this check


    // التحقق من وجود القسم إذا تم توفيره
    if (data.departmentId && data.departmentId.trim() !== '') {
      const department = await this.prisma.department.findFirst({
        where: { id: data.departmentId, companyId }
      });
      if (!department) {
        console.warn(`⚠️ Department ${data.departmentId} not found, removing from data`);
        delete data.departmentId;
      }
    } else if (data.departmentId === '' || data.departmentId === null) {
      // Remove empty strings or null values
      delete data.departmentId;
    }

    // التحقق من وجود المنصب إذا تم توفيره
    if (data.positionId && data.positionId.trim() !== '') {
      const position = await this.prisma.position.findFirst({
        where: { id: data.positionId, companyId }
      });
      if (!position) {
        console.warn(`⚠️ Position ${data.positionId} not found, removing from data`);
        delete data.positionId;
      }
    } else if (data.positionId === '' || data.positionId === null) {
      // Remove empty strings or null values
      delete data.positionId;
    }

    // Note: managerId is not directly in User model, so we skip this check

    // توليد رقم موظف تلقائي إذا لم يتم توفيره
    if (!data.employeeNumber) {
      // Find the last employee number to ensure uniqueness
      const lastEmployee = await this.prisma.user.findFirst({
        where: {
          companyId,
          employeeNumber: { not: null }
        },
        orderBy: { employeeNumber: 'desc' },
        select: { employeeNumber: true }
      });

      let nextNumber = 1;
      if (lastEmployee?.employeeNumber) {
        const match = lastEmployee.employeeNumber.match(/EMP(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      data.employeeNumber = `EMP${String(nextNumber).padStart(5, '0')}`;
    }

    // Update or create User with employee data
    // ✅ Only include fields that exist in User model and handle empty strings
    const userData = {
      employeeNumber: data.employeeNumber,
      departmentId: data.departmentId && data.departmentId !== '' ? data.departmentId : null,
      positionId: data.positionId && data.positionId !== '' ? data.positionId : null,
      hireDate: data.hireDate && data.hireDate !== '' ? new Date(data.hireDate) : null,
      contractType: data.contractType && data.contractType !== '' ? data.contractType : null,
      baseSalary: data.baseSalary && data.baseSalary !== '' ? parseFloat(data.baseSalary) : null,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone && data.phone !== '' ? data.phone : null,
      avatar: data.avatar || null,
      companyId: companyId,
      // Deduction fields
      enableAutoDeduction: data.enableAutoDeduction !== undefined ? data.enableAutoDeduction : true,
      monthlyGraceMinutes: data.monthlyGraceMinutes !== undefined ? parseInt(data.monthlyGraceMinutes) : 60,
      maxDailyLateMinutes: data.maxDailyLateMinutes !== undefined ? parseInt(data.maxDailyLateMinutes) : 10,
      lateDeductionRate: data.lateDeductionRate !== undefined ? parseFloat(data.lateDeductionRate) : null
    };

    // ✅ Log the data that will be saved
    console.log('💾 [HR] Saving employee data to User table:', JSON.stringify({
      ...userData,
      baseSalary: userData.baseSalary ? userData.baseSalary.toString() : null,
      hireDate: userData.hireDate ? userData.hireDate.toISOString() : null
    }, null, 2));

    let employee;
    if (linkedUserId) {
      // Update existing user
      employee = await this.prisma.user.update({
        where: { id: linkedUserId },
        data: userData,
        include: {
          departmentRelation: true,
          positionRelation: true
        }
      });
    } else {
      // This shouldn't happen as we create user above, but just in case
      throw new Error('User must be created before employee data can be added');
    }

    console.log('✅ [HR] Employee created:', employee.employeeNumber);
    return employee;
  }

  /**
   * جلب موظف بـ userId
   */
  async getEmployeeByUserId(companyId, userId) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          companyId
        },
        include: {
          departmentRelation: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          positionRelation: {
            select: {
              id: true,
              title: true,
              level: true
            }
          }
        }
      });

      return user;
    } catch (error) {
      console.error('❌ Error getting employee by userId:', error);
      throw new EmployeeError('حدث خطأ أثناء جلب بيانات الموظف');
    }
  }

  /**
   * جلب جميع الموظفين من جدول Employee مباشرة
   */
  async getEmployees(companyId, options = {}) {
    try {
      const {
        page: pageStr = 1,
        limit: limitStr = 20,
        search,
        departmentId,
        positionId,
        status,
        contractType,
        userStatus, // ✅ Add User Status filter
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // تحويل page و limit إلى أرقام
      const page = parseInt(pageStr, 10) || 1;
      const limit = parseInt(limitStr, 10) || 20;

      // عزل البيانات: يجب أن يكون companyId موجود دائماً
      if (!companyId) {
        throw new Error('companyId مطلوب لجلب الموظفين');
      }

      // بناء الفلاتر للموظفين من جدول User
      // جلب جميع المستخدمين في الشركة (الموظفين هم Users في نفس الشركة)
      const userWhere = {
        userCompanies: {
          some: {
            companyId,
            isActive: true
          }
        }
      };

      // فلتر البحث
      if (search) {
        userWhere.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeNumber: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } }
        ];
      }

      // فلاتر إضافية
      if (departmentId && departmentId !== 'all') userWhere.departmentId = departmentId;
      if (positionId && positionId !== 'all') userWhere.positionId = positionId;
      if (contractType && contractType !== 'all') userWhere.contractType = contractType;

      // ✅ Handle status filter (ACTIVE / INACTIVE)
      if (status && status !== 'all') {
        if (status === 'ACTIVE') {
          userWhere.isActive = true;
        } else if (status === 'INACTIVE') {
          userWhere.isActive = false;
        }
      }

      if (userStatus && userStatus !== 'all') {
        if (userStatus === 'ACTIVE_USER') {
          userWhere.isActive = true;
        } else if (userStatus === 'INACTIVE_USER') {
          userWhere.isActive = false;
        }
      }

      console.log('🔍 [HR] Fetching employees from User table with where:', JSON.stringify(userWhere, null, 2));

      // ✅ ADDED: Debug check - are there users in this company that are NOT employees?
      const potentialUsersCount = await this.prisma.user.count({
        where: {
          companyId,
          employeeNumber: null
        }
      });
      if (potentialUsersCount > 0) {
        console.warn(`⚠️ [HR] Found ${potentialUsersCount} users in company ${companyId} who do NOT have an employeeNumber. They will be hidden from the HR list.`);
      }

      // جلب الموظفين من جدول User مباشرة
      const [users, total] = await executeWithRetry(async () => {
        return await Promise.all([
          this.prisma.user.findMany({
            where: userWhere,
            include: {
              departmentRelation: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                  code: true
                }
              },
              positionRelation: {
                select: {
                  id: true,
                  title: true,
                  level: true
                }
              },
              // Include UserCompany for company-specific role
              userCompanies: {
                where: { companyId: companyId },
                select: {
                  role: true,
                  isActive: true
                },
                take: 1
              }
            },
            orderBy: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit
          }),
          this.prisma.user.count({ where: userWhere })
        ]);
      });

      console.log('✅ [HR] Found employees:', total, 'Returned:', users.length);

      // ✅ FIX: تحويل البيانات من User إلى تنسيق Employee للـ frontend
      const formattedEmployees = users.map(user => {
        // Get role and isActive from UserCompany if available, otherwise from User
        const userCompany = user.userCompanies?.[0];
        const userRole = userCompany?.role || user.role || null;
        const userIsActive = userCompany?.isActive !== undefined ? userCompany.isActive : user.isActive;

        return {
          id: user.id, // Use user.id as employee id
          userId: user.id,
          employeeNumber: user.employeeNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          firstNameEn: null, // Not in User model
          lastNameEn: null, // Not in User model
          email: user.email,
          phone: user.phone,
          mobile: null, // Not in User model
          avatar: user.avatar,
          dateOfBirth: null, // Not in User model
          gender: null, // Not in User model
          nationality: null, // Not in User model
          nationalId: null, // Not in User model
          status: userIsActive ? 'ACTIVE' : 'INACTIVE', // Use actual user status
          contractType: user.contractType,
          hireDate: user.hireDate,
          baseSalary: user.baseSalary,
          department: user.departmentRelation,
          position: user.positionRelation,
          manager: null, // Not directly in User model
          hasEmployeeRecord: !!user.employeeNumber, // true if has employeeNumber
          // ✅ Include User (HR Integration) data
          user: {
            id: user.id,
            email: user.email,
            role: userRole,
            isActive: userIsActive,
            isEmailVerified: user.isEmailVerified,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt
          }
        };
      });

      return {
        employees: formattedEmployees,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting employees:', error);
      throw error;
    }
  }

  /**
   * جلب موظف بالـ ID
   */
  async getEmployeeById(companyId, employeeId) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId },
        include: {
          departmentRelation: true,
          positionRelation: true,
          // Note: employeeDocuments and leaveRequests relations are commented out in User model
          // Using separate queries if needed
          attendance: {
            where: { companyId },
            orderBy: { date: 'desc' },
            take: 30
          },
          userCompanies: {
            where: { companyId },
            select: {
              role: true,
              isActive: true
            },
            take: 1
          }
        }
      });

      return user;
    } catch (error) {
      console.error('❌ Error getting employee:', error);
      throw error;
    }
  }

  /**
   * تحديث موظف
   */
  async updateEmployee(companyId, employeeId, data) {
    try {
      // التحقق من وجود الموظف (User)
      const existing = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });

      if (!existing) {
        throw new Error('الموظف غير موجود');
      }

      // تحويل التواريخ وإعداد البيانات للتحديث
      const updateData = {};
      console.log('🔍 [DEBUG] updateEmployee payload:', {
        dept: data.departmentId,
        pos: data.positionId,
        typeDept: typeof data.departmentId,
        typePos: typeof data.positionId
      });

      if (data.hireDate) updateData.hireDate = new Date(data.hireDate);
      if (data.contractType) updateData.contractType = data.contractType;
      if (data.baseSalary !== undefined) updateData.baseSalary = data.baseSalary;
      // Handle foreign keys - convert empty strings to null
      if (data.departmentId !== undefined) {
        updateData.departmentId = (data.departmentId && data.departmentId.trim() !== '') ? data.departmentId : null;
      }
      if (data.positionId !== undefined) {
        updateData.positionId = (data.positionId && data.positionId.trim() !== '') ? data.positionId : null;
      }
      if (data.employeeNumber) updateData.employeeNumber = data.employeeNumber;
      if (data.firstName) updateData.firstName = data.firstName;
      if (data.lastName) updateData.lastName = data.lastName;
      if (data.phone) updateData.phone = data.phone;
      if (data.avatar) updateData.avatar = data.avatar;

      // Deduction fields
      if (data.enableAutoDeduction !== undefined) updateData.enableAutoDeduction = data.enableAutoDeduction;
      if (data.monthlyGraceMinutes !== undefined) updateData.monthlyGraceMinutes = parseInt(data.monthlyGraceMinutes);
      if (data.maxDailyLateMinutes !== undefined) updateData.maxDailyLateMinutes = parseInt(data.maxDailyLateMinutes);
      if (data.lateDeductionRate !== undefined) updateData.lateDeductionRate = parseFloat(data.lateDeductionRate);

      // تسجيل تغيير الراتب إذا تغير
      if (data.baseSalary && existing.baseSalary &&
        parseFloat(data.baseSalary) !== parseFloat(existing.baseSalary)) {
        await this.prisma.salaryHistory.create({
          data: {
            companyId,
            userId: employeeId,
            previousSalary: existing.baseSalary,
            newSalary: data.baseSalary,
            changeType: 'adjustment',
            changePercentage: Number(((data.baseSalary - existing.baseSalary) / existing.baseSalary * 100)),
            effectiveDate: new Date()
          }
        });
      }

      const employee = await this.prisma.user.update({
        where: { id: employeeId },
        data: updateData,
        include: {
          departmentRelation: true,
          positionRelation: true
        }
      });

      // ✅ FIX: Update User record if Employee is linked to a User (HR Integration)
      if (employee.userId && employee.user) {
        try {
          const userUpdateData = {};
          if (data.firstName && data.firstName !== employee.user.firstName) {
            userUpdateData.firstName = data.firstName;
          }
          if (data.lastName && data.lastName !== employee.user.lastName) {
            userUpdateData.lastName = data.lastName;
          }
          if (data.email && data.email !== employee.user.email) {
            userUpdateData.email = data.email.toLowerCase();
          }
          if (data.phone && data.phone !== employee.user.phone) {
            userUpdateData.phone = data.phone;
          }
          if (data.avatar && data.avatar !== employee.user.avatar) {
            userUpdateData.avatar = data.avatar;
          }

          if (Object.keys(userUpdateData).length > 0) {
            await this.prisma.user.update({
              where: { id: employee.userId },
              data: userUpdateData
            });
            console.log(`✅ [HR] Updated User (${employee.user.email}) for Employee: ${employee.employeeNumber}`);
          }

          // Also update UserCompany if email changed
          if (data.email && data.email !== employee.user.email) {
            await this.prisma.userCompany.updateMany({
              where: {
                userId: employee.userId,
                companyId: companyId
              },
              data: {
                // Note: role and isActive are managed separately
              }
            });
          }
        } catch (userError) {
          console.warn(`⚠️ [HR] Failed to update User for Employee:`, userError.message);
          // Don't fail the request if User update fails
        }
      }

      return employee;
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      throw error;
    }
  }

  /**
   * حذف موظف
   */
  async deleteEmployee(companyId, employeeId) {
    try {
      const existing = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });

      if (!existing) {
        throw new Error('الموظف غير موجود');
      }

      // Remove employee data but keep user account
      await this.prisma.user.update({
        where: { id: employeeId },
        data: {
          employeeNumber: null,
          departmentId: null,
          positionId: null,
          hireDate: null,
          contractType: null,
          baseSalary: null
        }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
  }

  /**
   * إنهاء خدمة موظف
   */
  async terminateEmployee(companyId, employeeId, data) {
    try {
      // Update user to mark as inactive (we don't have status field in User)
      const user = await this.prisma.user.update({
        where: { id: employeeId },
        data: {
          isActive: false
          // Note: terminationDate and terminationReason are not in User model
        }
      });

      return user;
    } catch (error) {
      console.error('❌ Error terminating employee:', error);
      throw error;
    }
  }

  /**
   * ربط موظف بحساب مستخدم
   */
  async linkToUser(companyId, employeeId, userId) {
    try {
      // Since employeeId is already userId, just verify the user exists
      const user = await this.prisma.user.findFirst({
        where: { id: employeeId, companyId }
      });

      if (!user) {
        throw new Error('الموظف غير موجود');
      }

      return user;
    } catch (error) {
      console.error('❌ Error linking employee to user:', error);
      throw error;
    }
  }

  /**
   * جلب الهيكل التنظيمي
   */
  async getOrganizationChart(companyId) {
    try {
      const employees = await this.prisma.user.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { employeeNumber: { not: null } },
            { departmentId: { not: null } },
            { positionId: { not: null } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          departmentId: true,
          positionId: true,
          departmentRelation: { select: { id: true, name: true, color: true } },
          positionRelation: { select: { id: true, title: true, level: true } }
        }
      });

      // Note: managerId is not in User model, so we return flat structure
      // بناء الشجرة (مبسط - بدون managerId)
      const buildTree = (parentId = null) => {
        // Since we don't have managerId, return all employees as root level
        return employees.map(emp => ({
          ...emp,
          department: emp.departmentRelation,
          position: emp.positionRelation,
          subordinates: []
        }));
      };

      return buildTree(null);
    } catch (error) {
      console.error('❌ Error getting organization chart:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الموظفين
   */
  async getEmployeeStats(companyId) {
    try {
      const [
        totalEmployees,
        activeEmployees,
        byDepartmentRaw,
        byContractTypeRaw,
        activeUserCount,
        recentHires,
        upcomingBirthdaysRaw
      ] = await executeWithRetry(async () => {
        return await Promise.all([
          this.prisma.user.count({
            where: {
              companyId
            }
          }),
          this.prisma.user.count({
            where: {
              companyId,
              isActive: true
            }
          }),
          // Group by departmentId
          this.prisma.user.findMany({
            where: {
              companyId,
              isActive: true,
              departmentId: { not: null }
            },
            select: { departmentId: true, departmentRelation: { select: { name: true } } }
          }),
          // Group by contractType
          this.prisma.user.findMany({
            where: {
              companyId,
              isActive: true,
              contractType: { not: null }
            },
            select: { contractType: true }
          }),
          // Status grouping (active vs inactive)
          this.prisma.user.count({
            where: {
              companyId,
              isActive: true
            }
          }),
          // Recent hires
          this.prisma.user.findMany({
            where: {
              companyId,
              isActive: true,
              hireDate: { not: null }
            },
            orderBy: { hireDate: 'desc' },
            take: 5,
            include: {
              departmentRelation: { select: { name: true } }
            }
          }),
          // Upcoming birthdays
          this.prisma.user.findMany({
            where: {
              companyId,
              isActive: true,
              dateOfBirth: { not: null }
            },
            take: 5
          })
        ]);
      });

      // برمجية تجميع البيانات
      const byDepartment = [];
      const deptMap = new Map();
      byDepartmentRaw.forEach(u => {
        const name = u.departmentRelation?.name || 'غير محدد';
        deptMap.set(name, (deptMap.get(name) || 0) + 1);
      });
      deptMap.forEach((count, name) => byDepartment.push({ name, count }));

      const byContractType = [];
      const contractMap = new Map();
      byContractTypeRaw.forEach(u => {
        const type = u.contractType || 'غير محدد';
        contractMap.set(type, (contractMap.get(type) || 0) + 1);
      });
      contractMap.forEach((count, name) => byContractType.push({ name, count }));

      const byStatus = [
        { name: 'نشط', count: activeUserCount },
        { name: 'غير نشط', count: totalEmployees - activeUserCount }
      ];

      // حساب أعياد الميلاد القادمة
      const today = new Date();
      const upcoming = upcomingBirthdaysRaw
        .map(emp => {
          const bday = new Date(emp.dateOfBirth);
          const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
          if (nextBday < today) {
            nextBday.setFullYear(today.getFullYear() + 1);
          }
          return { ...emp, nextBirthday: nextBday };
        })
        .sort((a, b) => a.nextBirthday - b.nextBirthday)
        .slice(0, 5);

      return {
        totalEmployees,
        activeEmployees,
        byDepartment,
        byContractType,
        byStatus,
        recentHires,
        upcomingBirthdays: upcoming
      };
    } catch (error) {
      console.error('❌ Error getting employee stats:', error);
      throw error;
    }
  }
}

module.exports = new EmployeeService();
