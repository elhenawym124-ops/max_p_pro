const { getSharedPrismaClient } = require('./sharedDatabase');

const getPrisma = () => getSharedPrismaClient();

class WalletService {
  // إنشاء محفظة جديدة للعميل
  static async createWallet(customerId, companyId) {
    try {
      const prisma = getPrisma();
      const wallet = await prisma.customerWallet.upsert({
        where: { customerId },
        update: {},
        create: {
          customerId,
          companyId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          currency: 'EGP',
          isActive: true
        }
      });

      return wallet;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error(error?.message || 'Failed to create wallet');
    }
  }

  // الحصول على رصيد العميل
  static async getWalletBalance(customerId) {
    try {
      const prisma = getPrisma();
      const wallet = await prisma.customerWallet.findFirst({
        where: { customerId, isActive: true }
      });

      return wallet ? wallet.balance : 0;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      throw new Error('Failed to get wallet balance');
    }
  }

  // إضافة مبلغ للمحفظة (Credit)
  static async addToWallet(customerId, amount, type, description, metadata = {}) {
    try {
      const prisma = getPrisma();
      const wallet = await prisma.customerWallet.findFirst({
        where: { customerId, isActive: true }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      // تحديث المحفظة
      await prisma.customerWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalEarned: wallet.totalEarned + amount
        }
      });

      // تسجيل المعاملة
      const transaction = await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          balanceBefore,
          balanceAfter,
          description,
          metadata: JSON.stringify(metadata)
        }
      });

      return { wallet, transaction };
    } catch (error) {
      console.error('Error adding to wallet:', error);
      throw new Error('Failed to add to wallet');
    }
  }

  // خصم مبلغ من المحفظة (Debit)
  static async deductFromWallet(customerId, amount, description) {
    try {
      const prisma = getPrisma();
      const wallet = await prisma.customerWallet.findFirst({
        where: { customerId, isActive: true }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.balance < amount) {
        throw new Error('Insufficient balance');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - amount;

      // تحديث المحفظة
      await prisma.customerWallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalSpent: wallet.totalSpent + amount
        }
      });

      // تسجيل المعاملة
      const transaction = await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount,
          balanceBefore,
          balanceAfter,
          description
        }
      });

      return { wallet, transaction };
    } catch (error) {
      console.error('Error deducting from wallet:', error);
      throw new Error('Failed to deduct from wallet');
    }
  }

  // حساب Cashback تلقائي
  static async calculateCashback(orderAmount, cashbackRate = 0.05) {
    return orderAmount * cashbackRate;
  }

  // إضافة Cashback بعد إتمام الطلب
  static async addCashback(customerId, orderId, orderAmount, cashbackRate = 0.05) {
    try {
      const cashbackAmount = await this.calculateCashback(orderAmount, cashbackRate);
      
      if (cashbackAmount > 0) {
        const result = await this.addToWallet(
          customerId,
          cashbackAmount,
          'CASHBACK',
          `Cashback from order #${orderId}`,
          { orderId, orderAmount, cashbackRate }
        );

        // Link transaction to orderId (for filtering + UI)
        try {
          const prisma = getPrisma();
          await prisma.walletTransaction.update({
            where: { id: result.transaction.id },
            data: { orderId }
          });
        } catch (linkError) {
          console.error('Error linking cashback transaction to order:', linkError);
        }

        console.log(`Added ${cashbackAmount} EGP cashback to customer ${customerId}`);
        return result;
      }

      return null;
    } catch (error) {
      console.error('Error adding cashback:', error);
      throw new Error('Failed to add cashback');
    }
  }

  // الحصول على سجل المعاملات
  static async getWalletTransactions(customerId, filters = {}) {
    try {
      const prisma = getPrisma();
      const { page = 1, limit = 10, type } = filters;
      const skip = (page - 1) * limit;

      const where = {
        wallet: { customerId },
        ...(type && { type })
      };

      const transactions = await prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          wallet: {
            include: {
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        }
      });

      const total = await prisma.walletTransaction.count({ where });

      return { transactions, total, page, limit };
    } catch (error) {
      console.error('Error getting wallet transactions:', error);
      throw new Error('Failed to get wallet transactions');
    }
  }

  // استخدام رصيد المحفظة في الطلب
  static async useWalletBalance(customerId, amount, orderId) {
    try {
      const prisma = getPrisma();
      const result = await this.deductFromWallet(
        customerId,
        amount,
        `Used for order #${orderId}`
      );

      // تحديث المعاملة بـ orderId
      await prisma.walletTransaction.update({
        where: { id: result.transaction.id },
        data: { orderId }
      });

      return result;
    } catch (error) {
      console.error('Error using wallet balance:', error);
      throw new Error('Failed to use wallet balance');
    }
  }

  // استرجاع المبلغ عند إلغاء الطلب
  static async refundWalletBalance(customerId, amount, orderId) {
    try {
      const prisma = getPrisma();
      const result = await this.addToWallet(
        customerId,
        amount,
        'REFUND',
        `Refund for cancelled order #${orderId}`,
        { orderId }
      );

      // تحديث المعاملة بـ orderId
      await prisma.walletTransaction.update({
        where: { id: result.transaction.id },
        data: { orderId }
      });

      return result;
    } catch (error) {
      console.error('Error refunding wallet balance:', error);
      throw new Error('Failed to refund wallet balance');
    }
  }
}

module.exports = WalletService;
