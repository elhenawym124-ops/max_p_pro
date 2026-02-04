/**
 * Legacy Agent Module (Formerly MessageProcessor)
 * 
 * Represents the 2023-style "Prompt Engineering + Validator" architecture.
 * Migrated to /legacy folder for dual-mode support.
 */

const { getSharedPrismaClient, safeQuery } = require('../../sharedDatabase');
const memoryService = require('../../memoryService');
const aiResponseMonitor = require('../../aiResponseMonitor');
const AIErrorHandler = require('../../aiErrorHandler');
const { safeJsonParse } = require('../../../utils/jsonUtils');
const PromptService = require('../promptService');
const RuleBasedResponder = require('../RuleBasedResponder');

class LegacyAgent {
    constructor(aiAgentService) {
        // ❌ REMOVED: this.prisma - لا نستخدم Prisma client مباشرة، بل نستخدم getSharedPrismaClient() داخل safeQuery
        // this.prisma = getSharedPrismaClient(); // ❌ Removed to prevent stale client usage
        this.errorHandler = new AIErrorHandler();
        // ✅ حفظ reference لـ aiAgentService للوصول للدوال المساعدة
        this.aiAgentService = aiAgentService;
    }

    /**
     * Process customer message and generate AI response
     * 
     * نفس الدالة من aiAgentService.js لكن في module منفصل
     * يستخدم this.aiAgentService للدوال المساعدة
     */
    async processCustomerMessage(messageData) {
        const startTime = Date.now();
        let errorContext = { companyId: 'unknown', intent: 'general_inquiry' };

        try {
            console.log(`🤖 [DEBUG] ===== Starting processCustomerMessage (Legacy Agent) =====`);
            const maskedContent = messageData?.content ? `${messageData.content.substring(0, 5)}***` : 'EMPTY';
            console.log(`🔍 [PROCESS-START] Message: "${maskedContent}" | CompanyId: ${messageData?.companyId || messageData?.customerData?.companyId || 'UNKNOWN'}`);

            // 1. Validation & Setup
            const setup = await this._validateAndSetupContext(messageData);
            if (!setup.valid) return setup.result;

            const { finalCompanyId, conversation, geminiConfig, companyPrompts, settings } = setup;
            errorContext.companyId = finalCompanyId;

            // 2. Post Details
            const { postDetails, postId, metadata } = this._handlePostDetails(conversation);

            // 3. AI Enabled Check
            if (settings.isEnabled === false || settings.autoReplyEnabled === false) {
                console.log(`🚫 [AI-DISABLED] Global AI is disabled for company ${finalCompanyId}, skipping processing (Fail-safe)`);
                return {
                    success: false, content: null, reason: 'AI_DISABLED_GLOBAL',
                    message: 'الذكاء الاصطناعي معطل للنظام بالكامل', silent: true
                };
            }

            if (metadata && metadata.aiEnabled === false) {
                return {
                    success: false, content: null, reason: 'AI_DISABLED',
                    message: 'الذكاء الاصطناعي معطل لهذه المحادثة', silent: true
                };
            }

            // 4. Reply Mode Check
            const replyModeCheck = await this._checkReplyMode(settings, conversation?.id || messageData.conversationId, messageData);
            if (replyModeCheck.shouldSkip) {
                return {
                    success: false,
                    content: null,
                    reason: replyModeCheck.reason,
                    message: replyModeCheck.message,
                    silent: replyModeCheck.silent
                };
            }

            // 5. Fetch Memory (Customer-Scoped)
            // ✅ FIX: Fetch global memory for this customer across all conversations
            // ⚠️ EXCEPTION: For 'test-chat', restrict to current conversation only to avoid context pollution from previous tests
            const memoryLimit = settings.maxMessagesPerConversation || 50;
            const isTestChat = messageData.platform === 'test-chat';

            const conversationMemory = await memoryService.getConversationMemory(
                isTestChat ? messageData.conversationId : null, // Uses 'null' for global context (WhatsApp/FB), but specific ID for Test Chat
                messageData.senderId,
                memoryLimit,
                finalCompanyId
            );

            // 6. Image Processing (with Context)
            const startImage = Date.now();
            const imageResult = await this._handleImageProcessing(
                messageData.attachments,
                messageData,
                finalCompanyId,
                conversationMemory
            );
            if (imageResult.handled) {
                console.log(`🖼️ [IMAGE-PROCESSING] Handled in ${Date.now() - startImage}ms`);
                return imageResult.response;
            }

            // ⚡ 6.5. QUICK INTENT CHECK (Before expensive AI analysis)
            // Check for simple greetings/thanks that can be handled by RuleBasedResponder without AI
            const ContextManager = require('../contextManager');
            const tempContextManager = new ContextManager(this.aiAgentService);
            const quickResult = tempContextManager.quickIntentCheck(messageData.content);

            if (quickResult && ['greeting', 'farewell'].includes(quickResult.intent)) {
                console.log(`⚡ [QUICK-INTENT] Detected: ${quickResult.intent} (Confidence: ${quickResult.confidence}) - Trying RuleBasedResponder first`);

                const quickRuleResponse = RuleBasedResponder.tryRespond(
                    messageData.content,
                    quickResult.intent,
                    quickResult.confidence, // ✅ Use calculated confidence
                    {
                        companyId: finalCompanyId,
                        companySettings: settings,
                        conversationId: messageData.conversationId,
                        conversationState: {}
                    }
                );

                if (quickRuleResponse) {
                    console.log(`⚡ [QUICK-RESPONSE] RuleBasedResponder handled ${quickResult.intent} - Saved AI tokens!`);

                    // Save to memory
                    try {
                        await memoryService.saveInteraction({
                            conversationId: messageData.conversationId,
                            senderId: messageData.senderId,
                            companyId: finalCompanyId,
                            userMessage: messageData.content,
                            aiResponse: quickRuleResponse.content,
                            intent: quickRuleResponse.intent,
                            sentiment: 'neutral',
                            timestamp: new Date(),
                            updatedAt: new Date(), // ✅ FIX: Added updatedAt here too
                            metadata: { source: 'quick-rule-based', tokensSaved: true, confidence: quickResult.confidence }
                        });
                    } catch (memErr) {
                        console.warn('⚠️ [QUICK-RESPONSE] Failed to save memory:', memErr.message);
                    }

                    return {
                        success: true,
                        content: quickRuleResponse.content,
                        intent: quickRuleResponse.intent,
                        source: 'quick-rule-based',
                        processingTime: Date.now() - startTime,
                        tokensSaved: true,
                        confidence: quickResult.confidence
                    };
                }
            }

            // 7. Retrieve Data (RAG, Context)
            const dataContext = await this._retrieveDataAndContext(
                messageData.conversationId,
                messageData.senderId,
                settings,
                finalCompanyId,
                messageData.content,
                messageData.customerData,
                postDetails,
                conversationMemory // Pass pre-fetched memory
            );
            errorContext.intent = dataContext.intent;

            // ⚡ 7.5. Rule-based Response Check (Token Saver)
            // Check if we can respond with a simple rule-based response
            // Now with: Multi-Tenant, Context Awareness, Kill-Switch
            const ruleBasedResponse = RuleBasedResponder.tryRespond(
                messageData.content,
                dataContext.intent,
                dataContext.confidence || dataContext.enhancedContext?.confidence || 0.5,
                {
                    companyId: finalCompanyId,
                    companySettings: settings,
                    conversationId: messageData.conversationId,
                    conversationState: dataContext.enhancedContext?.conversationState || {}
                }
            );

            if (ruleBasedResponse) {
                // Save to memory for context continuity
                await memoryService.saveInteraction({
                    conversationId: messageData.conversationId,
                    senderId: messageData.senderId,
                    companyId: finalCompanyId,
                    userMessage: messageData.content,
                    aiResponse: ruleBasedResponse.content,
                    intent: ruleBasedResponse.intent,
                    sentiment: 'neutral',
                    timestamp: new Date(),
                    metadata: {
                        source: 'rule-based',
                        tokensSaved: true,
                        locale: ruleBasedResponse.metadata?.locale
                    }
                });

                return {
                    success: true,
                    content: ruleBasedResponse.content,
                    intent: ruleBasedResponse.intent,
                    source: 'rule-based',
                    processingTime: Date.now() - startTime,
                    tokensSaved: true,
                    metadata: ruleBasedResponse.metadata
                };
            }

            // 8. Generate Response (AI)
            const response = await this._generateAndProcessResponse(
                {
                    ...dataContext,
                    messageData,
                    postDetails,
                    companyPrompts,
                    content: messageData.content,
                    customerData: messageData.customerData,
                    hasImages: dataContext.images.length > 0
                },
                {
                    finalCompanyId,
                    conversationId: messageData.conversationId,
                    senderId: messageData.senderId,
                    intent: dataContext.intent,
                    customPrompt: messageData.customPrompt,
                    startTime
                }
            );

            return response;

        } catch (error) {
            console.error('❌ [PROCESS-ERROR] Unhandled error in processCustomerMessage:', error.message);

            // Error Monitoring
            const { simpleMonitor } = require('../../simpleMonitor');
            if (simpleMonitor) {
                await simpleMonitor.logError(error, {
                    companyId: errorContext.companyId,
                    conversationId: messageData?.conversationId,
                    customerId: messageData?.senderId,
                    intent: errorContext.intent,
                    silent: true
                });
            }

            const criticalErrorTypes = ['auth_error', 'service_unavailable', 'api_quota_exceeded'];
            const errorType = error.code || 'unknown_error';

            if (criticalErrorTypes.includes(errorType)) {
                await aiResponseMonitor.sendNotification({
                    companyId: errorContext.companyId,
                    type: 'ai_critical_failure',
                    severity: 'high',
                    title: `🚨 فشل حرج في الذكاء الاصطناعي: ${errorType}`,
                    message: `فشل النظام في معالجة رسالة العميل. نوع الخطأ: ${errorType}. رسالة الخطأ: ${error.message.substring(0, 200)}`,
                    metadata: {
                        errorType,
                        errorMessage: error.message,
                        conversationId: messageData?.conversationId,
                        customerId: messageData?.senderId,
                        intent: errorContext.intent,
                        userMessage: messageData?.content?.substring(0, 100)
                    }
                });
            }

            console.log('🤐 [SILENT-MODE] System is silent with customer - no response sent (Exception)');
            return {
                success: false,
                error: error.message,
                content: null,
                shouldEscalate: false,
                processingTime: Date.now() - startTime,
                intent: errorContext.intent || 'general_inquiry',
                silent: true,
                errorType
            };
        }
    }


    /**
     * Helper Methods for Image Processing
     * These methods are used internally by processCustomerMessage
     */

    /*
     * معالجة الصور مع الـ AI باستخدام الذاكرة (Context Aware)
     */
    async processImageWithAI(imageAnalysis, messageData, intent = 'general_inquiry', productMatch, conversationMemory = []) {
        try {
            //console.log('🖼️ [IMAGE-AI] Processing image with AI (memory-independent)...');

            // الحصول على معلومات الشركة والـ prompts
            const finalCompanyId = messageData.companyId || messageData.customerData?.companyId;
            //console.log('🏢 [IMAGE-AI] Using companyId:', finalCompanyId);
            const companyPrompts = await this.aiAgentService.getCompanyPrompts(finalCompanyId);

            // بناء prompt خاص بالصور بدون استخدام الذاكرة
            const imagePrompt = this.buildImageResponsePrompt(
                imageAnalysis,
                companyPrompts,
                productMatch,
                messageData.customerData
            );

            // تحضير سياق الرسالة للأنماط (بدون ذاكرة)
            const messageContext = {
                messageType: 'image_analysis',
                inquiryType: intent,
                timeOfDay: this.aiAgentService.getTimeOfDay(),
                customerHistory: {
                    isReturning: false, // نعتبر كل صورة كتفاعل جديد
                    previousPurchases: 0
                }
            };

            // إنشاء الرد مع الـ AI باستخدام الذاكرة
            let aiContent = await this.aiAgentService.generateAIResponse(
                imagePrompt,
                conversationMemory, // استخدم الذاكرة الآن!
                true,
                null, // geminiConfig
                finalCompanyId,
                messageData.conversationId,
                messageContext
            );

            // ✅ التحقق من نوع الرد - قد يكون string أو كائن { content, silentReason }
            if (aiContent && typeof aiContent === 'object' && aiContent.content === null) {
                // النظام صامت - إرجاع null
                aiContent = null;
            } else if (typeof aiContent === 'string') {
                // رد عادي
                //console.log('✅ [IMAGE-AI] Image processed successfully with independent analysis');
            }

            return {
                content: aiContent,
                intent: intent,
                confidence: 0.9,
                shouldEscalate: false,
                metadata: {
                    processingType: 'image_independent',
                    hasProductMatch: !!productMatch?.found,
                    analysisTimestamp: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('❌ [IMAGE-AI] Error processing image with AI:', error);

            // رد افتراضي في حالة الخطأ
            return {
                content: 'عذراً، حدث خطأ في تحليل الصورة. ممكن تجربي ترسليها تاني؟',
                intent: 'error_handling',
                confidence: 0.1,
                shouldEscalate: true,
                metadata: {
                    processingType: 'image_error',
                    error: error.message
                }
            };
        }
    }

    /**
     * دالة معالجة منفصلة مع الـ AI Agent للصور
     */
    async processWithAI(content, messageData, intent = 'general_inquiry') {
        const startTime = Date.now();

        try {
            //console.log('🤖 [AI-PROCESSING] Processing with AI Agent...');
            //console.log('📝 [AI-PROCESSING] Content:', content.substring(0, 100) + '...');
            //console.log('🎯 [AI-PROCESSING] Intent:', intent);

            // الحصول على معلومات الشركة والـ prompts
            const finalCompanyId = messageData.companyId || messageData.customerData?.companyId;
            //console.log('🏢 [COMPANY-DEBUG] Using companyId:', finalCompanyId);
            const companyPrompts = await this.aiAgentService.getCompanyPrompts(finalCompanyId);

            // جلب الذاكرة والتفاعلات السابقة
            // الحصول على إعدادات الذاكرة من قاعدة البيانات
            const settings = await this.aiAgentService.getSettings(finalCompanyId);
            const memoryLimit = settings.maxMessagesPerConversation || 50;
            // ✅ FIX: استخدام null للـ conversationId لجلب التاريخ الكامل للعميل
            const conversationMemory = await memoryService.getConversationMemory(null, messageData.senderId, memoryLimit, finalCompanyId);

            // معالجة الرد مع الـ RAG إذا كان مطلوباً
            let ragData = [];
            if (intent === 'product_inquiry' || intent === 'price_inquiry') {
                try {
                    const ragService = require('../../ragService');
                    this.aiAgentService.ragService = ragService;
                    await ragService.ensureInitialized();

                    // ✅ FIX: Pass conversationMemory to RAG for context awareness (e.g. "How much is it?" -> implies last product)
                    ragData = await ragService.retrieveRelevantData(
                        content,
                        intent,
                        messageData.customerData?.id,
                        finalCompanyId,
                        messageData.ipAddress || null,
                        conversationMemory // 🧠 Context Injection
                    );
                } catch (error) {
                    console.error('❌ Error getting RAG data:', error);
                    ragData = [];
                }
            }


            // إنشاء الـ prompt المتقدم
            // إنشاء الـ prompt المتقدم
            const prompt = await this.aiAgentService.buildPrompt(content, companyPrompts, conversationMemory, ragData, messageData.customerData, messageData);

            // ✅ DEBUG: Inspect RAG Data (Sanitized)
            if (ragData && ragData.length > 0) {
                console.log(`🔍 [RAG-DEBUG] Found ${ragData.length} relevant items. Metadata sanitized for privacy.`);
            }

            // تحضير سياق الرسالة للأنماط
            const messageContext = {
                messageType: intent,
                inquiryType: intent,
                timeOfDay: this.aiAgentService.getTimeOfDay(),
                customerHistory: {
                    isReturning: conversationMemory.length > 0,
                    previousPurchases: 0 // يمكن تحسينه لاحقاً
                },
                conversationMemory: conversationMemory // ✅ إضافة conversationMemory للتحقق من المحادثات الجديدة
            };

            // إنشاء الرد مع الـ AI مع تطبيق الأنماط
            let aiContent = await this.aiAgentService.generateAIResponse(
                prompt,
                conversationMemory,
                true,
                null, // geminiConfig
                finalCompanyId,
                messageData.conversationId,
                messageContext
            );

            // ✅ التحقق من نوع الرد - قد يكون string أو كائن { content, silentReason }
            if (aiContent && typeof aiContent === 'object' && aiContent.content === null) {
                // النظام صامت - إرجاع null
                aiContent = null;
            } else if (typeof aiContent === 'string') {
                // رد عادي
            }

            // الحصول على معلومات النموذج المستخدم للشركة
            const currentModel = await this.aiAgentService.getCurrentActiveModel(finalCompanyId);

            // ✅ Extract images from RAG data if available
            let responseImages = [];
            if (ragData && ragData.length > 0) {
                ragData.forEach(item => {
                    if (item.metadata && item.metadata.images) {
                        // Handle array of images or string
                        let imgs = item.metadata.images;
                        if (typeof imgs === 'string') {
                            try { imgs = JSON.parse(imgs); } catch (e) { imgs = [imgs]; }
                        }
                        if (Array.isArray(imgs)) responseImages.push(...imgs);
                    } else if (item.image) {
                        responseImages.push(item.image);
                    }
                    // Support 'mainImage' from product data
                    if (item.mainImage) responseImages.push(item.mainImage);
                });
            }

            // Limit images to preventing spamming
            responseImages = [...new Set(responseImages)].slice(0, 5);

            return {
                success: true,
                content: aiContent,
                model: currentModel?.model || 'unknown',
                keyId: currentModel?.keyId || 'unknown',
                processingTime: Date.now() - startTime,
                intent: intent,
                sentiment: 'neutral',
                confidence: 0.9,
                shouldEscalate: false,
                ragDataUsed: ragData.length > 0,
                memoryUsed: conversationMemory.length > 0,
                images: responseImages // ✅ FIX: Return images so controller can attach them
            };

        } catch (error) {
            // 🤐 النظام الصامت - تسجيل الخطأ داخلياً فقط
            console.error('🚨 [SILENT-AI-ERROR] ProcessWithAI error (hidden from customer):', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                processingTime: Date.now() - startTime
            });

            return {
                success: false,
                error: error.message,
                content: null, // 🚫 لا محتوى للعميل - صمت تام
                shouldEscalate: false, // 🚫 لا تصعيد تلقائي
                processingTime: Date.now() - startTime,
                errorType: 'ai_processing_error',
                silent: true // 🤐 علامة الصمت
            };
        }
    }

    /**
     * حفظ الرد النهائي للصورة في الذاكرة
     */
    async saveImageResponseToMemory(messageData, finalResponse, productMatch, companyId) {
        try {
            // حفظ الرد النهائي المفيد بدلاً من التحليل الخام
            await memoryService.saveInteraction({
                conversationId: messageData.conversationId,
                senderId: messageData.senderId,
                companyId: companyId || messageData.companyId || messageData.customerData?.companyId, // ✅ استخدام companyId الممرر أولاً
                userMessage: 'العميل أرسل صورة منتج',
                aiResponse: finalResponse, // الرد النهائي المفيد
                intent: 'image_analysis',
                sentiment: 'neutral',
                timestamp: new Date(),
                metadata: {
                    hasProductMatch: !!productMatch?.found,
                    productName: productMatch?.productName || null,
                    processingType: 'image_independent'
                }
            });

            //console.log('💾 Final image response saved to memory (helpful response, not raw analysis)');
        } catch (error) {
            //console.log('⚠️ Could not save image response to memory:', error.message);
        }
    }

    /**
     * بناء prompt خاص بالصور بدون استخدام الذاكرة
     */
    buildImageResponsePrompt(imageAnalysis, companyPrompts, productMatch, customerData) {
        let prompt = '';

        // إضافة شخصية الشركة
        if (companyPrompts.personalityPrompt) {
            prompt += companyPrompts.personalityPrompt + '\n\n';
        }

        // تعليمات خاصة بالرد على الصور
        prompt += `🖼️ مهمة: الرد على العميل بناءً على تحليل الصورة المرسلة

📋 معلومات تحليل الصورة:
${imageAnalysis}

🎯 تعليمات مهمة للرد:
1. ✅ استخدم نتائج تحليل الصورة فقط
2. 🚫 لا تشير لأي محادثات أو تفاعلات سابقة
3. 💬 رد بشكل طبيعي وودود كأنها أول مرة تتفاعل مع العميل
4. 🎨 اذكر الألوان والتفاصيل التي تم تحليلها
5. 💰 اذكر السعر إذا تم العثور على منتج مطابق
6. ❓ اسأل إذا كان العميل يريد معرفة المزيد

`;

        // إضافة معلومات المطابقة إذا وجدت
        if (productMatch && productMatch.found) {
            prompt += `✅ تم العثور على منتج مطابق:
- اسم المنتج: ${productMatch.productName}
- السعر: ${productMatch.price}
- التفاصيل: ${productMatch.details || 'غير متوفر'}

`;
        } else {
            prompt += `⚠️ لم يتم العثور على منتج مطابق تماماً في المتجر.

`;
        }

        // إضافة معلومات العميل إذا توفرت
        if (customerData && customerData.name) {
            prompt += `👤 معلومات العميل: ${customerData.name}\n\n`;
        }

        prompt += `🎯 المطلوب: رد طبيعي وودود بناءً على تحليل الصورة فقط، بدون أي إشارة لسياق سابق.`;

        return prompt;
    }


    /**
     * 🔒 Helper: Validate and Setup Context
     * Performs early validation, resolves company ID, and fetches necessary configuration.
     */
    async _validateAndSetupContext(messageData) {
        const { conversationId, senderId, content, attachments, customerData, companyId, customPrompt } = messageData || {};
        let finalCompanyId = companyId || customerData?.companyId;

        // 1. Resolve Company ID (Fallback to DB if needed)
        if (!finalCompanyId && customerData?.id) {
            try {
                const customerRecord = await safeQuery(async () => {
                    const prisma = getSharedPrismaClient();
                    return await prisma.customer.findUnique({
                        where: { id: customerData.id },
                        select: { companyId: true }
                    });
                }, 7);
                if (customerRecord?.companyId) {
                    finalCompanyId = customerRecord.companyId;
                }
            } catch (error) {
                console.error('❌ [AI-PROCESS] Error getting company ID from customer record:', error);
            }
        }

        // 2. Critical Security Check
        if (!finalCompanyId) {
            console.error('❌ [SECURITY] No companyId available for AI processing - request denied');
            await aiResponseMonitor.recordAIFailure({
                companyId: 'unknown',
                conversationId,
                customerId: senderId,
                errorType: 'security_error',
                errorMessage: 'No company ID found for security isolation',
                context: { messageData }
            });
            return {
                valid: false,
                result: {
                    success: false,
                    error: 'No company ID found for security isolation',
                    content: null,
                    shouldEscalate: false,
                    silent: true,
                    errorType: 'security_error'
                }
            };
        }

        // 3. Fetch Conversation (Priority 8)
        let conversation = null;
        if (conversationId) {
            conversation = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.conversation.findUnique({
                    where: { id: conversationId },
                    select: { id: true, customerId: true, metadata: true, createdAt: true }
                });
            }, 8);
        }

        // 4. Fetch Configuration Parallelly
        const [geminiConfig, companyPrompts, settings] = await Promise.all([
            this.aiAgentService.getCurrentActiveModel(finalCompanyId),
            this.aiAgentService.getCompanyPrompts(finalCompanyId, customPrompt),
            this.aiAgentService.getSettings(finalCompanyId)
        ]);

        // 5. Validate Configuration
        if (!geminiConfig || geminiConfig.error) {
            const errorMsg = geminiConfig?.arabicMessage || geminiConfig?.message || 'No active Gemini API key found';
            await aiResponseMonitor.recordAIFailure({
                companyId: finalCompanyId,
                conversationId,
                customerId: senderId,
                errorType: geminiConfig?.error || 'no_api_key',
                errorMessage: errorMsg,
                context: { content: content?.substring(0, 100) }
            });
            return {
                valid: false,
                result: {
                    success: false,
                    error: errorMsg,
                    content: null,
                    shouldEscalate: false,
                    silent: true,
                    errorType: geminiConfig?.error || 'no_api_key'
                }
            };
        }

        return {
            valid: true,
            finalCompanyId,
            conversation,
            geminiConfig,
            companyPrompts,
            settings
        };
    }

    /**
     * 🔒 Helper: Handle Post Details from Metadata
     * Extracts postId and handles background fetching of details
     */
    _handlePostDetails(conversation) {
        let postDetails = null;
        let postId = null;

        if (conversation && conversation.metadata) {
            const metadata = safeJsonParse(conversation.metadata, {});
            postId = metadata?.postId;

            if (metadata?.postDetails) {
                postDetails = metadata.postDetails;
                console.log(`✅ [POST-DETAILS] Using cached postDetails`);
            }

            return { postId, postDetails, metadata, pageId: metadata?.pageId };
        }
        return { postId: null, postDetails: null, metadata: {}, pageId: null };
    }

    /**
     * 🔒 Helper: Check Reply Mode
     * Determines if AI should reply based on settings and recent employee activity.
     */
    async _checkReplyMode(settings, conversationId, messageData) {
        if (!settings || !conversationId) return { shouldSkip: false };

        console.log(`\n🔍 [REPLY-MODE-DEBUG] Check started for Conv: ${conversationId}, Mode: ${settings.replyMode}`);

        if (settings.replyMode === 'new_only') {
            const messageTimestamp = messageData.timestamp ? new Date(messageData.timestamp) : new Date();

            // Find the last employee message
            const lastEmployeeMessage = await safeQuery(async () => {
                const prisma = getSharedPrismaClient();
                return await prisma.message.findFirst({
                    where: {
                        conversationId,
                        isFromCustomer: false,
                        senderId: { not: null } // Employee
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                });
            }, 7);

            if (lastEmployeeMessage) {
                const employeeMessageTime = new Date(lastEmployeeMessage.createdAt);
                const now = new Date();
                const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);

                // Check 1: Employee replied after current message
                if (employeeMessageTime > messageTimestamp) {
                    return {
                        shouldSkip: true,
                        reason: 'EMPLOYEE_REPLIED',
                        message: 'الذكاء الاصطناعي يرد على المحادثات الجديدة فقط - تم تدخل موظف',
                        silent: true
                    };
                }
                // Check 2: Employee replied in last 30 seconds
                else if (employeeMessageTime > thirtySecondsAgo) {
                    return {
                        shouldSkip: true,
                        reason: 'EMPLOYEE_RECENTLY_REPLIED',
                        message: 'تم تدخل موظف مؤخراً',
                        silent: true
                    };
                }
            }
        }

        return { shouldSkip: false };
    }

    /**
     * 🔒 Helper: Handle Image Processing
     * Process images using MultimodalService if present.
     */
    async _handleImageProcessing(attachments, messageData, companyId, conversationMemory) {
        if (!attachments || attachments.length === 0) return { handled: false };

        // Check for image attachments
        const imageAttachments = attachments.filter(att =>
            att.type === 'image' ||
            (att.payload && att.payload.url && att.payload.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))
        );

        if (imageAttachments.length > 0) {
            try {
                const multimodalService = require('../../multimodalService');
                const imageResult = await multimodalService.processImage(messageData);

                if (imageResult?.type === 'image_analysis') {
                    const intent = imageResult.productMatch?.found ? 'product_inquiry' : 'general_inquiry';

                    // Delegate to internal method
                    const aiResponse = await this.processImageWithAI(
                        imageResult.processedContent,
                        messageData,
                        intent,
                        imageResult.productMatch,
                        conversationMemory // Pass memory
                    );

                    await this.saveImageResponseToMemory(
                        messageData,
                        aiResponse.content,
                        imageResult.productMatch,
                        companyId // ✅ تمرير companyId
                    );

                    return {
                        handled: true,
                        response: {
                            ...aiResponse,
                            imageAnalysis: imageResult.analysis,
                            imageUrl: imageResult.imageUrl,
                            productMatch: imageResult.productMatch
                        }
                    };
                } else if (imageResult?.type === 'image_error') {
                    // On error, let the main flow handle it as text + context, OR handle it here?
                    // The original code returned a response here.
                    const customerMessage = messageData.content || 'العميل أرسل صورة';
                    const intent = imageResult.errorType === 'general_error' ? 'product_inquiry' : 'general_inquiry';

                    const aiResponse = await this.processWithAI(
                        `${customerMessage}\n\nتوضيح الموقف: ${imageResult.processedContent}`,
                        messageData,
                        intent
                    );

                    return {
                        handled: true,
                        response: {
                            ...aiResponse,
                            shouldEscalate: imageResult.shouldEscalate || false,
                            errorType: imageResult.errorType || 'general_error'
                        }
                    };
                }
            } catch (imageError) {
                console.error('❌ [IMAGE-PROCESSING] Error processing image:', imageError);
                // Fallthrough to normal text processing
            }
        }

        return { handled: false };
    }

    /**
     * 🔒 Helper: Retrieve Data and Context (RAG, Memory, Intent)
     */
    async _retrieveDataAndContext(conversationId, senderId, settings, finalCompanyId, content, customerData, postDetails, conversationMemory) {
        // 1. Initialize RAG Service
        if (!this.aiAgentService.ragService) {
            this.aiAgentService.ragService = require('../../ragService');
            await this.aiAgentService.ragService.ensureInitialized();
        }

        // ✅ FIX: Force load products for this company to ensure RAG has data
        if (finalCompanyId) {
            await this.aiAgentService.ragService.loadProductsForCompany(finalCompanyId);
            const productCount = this.aiAgentService.ragService.productIndex?.filter(
                p => p.metadata?.companyId === finalCompanyId
            ).length || 0;
            console.log(`🔍 [RAG-LOAD] Loaded ${productCount} products for company ${finalCompanyId}`);
        }

        // 🔍 DEBUG: Log the companyId being used for RAG
        console.log(`🔍 [DEBUG-RAG] Company ID for RAG retrieval: ${finalCompanyId}`);
        console.log(`🔍 [DEBUG-RAG] Customer message: "${content?.substring(0, 50)}..."`);

        // 2. Fetch Memory (Already fetched in orchestrator)
        // const memoryLimit = settings.maxMessagesPerConversation || 50;
        // const conversationMemory = await memoryService.getConversationMemory(conversationId, senderId, memoryLimit, finalCompanyId);
        console.log('✅ [MEMORY-SERVICE] Using pre-fetched memory:', conversationMemory?.length || 0, 'messages');

        // 3. Enhanced Context & Intent Analysis
        // ✅ FIX: Use ContextManager for deep analysis instead of simple keywords
        if (!this.aiAgentService.contextManager) {
            const ContextManager = require('../contextManager');
            this.aiAgentService.contextManager = new ContextManager(this.aiAgentService);
        }

        // Use Context Manager for deeper understanding
        // This replaces the simple localIntentResult which was keyword-only
        const enhancedContext = await this.aiAgentService.contextManager.analyzeEnhancedConversationContext(content, conversationMemory, finalCompanyId);

        // Use the intent determined by the smart context manager
        const intent = enhancedContext.intent || 'general_inquiry';
        console.log(`⚡ [INTENT-OPTIMIZATION] Enhanced intent: ${intent} (Confidence: ${enhancedContext.confidence})`);

        // 4. Smart Response & RAG Data
        let smartResponse;
        let postProductData = null;
        let promotedProductsData = [];
        const isFirstMessage = conversationMemory.length === 0;
        const isPriceQuestion = /سعر|كام|بكام|ثمن|price/i.test(content);

        // Get Promoted Products if needed
        if (isFirstMessage && isPriceQuestion) {
            try {
                const ragService = require('../../ragService');
                promotedProductsData = ragService.getPromotedProducts(finalCompanyId);
                console.log(`🎯 [PROMOTED-PRODUCTS] Fetched ${promotedProductsData.length} promoted products for company ${finalCompanyId}`);
            } catch (error) {
                console.error('❌ [PROMOTED-PRODUCTS] Error fetching promoted products:', error);
            }
        }

        const hasPromotedContext = (postProductData && promotedProductsData.length > 0) ||
            (isFirstMessage && isPriceQuestion && promotedProductsData.length > 0);

        if (hasPromotedContext) {
            console.log(`⚡ [OPTIMIZATION] Skipping getSmartResponse (Using Promoted Context)`);
            smartResponse = {
                images: [],
                ragData: [],
                hasSpecificProduct: !!postProductData,
                productInfo: postProductData
            };
        } else {
            try {
                console.log(`🔍🔍🔍 [SMART-RESPONSE] Calling getSmartResponse with companyId=${finalCompanyId}, intent=${intent}`);
                smartResponse = await this.aiAgentService.getSmartResponse(content, intent, conversationMemory, customerData?.id, finalCompanyId);
                console.log(`🔍🔍🔍 [SMART-RESPONSE] Result: ragData=${smartResponse.ragData?.length || 0}, images=${smartResponse.images?.length || 0}`);
            } catch (smartResponseError) {
                console.error('❌ [DEBUG] Error in getSmartResponse:', smartResponseError);
                smartResponse = { images: [], ragData: [], hasSpecificProduct: false, productInfo: null };
            }
        }

        let images = smartResponse.images || [];
        let ragData = smartResponse.ragData || [];

        // 🔍 DEBUG: Log RAG data results
        console.log(`🔍 [DEBUG-RAG] SmartResponse returned: images=${images.length}, ragData=${ragData.length}`);
        if (ragData.length > 0) {
            console.log(`🔍 [DEBUG-RAG] First RAG item: type=${ragData[0].type}, name=${ragData[0].metadata?.name || 'N/A'}`);
        } else {
            console.log(`⚠️ [DEBUG-RAG] No RAG data returned for companyId: ${finalCompanyId}`);

            // ✅ CRITICAL FIX: Fallback to direct RAG retrieval when getSmartResponse returns nothing
            // getSmartResponse is optimized for image requests, but general product inquiries need RAG too
            try {
                console.log(`🔄 [RAG-FALLBACK] Attempting direct RAG retrieval for general inquiry...`);
                const directRagData = await this.aiAgentService.ragService.retrieveRelevantData(
                    content,
                    intent,
                    customerData?.id,
                    finalCompanyId,
                    null, // ipAddress
                    conversationMemory
                );
                if (directRagData && directRagData.length > 0) {
                    ragData = directRagData;
                    console.log(`✅ [RAG-FALLBACK] Retrieved ${ragData.length} items via direct RAG`);
                }
            } catch (fallbackError) {
                console.error(`❌ [RAG-FALLBACK] Error:`, fallbackError.message);
            }
        }

        // Override RAG Data for Promoted Products
        if (postProductData && promotedProductsData.length > 0) {
            ragData = promotedProductsData;
        } else if (isFirstMessage && isPriceQuestion && promotedProductsData.length > 0) {
            ragData = promotedProductsData;
        }

        // 5. Extract Color Images (if asking about colors)
        const colorQuestionPatterns = [
            /(ايه|إيه|ما هي|ما هي)\s*(الألوان|الألوان المتاحة|الألوان اللي|الألوان الموجودة)/i,
            /(عايز|أريد|أعرض|أشوف|أرى)\s*(الألوان|صور الألوان|ألوان)/i,
            /(الألوان|الألوان المتاحة|الألوان اللي)/i
        ];
        const isColorQuestion = colorQuestionPatterns.some(pattern => pattern.test(content));

        if (isColorQuestion && ragData && ragData.length > 0) {
            console.log('🎨 [COLOR-IMAGES] Extracting color images...');
            const colorImages = [];
            ragData.forEach(item => {
                if (item.type === 'product' && item.metadata?.variants) {
                    const colorVariants = item.metadata.variants.filter(v => v.type === 'color');
                    colorVariants.forEach(variant => {
                        if (variant.images && Array.isArray(variant.images) && variant.images.length > 0) {
                            variant.images.forEach(imageUrl => {
                                colorImages.push({
                                    type: 'image',
                                    payload: { url: imageUrl, title: `${item.metadata.name} - اللون ${variant.name}`, variantName: variant.name }
                                });
                            });
                        }
                    });
                }
            });
            if (colorImages.length > 0) {
                images = [...images, ...colorImages].slice(0, 10);
                console.log(`✅ [COLOR-IMAGES] Extracted ${colorImages.length} color images`);
            }
        }

        // 🔍 Final Debug: What are we returning from _retrieveDataAndContext?
        console.log(`🔍🔍🔍 [RAG-DEBUG-RETURN] Returning: ragData.length=${ragData?.length || 0}, images.length=${images?.length || 0}, intent=${intent}`);
        if (ragData && ragData.length > 0) {
            console.log(`🔍🔍🔍 [RAG-DEBUG-RETURN] First product: ${ragData[0]?.metadata?.name || ragData[0]?.type || 'N/A'}`);
        }

        return {
            conversationMemory,
            intent,
            confidence: enhancedContext?.confidence || 0.5, // ✅ FIX: Add confidence for RuleBasedResponder
            enhancedContext,
            smartResponse,
            images,
            ragData,
            postProductData,
            promotedProductsData,
            isFirstMessage,
            isPriceQuestion
        };
    }

    /**
     * 🔒 Helper: Generate and Process Response
     * Orchestrates the final AI generation and post-processing
     */
    async _generateAndProcessResponse(promptParams, generationParams) {
        const {
            content, customerData, companyPrompts, ragData, conversationMemory,
            hasImages, smartResponse, messageData, enhancedContext,
            postDetails, postProductData, promotedProductsData, isFirstMessage, isPriceQuestion
        } = promptParams;

        const {
            finalCompanyId, conversationId, senderId, intent, customPrompt, startTime
        } = generationParams;

        // 1. Build Advanced Prompt
        let advancedPrompt;
        try {
            // logic for isPostProductResponseFlag
            const isPostProductResponseFlag = !!postProductData && !!messageData.postId;

            const enhancedMessageData = {
                ...messageData,
                postDetails,
                isFirstPriceInquiry: isFirstMessage && isPriceQuestion,
                promotedProductsCount: promotedProductsData.length,
                hasPostProduct: !!postProductData,
                isPostProductResponse: isPostProductResponseFlag
            };

            console.log(`🔍 [DEBUG] Building advanced prompt...`);
            advancedPrompt = await this.aiAgentService.buildAdvancedPrompt(
                content,
                customerData,
                companyPrompts,
                ragData,
                conversationMemory,
                hasImages,
                smartResponse,
                enhancedMessageData
            );
        } catch (promptError) {
            console.error('❌ [DEBUG] Error building prompt:', promptError);
            throw promptError;
        }

        // 2. Generate AI Response
        console.log(`🔍 [DEBUG] Calling generateAIResponse...`);

        let aiContent;

        // ✨ SINGLE-PASS ORDER OPTIMIZATION (New Flow)
        // If intent is 'order_inquiry' (or 'order_confirmation'), we delegate to the optimized single-pass processor
        if (intent === 'order_inquiry' || intent === 'order_confirmation') {
            try {
                console.log('🚀 [LegacyAgent] Delegating to Single-Pass OrderProcessor...');

                // Ensure customerData object exists
                const safeCustomerData = customerData || { id: senderId, companyId: finalCompanyId };

                const opResult = await this.aiAgentService.orderProcessor.processOrderSinglePass(
                    content,
                    conversationMemory,
                    safeCustomerData,
                    finalCompanyId,
                    companyPrompts
                );

                if (opResult && opResult.response) {
                    console.log(`✅ [LegacyAgent] Single-Pass Success. Status: ${opResult.status}`);
                    aiContent = opResult.response;

                    // Optional: You could update 'intent' here if needed, but for now we keep the original trigger intent
                }
            } catch (singlePassError) {
                console.error('❌ [LegacyAgent] Single-Pass Failed, falling back to standard AI:', singlePassError);
                // aiContent remains undefined, so it falls through to standard generation
            }
        }

        // Standard Generation (Fallback or Non-Order Intents)
        if (!aiContent) {
            try {
                aiContent = await this.aiAgentService.generateAIResponse(
                    advancedPrompt,
                    conversationMemory,
                    true,
                    null,
                    finalCompanyId,
                    conversationId,
                    {
                        messageType: intent,
                        inquiryType: intent,
                        conversationPhase: enhancedContext.conversationPhase,
                        customerEngagement: enhancedContext.customerEngagement,
                        customPrompt: customPrompt,
                        customerId: senderId,
                        conversationMemory: conversationMemory
                    }
                );
            } catch (aiError) {
                console.error('❌ [DEBUG] Error generating AI response:', aiError);
                throw aiError;
            }
        }

        // 3. Handle Silent Mode / Errors
        let silentReason = null;
        let generationMetadata = {};

        if (aiContent === null || aiContent === undefined) {
            silentReason = 'AI returned null response';
        } else if (typeof aiContent === 'object') {
            if (aiContent.content === null) {
                silentReason = aiContent.silentReason || 'AI returned null response';
                aiContent = null;
            } else {
                generationMetadata = {
                    keyName: aiContent.keyName,
                    model: aiContent.model,
                    provider: aiContent.provider, // ✅ NEW
                    processingTime: aiContent.processingTime
                };
                aiContent = aiContent.content;
            }
        }

        // 🛡️ Hallucination Guard
        if (aiContent && typeof aiContent === 'string') {
            try {
                const HallucinationGuard = require('../hallucinationGuard');
                const guardResult = HallucinationGuard.validateAndCorrect(aiContent);
                if (!guardResult.isValid) {
                    console.warn(`🛡️ [HALLUCINATION-GUARD] Flaws detected: ${guardResult.flaws.join(', ')}`);
                    aiContent = guardResult.correctedResponse;
                    generationMetadata.hallucinationCorrected = true;
                    generationMetadata.detectedFlaws = guardResult.flaws;

                    // Log the correction for monitoring
                    // Note: aiResponseMonitor might not be defined in this scope, let's check
                    if (this.aiAgentService && this.aiAgentService.aiResponseMonitor) {
                        await this.aiAgentService.aiResponseMonitor.recordAIFailure({
                            companyId: finalCompanyId,
                            conversationId,
                            customerId: senderId,
                            errorType: 'hallucination_detected',
                            errorMessage: `Flaws: ${guardResult.flaws.join(', ')}`,
                            context: { intent, originalResponse: aiContent }
                        });
                    }
                }
            } catch (guardError) {
                console.error('❌ [HALLUCINATION-GUARD] Error:', guardError);
            }
        }

        if (silentReason) {
            console.log(`🤐 [SILENT-MODE] Reason: ${silentReason}`);
            await aiResponseMonitor.recordAIFailure({
                companyId: finalCompanyId,
                conversationId,
                customerId: senderId,
                errorType: 'null_response',
                errorMessage: silentReason,
                context: { intent, userMessage: content?.substring(0, 100) }
            });
            return {
                success: false,
                error: silentReason,
                content: null,
                shouldEscalate: false,
                processingTime: Date.now() - startTime,
                intent,
                silent: true
            };
        }

        // 4. Enhance Response (State & Shipping)
        let finalResponse = aiContent;
        if (finalResponse && typeof finalResponse === 'string') {
            // State Enhancement
            const enhanced = this.aiAgentService.enhanceResponseWithConversationState(
                finalResponse,
                {
                    phase: enhancedContext.conversationPhase,
                    engagement: enhancedContext.customerEngagement,
                    needsRedirection: enhancedContext.needsRedirection,
                    direction: enhancedContext.conversationFlow.direction,
                    momentum: enhancedContext.conversationFlow.momentum
                },
                enhancedContext
            );
            if (enhanced) finalResponse = enhanced;

            // Shipping Price Validation
            try {
                const shippingService = require('../../shippingService');
                // Re-fetch memory? Or use existing? Existing is fine usually, but validation used 50 limit.
                // Existing memory limit was also 50. Safe to reuse.
                const extractedGov = await shippingService.extractGovernorateFromMessage(content, finalCompanyId, conversationMemory);
                if (extractedGov && extractedGov.found) {
                    const shippingInfo = await shippingService.findShippingInfo(extractedGov.governorate, finalCompanyId);
                    if (shippingInfo && shippingInfo.found) {
                        const correctPrice = shippingInfo.price;
                        const pricePattern = /(\d+)\s*جنيه/gi;
                        const matches = finalResponse.match(pricePattern);
                        if (matches) {
                            const wrongPrices = matches.filter(match => {
                                const price = parseInt(match.replace(/\D/g, ''));
                                return price !== correctPrice && price >= 30 && price <= 200;
                            });
                            if (wrongPrices.length > 0) {
                                console.warn(`⚠️ [PRICE-VALIDATION] Correcting prices to ${correctPrice}`);
                                wrongPrices.forEach(wrongPrice => {
                                    const wrongPriceNum = wrongPrice.replace(/\D/g, '');
                                    const wrongPricePattern = new RegExp(`\\b${wrongPriceNum}\\s*جنيه`, 'gi');
                                    finalResponse = finalResponse.replace(wrongPricePattern, `${correctPrice} جنيه`);
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('❌ [PRICE-VALIDATION] Error:', e.message);
            }

            // ✅ Product Price Validation (New)
            try {
                // If we have a specific product context (from Post or RAG)
                const targetProduct = postProductData || (ragData && ragData.length === 1 && ragData[0].type === 'product' ? ragData[0].metadata : null);

                if (targetProduct && targetProduct.price) {
                    const correctPrice = parseInt(targetProduct.price);
                    const pricePattern = /(\d+)\s*جنيه/gi;
                    const matches = finalResponse.match(pricePattern);

                    if (matches && correctPrice > 200) { // Only validate if product price > 200 to avoid conflict with shipping
                        const wrongPrices = matches.filter(match => {
                            const price = parseInt(match.replace(/\D/g, ''));
                            // Flag if price differs by more than 10% and is also > 200 (to avoid catching shipping costs)
                            const diff = Math.abs(price - correctPrice);
                            return diff > (correctPrice * 0.1) && price > 200;
                        });

                        if (wrongPrices.length > 0) {
                            console.warn(`⚠️ [PRODUCT-PRICE-VALIDATION] Found discrepancies. Correct: ${correctPrice}, Found: ${wrongPrices.join(', ')}`);
                            wrongPrices.forEach(wrongPrice => {
                                const wrongPriceNum = wrongPrice.replace(/\D/g, '');
                                // Use boundary match to avoid replacing "1650" inside "11650"
                                const wrongPricePattern = new RegExp(`\\b${wrongPriceNum}\\s*جنيه`, 'gi');
                                finalResponse = finalResponse.replace(wrongPricePattern, `${correctPrice} جنيه`);
                                console.log(`✅ [PRODUCT-PRICE-FIX] Replaced ${wrongPrice} with ${correctPrice} جنيه`);
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('❌ [PRODUCT-PRICE-VALIDATION] Error:', e.message);
            }

            // Cleanup (Image mentions)
            finalResponse = finalResponse.replace(/\[(صورة|صور|image|إرفاق).*?\]/g, '').trim();
        }

        return {
            success: true,
            content: finalResponse,
            shouldEscalate: false,
            processingTime: Date.now() - startTime,
            intent: intent,
            generationMetadata,
            // ✅ FIX: Use 'images' passed from dataContext (calculated/updated) instead of smartResponse.images
            images: promptParams.images || (hasImages ? smartResponse.images : []),
            ragData: ragData
        };
    }

}

module.exports = LegacyAgent;
