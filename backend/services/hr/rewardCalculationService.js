/**
 * 🧮 Reward Calculation Service
 * خدمة حساب قيم المكافآت
 * 
 * Calculates the exact value of a reward based on type and employee salary.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { BusinessLogicError } = require('../../utils/hrErrors');

class RewardCalculationService {
    constructor() {
        // Don't initialize prisma here
    }

    get prisma() {
        return getSharedPrismaClient();
    }

    /**
     * حساب قيمة المكافأة
     * Calculate reward value
     */
    async calculateRewardValue(companyId, userId, rewardType) {
        let calculatedValue = 0;
        let calculationDetails = {};

        switch (rewardType.calculationMethod) {
            case 'FIXED_AMOUNT':
                calculatedValue = Number(rewardType.value);
                calculationDetails = {
                    method: 'FIXED_AMOUNT',
                    fixedValue: calculatedValue
                };
                break;

            case 'PERCENTAGE_SALARY':
                const employee = await this.prisma.user.findUnique({
                    where: { id: userId },
                    select: { baseSalary: true }
                });

                if (!employee || !employee.baseSalary) {
                    // If base salary is missing, we can't calculate percentage. 
                    // Should we throw error or return 0? Throwing error ensures data integrity.
                    // However, for rewards, maybe 0 is better to avoid crashing bulk processes?
                    // Better to throw error and let the caller handle it (e.g. skip employee).
                    // But I'll use 0 if salary is null to be safe, with a warning in details.
                    if (!employee) {
                        throw new BusinessLogicError('Employee not found');
                    }
                    calculatedValue = 0;
                    calculationDetails = {
                        method: 'PERCENTAGE_SALARY',
                        baseSalary: 0,
                        error: 'Base salary is not defined'
                    };
                } else {
                    const baseSalary = Number(employee.baseSalary);
                    const percentage = Number(rewardType.value);
                    let amount = (baseSalary * percentage) / 100;

                    calculationDetails = {
                        method: 'PERCENTAGE_SALARY',
                        baseSalary: baseSalary,
                        percentage: percentage,
                        rawAmount: amount
                    };

                    // Apply Cap if defined
                    if (rewardType.maxCap && Number(rewardType.maxCap) > 0) {
                        const cap = Number(rewardType.maxCap);
                        if (amount > cap) {
                            amount = cap;
                            calculationDetails.isCapped = true;
                            calculationDetails.capValue = cap;
                        }
                    }
                    calculatedValue = amount;
                }
                break;

            case 'POINTS':
                calculatedValue = Number(rewardType.value);
                calculationDetails = {
                    method: 'POINTS',
                    points: calculatedValue
                };
                break;

            case 'NON_MONETARY':
                calculatedValue = 0; // Value is 0 for payroll purposes
                calculationDetails = {
                    method: 'NON_MONETARY',
                    description: 'Non-monetary reward'
                };
                break;

            default:
                throw new BusinessLogicError(`Unknown calculation method: ${rewardType.calculationMethod}`);
        }

        return {
            value: parseFloat(calculatedValue.toFixed(2)),
            details: calculationDetails
        };
    }
}

module.exports = new RewardCalculationService();
