/**
 * 🏆 Reward Type Service
 * خدمة إدارة أنواع المكافآت والحوافز
 * 
 * Handles Creation, Update, Deletion, and Retrieval of Reward Types.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const {
    ValidationError,
    NotFoundError,
    ConflictError
} = require('../../utils/hrErrors');

class RewardTypeService {
    constructor() {
        // Don't initialize prisma here
    }

    get prisma() {
        const client = getSharedPrismaClient();
        if (!client) {
            throw new Error('Prisma client is not initialized');
        }
        return client;
    }

    /**
     * إنشاء نوع مكافأة جديد
     * Create a new reward type
     */
    async createRewardType(companyId, data) {
        // Validate required fields
        if (!data.name || !data.category || !data.calculationMethod || !data.triggerType) {
            throw new ValidationError('البيانات الأساسية مطلوبة (الاسم، الفئة، طريقة الحساب، نوع التنفيذ)');
        }

        // Validate calculation method values
        const percentageMethods = ['PERCENTAGE_SALARY', 'PERCENTAGE_SALES', 'PERCENTAGE_PROJECT_PROFIT'];
        if (percentageMethods.includes(data.calculationMethod) && !data.value) {
            throw new ValidationError('يجب تحديد النسبة المئوية لهذا النوع من المكافآت');
        }

        if (data.calculationMethod === 'FIXED_AMOUNT' && !data.value) {
            throw new ValidationError('يجب تحديد المبلغ الثابت للمكافأة');
        }

        // Validate Frequency
        if (data.frequency && !['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'].includes(data.frequency)) {
            throw new ValidationError('تكرار المكافأة غير صالح');
        }

        return await this.prisma.rewardType.create({
            data: {
                companyId,
                name: data.name,
                nameAr: data.nameAr,
                description: data.description,
                category: data.category,
                calculationMethod: data.calculationMethod,
                value: data.value || 0,
                maxCap: data.maxCap,
                eligibilityConditions: data.eligibilityConditions ? JSON.stringify(data.eligibilityConditions) : null,
                triggerType: data.triggerType,
                frequency: data.frequency || 'MONTHLY',
                isActive: data.isActive !== undefined ? data.isActive : true,
                priority: data.priority || 1,
                effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : null,
                effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
                createdBy: data.createdBy // ID of user creating this
            }
        });
    }

    /**
     * تحديث نوع مكافأة
     * Update existing reward type
     */
    async updateRewardType(companyId, id, data) {
        const existing = await this.prisma.rewardType.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            throw new NotFoundError('نوع المكافأة', id);
        }

        const updateData = {};
        if (data.name) updateData.name = data.name;
        if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.category) updateData.category = data.category;
        if (data.calculationMethod) updateData.calculationMethod = data.calculationMethod;
        if (data.value !== undefined) updateData.value = data.value;
        if (data.maxCap !== undefined) updateData.maxCap = data.maxCap;
        if (data.eligibilityConditions !== undefined) updateData.eligibilityConditions = data.eligibilityConditions ? JSON.stringify(data.eligibilityConditions) : null;
        if (data.triggerType) updateData.triggerType = data.triggerType;
        if (data.frequency) updateData.frequency = data.frequency;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.effectiveFrom !== undefined) updateData.effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : null;
        if (data.effectiveTo !== undefined) updateData.effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : null;

        return await this.prisma.rewardType.update({
            where: { id },
            data: updateData
        });
    }

    /**
     * حذف نوع مكافأة
     * Delete reward type (if unused)
     */
    async deleteRewardType(companyId, id) {
        const existing = await this.prisma.rewardType.findFirst({
            where: { id, companyId },
            include: {
                _count: {
                    select: { rewardRecords: true }
                }
            }
        });

        if (!existing) {
            throw new NotFoundError('نوع المكافأة', id);
        }

        if (existing._count.rewardRecords > 0) {
            throw new ConflictError('لا يمكن حذف نوع المكافأة لأنه مستخدم بالفعل في سجلات الموظفين. يمكنك تعطيله بدلاً من ذلك.');
        }

        return await this.prisma.rewardType.delete({
            where: { id }
        });
    }

    /**
     * تبديل حالة التفعيل
     * Toggle active status
     */
    async toggleRewardTypeStatus(companyId, id, isActive) {
        const existing = await this.prisma.rewardType.findFirst({
            where: { id, companyId }
        });

        if (!existing) {
            throw new NotFoundError('نوع المكافأة', id);
        }

        return await this.prisma.rewardType.update({
            where: { id },
            data: { isActive }
        });
    }

    /**
     * جلب أنواع المكافآت مع الفلترة
     * List reward types with filters
     */
    async getRewardTypes(companyId, options = {}) {
        const {
            page = 1,
            limit = 20,
            search,
            category,
            triggerType,
            isActive,
            frequency
        } = options;

        const where = { companyId };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } }
            ];
        }

        if (category) where.category = category;
        if (triggerType) where.triggerType = triggerType;
        if (isActive !== undefined && isActive !== 'all') where.isActive = isActive === 'true' || isActive === true;
        if (frequency) where.frequency = frequency;

        const [items, total] = await Promise.all([
            this.prisma.rewardType.findMany({
                where,
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                orderBy: { priority: 'asc' }
            }),
            this.prisma.rewardType.count({ where })
        ]);

        return {
            items: items.map(item => ({
                ...item,
                eligibilityConditions: item.eligibilityConditions ? JSON.parse(item.eligibilityConditions) : null
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        };
    }

    /**
     * جلب تفاصيل نوع مكافأة
     * Get reward type details
     */
    async getRewardTypeById(companyId, id) {
        const item = await this.prisma.rewardType.findFirst({
            where: { id, companyId }
        });

        if (!item) {
            throw new NotFoundError('نوع المكافأة', id);
        }

        return {
            ...item,
            eligibilityConditions: item.eligibilityConditions ? JSON.parse(item.eligibilityConditions) : null
        };
    }

    /**
     * تجهيز القوالب الافتراضية
     * Seed default reward templates for a company
     */
    async seedDefaultRewardTypes(companyId, creatorId) {
        const defaults = [
            { name: 'Target Achievement Bonus', nameAr: 'مكافأة تحقيق التارجت', category: 'TARGET_ACHIEVEMENT', calculationMethod: 'PERCENTAGE_SALES', value: 5, triggerType: 'MANUAL', description: 'تمنح عند تحقيق 100% من الهدف البيعي' },
            { name: 'Monthly Punctuality Reward', nameAr: 'مكافأة الالتزام بالمواعيد', category: 'PUNCTUALITY', calculationMethod: 'FIXED_AMOUNT', value: 500, triggerType: 'AUTOMATIC', description: 'تمنح للموظفين بدون أي تأخير خلال الشهر' },
            { name: 'Perfect Attendance', nameAr: 'مكافأة عدم الغياب', category: 'NO_ABSENCE', calculationMethod: 'FIXED_AMOUNT', value: 300, triggerType: 'AUTOMATIC', description: 'تمنح عند عدم تسجيل أي غياب طوال الشهر' },
            { name: 'Quality Excellence Award', nameAr: 'جائزة جودة العمل', category: 'QUALITY', calculationMethod: 'FIXED_AMOUNT', value: 1000, triggerType: 'MANUAL', description: 'تمنح للموظفين المتميزين في دقة وجودة المخرجات' },
            { name: 'Employee of the Month', nameAr: 'موظف الشهر', category: 'EMPLOYEE_OF_MONTH', calculationMethod: 'FIXED_AMOUNT', value: 2000, triggerType: 'MANUAL', description: 'أعلى تقدير شهري للموظف الأكثر في الإنتاجية والتعاون' },
            { name: 'Initiative & Innovation', nameAr: 'مكافأة المبادرة والابتكار', category: 'INITIATIVE', calculationMethod: 'FIXED_AMOUNT', value: 1500, triggerType: 'MANUAL', description: 'تمنح لتقديم أفكار خارج الصندوق تساهم في تطوير العمل' },
            { name: 'Project Success Bonus', nameAr: 'مكافأة نجاح المشروع', category: 'PROJECT_SUCCESS', calculationMethod: 'PERCENTAGE_PROJECT_PROFIT', value: 2, triggerType: 'MANUAL', description: 'نسبة من أرباح المشروع تمنح للفريق عند التسليم النهائي' },
            { name: 'High Volume Sales Commission', nameAr: 'عمولة مبيعات مرتفعة', category: 'SALES', calculationMethod: 'PERCENTAGE_SALES', value: 1, triggerType: 'AUTOMATIC', description: 'عمولة إضافية عند تجاوز حد معين من المبيعات' },
            { name: 'Administrative Excellence', nameAr: 'مكافأة التميز الإداري', category: 'ADMINISTRATIVE', calculationMethod: 'FIXED_AMOUNT', value: 500, triggerType: 'MANUAL', description: 'تمنح للالتزام التام بالسياسات والإجراءات الإدارية' },
            { name: 'General Performance Bonus', nameAr: 'مكافأة أداء عامة', category: 'PERFORMANCE', calculationMethod: 'FIXED_AMOUNT', value: 750, triggerType: 'MANUAL', description: 'تحفيز دوري بناءً على تقييم المدير المباشر' }
        ];

        const created = [];
        for (const item of defaults) {
            const existing = await this.prisma.rewardType.findFirst({
                where: { companyId, nameAr: item.nameAr }
            });

            if (!existing) {
                const rt = await this.createRewardType(companyId, { ...item, createdBy: creatorId });
                created.push(rt);
            }
        }

        return created;
    }
}

module.exports = new RewardTypeService();
