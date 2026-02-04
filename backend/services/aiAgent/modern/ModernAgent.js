const ToolRegistry = require('./tools/ToolRegistry');
const { getSharedPrismaClient, safeQuery } = require('../../sharedDatabase');
const memoryService = require('../../memoryService');
const aiResponseMonitor = require('../../aiResponseMonitor');
const AIErrorHandler = require('../../aiErrorHandler');
const { safeJsonParse } = require('../../../utils/jsonUtils');
const RuleBasedResponder = require('../RuleBasedResponder');

/**
 * Modern Agent - Function Calling Implementation (2026 Standard)
 * Implements ReAct loop: Thought → Action → Observation → Response
 */
class ModernAgent {
    constructor(serviceLocator) {
        this.aiAgentService = serviceLocator; // Compatibility with legacy naming
        this.serviceLocator = serviceLocator;
        this.toolRegistry = new ToolRegistry(serviceLocator);
        this.maxIterations = 5; // Prevent infinite loops
        this.errorHandler = new AIErrorHandler();
    }

    /**
     * Unified entry point: Process customer message and generate AI response
     */
    async processCustomerMessage(messageData) {
        const startTime = Date.now();
        let errorContext = { companyId: 'unknown', intent: 'general_inquiry' };

        try {
            console.log(`🚀 [ModernAgent] Starting refined processCustomerMessage`);

            // 1. Validation & Setup
            const setup = await this._validateAndSetupContext(messageData);
            if (!setup.valid) return setup.result;

            const { finalCompanyId, conversation, geminiConfig, companyPrompts, settings } = setup;
            errorContext.companyId = finalCompanyId;

            // 2. Post Details
            const { postDetails, postId, metadata } = this._handlePostDetails(conversation);

            // 3. AI Enabled Check
            if (settings.isEnabled === false || settings.autoReplyEnabled === false) {
                return {
                    success: false, content: null, reason: 'AI_DISABLED_GLOBAL',
                    message: 'الذكاء الاصطناعي معطل للنظام بالكامل', silent: true
                };
            }

            // 4. Memory Fetching (Isolated for Test Chat)
            const memoryLimit = settings.maxMessagesPerConversation || 50;
            const isTestChat = messageData.platform === 'test-chat';
            const conversationMemory = await memoryService.getConversationMemory(
                isTestChat ? messageData.conversationId : null,
                messageData.senderId,
                memoryLimit,
                finalCompanyId
            );

            // 5. Retrieve Data & Context (RAG, Intent)
            const dataContext = await this._retrieveDataAndContext(
                messageData.conversationId,
                messageData.senderId,
                settings,
                finalCompanyId,
                messageData.content,
                messageData.customerData,
                postDetails,
                conversationMemory
            );
            errorContext.intent = dataContext.intent;

            // ⚡ 5.5. Rule-based Response Check (Token Saver)
            // Now with: Multi-Tenant, Context Awareness, Kill-Switch
            const ruleBasedResponse = RuleBasedResponder.tryRespond(
                messageData.content,
                dataContext.intent,
                dataContext.enhancedContext?.confidence || 0.5,
                {
                    companyId: finalCompanyId,
                    companySettings: settings,
                    conversationId: messageData.conversationId,
                    conversationState: dataContext.enhancedContext?.conversationState || {}
                }
            );

            if (ruleBasedResponse) {
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

            // 6. Generate Response (The ReAct Loop)
            const response = await this.generateResponse(
                {
                    ...dataContext,
                    messageData,
                    postDetails,
                    companyPrompts,
                    content: messageData.content,
                    customerData: messageData.customerData,
                    companyId: finalCompanyId,
                    conversationContext: {
                        messages: conversationMemory.map(m => ({
                            role: m.isFromCustomer ? 'customer' : 'assistant',
                            content: m.content || m.aiResponse
                        })).concat([{ role: 'customer', content: messageData.content }])
                    }
                },
                {
                    finalCompanyId,
                    conversationId: messageData.conversationId,
                    senderId: messageData.senderId,
                    intent: dataContext.intent,
                    startTime
                }
            );

            return response;

        } catch (error) {
            console.error('❌ [ModernAgent] Unified process failed:', error);
            return {
                success: false,
                error: error.message,
                content: null,
                silent: true,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Main entry point for generating AI responses using Function Calling
     */
    async generateResponse(promptParams, generationParams) {
        try {
            console.log('🚀 [ModernAgent] Starting ReAct loop');

            const { companyId, conversationContext } = promptParams;
            const { startTime } = generationParams;

            // Build conversation history for AI
            const messages = this._buildConversationHistory(conversationContext);
            const tools = this.toolRegistry.getToolDefinitions();

            let iteration = 0;
            let finalResponse = null;
            const executionLog = [];

            while (iteration < this.maxIterations && !finalResponse) {
                iteration++;
                const aiResponse = await this._callAIWithTools(messages, tools, companyId);

                executionLog.push({ iteration, type: aiResponse.type, content: aiResponse.content || aiResponse.toolCall });

                if (aiResponse.type === 'tool_call') {
                    const { toolName, toolArgs } = aiResponse.toolCall;
                    const toolResult = await this.toolRegistry.executeTool(toolName, toolArgs, { companyId, ...promptParams });

                    messages.push({ role: 'function', name: toolName, content: JSON.stringify(toolResult) });
                } else if (aiResponse.type === 'final_answer') {
                    finalResponse = aiResponse.content;
                }
            }

            if (!finalResponse) finalResponse = 'عذراً، واجهت صعوبة في معالجة طلبك.';

            return {
                success: true,
                content: finalResponse,
                processingTime: Date.now() - startTime,
                generationMetadata: {
                    model: 'Modern-Function-Calling-v1',
                    iterations: iteration,
                    executionLog
                }
            };

        } catch (error) {
            console.error('❌ [ModernAgent] Execution Error:', error);
            return { success: false, content: 'عذراً، حدث خطأ.', error: error.message };
        }
    }

    /**
     * Helpers (Standardized with Legacy Agent)
     */
    async _validateAndSetupContext(messageData) {
        const { conversationId, senderId, customerData, companyId, customPrompt } = messageData || {};
        let finalCompanyId = companyId || customerData?.companyId;

        const [geminiConfig, companyPrompts, settings] = await Promise.all([
            this.aiAgentService.getCurrentActiveModel(finalCompanyId),
            this.aiAgentService.getCompanyPrompts(finalCompanyId, customPrompt),
            this.aiAgentService.getSettings(finalCompanyId)
        ]);

        return { valid: true, finalCompanyId, geminiConfig, companyPrompts, settings };
    }

    _handlePostDetails(conversation) {
        if (conversation && conversation.metadata) {
            const metadata = safeJsonParse(conversation.metadata, {});
            return { postId: metadata?.postId, postDetails: metadata.postDetails || null, metadata };
        }
        return { postId: null, postDetails: null, metadata: {} };
    }

    async _retrieveDataAndContext(conversationId, senderId, settings, finalCompanyId, content, customerData, postDetails, conversationMemory) {
        // Initialize RAG
        const ragService = require('../../ragService');
        await ragService.ensureInitialized();
        await ragService.loadProductsForCompany(finalCompanyId);

        const ContextManager = require('../contextManager');
        const contextManager = new ContextManager(this.aiAgentService);
        const enhancedContext = await contextManager.analyzeEnhancedConversationContext(content, conversationMemory, finalCompanyId);

        const intent = enhancedContext.intent || 'general_inquiry';
        return { intent, conversationMemory, enhancedContext };
    }

    _buildConversationHistory(conversationContext) {
        const messages = [{
            role: 'system',
            content: 'أنت مساعد ذكي لخدمة العملاء. استخدم الأدوات المتاحة للرد بدقة باللغة العربية.'
        }];

        if (conversationContext.messages) {
            conversationContext.messages.forEach(msg => {
                messages.push({ role: msg.role === 'customer' ? 'user' : 'assistant', content: msg.content });
            });
        }
        return messages;
    }

    async _callAIWithTools(messages, tools, companyId) {
        // Simplified Logic for MVP - Keyword based tool triggers
        const lastUserMessage = messages[messages.length - 1].content;

        if (this._shouldCallPriceTool(lastUserMessage)) {
            return { type: 'tool_call', toolCall: { toolName: 'get_product_price', toolArgs: { productName: this._extractProductName(lastUserMessage) } } };
        }

        if (this._shouldCallShippingTool(lastUserMessage)) {
            return { type: 'tool_call', toolCall: { toolName: 'get_shipping_info', toolArgs: {} } };
        }

        // Final response generation using modelManager
        const genResult = await this.aiAgentService.generateAIResponse(
            messages[messages.length - 1].content,
            [], true, null, companyId, null, {}
        );

        return { type: 'final_answer', content: typeof genResult === 'string' ? genResult : genResult.content };
    }

    _shouldCallPriceTool(message) {
        return /سعر|بكام|كم|price/i.test(message);
    }

    _shouldCallShippingTool(message) {
        return /شحن|توصيل|delivery/i.test(message);
    }

    _extractProductName(message) {
        return message.split(' ').slice(0, 3).join(' ');
    }
}

module.exports = ModernAgent;

