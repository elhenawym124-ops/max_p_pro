const cron = require('node-cron');
const { getSharedPrismaClient, executeWithRetry } = require('./sharedDatabase');

class BillingCronService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * بدء خدمة الخصم التلقائي
   */
  start() {
    console.log('🕐 [BILLING-CRON] Starting Billing Cron Service...');

    // يعمل يومياً الساعة 2 صباحاً
    cron.schedule('0 2 * * *', async () => {
      if (this.isRunning) {
        console.log('⚠️ [BILLING-CRON] Previous billing job still running, skipping...');
        return;
      }

      this.isRunning = true;
      console.log('🔄 [BILLING-CRON] Running daily billing job...');

      try {
        await this.processPlatformFees();
        await this.processAppSubscriptions();
        await this.checkLowBalances();
        
        console.log('✅ [BILLING-CRON] Daily billing job completed successfully');
      } catch (error) {
        console.error('❌ [BILLING-CRON] Error in billing job:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ [BILLING-CRON] Billing Cron Service started (runs daily at 2 AM)');
  }

  /**
   * خصم رسوم المنصة الشهرية
   */
  async processPlatformFees() {
    console.log('💳 [BILLING-CRON] Processing platform fees...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // جلب الاشتراكات المستحقة
      const dueSubscriptions = await executeWithRetry(async () => {
        return await getSharedPrismaClient().platformSubscription.findMany({
          where: {
            nextBillingDate: {
              gte: today,
              lt: tomorrow
            },
            status: 'ACTIVE'
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                plan: true
              }
            }
          }
        });
      });

      console.log(`📊 [BILLING-CRON] Found ${dueSubscriptions.length} subscriptions due for billing`);

      for (const subscription of dueSubscriptions) {
        try {
          await this.deductPlatformFee(subscription);
        } catch (error) {
          console.error(`❌ [BILLING-CRON] Error processing subscription ${subscription.id}:`, error);
        }
      }

      console.log('✅ [BILLING-CRON] Platform fees processing completed');
    } catch (error) {
      console.error('❌ [BILLING-CRON] Error in processPlatformFees:', error);
      throw error;
    }
  }

  /**
   * خصم رسوم المنصة من محفظة الشركة
   */
  async deductPlatformFee(subscription) {
    const { companyId, monthlyFee, company } = subscription;

    console.log(`💰 [BILLING-CRON] Processing platform fee for company: ${company.name} (${monthlyFee} EGP)`);

    try {
      await executeWithRetry(async () => {
        return await getSharedPrismaClient().$transaction(async (tx) => {
          // جلب المحفظة
          let wallet = await tx.companyWallet.findUnique({
            where: { companyId }
          });

          // إنشاء محفظة إن لم تكن موجودة
          if (!wallet) {
            wallet = await tx.companyWallet.create({
              data: {
                companyId,
                balance: 0,
                currency: 'EGP'
              }
            });
          }

          const currentBalance = parseFloat(wallet.balance.toString());
          const fee = parseFloat(monthlyFee.toString());

          // التحقق من الرصيد
          if (currentBalance < fee) {
            console.warn(`⚠️ [BILLING-CRON] Insufficient balance for ${company.name}: ${currentBalance} < ${fee}`);
            
            // تعليق الاشتراك
            await tx.platformSubscription.update({
              where: { id: subscription.id },
              data: {
                status: 'SUSPENDED',
                failedAttempts: subscription.failedAttempts + 1
              }
            });

            // تسجيل محاولة فاشلة
            await tx.billingHistory.create({
              data: {
                companyId,
                type: 'PLATFORM_FEE',
                amount: fee,
                description: `فشل خصم رسوم المنصة - رصيد غير كافٍ`,
                status: 'FAILED',
                referenceId: subscription.id
              }
            });

            return;
          }

          // خصم الرسوم
          const newBalance = currentBalance - fee;
          await tx.companyWallet.update({
            where: { id: wallet.id },
            data: {
              balance: newBalance,
              totalSpent: parseFloat(wallet.totalSpent.toString()) + fee
            }
          });

          // تسجيل الحركة
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'DEDUCT',
              amount: fee,
              balanceAfter: newBalance,
              description: `رسوم المنصة الشهرية - خطة ${company.plan}`,
              metadata: JSON.stringify({ subscriptionId: subscription.id })
            }
          });

          // تحديث تاريخ الفاتورة التالية
          const nextBillingDate = new Date(subscription.nextBillingDate);
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

          await tx.platformSubscription.update({
            where: { id: subscription.id },
            data: {
              lastBillingDate: new Date(),
              nextBillingDate,
              failedAttempts: 0
            }
          });

          // تسجيل في سجل الفواتير
          await tx.billingHistory.create({
            data: {
              companyId,
              type: 'PLATFORM_FEE',
              amount: fee,
              description: `رسوم المنصة الشهرية - خطة ${company.plan}`,
              status: 'SUCCESS',
              referenceId: subscription.id
            }
          });

          console.log(`✅ [BILLING-CRON] Platform fee deducted successfully for ${company.name}`);
        });
      });
    } catch (error) {
      console.error(`❌ [BILLING-CRON] Error deducting platform fee for ${company.name}:`, error);
      throw error;
    }
  }

  /**
   * خصم اشتراكات الأدوات الشهرية
   */
  async processAppSubscriptions() {
    console.log('📱 [BILLING-CRON] Processing app subscriptions...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // جلب الأدوات المستحقة
      const dueApps = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyApp.findMany({
          where: {
            status: 'ACTIVE',
            nextBillingAt: {
              gte: today,
              lt: tomorrow
            }
          },
          include: {
            app: {
              select: {
                name: true,
                monthlyPrice: true
              }
            },
            company: {
              select: {
                name: true
              }
            }
          }
        });
      });

      console.log(`📊 [BILLING-CRON] Found ${dueApps.length} app subscriptions due for billing`);

      for (const companyApp of dueApps) {
        try {
          await this.deductAppSubscription(companyApp);
        } catch (error) {
          console.error(`❌ [BILLING-CRON] Error processing app ${companyApp.id}:`, error);
        }
      }

      console.log('✅ [BILLING-CRON] App subscriptions processing completed');
    } catch (error) {
      console.error('❌ [BILLING-CRON] Error in processAppSubscriptions:', error);
      throw error;
    }
  }

  /**
   * خصم اشتراك أداة من محفظة الشركة
   */
  async deductAppSubscription(companyApp) {
    const { companyId, app, company } = companyApp;
    const monthlyPrice = parseFloat(app.monthlyPrice?.toString() || 0);

    if (monthlyPrice <= 0) {
      console.log(`⏭️ [BILLING-CRON] Skipping ${app.name} - no monthly fee`);
      return;
    }

    console.log(`💰 [BILLING-CRON] Processing app subscription: ${app.name} for ${company.name} (${monthlyPrice} EGP)`);

    try {
      await executeWithRetry(async () => {
        return await getSharedPrismaClient().$transaction(async (tx) => {
          // جلب المحفظة
          const wallet = await tx.companyWallet.findUnique({
            where: { companyId }
          });

          if (!wallet) {
            console.warn(`⚠️ [BILLING-CRON] No wallet found for ${company.name}`);
            return;
          }

          const currentBalance = parseFloat(wallet.balance.toString());

          // التحقق من الرصيد
          if (currentBalance < monthlyPrice) {
            console.warn(`⚠️ [BILLING-CRON] Insufficient balance for ${app.name}: ${currentBalance} < ${monthlyPrice}`);
            
            // تعليق الأداة
            await tx.companyApp.update({
              where: { id: companyApp.id },
              data: { status: 'SUSPENDED' }
            });

            // تسجيل محاولة فاشلة
            await tx.billingHistory.create({
              data: {
                companyId,
                type: 'APP_SUBSCRIPTION',
                amount: monthlyPrice,
                description: `فشل خصم اشتراك ${app.name} - رصيد غير كافٍ`,
                status: 'FAILED',
                referenceId: companyApp.id
              }
            });

            return;
          }

          // خصم الاشتراك
          const newBalance = currentBalance - monthlyPrice;
          await tx.companyWallet.update({
            where: { id: wallet.id },
            data: {
              balance: newBalance,
              totalSpent: parseFloat(wallet.totalSpent.toString()) + monthlyPrice
            }
          });

          // تسجيل الحركة
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: 'DEDUCT',
              amount: monthlyPrice,
              balanceAfter: newBalance,
              description: `اشتراك شهري - ${app.name}`,
              metadata: JSON.stringify({ appId: companyApp.id })
            }
          });

          // تحديث تاريخ الفاتورة التالية
          const nextBillingAt = new Date(companyApp.nextBillingAt);
          nextBillingAt.setMonth(nextBillingAt.getMonth() + 1);

          await tx.companyApp.update({
            where: { id: companyApp.id },
            data: {
              nextBillingAt,
              totalSpent: parseFloat(companyApp.totalSpent.toString()) + monthlyPrice
            }
          });

          // تسجيل في سجل الفواتير
          await tx.billingHistory.create({
            data: {
              companyId,
              type: 'APP_SUBSCRIPTION',
              amount: monthlyPrice,
              description: `اشتراك شهري - ${app.name}`,
              status: 'SUCCESS',
              referenceId: companyApp.id
            }
          });

          console.log(`✅ [BILLING-CRON] App subscription deducted successfully: ${app.name}`);
        });
      });
    } catch (error) {
      console.error(`❌ [BILLING-CRON] Error deducting app subscription ${app.name}:`, error);
      throw error;
    }
  }

  /**
   * التحقق من الأرصدة المنخفضة وإرسال تنبيهات
   */
  async checkLowBalances() {
    console.log('⚠️ [BILLING-CRON] Checking for low balances...');

    try {
      const lowBalanceWallets = await executeWithRetry(async () => {
        return await getSharedPrismaClient().companyWallet.findMany({
          where: {
            balance: { lt: 100 } // أقل من 100 جنيه
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
      });

      console.log(`📊 [BILLING-CRON] Found ${lowBalanceWallets.length} wallets with low balance`);

      for (const wallet of lowBalanceWallets) {
        console.log(`⚠️ [BILLING-CRON] Low balance alert for ${wallet.company.name}: ${wallet.balance} EGP`);
        
        // TODO: إرسال إشعار للشركة
        // يمكن إضافة notification service هنا
      }

      console.log('✅ [BILLING-CRON] Low balance check completed');
    } catch (error) {
      console.error('❌ [BILLING-CRON] Error in checkLowBalances:', error);
      throw error;
    }
  }

  /**
   * تشغيل يدوي للخصم (للاختبار)
   */
  async runManually() {
    console.log('🔄 [BILLING-CRON] Running billing job manually...');
    
    this.isRunning = true;
    try {
      await this.processPlatformFees();
      await this.processAppSubscriptions();
      await this.checkLowBalances();
      
      console.log('✅ [BILLING-CRON] Manual billing job completed');
    } catch (error) {
      console.error('❌ [BILLING-CRON] Error in manual billing job:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new BillingCronService();
