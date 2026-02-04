const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const WalletService = require('../services/walletService');

class WalletController {
  // --- Company Wallet & Billing Logic ---

  /**
   * @route GET /api/v1/wallet/balance
   * @desc Get company wallet balance
   * @access Protected
   */
  static async getBalance(req, res) {
    try {
      const { companyId } = req.user;

      let wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });

      // Create wallet if doesn't exist
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

      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب رصيد المحفظة',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/wallet/transactions
   * @desc Get wallet transactions
   * @access Protected
   */
  static async getTransactions(req, res) {
    try {
      const { companyId } = req.user;
      const { page = 1, limit = 20, type, startDate, endDate } = req.query;

      const wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });

      if (!wallet) {
        return res.json({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, pages: 0 }
        });
      }

      const where = { walletId: wallet.id };

      if (type) {
        where.type = type;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [transactions, total] = await executeWithRetry(async () => {
        return await Promise.all([
          getSharedPrismaClient().walletTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
          }),
          getSharedPrismaClient().walletTransaction.count({ where })
        ]);
      });

      res.json({
        success: true,
        data: transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب حركات المحفظة',
        error: error.message
      });
    }
  }

  /**
   * @route POST /api/v1/wallet/recharge
   * @desc Recharge wallet balance
   * @access Protected
   */
  static async rechargeWallet(req, res) {
    try {
      const { companyId } = req.user;
      const { amount, paymentMethod, paymentId, reference } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'المبلغ يجب أن يكون أكبر من صفر'
        });
      }

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

      // Apply bonus based on amount
      let bonus = 0;
      let finalAmount = parseFloat(amount);

      if (finalAmount >= 5000) {
        bonus = finalAmount * 0.30; // 30% bonus
      } else if (finalAmount >= 1000) {
        bonus = finalAmount * 0.20; // 20% bonus
      } else if (finalAmount >= 500) {
        bonus = finalAmount * 0.15; // 15% bonus
      } else if (finalAmount >= 100) {
        bonus = finalAmount * 0.10; // 10% bonus
      }

      const totalAmount = finalAmount + bonus;
      const balanceBefore = wallet.balance;
      const balanceAfter = parseFloat(balanceBefore) + totalAmount;

      const result = await executeWithRetry(async () => {
        return await getSharedPrismaClient().$transaction(async (tx) => {
          // Update wallet
          const updatedWallet = await tx.companyWallet.update({
            where: { id: wallet.id },
            data: {
              balance: balanceAfter,
              totalDeposited: { increment: totalAmount }
            }
          });

          // Create transaction
          const transaction = await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              companyId,
              type: 'DEPOSIT',
              amount: totalAmount,
              balanceBefore,
              balanceAfter,
              description: bonus > 0
                ? `شحن المحفظة: ${finalAmount} جنيه + بونص ${bonus.toFixed(2)} جنيه`
                : `شحن المحفظة: ${finalAmount} جنيه`,
              paymentMethod,
              paymentId,
              reference,
              metadata: JSON.stringify({
                originalAmount: finalAmount,
                bonus,
                bonusPercentage: bonus > 0 ? (bonus / finalAmount * 100).toFixed(0) : 0
              })
            }
          });

          // Add bonus transaction if applicable
          if (bonus > 0) {
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                companyId,
                type: 'BONUS',
                amount: bonus,
                balanceBefore: parseFloat(balanceBefore) + finalAmount,
                balanceAfter,
                description: `بونص شحن المحفظة (${(bonus / finalAmount * 100).toFixed(0)}%)`,
                reference: transaction.id
              }
            });
          }

          return { wallet: updatedWallet, transaction };
        });
      });

      res.json({
        success: true,
        message: bonus > 0
          ? `تم شحن المحفظة بنجاح! 🎉\nحصلت على بونص ${bonus.toFixed(2)} جنيه`
          : 'تم شحن المحفظة بنجاح! 💰',
        data: {
          wallet: result.wallet,
          transaction: result.transaction,
          bonus: bonus > 0 ? {
            amount: bonus,
            percentage: (bonus / finalAmount * 100).toFixed(0)
          } : null
        }
      });
    } catch (error) {
      console.error('Error recharging wallet:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في شحن المحفظة',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/billing/summary
   * @desc Get billing summary for current month
   * @access Protected
   */
  static async getBillingSummary(req, res) {
    try {
      const { companyId } = req.user;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Get active apps
      const activeApps = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyApp.findMany({
          where: {
            companyId,
            status: { in: ['TRIAL', 'ACTIVE'] }
          },
          include: {
            app: true
          }
        });
      });

      // Calculate subscription costs
      let subscriptionCost = 0;
      activeApps.forEach(ca => {
        if (ca.app.pricingModel === 'SUBSCRIPTION' || ca.app.pricingModel === 'HYBRID') {
          subscriptionCost += parseFloat(ca.app.monthlyPrice || 0);
        }
      });

      // Get usage costs for this month
      const usageCosts = await executeWithRetry(async () => {
        return await getSharedPrismaClient().appUsageLog.aggregate({
          where: {
            companyId,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: {
            totalCost: true
          }
        });
      });

      const usageCost = parseFloat(usageCosts._sum.totalCost || 0);
      const totalCost = subscriptionCost + usageCost;

      // Get wallet balance
      const wallet = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findUnique({
          where: { companyId }
        });
      });

      // Get usage breakdown by feature
      const usageByFeature = await executeWithRetry(async () => {
        return await getSharedPrismaClient().appUsageLog.groupBy({
          by: ['feature'],
          where: {
            companyId,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: {
            totalCost: true,
            quantity: true
          }
        });
      });

      res.json({
        success: true,
        data: {
          period: {
            start: startOfMonth,
            end: endOfMonth
          },
          costs: {
            subscriptions: subscriptionCost,
            usage: usageCost,
            total: totalCost
          },
          wallet: {
            balance: wallet ? parseFloat(wallet.balance) : 0,
            currency: wallet?.currency || 'EGP'
          },
          activeApps: activeApps.length,
          usageBreakdown: usageByFeature
        }
      });
    } catch (error) {
      console.error('Error fetching billing summary:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب ملخص الفواتير',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/billing/usage
   * @desc Get detailed usage report
   * @access Protected
   */
  static async getUsageReport(req, res) {
    try {
      const { companyId } = req.user;
      const { startDate, endDate, groupBy = 'day' } = req.query;

      const where = { companyId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      } else {
        // Default to current month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        where.createdAt = { gte: startOfMonth };
      }

      const [usageLogs, summary] = await executeWithRetry(async () => {
        return await Promise.all([
          getSharedPrismaClient().appUsageLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
          }),
          getSharedPrismaClient().appUsageLog.aggregate({
            where,
            _sum: {
              totalCost: true,
              quantity: true
            },
            _count: {
              id: true
            }
          })
        ]);
      });

      // Group by feature
      const byFeature = await executeWithRetry(async () => {
        return await getSharedPrismaClient().appUsageLog.groupBy({
          by: ['feature', 'action'],
          where,
          _sum: {
            totalCost: true,
            quantity: true
          }
        });
      });

      res.json({
        success: true,
        data: {
          usage: usageLogs,
          summary: {
            totalCost: parseFloat(summary._sum.totalCost || 0),
            totalQuantity: summary._sum.quantity || 0,
            count: summary._count.id
          },
          byFeature
        }
      });
    } catch (error) {
      console.error('Error fetching usage report:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تقرير الاستخدام',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/billing/invoices
   * @desc Get billing invoices
   * @access Protected
   */
  static async getInvoices(req, res) {
    try {
      const { companyId } = req.user;
      const { status, page = 1, limit = 10 } = req.query;

      const where = { companyId };
      if (status) where.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [invoices, total] = await executeWithRetry(async () => {
        return await Promise.all([
          getSharedPrismaClient().invoice.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit)
          }),
          getSharedPrismaClient().invoice.count({ where })
        ]);
      });

      res.json({
        success: true,
        data: invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب الفواتير',
        error: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/billing/invoices/:id
   * @desc Get invoice details
   * @access Protected
   */
  static async getInvoiceDetails(req, res) {
    try {
      const { companyId } = req.user;
      const { id } = req.params;

      const invoice = await executeWithRetry(async () => {
        return await getSharedPrismaClient().invoice.findFirst({
          where: { id, companyId },
          include: {
            invoiceItems: true
          }
        });
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: 'الفاتورة غير موجودة'
        });
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      res.status(500).json({
        success: false,
        message: 'خطأ في جلب تفاصيل الفاتورة',
        error: error.message
      });
    }
  }

  // --- Customer Wallet & Loyalty Logic ---

  /**
   * @route GET /api/v1/wallet/my-wallet
   * @desc Get current user's (customer) wallet balance
   */
  static async getMyWallet(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user.role);
      const customerId = user.role === 'CUSTOMER'
        ? (user.customerId || user.userId || user.id)
        : req.query.customerId;
      const companyId = user.companyId;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'customerId is required'
        });
      }

      if (user.role === 'CUSTOMER' && (user.customerId || user.userId || user.id) !== customerId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      if (companyId) {
        await WalletService.createWallet(customerId, companyId);
      }

      const walletBalance = await WalletService.getWalletBalance(customerId);

      res.json({
        success: true,
        data: {
          balance: walletBalance,
          currency: 'EGP'
        }
      });
    } catch (error) {
      console.error('Error in getMyWallet:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/wallet/my-transactions
   * @desc Get current user's (customer) wallet transactions
   */
  static async getMyTransactions(req, res) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user.role);
      const customerId = user.role === 'CUSTOMER'
        ? (user.customerId || user.userId || user.id)
        : req.query.customerId;
      const companyId = user.companyId;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'customerId is required'
        });
      }

      if (user.role === 'CUSTOMER' && (user.customerId || user.userId || user.id) !== customerId) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const { page = 1, limit = 10, type } = req.query;

      const result = await WalletService.getWalletTransactions(customerId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in getMyTransactions:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * @route POST /api/v1/wallet/use-balance
   * @desc Use customer wallet balance for an order
   */
  static async useWalletBalance(req, res) {
    try {
      const user = req.user;
      if (!user || user.role !== 'CUSTOMER') {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const { amount, orderId } = req.body;
      if (!amount || !orderId) {
        return res.status(400).json({ success: false, message: 'Amount and orderId are required' });
      }

      const customerId = user.customerId || user.userId || user.id;
      const result = await WalletService.useWalletBalance(
        customerId,
        parseFloat(amount),
        orderId
      );

      res.json({
        success: true,
        data: {
          newBalance: result.wallet.balance,
          transaction: result.transaction
        }
      });
    } catch (error) {
      console.error('Error in useWalletBalance:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * @route POST /api/v1/wallet/add-balance
   * @desc Add balance to customer wallet (Admin only)
   */
  static async addToWallet(req, res) {
    try {
      const user = req.user;
      if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const { customerId, amount, type, description } = req.body;
      if (!customerId || !amount || !type || !description) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }

      const result = await WalletService.addToWallet(
        customerId,
        parseFloat(amount),
        type,
        description,
        { addedBy: user.id }
      );

      res.json({
        success: true,
        data: {
          newBalance: result.wallet.balance,
          transaction: result.transaction
        }
      });
    } catch (error) {
      console.error('Error in addToWallet:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * @route GET /api/v1/wallet/stats
   * @desc Get wallet statistics for admin
   */
  static async getWalletStats(req, res) {
    try {
      const user = req.user;
      if (!user || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const prisma = getSharedPrismaClient();

      const [totalBalance, totalEarned, totalSpent, activeWallets] = await Promise.all([
        prisma.customerWallet.aggregate({ where: { isActive: true }, _sum: { balance: true } }),
        prisma.customerWallet.aggregate({ where: { isActive: true }, _sum: { totalEarned: true } }),
        prisma.customerWallet.aggregate({ where: { isActive: true }, _sum: { totalSpent: true } }),
        prisma.customerWallet.count({ where: { isActive: true } })
      ]);

      res.json({
        success: true,
        data: {
          totalBalance: totalBalance._sum.balance || 0,
          totalEarned: totalEarned._sum.totalEarned || 0,
          totalSpent: totalSpent._sum.totalSpent || 0,
          activeWallets
        }
      });
    } catch (error) {
      console.error('Error in getWalletStats:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = WalletController;
