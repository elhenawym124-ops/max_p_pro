const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

/**
 * Plan Limits Service
 * 
 * Manages and enforces plan limits for companies
 */

class PlanLimitsService {
  constructor() {
    // Define plan limits
    this.planLimits = {
      BASIC: {
        users: 5,
        customers: 1000,
        conversations: 5000,
        storage: 1024, // MB
        features: ['basic_support', 'basic_analytics']
      },
      PRO: {
        users: 25,
        customers: 10000,
        conversations: 25000,
        storage: 5120, // MB
        features: ['priority_support', 'advanced_analytics', 'custom_branding']
      },
      ENTERPRISE: {
        users: -1, // unlimited
        customers: -1, // unlimited
        conversations: -1, // unlimited
        storage: -1, // unlimited
        features: ['dedicated_support', 'advanced_analytics', 'custom_branding', 'api_access', 'white_label']
      }
    };
  }

  /**
   * Get plan limits for a company
   */
  getPlanLimits(plan) {
    return this.planLimits[plan] || this.planLimits.BASIC;
  }

  /**
   * Get current usage for a company
   */
  async getCurrentUsage(companyId) {
    try {
      // const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
      const company = await getSharedPrismaClient().company.findUnique({
        where: { id: companyId },
        include: {
          _count: {
            select: {
              User: true,
              customers: true,
              products: true,
              orders: true,
              conversations: true
            }
          }
        }
      });

      if (!company) {
        throw new Error('Company not found');
      }

      return {
        users: company._count.users,
        customers: company._count.customers,
        products: company._count.products,
        orders: company._count.orders,
        conversations: company._count.conversations,
        plan: company.plan
      };
    } catch (error) {
      console.error('❌ Error getting current usage:', error);
      throw error;
    }
  }

  /**
   * Check if adding new items would exceed limits
   */
  async checkLimits(companyId, type, count = 1) {
    try {
      const usage = await this.getCurrentUsage(companyId);
      const limits = this.getPlanLimits(usage.plan);
      
      const currentCount = usage[type] || 0;
      const limit = limits[type];
      
      // Unlimited plan
      if (limit === -1) {
        return {
          allowed: true,
          current: currentCount,
          limit: -1,
          remaining: -1,
          percentage: 0
        };
      }

      const newTotal = currentCount + count;
      const allowed = newTotal <= limit;
      const remaining = Math.max(0, limit - currentCount);
      const percentage = Math.round((currentCount / limit) * 100);

      return {
        allowed,
        current: currentCount,
        limit,
        remaining,
        percentage,
        wouldExceed: !allowed,
        newTotal: allowed ? newTotal : currentCount
      };
    } catch (error) {
      console.error('❌ Error checking limits:', error);
      throw error;
    }
  }

  /**
   * Check multiple limits at once
   */
  async checkMultipleLimits(companyId, checks) {
    try {
      const results = {};
      
      for (const [type, count] of Object.entries(checks)) {
        results[type] = await this.checkLimits(companyId, type, count);
      }

      const allAllowed = Object.values(results).every(result => result.allowed);

      return {
        allowed: allAllowed,
        results
      };
    } catch (error) {
      console.error('❌ Error checking multiple limits:', error);
      throw error;
    }
  }

  /**
   * Get usage warnings (when approaching limits)
   */
  async getUsageWarnings(companyId, warningThreshold = 80) {
    try {
      const usage = await this.getCurrentUsage(companyId);
      const limits = this.getPlanLimits(usage.plan);
      const warnings = [];

      for (const [type, currentCount] of Object.entries(usage)) {
        if (type === 'plan') continue;
        
        const limit = limits[type];
        if (limit === -1) continue; // Skip unlimited

        const percentage = Math.round((currentCount / limit) * 100);
        
        if (percentage >= warningThreshold) {
          warnings.push({
            type,
            current: currentCount,
            limit,
            percentage,
            severity: percentage >= 95 ? 'critical' : percentage >= 90 ? 'high' : 'medium'
          });
        }
      }

      return warnings;
    } catch (error) {
      console.error('❌ Error getting usage warnings:', error);
      throw error;
    }
  }

  /**
   * Get upgrade suggestions
   */
  getUpgradeSuggestions(currentPlan, exceededLimits = []) {
    const suggestions = [];

    if (currentPlan === 'BASIC') {
      suggestions.push({
        plan: 'PRO',
        benefits: [
          'زيادة عدد المستخدمين إلى 25',
          'زيادة عدد العملاء إلى 10,000',
          'زيادة عدد المحادثات إلى 25,000',
          'مساحة تخزين أكبر (5GB)',
          'دعم أولوية',
          'تحليلات متقدمة'
        ],
        price: '$29/month'
      });
    }

    if (currentPlan === 'BASIC' || currentPlan === 'PRO') {
      suggestions.push({
        plan: 'ENTERPRISE',
        benefits: [
          'مستخدمين غير محدودين',
          'عملاء غير محدودين',
          'محادثات غير محدودة',
          'مساحة تخزين غير محدودة',
          'دعم مخصص',
          'وصول للـ API',
          'علامة تجارية مخصصة'
        ],
        price: 'اتصل بنا'
      });
    }

    return suggestions;
  }

  /**
   * Format limit check result for API response
   */
  formatLimitError(type, checkResult) {
    const typeNames = {
      users: 'المستخدمين',
      customers: 'العملاء',
      conversations: 'المحادثات',
      storage: 'مساحة التخزين'
    };

    const typeName = typeNames[type] || type;

    return {
      error: 'LIMIT_EXCEEDED',
      message: `تم تجاوز حد ${typeName} المسموح به`,
      details: {
        type,
        current: checkResult.current,
        limit: checkResult.limit,
        remaining: checkResult.remaining,
        percentage: checkResult.percentage
      }
    };
  }
}

module.exports = new PlanLimitsService();

