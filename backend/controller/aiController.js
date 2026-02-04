const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
// AI Agent Integration
const aiAgentService = require('../services/aiAgentService');
const ragService = require('../services/ragService');
const memoryService = require('../services/memoryService');
// Moved to top of file
const multimodalService = require('../services/multimodalService');

// Helper function to generate unique IDs
function generateId() {
    return 'cm' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
}

const updateSettings = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        await aiAgentService.updateSettings(req.body, companyId);

        res.json({
            success: true,
            message: 'AI settings updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating AI settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update AI settings'
        });
    }
};

const toggle = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        const { enabled } = req.body;

        await aiAgentService.updateSettings({ isEnabled: enabled }, companyId);

        res.json({
            success: true,
            message: `AI ${enabled ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error) {
        console.error('❌ Error toggling AI:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle AI'
        });
    }
};

const getAIStatistics = async (req, res) => {
    try {
        // 🔐 الحصول على companyId من المستخدم المصادق عليه
        const user = req.user; // من authMiddleware

        if (!user || !user.companyId) {
            return res.status(401).json({
                success: false,
                error: 'مستخدم غير صالح'
            });
        }

        const companyId = user.companyId;
        //console.log('🏢 [AI-STATS] Getting stats for company:', companyId);

        // جلب إحصائيات من قاعدة البيانات مع العزل
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 🔒 إضافة companyId لجميع الاستعلامات
        const whereCondition = {
            createdAt: {
                gte: today
            },
            conversation: {
                companyId: companyId
            }
        };

        const aiWhereCondition = {
            createdAt: {
                gte: today
            },
            companyId: companyId
        };

        const totalMessages = await getSharedPrismaClient().message.count({
            where: whereCondition
        });

        const aiInteractions = await getSharedPrismaClient().aiInteraction.count({
            where: aiWhereCondition
        });

        const humanHandoffs = await getSharedPrismaClient().aiInteraction.count({
            where: {
                ...aiWhereCondition,
                requiresHumanIntervention: true
            }
        });

        // حساب متوسط وقت الرد
        const avgResponseTime = await getSharedPrismaClient().aiInteraction.aggregate({
            where: aiWhereCondition,
            _avg: {
                responseTime: true
            }
        });

        // حساب متوسط الثقة
        const avgConfidence = await getSharedPrismaClient().aiInteraction.aggregate({
            where: aiWhereCondition,
            _avg: {
                confidence: true
            }
        });

        // أكثر النوايا شيوعاً
        const intentCounts = await getSharedPrismaClient().aiInteraction.groupBy({
            by: ['intent'],
            where: aiWhereCondition,
            _count: {
                intent: true
            },
            orderBy: {
                _count: {
                    intent: 'desc'
                }
            },
            take: 5
        });

        const topIntents = intentCounts.map(item => ({
            intent: item.intent || 'غير محدد',
            count: item._count.intent
        }));

        // توزيع المشاعر
        const sentimentCounts = await getSharedPrismaClient().aiInteraction.groupBy({
            by: ['sentiment'],
            where: aiWhereCondition,
            _count: {
                sentiment: true
            }
        });

        const totalSentiments = sentimentCounts.reduce((sum, item) => sum + item._count.sentiment, 0);
        const sentimentDistribution = {
            positive: Math.round((sentimentCounts.find(s => s.sentiment === 'positive')?._count.sentiment || 0) / totalSentiments * 100) || 0,
            neutral: Math.round((sentimentCounts.find(s => s.sentiment === 'neutral')?._count.sentiment || 0) / totalSentiments * 100) || 0,
            negative: Math.round((sentimentCounts.find(s => s.sentiment === 'negative')?._count.sentiment || 0) / totalSentiments * 100) || 0
        };

        // //console.log('📊 [AI-STATS] Stats for company', companyId, ':', {
        //     totalMessages,
        //     aiInteractions,
        //     humanHandoffs
        // });

        res.json({
            success: true,
            data: {
                totalMessages,
                aiResponses: aiInteractions,
                humanHandoffs,
                avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
                avgConfidence: Math.round((avgConfidence._avg.confidence || 0) * 100) / 100,
                topIntents,
                sentimentDistribution
            },
            companyId // 🏢 إضافة companyId للتأكد من العزل
        });

    } catch (error) {
        console.error('❌ Error getting AI stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get AI statistics'
        });
    }
};

const clearConversationMemory = async (req, res) => {
    try {
        const deletedCount = await getSharedPrismaClient().conversationMemory.deleteMany({});

        //console.log(`🧹 Cleared ${deletedCount.count} memory records`);

        res.json({
            success: true,
            message: `Cleared ${deletedCount.count} memory records`
        });
    } catch (error) {
        console.error('❌ Error clearing memory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear memory'
        });
    }
};

const updateKnowledgeBase = async (req, res) => {
    try {
        await ragService.updateKnowledgeBase();

        res.json({
            success: true,
            message: 'Knowledge base updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating knowledge base:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update knowledge base'
        });
    }
};

const getMemoryStatistics = async (req, res) => {
    try {
        // ✅ إضافة العزل الأمني - الحصول على companyId من المستخدم المصادق عليه
        const { companyId } = req.query;

        // التحقق من وجود companyId للعزل الأمني
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'companyId is required for memory isolation'
            });
        }

        const stats = await memoryService.getMemoryStats(companyId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error getting memory stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get memory statistics'
        });
    }
};

const getRAGStatistics = async (req, res) => {
    try {
        const stats = ragService.getStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error getting RAG stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get RAG statistics'
        });
    }
};

const getMultimodalProcessingStatistics = async (req, res) => {
    try {
        const stats = multimodalService.getProcessingStats();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error getting multimodal stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get multimodal statistics'
        });
    }
}

// ================================
// GEMINI KEYS MANAGEMENT
// ================================
// Helper function to create AI management tables
// ✅ FIX: Skip CREATE TABLE - tables should be created via Prisma migrations
async function createAIManagementTables() {
    // ✅ FIX: Skip CREATE TABLE to avoid permission errors
    // Tables should already exist from Prisma migrations (GeminiKey, SystemPrompt models)
    return;
}



const getAvailableModels = async (req, res) => {
    try {
        const models = [
            // أحدث نماذج Gemini 2025 🚀
            {
                id: 'gemini-2.5-pro',
                name: 'Gemini 2.5 Pro',
                description: 'الأقوى - للمهام المعقدة والتفكير المتقدم',
                category: 'premium',
                features: ['تفكير متقدم', 'فهم متعدد الوسائط', 'برمجة متقدمة']
            },
            {
                id: 'gemini-2.5-flash',
                name: 'Gemini 2.5 Flash',
                description: 'الأفضل سعر/أداء - للمهام العامة',
                category: 'recommended',
                features: ['تفكير تكيفي', 'كفاءة التكلفة', 'سرعة عالية']
            },
            {
                id: 'gemini-2.5-flash-lite',
                name: 'Gemini 2.5 Flash Lite',
                description: 'الأسرع والأوفر - للمهام البسيطة',
                category: 'economy',
                features: ['سرعة فائقة', 'تكلفة منخفضة', 'إنتاجية عالية']
            },

            // نماذج الصوت المتقدمة 🎤
            {
                id: 'gemini-2.5-flash-preview-native-audio-dialog',
                name: 'Gemini 2.5 Flash Audio Dialog',
                description: 'محادثات صوتية تفاعلية طبيعية',
                category: 'audio',
                features: ['صوت تفاعلي', 'محادثات طبيعية', 'تحكم في النبرة']
            },
            {
                id: 'gemini-2.5-flash-preview-tts',
                name: 'Gemini 2.5 Flash TTS',
                description: 'تحويل نص لصوت عالي الجودة',
                category: 'audio',
                features: ['تحويل نص لصوت', 'أصوات متعددة', 'تحكم متقدم']
            },

            // نماذج Gemini 2.0 ⚡
            {
                id: 'gemini-2.0-flash',
                name: 'Gemini 2.0 Flash',
                description: 'الجيل الثاني - مميزات متقدمة وسرعة',
                category: 'standard',
                features: ['أدوات أصلية', 'سرعة محسنة', 'مليون رمز']
            },
            {
                id: 'gemini-2.0-flash-lite',
                name: 'Gemini 2.0 Flash Lite',
                description: 'نسخة خفيفة من 2.0 للسرعة والكفاءة',
                category: 'economy',
                features: ['كفاءة التكلفة', 'زمن استجابة منخفض']
            },

            // نماذج مستقرة 1.5 📊
            {
                id: 'gemini-1.5-pro',
                name: 'Gemini 1.5 Pro',
                description: 'مستقر للمهام المعقدة - مجرب ومختبر',
                category: 'stable',
                features: ['مستقر', 'سياق طويل', 'موثوق']
            },
            {
                id: 'gemini-1.5-flash',
                name: 'Gemini 1.5 Flash',
                description: 'مستقر وسريع - للاستخدام العام',
                category: 'stable',
                features: ['مستقر', 'سريع', 'متعدد الوسائط']
            },

            // 🆕 أحدث نماذج 2025
            {
                id: 'gemini-3-pro',
                name: 'Gemini 3 Pro',
                description: 'أحدث نموذج Pro - الأقوى للمهام المعقدة',
                category: 'premium',
                features: ['أحدث تقنية', 'أقوى أداء', 'دقة عالية']
            },
            {
                id: 'gemini-2.5-flash-tts',
                name: 'Gemini 2.5 Flash TTS',
                description: 'تحويل نص لصوت عالي الجودة',
                category: 'audio',
                features: ['تحويل نص لصوت', 'أصوات طبيعية', 'دعم عربي']
            },

            // نماذج Live API 🎙️
            {
                id: 'gemini-2.5-flash-live',
                name: 'Gemini 2.5 Flash Live',
                description: 'تفاعل مباشر في الوقت الفعلي',
                category: 'live',
                features: ['تفاعل مباشر', 'زمن استجابة منخفض', 'محادثات طبيعية']
            },
            {
                id: 'gemini-2.0-flash-live',
                name: 'Gemini 2.0 Flash Live',
                description: 'تفاعل مباشر - الجيل الثاني',
                category: 'live',
                features: ['تفاعل مباشر', 'سرعة عالية', 'أداء محسن']
            },
            {
                id: 'gemini-2.5-flash-native-audio-dialog',
                name: 'Gemini 2.5 Native Audio Dialog',
                description: 'محادثات صوتية تفاعلية طبيعية',
                category: 'audio',
                features: ['صوت تفاعلي', 'محادثات طبيعية', 'تحكم في النبرة']
            },

            // نماذج متخصصة 🔬
            {
                id: 'gemini-robotics-er-1.5-preview',
                name: 'Gemini Robotics ER 1.5',
                description: 'مخصص للتطبيقات الروبوتية',
                category: 'specialized',
                features: ['روبوتات', 'تحكم دقيق', 'معالجة إشارات']
            },
            {
                id: 'learnlm-2.0-flash-experimental',
                name: 'LearnLM 2.0 Flash',
                description: 'نموذج تجريبي للتعلم والتعليم',
                category: 'experimental',
                features: ['تعليم', 'تعلم', 'تفسيرات واضحة']
            },

            // نماذج Gemma 🦙
            {
                id: 'gemma-3-12b',
                name: 'Gemma 3 12B',
                description: 'نموذج Gemma متوسط الحجم',
                category: 'gemma',
                features: ['أداء متوازن', 'كفاءة عالية', 'مفتوح المصدر']
            },
            {
                id: 'gemma-3-27b',
                name: 'Gemma 3 27B',
                description: 'نموذج Gemma كبير الحجم',
                category: 'gemma',
                features: ['أداء عالي', 'دقة ممتازة', 'مفتوح المصدر']
            },
            {
                id: 'gemma-3-4b',
                name: 'Gemma 3 4B',
                description: 'نموذج Gemma صغير الحجم',
                category: 'gemma',
                features: ['خفيف', 'سريع', 'موفر للطاقة']
            },
            {
                id: 'gemma-3-2b',
                name: 'Gemma 3 2B',
                description: 'نموذج Gemma صغير جداً',
                category: 'gemma',
                features: ['خفيف جداً', 'سريع جداً', 'موفر للطاقة']
            }
        ];

        res.json({
            success: true,
            models: models.map(m => m.id), // للتوافق مع الكود القديم
            modelsDetailed: models
        });
    } catch (error) {
        console.error('❌ Error getting available models:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get available models'
        });
    }
}


// ================================
// SYSTEM PROMPTS MANAGEMENT
// ================================

// Helper function to check if table exists
async function checkTableExists(tableName) {
    try {
        // Use a safer approach to check table existence
        const result = await getSharedPrismaClient().$queryRaw`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = ${tableName}`;
        return result[0]?.count > 0;
    } catch (error) {
        //console.log(`⚠️ Error checking table ${tableName}:`, error.message);
        return false;
    }
}

const getAllSystemPrompts = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        // Check if table exists first
        const tableExists = await checkTableExists('system_prompts');
        if (!tableExists) {
            await createAIManagementTables();
        }

        const prompts = await getSharedPrismaClient().systemPrompt.findMany({
            where: { companyId },  // فلترة حسب الشركة
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: prompts
        });
    } catch (error) {
        console.error('❌ Error getting system prompts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get system prompts'
        });
    }
};

const addNewSystemPrompt = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        const { name, content, category } = req.body;

        if (!name || !content) {
            return res.status(400).json({
                success: false,
                error: 'Name and content are required'
            });
        }

        const newPrompt = await getSharedPrismaClient().systemPrompt.create({
            data: {
                name,
                content,
                category: category || 'general',
                isActive: false,
                companyId  // إضافة companyId للعزل
            }
        });

        res.json({
            success: true,
            data: newPrompt
        });
    } catch (error) {
        console.error('❌ Error adding system prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add system prompt'
        });
    }
};

const activateSystemPrompt = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        const { id } = req.params;

        // Deactivate all other prompts for this company only
        await getSharedPrismaClient().systemPrompt.updateMany({
            where: { companyId },  // فقط برومبت هذه الشركة
            data: { isActive: false }
        });

        // Activate the selected prompt (with company check)
        await getSharedPrismaClient().systemPrompt.update({
            where: {
                id,
                companyId  // التأكد أن البرومبت ينتمي لهذه الشركة
            },
            data: { isActive: true }
        });

        if (aiAgentService && typeof aiAgentService.reloadSystemPrompt === 'function') {
            await aiAgentService.reloadSystemPrompt();
            //console.log('✅ AI Agent system prompt reloaded');
        }

        res.json({
            success: true,
            message: 'System prompt activated successfully'
        });
    } catch (error) {
        console.error('❌ Error activating system prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to activate system prompt'
        });
    }
}

const updateSystemPrompt = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        const { id } = req.params;
        const { name, content, category } = req.body;

        if (!name || !content) {
            return res.status(400).json({
                success: false,
                error: 'Name and content are required'
            });
        }

        const updatedPrompt = await getSharedPrismaClient().systemPrompt.update({
            where: {
                id,
                companyId  // التأكد أن البرومبت ينتمي لهذه الشركة
            },
            data: {
                name,
                content,
                category: category || 'general',
                updatedAt: new Date()
            }
        });

        // إذا كان الـ prompt المحدث نشط، أعد تحميله في الـ AI Agent
        if (updatedPrompt.isActive) {
            if (aiAgentService && typeof aiAgentService.reloadSystemPrompt === 'function') {
                await aiAgentService.reloadSystemPrompt();
                //console.log('✅ AI Agent system prompt reloaded after update');
            }
        }

        res.json({
            success: true,
            data: updatedPrompt,
            message: 'System prompt updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating system prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update system prompt'
        });
    }
};

const deleteSystemPrompt = async (req, res) => {
    try {
        const { id } = req.params;

        await getSharedPrismaClient().systemPrompt.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'System prompt deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting system prompt:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete system prompt'
        });
    }
}

// ================================
// MEMORY MANAGEMENT
// ================================

const getMemorySettings = async (req, res) => {
    try {
        // ✅ FIX: الحصول على companyId من المستخدم المصادق عليه (من verifyToken)
        const companyId = req.user?.companyId;

        // التحقق من وجود companyId للعزل الأمني
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'companyId is required for memory isolation'
            });
        }

        // ✅ FIX: قراءة الإعدادات من AiSettings بدلاً من القيم الثابتة
        const aiSettings = await getSharedPrismaClient().aiSetting.findUnique({
            where: { companyId }
        });

        // ✅ FIX: استخدام الإعدادات من قاعدة البيانات مع القيم الافتراضية
        const memoryStats = await memoryService.getMemoryStats(companyId);

        res.json({
            success: true,
            data: {
                retentionDays: aiSettings?.memoryRetentionDays ?? 30,
                maxConversationsPerUser: aiSettings?.maxConversationsPerUser ?? 100,
                maxMessagesPerConversation: aiSettings?.maxMessagesPerConversation ?? 50,
                autoCleanup: aiSettings?.autoCleanup !== undefined ? aiSettings.autoCleanup : true,
                compressionEnabled: aiSettings?.compressionEnabled !== undefined ? aiSettings.compressionEnabled : false,
                enableLongTermMemory: aiSettings?.enableLongTermMemory ?? false,
                ...memoryStats
            }
        });
    } catch (error) {
        console.error('❌ Error getting memory settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get memory settings'
        });
    }
}

const updateMemorySettings = async (req, res) => {
    try {
        // ✅ FIX: الحصول على companyId من المستخدم المصادق عليه (من verifyToken)
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'companyId is required'
            });
        }

        const {
            retentionDays,
            maxConversationsPerUser,
            maxMessagesPerConversation,
            autoCleanup,
            compressionEnabled
        } = req.body;

        // ✅ FIX: حفظ الإعدادات في AiSettings (استخدام نفس الكود من settingsRoutes.js)
        const updateData = {};
        if (retentionDays !== undefined) updateData.memoryRetentionDays = retentionDays;
        if (maxConversationsPerUser !== undefined) updateData.maxConversationsPerUser = maxConversationsPerUser;
        if (maxMessagesPerConversation !== undefined) updateData.maxMessagesPerConversation = maxMessagesPerConversation;
        if (autoCleanup !== undefined) updateData.autoCleanup = autoCleanup;
        if (compressionEnabled !== undefined) updateData.compressionEnabled = compressionEnabled;

        // ✅ FIX: التحقق من أن updateData غير فارغ
        if (Object.keys(updateData).length === 0) {
            console.warn('⚠️ [MEMORY-SETTINGS] No data to update');
            return res.json({
                success: true,
                message: 'No changes to update'
            });
        }

        // ✅ FIX: التحقق من وجود السجل أولاً (السجل موجود دائماً من settingsRoutes.js)
        const existingSettings = await getSharedPrismaClient().aiSetting.findUnique({
            where: { companyId }
        });

        if (existingSettings) {
            // ✅ تحديث السجل الموجود فقط
            console.log('✅ [MEMORY-SETTINGS] Updating existing settings:', updateData);
            await getSharedPrismaClient().aiSetting.update({
                where: { companyId },
                data: updateData
            });
            console.log('✅ [MEMORY-SETTINGS] Settings updated successfully');
        } else {
            // ✅ إذا لم يكن موجوداً (حالة نادرة)، استخدم upsert مع جميع الحقول
            await getSharedPrismaClient().aiSetting.create({
                data: {
                    companyId,
                    qualityEvaluationEnabled: true,
                    autoReplyEnabled: false,
                    confidenceThreshold: 0.7,
                    multimodalEnabled: true,
                    ragEnabled: true,
                    replyMode: 'all',
                    aiTemperature: 0.7,
                    aiTopP: 0.9,
                    aiTopK: 40,
                    aiMaxTokens: 2048, // ✅ توحيد: 2048 (متوافق مع constants)
                    aiResponseStyle: 'balanced',
                    enableDiversityCheck: true,
                    enableToneAdaptation: true,
                    enableEmotionalResponse: true,
                    enableSmartSuggestions: false,
                    enableLongTermMemory: false,
                    maxMessagesPerConversation: maxMessagesPerConversation ?? 50,
                    memoryRetentionDays: retentionDays ?? 30,
                    minQualityScore: 70,
                    enableLowQualityAlerts: true,
                    maxConversationsPerUser: maxConversationsPerUser ?? 100,
                    autoCleanup: autoCleanup !== undefined ? autoCleanup : true,
                    compressionEnabled: compressionEnabled !== undefined ? compressionEnabled : false,
                    maxRepliesPerCustomer: 5,
                    maxSuggestions: 3,
                    workingHoursEnabled: true,
                    useAdvancedTools: false,
                    autoCreateOrders: false,
                    autoSuggestProducts: true,
                    includeImages: true
                }
            });
        }

        res.json({
            success: true,
            message: 'Memory settings updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating memory settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update memory settings'
        });
    }
}

const cleanupOldMemory = async (req, res) => {
    try {
        // ✅ FIX: الحصول على companyId من المستخدم المصادق عليه (من verifyToken)
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'companyId is required'
            });
        }

        // ✅ FIX: قراءة retentionDays من AiSettings
        const aiSettings = await getSharedPrismaClient().aiSetting.findUnique({
            where: { companyId },
            select: { memoryRetentionDays: true }
        });

        const retentionDays = aiSettings?.memoryRetentionDays || 30;
        const deletedCount = await memoryService.cleanupOldMemories(companyId, retentionDays);

        res.json({
            success: true,
            deletedCount,
            message: `Cleaned up ${deletedCount} old memory records`
        });
    } catch (error) {
        console.error('❌ Error cleaning up memory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup memory'
        });
    }
};

// ✅ قواعد الاستجابة (Response Rules Checkpoints)
const { getRulesConfig, getDefaultRules, validateRules } = require('../services/aiAgent/responseRulesConfig');

/**
 * الحصول على تكوين قواعد الاستجابة (للواجهة)
 */
const getResponseRulesConfig = async (req, res) => {
    try {
        const config = getRulesConfig();
        const defaults = getDefaultRules();

        console.log('🔍 [AI-CONFIG-DEBUG] Sending config keys:', Object.keys(config));

        res.json({
            success: true,
            data: {
                config,
                defaults
            }
        });
    } catch (error) {
        console.error('❌ Error getting response rules config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get response rules config'
        });
    }
};

/**
 * الحصول على قواعد الاستجابة للشركة
 */
const getResponseRules = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        const aiSettings = await getSharedPrismaClient().aiSetting.findFirst({
            where: { companyId },
            select: { responseRules: true, disableDefaultTemplates: true }
        });

        let rules = getDefaultRules();
        if (aiSettings?.responseRules) {
            try {
                rules = JSON.parse(aiSettings.responseRules);
            } catch (e) {
                console.warn('⚠️ Failed to parse responseRules, using defaults');
            }
        }

        res.json({
            success: true,
            data: {
                ...rules,
                disableDefaultTemplates: aiSettings?.disableDefaultTemplates ?? false
            }
        });
    } catch (error) {
        console.error('❌ Error getting response rules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get response rules'
        });
    }
};

/**
 * تحديث قواعد الاستجابة للشركة
 */
const updateResponseRules = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        // Extract disableDefaultTemplates from rules
        const { disableDefaultTemplates, ...ruleData } = req.body;

        // التحقق من صحة القواعد
        const validation = validateRules(ruleData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: 'Invalid rules',
                errors: validation.errors
            });
        }

        // تحديث أو إنشاء الإعدادات
        await getSharedPrismaClient().aiSetting.upsert({
            where: { companyId },
            update: {
                responseRules: JSON.stringify(ruleData),
                disableDefaultTemplates: typeof disableDefaultTemplates === 'boolean' ? disableDefaultTemplates : undefined,
                updatedAt: new Date()
            },
            create: {
                id: generateId(),
                companyId,
                responseRules: JSON.stringify(ruleData),
                disableDefaultTemplates: typeof disableDefaultTemplates === 'boolean' ? disableDefaultTemplates : false,
                autoReplyEnabled: false
            }
        });

        // تحديث الـ cache
        if (aiAgentService.aiSettingsCache) {
            const cached = aiAgentService.aiSettingsCache.get(companyId);
            if (cached) {
                cached.responseRules = JSON.stringify(rules);
                aiAgentService.aiSettingsCache.set(companyId, cached);
            }
        }

        res.json({
            success: true,
            message: 'Response rules updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating response rules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update response rules'
        });
    }
};

/**
 * إعادة تعيين قواعد الاستجابة للقيم الافتراضية
 */
const resetResponseRules = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        const defaultRules = getDefaultRules();

        await getSharedPrismaClient().aiSetting.upsert({
            where: { companyId },
            update: {
                responseRules: JSON.stringify(defaultRules),
                updatedAt: new Date()
            },
            create: {
                id: generateId(),
                companyId,
                responseRules: JSON.stringify(defaultRules),
                autoReplyEnabled: false
            }
        });

        res.json({
            success: true,
            message: 'Response rules reset to defaults',
            data: defaultRules
        });
    } catch (error) {
        console.error('❌ Error resetting response rules:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset response rules'
        });
    }
};

// ================================
// RULE-BASED QUICK RESPONSES (الردود السريعة)
// ================================
const RuleBasedResponder = require('../services/aiAgent/RuleBasedResponder');

/**
 * الحصول على إعدادات الردود السريعة
 */
const getRuleResponses = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        const aiSettings = await getSharedPrismaClient().aiSetting.findFirst({
            where: { companyId },
            select: {
                responseRules: true,
                modelSettings: true
            }
        });

        // Parse existing responseRules or use defaults
        let ruleResponsesSettings = {
            enableRuleResponses: true,
            customRuleResponses: {
                templates: []
            }
        };

        if (aiSettings?.modelSettings) {
            try {
                const modelSettings = JSON.parse(aiSettings.modelSettings);
                if (modelSettings.ruleResponses) {
                    ruleResponsesSettings = {
                        ...ruleResponsesSettings,
                        ...modelSettings.ruleResponses
                    };
                }
            } catch (e) {
                console.warn('⚠️ Failed to parse modelSettings');
            }
        }

        // If no templates, migrate old format or use defaults
        if (!ruleResponsesSettings.customRuleResponses?.templates || ruleResponsesSettings.customRuleResponses.templates.length === 0) {
            const defaultTemplates = [
                {
                    id: 'greeting',
                    name: 'التحيات',
                    type: 'greeting',
                    keywords: ['سلام', 'السلام عليكم', 'أهلا', 'مرحبا', 'هلو', 'hi', 'hello'],
                    responses: RuleBasedResponder.defaultResponses.greeting.ar_eg,
                    isDefault: true
                },
                {
                    id: 'thanks',
                    name: 'الشكر',
                    type: 'thanks',
                    keywords: ['شكرا', 'شكراً', 'مشكور', 'تسلم', 'thanks', 'thank you'],
                    responses: RuleBasedResponder.defaultResponses.thanks.ar_eg,
                    isDefault: true
                },
                {
                    id: 'farewell',
                    name: 'الوداع',
                    type: 'farewell',
                    keywords: ['مع السلامة', 'باي', 'bye', 'سلام'],
                    responses: RuleBasedResponder.defaultResponses.farewell.ar_eg,
                    isDefault: true
                }
            ];

            ruleResponsesSettings.customRuleResponses = {
                templates: defaultTemplates
            };
        }

        res.json({
            success: true,
            data: ruleResponsesSettings
        });
    } catch (error) {
        console.error('❌ Error getting rule responses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get rule responses'
        });
    }
};

/**
 * تحديث إعدادات الردود السريعة
 */
const updateRuleResponses = async (req, res) => {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                error: 'Company ID is required'
            });
        }

        const { enableRuleResponses, customRuleResponses } = req.body;

        // Get existing modelSettings
        const existingSettings = await getSharedPrismaClient().aiSetting.findFirst({
            where: { companyId },
            select: { modelSettings: true }
        });

        let modelSettings = {};
        if (existingSettings?.modelSettings) {
            try {
                modelSettings = JSON.parse(existingSettings.modelSettings);
            } catch (e) { }
        }

        // Update ruleResponses within modelSettings
        modelSettings.ruleResponses = {
            enableRuleResponses: enableRuleResponses !== undefined ? enableRuleResponses : true,
            customRuleResponses: customRuleResponses || { templates: [] },
            updatedAt: new Date().toISOString()
        };

        // Save to database
        await getSharedPrismaClient().aiSetting.upsert({
            where: { companyId },
            update: {
                modelSettings: JSON.stringify(modelSettings),
                updatedAt: new Date()
            },
            create: {
                id: generateId(),
                companyId,
                modelSettings: JSON.stringify(modelSettings),
                autoReplyEnabled: false
            }
        });

        console.log(`✅ [SMART-REPLIES] Updated for company ${companyId}: enabled=${enableRuleResponses}, templates=${customRuleResponses?.templates?.length}`);

        res.json({
            success: true,
            message: 'تم حفظ إعدادات الردود الذكية بنجاح'
        });
    } catch (error) {
        console.error('❌ Error updating rule responses:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update rule responses'
        });
    }
};

module.exports = {
    updateSettings,
    toggle,
    getAIStatistics,
    clearConversationMemory,
    updateKnowledgeBase,
    getMemoryStatistics,
    getRAGStatistics,
    getMultimodalProcessingStatistics,
    getAvailableModels,
    getAllSystemPrompts,
    addNewSystemPrompt,
    activateSystemPrompt,
    updateSystemPrompt,
    deleteSystemPrompt,
    getMemorySettings,
    updateMemorySettings,
    cleanupOldMemory,
    getResponseRulesConfig,
    getResponseRules,
    updateResponseRules,
    resetResponseRules,
    getRuleResponses,
    updateRuleResponses,

    // ✅ New Gemini/AI Keys Management for Companies
    getGeminiKeys: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });

            const prisma = getSharedPrismaClient();
            const keys = await prisma.aIKey.findMany({
                where: {
                    companyId,
                    provider: 'GOOGLE'
                },
                include: {
                    models: true
                },
                orderBy: { createdAt: 'desc' }
            });

            // Format to match old gemini_keys structure if needed by frontend
            const formattedKeys = keys.map(k => ({
                ...k,
                usage: k.usage ? JSON.parse(k.usage) : { used: k.currentUsage, limit: k.maxRequestsPerDay },
                models: k.models.map(m => ({
                    id: m.id,
                    model: m.modelName,
                    isEnabled: m.isEnabled,
                    priority: m.priority,
                    usage: m.usage ? JSON.parse(m.usage) : { used: 0, limit: 1000 }
                }))
            }));

            res.json({ success: true, data: formattedKeys });
        } catch (error) {
            console.error('❌ Error getting Gemini keys:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    addGeminiKey: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            const { name, apiKey, description, model } = req.body;

            if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });
            if (!apiKey) return res.status(400).json({ success: false, error: 'API Key is required' });

            const prisma = getSharedPrismaClient();

            // Check if key already exists
            const existing = await prisma.aIKey.findUnique({ where: { apiKey } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    errorCode: 'DUPLICATE_API_KEY',
                    message: 'هذا المفتاح مضاف مسبقاً في النظام',
                    details: { arabic: 'هذا المفتاح مضاف مسبقاً في النظام', suggestion: 'يرجى استخدام مفتاح مختلف' }
                });
            }

            const newKey = await prisma.aIKey.create({
                data: {
                    name: name || 'Gemini Key',
                    apiKey,
                    description,
                    companyId,
                    provider: 'GOOGLE',
                    keyType: 'COMPANY',
                    usage: JSON.stringify({ used: 0, limit: 1500 }),
                    models: {
                        create: [
                            { modelName: model || 'gemini-1.5-flash', isEnabled: true, priority: 1 }
                        ]
                    }
                },
                include: { models: true }
            });

            res.json({ success: true, data: { ...newKey, modelsCreated: 1 } });
        } catch (error) {
            console.error('❌ Error adding Gemini key:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    deleteGeminiKey: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            const { id } = req.params;

            if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });

            const prisma = getSharedPrismaClient();

            // Ensure key belongs to company
            const key = await prisma.aIKey.findFirst({
                where: { id, companyId }
            });

            if (!key) return res.status(404).json({ success: false, error: 'Key not found or access denied' });

            await prisma.aIKey.delete({ where: { id } });

            res.json({ success: true, message: 'تم حذف المفتاح بنجاح' });
        } catch (error) {
            console.error('❌ Error deleting Gemini key:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

