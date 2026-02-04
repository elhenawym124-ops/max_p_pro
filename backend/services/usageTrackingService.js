const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

class UsageTrackingService {
  /**
   * Track usage and deduct from wallet
   * @param {string} companyId - Company ID
   * @param {string} feature - Feature name (e.g., 'order', 'employee_monthly')
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Result with cost and new balance
   */
  async trackUsage(companyId, feature, metadata = {}) {
    try {
      // 1. Get pricing rule
      const pricingRule = await executeWithRetry(async () => {
        return await getSharedPrismaClient().pricingRule.findUnique({
          where: { feature }
        });
      });
      
      if (!pricingRule || !pricingRule.isActive) {
        console.log(`⚠️ No active pricing rule for feature: ${feature}`);
        return { success: true, cost: 0, skipped: true };
      }
      
      // 2. Get or create company wallet
      let wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });
      
      if (!wallet) {
        wallet = await executeWithRetry(async () => {
          return await getSharedPrismaClient().companyWallet.create({
            data: {
              companyId,
              balance: 0,
              currency: 'EGP'
            }
          });
        });
      }
      
      // 3. Check balance
      const cost = parseFloat(pricingRule.price);
      if (parseFloat(wallet.balance) < cost) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      
      // 4. Deduct from wallet and log usage
      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = balanceBefore - cost;
      
      const result = await executeWithRetry(async () => {
        return await getSharedPrismaClient().$transaction(async (tx) => {
          // Update wallet
          await tx.companyWallet.update({
            where: { id: wallet.id },
            data: {
              balance: balanceAfter,
              totalSpent: { increment: cost }
            }
          });
          
          // Create wallet transaction
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              companyId,
              type: 'DEDUCT',
              amount: cost,
              balanceBefore,
              balanceAfter,
              description: `استخدام: ${pricingRule.name}`,
              reference: metadata.reference || null,
              metadata: JSON.stringify(metadata)
            }
          });
          
          // Log usage
          const usageLog = await tx.appUsageLog.create({
            data: {
              companyAppId: metadata.companyAppId || '',
              companyId,
              feature,
              action: metadata.action || feature,
              quantity: metadata.quantity || 1,
              unitCost: cost,
              totalCost: cost,
              metadata: JSON.stringify(metadata)
            }
          });
          
          return { usageLog, newBalance: balanceAfter };
        });
      });
      
      console.log(`✅ Usage tracked: ${feature} - ${cost} EGP (Balance: ${result.newBalance})`);
      
      return {
        success: true,
        cost,
        newBalance: result.newBalance,
        usageLog: result.usageLog
      };
    } catch (error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        console.error(`❌ Insufficient balance for ${feature}`);
        throw error;
      }
      console.error('Error tracking usage:', error);
      throw new Error('TRACKING_ERROR');
    }
  }
  
  /**
   * Track monthly subscription for an app
   * @param {string} companyAppId - Company App ID
   * @returns {Promise<object>} Result
   */
  async trackMonthlySubscription(companyAppId) {
    try {
      const companyApp = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyApp.findUnique({
          where: { id: companyAppId },
          include: { app: true }
        });
      });
      
      if (!companyApp) {
        throw new Error('Company app not found');
      }
      
      if (!companyApp.app.monthlyPrice || companyApp.app.monthlyPrice <= 0) {
        return { success: true, cost: 0, skipped: true };
      }
      
      const cost = parseFloat(companyApp.app.monthlyPrice);
      
      // Get wallet
      let wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId: companyApp.companyId }
        });
      });
      
      if (!wallet || parseFloat(wallet.balance) < cost) {
        throw new Error('INSUFFICIENT_BALANCE');
      }
      
      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = balanceBefore - cost;
      
      const result = await executeWithRetry(async () => {
        return await getSharedPrismaClient().$transaction(async (tx) => {
          // Update wallet
          await tx.companyWallet.update({
            where: { id: wallet.id },
            data: {
              balance: balanceAfter,
              totalSpent: { increment: cost }
            }
          });
          
          // Create transaction
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              companyId: companyApp.companyId,
              type: 'DEDUCT',
              amount: cost,
              balanceBefore,
              balanceAfter,
              description: `اشتراك شهري: ${companyApp.app.name}`,
              reference: companyAppId
            }
          });
          
          // Update company app
          const nextBillingDate = new Date();
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          
          await tx.companyApp.update({
            where: { id: companyAppId },
            data: {
              lastBilledAt: new Date(),
              nextBillingAt: nextBillingDate,
              totalSpent: { increment: cost }
            }
          });
          
          return { newBalance: balanceAfter };
        });
      });
      
      console.log(`✅ Monthly subscription billed: ${companyApp.app.name} - ${cost} EGP`);
      
      return {
        success: true,
        cost,
        newBalance: result.newBalance
      };
    } catch (error) {
      if (error.message === 'INSUFFICIENT_BALANCE') {
        console.error(`❌ Insufficient balance for monthly subscription`);
        throw error;
      }
      console.error('Error tracking monthly subscription:', error);
      throw error;
    }
  }
  
  /**
   * Get usage summary for a company
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<object>} Usage summary
   */
  async getUsageSummary(companyId, startDate, endDate) {
    try {
      const where = { companyId };
      
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }
      
      const [summary, byFeature] = await executeWithRetry(async () => {
        return await Promise.all([
          getSharedPrismaClient().appUsageLog.aggregate({
            where,
            _sum: {
              totalCost: true,
              quantity: true
            },
            _count: {
              id: true
            }
          }),
          getSharedPrismaClient().appUsageLog.groupBy({
            by: ['feature'],
            where,
            _sum: {
              totalCost: true,
              quantity: true
            }
          })
        ]);
      });
      
      return {
        totalCost: summary._sum.totalCost || 0,
        totalQuantity: summary._sum.quantity || 0,
        totalActions: summary._count.id,
        byFeature
      };
    } catch (error) {
      console.error('Error getting usage summary:', error);
      throw error;
    }
  }
}

module.exports = new UsageTrackingService();
