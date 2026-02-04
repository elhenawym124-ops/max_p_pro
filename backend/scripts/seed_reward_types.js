/**
 * 🌱 Seed Reward Types Script
 * يقوم بإنشاء أنواع المكافآت القياسية المطلوبة للشركة
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function seedRewardTypes(companyId, userId) {
    const prisma = getSharedPrismaClient();

    const standardTypes = [
        {
            name: 'Target Achievement',
            nameAr: 'تحقيق التارجت',
            category: 'TARGET_ACHIEVEMENT',
            calculationMethod: 'FIXED_AMOUNT',
            value: 500,
            triggerType: 'SEMI_AUTOMATIC',
            frequency: 'MONTHLY',
            description: 'مكافأة عند تحقيق 100% من المستهدف الشهري',
            eligibilityConditions: { minTargetProgress: 100 }
        },
        {
            name: 'Target Exceeding',
            nameAr: 'تجاوز التارجت',
            category: 'TARGET_EXCEED',
            calculationMethod: 'PERCENTAGE_SALARY',
            value: 10,
            triggerType: 'SEMI_AUTOMATIC',
            frequency: 'MONTHLY',
            description: 'مكافأة عند تجاوز المستهدف بنسبة 120%',
            eligibilityConditions: { minTargetProgress: 120 }
        },
        {
            name: 'Punctuality Reward',
            nameAr: 'التزام بالمواعيد',
            category: 'PUNCTUALITY',
            calculationMethod: 'PERCENTAGE_SALARY',
            value: 5,
            triggerType: 'AUTOMATIC',
            frequency: 'MONTHLY',
            description: 'مكافأة الالتزام الكامل بالحضور والانصراف بدون تأخير',
            eligibilityConditions: { maxLatenessCount: 0 }
        },
        {
            name: 'No Absence Reward',
            nameAr: 'عدم غياب',
            category: 'NO_ABSENCE',
            calculationMethod: 'FIXED_AMOUNT',
            value: 300,
            triggerType: 'AUTOMATIC',
            frequency: 'MONTHLY',
            description: 'مكافأة عدم تسجيل أي يوم غياب خلال الشهر',
            eligibilityConditions: { maxAbsenceCount: 0 }
        },
        {
            name: 'Work Quality',
            nameAr: 'جودة العمل',
            category: 'QUALITY',
            calculationMethod: 'FIXED_AMOUNT',
            value: 400,
            triggerType: 'SEMI_AUTOMATIC',
            frequency: 'MONTHLY',
            description: 'مكافأة جودة العمل (أخطاء أقل من 2%)',
            eligibilityConditions: { maxErrorRate: 2 }
        },
        {
            name: 'Employee of the Month',
            nameAr: 'موظف الشهر',
            category: 'EMPLOYEE_OF_MONTH',
            calculationMethod: 'FIXED_AMOUNT',
            value: 1000,
            triggerType: 'MANUAL',
            frequency: 'MONTHLY',
            description: 'لقب ومكافأة موظف الشهر بناءً على ترشيح الإدارة',
            eligibilityConditions: { requiresManagerNomination: true }
        },
        {
            name: 'Distinguished Initiative',
            nameAr: 'مبادرة مميزة',
            category: 'INITIATIVE',
            calculationMethod: 'FIXED_AMOUNT',
            value: 500,
            triggerType: 'MANUAL',
            frequency: 'ONE_TIME',
            description: 'مكافأة لتنفيذ مبادرة جديدة أو تحسين ملموس',
            eligibilityConditions: {}
        },
        {
            name: 'Successful Project',
            nameAr: 'مشروع ناجح',
            category: 'PROJECT_SUCCESS',
            calculationMethod: 'PERCENTAGE_PROJECT_PROFIT',
            value: 2,
            triggerType: 'MANUAL',
            frequency: 'ONE_TIME',
            description: 'نسبة من أرباح المشروع عند النجاح في التسليم',
            eligibilityConditions: { minProjectScore: 90 }
        },
        {
            name: 'Sales Commission',
            nameAr: 'مبيعات',
            category: 'SALES',
            calculationMethod: 'PERCENTAGE_SALES',
            value: 3,
            triggerType: 'AUTOMATIC',
            frequency: 'MONTHLY',
            description: 'عمولة مبيعات شهرية',
            eligibilityConditions: { minSalesAmount: 10000 }
        },
        {
            name: 'Administrative Reward',
            nameAr: 'مكافأة إدارية',
            category: 'ADMINISTRATIVE',
            calculationMethod: 'FIXED_AMOUNT',
            value: 0,
            triggerType: 'MANUAL',
            frequency: 'ONE_TIME',
            description: 'مكافأة تقديرية من الإدارة',
            eligibilityConditions: { requiresHRApproval: true }
        }
    ];

    console.log(`🚀 Seeding ${standardTypes.length} reward types for company: ${companyId}`);

    const results = [];
    for (const type of standardTypes) {
        // Check if exists
        const existing = await prisma.rewardType.findFirst({
            where: { companyId, category: type.category, name: type.name }
        });

        if (existing) {
            console.log(`⏭️ Skipping ${type.name} (already exists)`);
            continue;
        }

        const created = await prisma.rewardType.create({
            data: {
                ...type,
                companyId,
                createdBy: userId,
                eligibilityConditions: JSON.stringify(type.eligibilityConditions)
            }
        });
        results.push(created);
        console.log(`✅ Created: ${type.name}`);
    }

    return results;
}

// For standalone execution via CLI (node seed_reward_types.js <companyId> <userId>)
if (require.main === module) {
    const companyId = process.argv[2] || 'cmgj92byv003djutl34dkh6ab';
    const userId = process.argv[3] || 'cmiug0rm70vbdjuewr9cuiy82';

    seedRewardTypes(companyId, userId)
        .then(() => {
            console.log('🎉 Seeding complete!');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ Seeding failed:', err);
            process.exit(1);
        });
}

module.exports = { seedRewardTypes };
