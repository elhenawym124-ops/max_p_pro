const fewShotService = require('../services/aiAgent/fewShotService');

/**
 * Few-Shot Controller
 * إدارة الأمثلة وإعدادات نظام Few-Shot
 */

// ==================== Settings ====================

exports.getSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const settings = await fewShotService.getSettings(companyId);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إعدادات Few-Shot'
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const settings = await fewShotService.updateSettings(companyId, req.body);
    
    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      data: settings
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الإعدادات'
    });
  }
};

// ==================== Examples ====================

exports.getExamples = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { category, isActive } = req.query;
    
    const filters = {};
    if (category) filters.category = category;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    
    const examples = await fewShotService.getExamples(companyId, filters);
    
    res.json({
      success: true,
      data: examples,
      count: examples.length
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error getting examples:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الأمثلة'
    });
  }
};

exports.getExample = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    
    const examples = await fewShotService.getExamples(companyId);
    const example = examples.find(ex => ex.id === id);
    
    if (!example) {
      return res.status(404).json({
        success: false,
        message: 'المثال غير موجود'
      });
    }
    
    res.json({
      success: true,
      data: example
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error getting example:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب المثال'
    });
  }
};

exports.createExample = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { customerMessage, aiResponse, category, tags, priority, notes, isActive } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!customerMessage || !aiResponse) {
      return res.status(400).json({
        success: false,
        message: 'سؤال العميل ورد الذكاء الاصطناعي مطلوبان'
      });
    }
    
    const example = await fewShotService.addExample(companyId, {
      customerMessage,
      aiResponse,
      category,
      tags,
      priority,
      notes,
      isActive
    });
    
    res.status(201).json({
      success: true,
      message: 'تم إضافة المثال بنجاح',
      data: example
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error creating example:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إضافة المثال'
    });
  }
};

exports.updateExample = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const example = await fewShotService.updateExample(id, updateData);
    
    res.json({
      success: true,
      message: 'تم تحديث المثال بنجاح',
      data: example
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error updating example:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث المثال'
    });
  }
};

exports.deleteExample = async (req, res) => {
  try {
    const { id } = req.params;
    
    await fewShotService.deleteExample(id);
    
    res.json({
      success: true,
      message: 'تم حذف المثال بنجاح'
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error deleting example:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حذف المثال'
    });
  }
};

exports.bulkCreateExamples = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { examples } = req.body;
    
    if (!Array.isArray(examples) || examples.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يجب إرسال مصفوفة من الأمثلة'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const exampleData of examples) {
      try {
        const example = await fewShotService.addExample(companyId, exampleData);
        results.push(example);
      } catch (error) {
        errors.push({
          data: exampleData,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `تم إضافة ${results.length} من ${examples.length} مثال`,
      data: {
        created: results,
        errors: errors
      }
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error bulk creating examples:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إضافة الأمثلة'
    });
  }
};

// ==================== Stats & Analytics ====================

exports.getStats = async (req, res) => {
  try {
    const { companyId } = req.user;
    const stats = await fewShotService.getStats(companyId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات'
    });
  }
};

// ==================== Testing ====================

exports.testPrompt = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { customerMessage, messageContext } = req.body;
    
    if (!customerMessage) {
      return res.status(400).json({
        success: false,
        message: 'رسالة العميل مطلوبة'
      });
    }
    
    const selectedExamples = await fewShotService.selectExamples(
      companyId,
      customerMessage,
      messageContext || {}
    );
    
    const prompt = fewShotService.buildFewShotPrompt(selectedExamples);
    
    res.json({
      success: true,
      data: {
        selectedExamples,
        examplesCount: selectedExamples.length,
        prompt
      }
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error testing prompt:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في اختبار البرومبت'
    });
  }
};

// ==================== Categories ====================

exports.getCategories = async (req, res) => {
  try {
    const { companyId } = req.user;
    const examples = await fewShotService.getExamples(companyId);
    
    const categories = [...new Set(examples.map(ex => ex.category).filter(Boolean))];
    
    const categoriesWithCount = categories.map(cat => ({
      name: cat,
      count: examples.filter(ex => ex.category === cat).length
    }));
    
    res.json({
      success: true,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('❌ [FEW-SHOT-CONTROLLER] Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب التصنيفات'
    });
  }
};
