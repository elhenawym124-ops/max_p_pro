const { getSharedPrismaClient } = require('../services/sharedDatabase');
const getPrisma = () => getSharedPrismaClient();

// Get all FAQs (Public)
const getFAQs = async (req, res) => {
  try {
    const { category, search } = req.query;
    const companyId = req.user?.companyId;

    const where = { isActive: true };
    if (companyId) where.companyId = companyId;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { question: { contains: search } },
        { answer: { contains: search } }
      ];
    }

    const faqs = await getPrisma().fAQ.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
    });

    // Return array directly for admin panel
    res.json(faqs.map(faq => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags ? (typeof faq.tags === 'string' ? JSON.parse(faq.tags) : faq.tags) : [],
      order: faq.order,
      helpful: faq.helpful,
      notHelpful: faq.notHelpful,
      isActive: faq.isActive,
      version: faq.version || 1,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt
    })));
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({
      error: 'خطأ في جلب الأسئلة الشائعة',
      message: error.message
    });
  }
};

// Get FAQ categories
const getFAQCategories = async (req, res) => {
  try {
    const faqs = await getPrisma().fAQ.findMany({
      where: { isActive: true },
      select: { category: true }
    });

    // Group and count by category
    const categoryCount = faqs.reduce((acc, faq) => {
      acc[faq.category] = (acc[faq.category] || 0) + 1;
      return acc;
    }, {});

    const categories = Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count
    })).sort((a, b) => a.category.localeCompare(b.category));

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching FAQ categories:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تصنيفات الأسئلة',
      error: error.message
    });
  }
};

// Rate FAQ helpfulness
const rateFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;
    const { helpful } = req.body; // true or false

    const faq = await getPrisma().fAQ.findUnique({ where: { id: faqId } });
    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'السؤال غير موجود'
      });
    }

    const updatedFaq = await getPrisma().fAQ.update({
      where: { id: faqId },
      data: helpful
        ? { helpful: { increment: 1 } }
        : { notHelpful: { increment: 1 } }
    });

    res.json({
      success: true,
      message: 'تم تسجيل تقييمك بنجاح',
      faq: {
        helpful: updatedFaq.helpful,
        notHelpful: updatedFaq.notHelpful
      }
    });
  } catch (error) {
    console.error('Error rating FAQ:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في تقييم السؤال',
      error: error.message
    });
  }
};

// Create FAQ (Admin only)
const createFAQ = async (req, res) => {
  try {
    const { question, answer, category, tags, isActive } = req.body;
    const companyId = req.user.companyId;

    const faq = await getPrisma().fAQ.create({
      data: {
        question,
        answer,
        category: category || 'general',
        tags: Array.isArray(tags) ? JSON.stringify(tags) : (tags || '[]'),
        isActive: isActive !== undefined ? isActive : true,
        companyId,
        order: 0,
        helpful: 0,
        notHelpful: 0,
        version: 1
      }
    });

    res.status(201).json({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags ? JSON.parse(faq.tags) : [],
      order: faq.order,
      helpful: faq.helpful,
      notHelpful: faq.notHelpful,
      isActive: faq.isActive,
      version: faq.version,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({
      error: 'خطأ في إنشاء السؤال',
      message: error.message
    });
  }
};

// Update FAQ (Admin only)
const updateFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;
    const { question, answer, category, order, tags, isActive } = req.body;

    const updateData = {};
    if (question !== undefined) updateData.question = question;
    if (answer !== undefined) updateData.answer = answer;
    if (category !== undefined) updateData.category = category;
    if (order !== undefined) updateData.order = order;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? JSON.stringify(tags) : tags;
    if (isActive !== undefined) updateData.isActive = isActive;

    const faq = await getPrisma().fAQ.update({
      where: { id: faqId },
      data: updateData
    });

    res.json({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.tags ? JSON.parse(faq.tags) : [],
      order: faq.order,
      helpful: faq.helpful,
      notHelpful: faq.notHelpful,
      isActive: faq.isActive,
      version: faq.version,
      createdAt: faq.createdAt,
      updatedAt: faq.updatedAt
    });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'السؤال غير موجود' });
    }
    res.status(500).json({
      error: 'خطأ في تحديث السؤال',
      message: error.message
    });
  }
};

// Delete FAQ (Admin only)
const deleteFAQ = async (req, res) => {
  try {
    const { faqId } = req.params;

    await getPrisma().fAQ.delete({ where: { id: faqId } });

    res.json({ message: 'تم حذف السؤال بنجاح' });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'السؤال غير موجود' });
    }
    res.status(500).json({
      error: 'خطأ في حذف السؤال',
      message: error.message
    });
  }
};

// Get all FAQs for admin
const getAllFAQsForAdmin = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'superadmin';
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'غير مسموح لك بعرض جميع الأسئلة'
      });
    }

    const { category, isActive, page = 1, limit = 20 } = req.query;

    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [faqs, total] = await Promise.all([
      getPrisma().fAQ.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      }),
      getPrisma().fAQ.count({ where })
    ]);

    res.json({
      success: true,
      faqs: faqs.map(faq => ({ _id: faq.id, ...faq })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all FAQs for admin:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الأسئلة',
      error: error.message
    });
  }
};

module.exports = {
  getFAQs,
  getFAQCategories,
  rateFAQ,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  getAllFAQsForAdmin
};
