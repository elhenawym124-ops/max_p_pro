const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');

const getSettings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    let settings = await executeWithRetry(async () => {
      return await prisma.orderInvoiceSettings.findUnique({
        where: { companyId }
      });
    });

    if (!settings) {
      settings = await executeWithRetry(async () => {
        return await prisma.orderInvoiceSettings.create({
          data: { companyId }
        });
      });
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Error fetching invoice settings:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب إعدادات الفواتير',
      error: error.message
    });
  }
};

const updateSettings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const updateData = req.body;
    const prisma = getSharedPrismaClient();

    const allowedFields = [
      'autoGenerate',
      'autoGenerateOnStatus',
      'invoicePrefix',
      'invoiceNumberFormat',
      'defaultTaxRate',
      'defaultTerms',
      'defaultNotes',
      'defaultDueDays',
      'showCompanyLogo',
      'showTaxBreakdown',
      'showPaymentMethod',
      'showOrderItems',
      'autoEmailToCustomer',
      'emailSubject',
      'emailBody',
      'pdfPageSize',
      'pdfOrientation',
      'primaryColor',
      'secondaryColor',
      'fontFamily'
    ];

    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const settings = await executeWithRetry(async () => {
      return await prisma.orderInvoiceSettings.upsert({
        where: { companyId },
        update: filteredData,
        create: {
          companyId,
          ...filteredData
        }
      });
    });

    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      data: settings
    });

  } catch (error) {
    console.error('Error updating invoice settings:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تحديث إعدادات الفواتير',
      error: error.message
    });
  }
};

const resetSettings = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const prisma = getSharedPrismaClient();

    await executeWithRetry(async () => {
      return await prisma.orderInvoiceSettings.delete({
        where: { companyId }
      });
    });

    const settings = await executeWithRetry(async () => {
      return await prisma.orderInvoiceSettings.create({
        data: { companyId }
      });
    });

    res.json({
      success: true,
      message: 'تم إعادة تعيين الإعدادات إلى القيم الافتراضية',
      data: settings
    });

  } catch (error) {
    console.error('Error resetting invoice settings:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في إعادة تعيين الإعدادات',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettings
};
