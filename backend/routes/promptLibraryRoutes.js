const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const { authenticateToken , requireSuperAdmin } = require('../utils/verifyToken');

// 📚 Get all prompts from library (للمستخدمين العاديين)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, businessType, search, featured } = req.query;

    const where = {
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    if (businessType) {
      where.businessType = businessType;
    }

    if (featured === 'true') {
      where.isFeatured = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameAr: { contains: search } },
        { description: { contains: search } },
        { descriptionAr: { contains: search } },
        { tags: { contains: search } }
      ];
    }

    const prompts = await getSharedPrismaClient().promptLibrary.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { sortOrder: 'asc' },
        { usageCount: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('❌ Error fetching prompt library:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب مكتبة البرومبتات'
    });
  }
});

// 📖 Get single prompt by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const prompt = await getSharedPrismaClient().promptLibrary.findUnique({
      where: { id }
    });

    if (!prompt) {
      return res.status(404).json({
        success: false,
        error: 'البرومبت غير موجود'
      });
    }

    // Increment usage count
    await getSharedPrismaClient().promptLibrary.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    res.json({
      success: true,
      data: prompt
    });
  } catch (error) {
    console.error('❌ Error fetching prompt:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب البرومبت'
    });
  }
});

// 🔧 Get categories list
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await getSharedPrismaClient().promptLibrary.groupBy({
      by: ['category'],
      where: {
        isActive: true
      },
      _count: {
        category: true
      }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب التصنيفات'
    });
  }
});

// ==================== SuperAdmin Routes ====================

// 📝 Create new prompt (SuperAdmin only)
router.post('/admin/create', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const {
      name,
      promptContent
    } = req.body;

    // Validation - فقط الاسم والبرومبت
    if (!name || !promptContent) {
      return res.status(400).json({
        success: false,
        error: 'الحقول المطلوبة: name, promptContent'
      });
    }

    const prompt = await getSharedPrismaClient().promptLibrary.create({
      data: {
        name,
        nameAr: name, // نفس الاسم
        description: 'برومبت مخصص',
        descriptionAr: 'برومبت مخصص',
        category: 'general',
        promptContent,
        isActive: true,
        isFeatured: false,
        sortOrder: 0,
        createdBy: req.user.userId
      }
    });

    res.json({
      success: true,
      message: 'تم إنشاء البرومبت بنجاح',
      data: prompt
    });
  } catch (error) {
    console.error('❌ Error creating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء البرومبت'
    });
  }
});

// ✏️ Update prompt (SuperAdmin only)
router.put('/admin/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      promptContent
    } = req.body;

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
      updateData.nameAr = name;
    }
    if (promptContent !== undefined) updateData.promptContent = promptContent;

    const prompt = await getSharedPrismaClient().promptLibrary.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'تم تحديث البرومبت بنجاح',
      data: prompt
    });
  } catch (error) {
    console.error('❌ Error updating prompt:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تحديث البرومبت'
    });
  }
});

// 🗑️ Delete prompt (SuperAdmin only)
router.delete('/admin/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await getSharedPrismaClient().promptLibrary.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'تم حذف البرومبت بنجاح'
    });
  } catch (error) {
    console.error('❌ Error deleting prompt:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في حذف البرومبت'
    });
  }
});

// 📊 Get all prompts for admin (including inactive)
router.get('/admin/all', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const prompts = await getSharedPrismaClient().promptLibrary.findMany({
      orderBy: [
        { isFeatured: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: prompts
    });
  } catch (error) {
    console.error('❌ Error fetching all prompts:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب البرومبتات'
    });
  }
});

// 📈 Get prompt statistics (SuperAdmin only)
router.get('/admin/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const totalPrompts = await getSharedPrismaClient().promptLibrary.count();
    const activePrompts = await getSharedPrismaClient().promptLibrary.count({
      where: { isActive: true }
    });
    const featuredPrompts = await getSharedPrismaClient().promptLibrary.count({
      where: { isFeatured: true }
    });

    const categoryStats = await getSharedPrismaClient().promptLibrary.groupBy({
      by: ['category'],
      _count: {
        category: true
      }
    });

    const topUsed = await getSharedPrismaClient().promptLibrary.findMany({
      take: 5,
      orderBy: {
        usageCount: 'desc'
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        usageCount: true,
        category: true
      }
    });

    res.json({
      success: true,
      data: {
        totalPrompts,
        activePrompts,
        featuredPrompts,
        categoryStats,
        topUsed
      }
    });
  } catch (error) {
    console.error('❌ Error fetching prompt stats:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات البرومبتات'
    });
  }
});

module.exports = router;

