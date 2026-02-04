const express = require('express');
const router = express.Router();
const aiController = require('../controller/aiController');
const aiPromptController = require('../controller/aiPromptController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');
const EnhancedOrderService = require('../services/enhancedOrderService');

router.put('/settings', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.updateSettings);
router.post('/toggle', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.toggle);
router.get('/stats', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getAIStatistics);
router.delete('/memory/clear', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.clearConversationMemory);
router.post('/knowledge-base/update', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.updateKnowledgeBase);
router.get('/memory/stats', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getMemoryStatistics);
router.get('/rag/stats', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getRAGStatistics);
router.get('/multimodal/stats', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getMultimodalProcessingStatistics);
router.get('/available-models', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getAvailableModels);
router.get('/gemini-keys', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getGeminiKeys);
router.post('/gemini-keys', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.addGeminiKey);
router.delete('/gemini-keys/:id', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.deleteGeminiKey);




// ================================
// SYSTEM PROMPTS MANAGEMENT
// ================================

router.get('/prompts', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getAllSystemPrompts);
router.post('/prompts', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.addNewSystemPrompt);
router.put('/prompts/:id/activate', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.activateSystemPrompt);
router.put('/prompts/:id', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.updateSystemPrompt);
router.delete('/prompts/:id', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.deleteSystemPrompt);

router.delete('/prompts/:id', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.deleteSystemPrompt);

// ================================
// SYSTEM TEMPLATES (Granular XML)
// ================================
router.get('/prompt-templates', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiPromptController.getAllTemplates);
router.post('/prompt-templates', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiPromptController.saveTemplate);
router.post('/prompt-templates/reset', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiPromptController.resetTemplate);
// MEMORY MANAGEMENT
// ================================

router.get('/memory/settings', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getMemorySettings);
router.put('/memory/settings', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.updateMemorySettings);
router.put('/memory/cleanup', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.cleanupOldMemory);

// ================================
// RESPONSE RULES (قواعد الاستجابة)
// ================================

router.get('/response-rules/config', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getResponseRulesConfig); // الحصول على تكوين القواعد
router.get('/response-rules', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getResponseRules); // الحصول على قواعد الشركة
router.put('/response-rules', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.updateResponseRules); // تحديث القواعد
router.post('/response-rules/reset', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.resetResponseRules); // إعادة تعيين للافتراضي

// ================================
// RULE-BASED QUICK RESPONSES (الردود السريعة)
// ================================

router.get('/rule-responses', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.getRuleResponses); // جلب إعدادات الردود السريعة
router.put('/rule-responses', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), aiController.updateRuleResponses); // تحديث إعدادات الردود السريعة

// ================================
// CREATE ORDER FROM CONVERSATION
// ================================

/**
 * إنشاء طلب من المحادثة
 * POST /api/v1/ai/create-order-from-conversation
 */
router.post('/create-order-from-conversation', verifyToken.authenticateToken, checkAppAccess('ai-chat-basic'), async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();

    const { customerId, conversationId, products, shippingAddress, notes } = req.body;
    const companyId = req.user.companyId;

    // التحقق من البيانات المطلوبة
    if (!customerId || !products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'معرف العميل والمنتجات مطلوبة'
      });
    }

    // حساب المجموع الكلي
    const subtotal = products.reduce((sum, item) => sum + item.total, 0);

    // تحضير بيانات الطلب
    const orderData = {
      companyId,
      customerId,
      conversationId,

      // معلومات المنتجات
      productName: products.map(p => p.productName).join(', '),
      productPrice: products[0].price,
      quantity: products.reduce((sum, p) => sum + p.quantity, 0),

      // معلومات الشحن
      customerAddress: shippingAddress || '',
      city: 'غير محدد', // يمكن استخراجها من العنوان لاحقاً

      // ملاحظات
      notes: notes || '',

      // معلومات الاستخراج
      extractionMethod: 'manual_order_modal',
      confidence: 1.0,

      // المنتجات للحفظ في OrderItems
      products: products
    };

    // إنشاء الطلب
    const result = await enhancedOrderService.createEnhancedOrder(orderData);
    await enhancedOrderService.disconnect();

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب من المحادثة:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في إنشاء الطلب'
    });
  }
});

module.exports = router;