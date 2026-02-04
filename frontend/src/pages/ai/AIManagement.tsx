import React, { useState, useEffect } from 'react';
import {
    CogIcon,
    ChartBarIcon,
    BoltIcon,
    ClockIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    KeyIcon,
    TrashIcon,
    PlayIcon,
    StopIcon,
    ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import PromptTemplateManager from '../../components/ai/PromptTemplateManager';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useAuth } from '../../hooks/useAuthSimple';
import { buildApiUrl } from '../../utils/urlHelper';
import ResponseRulesSettings from '../../components/ai/ResponseRulesSettings';
import FewShotTwoColumns from './FewShotTwoColumns';

// Add custom CSS for better styling
const customStyles = `
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

interface AISettings {
    isEnabled: boolean;
    workingHours: {
        start: string;
        end: string;
    };
    workingHoursEnabled: boolean;
    maxRepliesPerCustomer: number;
    escalationKeywords: string[];
    responseDelay: number;
    confidenceThreshold: number;
    memoryRetentionDays: number;
    multimodalEnabled: boolean;
    ragEnabled: boolean;
    qualityEvaluationEnabled: boolean;
    replyMode: 'new_only' | 'all'; // ✅ NEW: Reply mode setting
}

interface QueueSettings {
    batchWaitTime: number;
    enabled: boolean;
    maxBatchSize: number;
    description: string;
}

interface PrioritySettings {
    promptPriority: 'high' | 'medium' | 'low';
    enforcePersonality: boolean;
    enforceLanguageStyle: boolean;
}

interface AdvancedAISettings {
    // إعدادات التوليد
    temperature: number;
    topP: number;
    topK: number;
    maxTokens: number;
    responseStyle: 'formal' | 'casual' | 'balanced';

    // إعدادات السلوك الذكي
    enableDiversityCheck: boolean;
    enableToneAdaptation: boolean;
    enableEmotionalResponse: boolean;
    enableSmartSuggestions: boolean;
    enableLongTermMemory: boolean;

    // إعدادات متقدمة
    maxMessagesPerConversation: number;
    memoryRetentionDays: number;

    // إعدادات الجودة
    minQualityScore: number;
    enableLowQualityAlerts: boolean;
}

interface GeminiKeyModel {
    id: string;
    model: string;
    usage: {
        used: number;
        limit: number;
        resetDate?: string;
    };
    isEnabled: boolean;
    priority: number;
    lastUsed?: string;
}

interface GeminiKey {
    id: string;
    name: string;
    apiKey: string;
    isActive: boolean;
    priority: number;
    description?: string;
    usage: {
        used: number;
        limit: number;
    };
    model: string; // للتوافق مع النظام القديم
    models: GeminiKeyModel[]; // النماذج الجديدة
    totalModels: number;
    availableModels: number;
    createdAt: string;
}

interface SystemPrompt {
    id: string;
    name: string;
    content: string;
    isActive: boolean;
    category: string;
    createdAt: string;
}

interface MemorySettings {
    retentionDays: number;
    maxConversationsPerUser: number;
    maxMessagesPerConversation: number;
    autoCleanup: boolean;
    compressionEnabled: boolean;
}

interface MemoryStats {
    totalMemories: number;
    totalMessages: number;
    totalCustomers: number;
    shortTermMemorySize: number;
    retentionDays: number;
}

interface AIStats {
    totalMessages: number;
    aiResponses: number;
    humanHandoffs: number;
    avgResponseTime: number;
    avgConfidence: number;
    topIntents: Array<{ intent: string; count: number }>;
    sentimentDistribution: {
        positive: number;
        neutral: number;
        negative: number;
    };
}

const AIManagement: React.FC = () => {
    // Authentication
    const { user, isAuthenticated } = useAuth();

    // All useState hooks must be called before any conditional returns
    const [settings, setSettings] = useState<AISettings>({
        isEnabled: false, // Default to false to avoid flicker/accidental activation
        workingHours: { start: '09:00', end: '18:00' },
        workingHoursEnabled: false,
        maxRepliesPerCustomer: 5,
        escalationKeywords: ['شكوى', 'مشكلة', 'غاضب', 'مدير'],
        responseDelay: 2000,
        confidenceThreshold: 0.7,
        memoryRetentionDays: 30,
        multimodalEnabled: true,
        ragEnabled: true,
        qualityEvaluationEnabled: true,
        replyMode: 'all'
    });

    const [geminiKeys, setGeminiKeys] = useState<GeminiKey[]>([]);
    const [systemPrompts, setSystemPrompts] = useState<SystemPrompt[]>([]);
    const [memorySettings, setMemorySettings] = useState<MemorySettings>({
        retentionDays: 30,
        maxConversationsPerUser: 100,
        maxMessagesPerConversation: 50,
        autoCleanup: true,
        compressionEnabled: false
    });

    const [prioritySettings, setPrioritySettings] = useState<PrioritySettings>({
        promptPriority: 'high',
        enforcePersonality: true,
        enforceLanguageStyle: true
    });

    const [memoryStats, setMemoryStats] = useState<MemoryStats>({
        totalMemories: 0,
        totalMessages: 0,
        totalCustomers: 0,
        shortTermMemorySize: 0,
        retentionDays: 30
    });

    const [newGeminiKey, setNewGeminiKey] = useState({
        name: '',
        apiKey: '',
        description: '',
        model: 'gemini-2.5-flash' // Add default model
    });

    const [newPrompt, setNewPrompt] = useState({
        name: '',
        content: '',
        category: 'general'
    });

    const [editingPrompt, setEditingPrompt] = useState<any>(null);
    const [editPromptData, setEditPromptData] = useState({
        name: '',
        content: '',
        category: 'general'
    });

    const [availableModels, setAvailableModels] = useState([
        // 🆕 أحدث نماذج Gemini 2025
        'gemini-3-pro',                              // أحدث Pro - الأقوى
        'gemini-2.5-pro',                            // الأقوى - للمهام المعقدة
        'gemini-2.5-flash',                          // الأفضل سعر/أداء
        'gemini-2.5-flash-lite',                     // الأسرع والأوفر
        'gemini-2.5-flash-tts',                      // تحويل نص لصوت

        // نماذج Gemini 2.0
        'gemini-2.0-flash',                          // الجيل الثاني
        'gemini-2.0-flash-lite',                     // نسخة خفيفة

        // نماذج Live API
        'gemini-2.5-flash-live',                     // تفاعل مباشر 2.5
        'gemini-2.0-flash-live',                     // تفاعل مباشر 2.0
        'gemini-2.5-flash-native-audio-dialog',      // صوت تفاعلي

        // نماذج Gemini 1.5 (مستقرة)
        'gemini-1.5-pro',                            // مستقر للمهام المعقدة
        'gemini-1.5-flash',                          // مستقر سريع

        // نماذج متخصصة
        'gemini-robotics-er-1.5-preview',            // للروبوتات
        'learnlm-2.0-flash-experimental',            // للتعلّم

        // نماذج Gemma
        'gemma-3-12b',                               // Gemma متوسط
        'gemma-3-27b',                               // Gemma كبير
        'gemma-3-4b',                                // Gemma صغير
        'gemma-3-2b'                                 // Gemma صغير جداً
    ]);

    const [stats, setStats] = useState<AIStats>({
        totalMessages: 0,
        aiResponses: 0,
        humanHandoffs: 0,
        avgResponseTime: 0,
        avgConfidence: 0,
        topIntents: [],
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 }
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('aiManagement_activeTab') || 'response-rules';
    });

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        localStorage.setItem('aiManagement_activeTab', tabId);
    };

    // Add notification state management
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [autoCloseSettings, setAutoCloseSettings] = useState(false);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editModel, setEditModel] = useState('');
    const [geminiEnabled, setGeminiEnabled] = useState(false);
    const [showAddGeminiKeyModal, setShowAddGeminiKeyModal] = useState(false);
    const [showPromptLibrary, setShowPromptLibrary] = useState(false);

    // Add these missing state setters
    const closeAddGeminiKeyModal = () => setShowAddGeminiKeyModal(false);
    const openAddGeminiKeyModal = () => setShowAddGeminiKeyModal(true);

    const handleAddGeminiKey = async () => {
        if (!newGeminiKey.name || !newGeminiKey.apiKey) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        try {
            const response = await companyAwareApi.post('/ai/gemini-keys', newGeminiKey);
            const data = response.data;

            if (data.success) {
                alert('تم إضافة مفتاح Gemini بنجاح! ✅');
                setNewGeminiKey({ name: '', apiKey: '', description: '', model: 'gemini-2.5-flash' });
                closeAddGeminiKeyModal();
                loadGeminiKeys();
            } else {
                // Enhanced error handling for duplicate keys
                if (data.errorCode === 'DUPLICATE_API_KEY') {
                    // Show detailed Arabic duplicate key message
                    const message = data.details?.arabic || data.message || data.error;
                    const suggestion = data.details?.suggestion ? `\n\n💡 ${data.details.suggestion}` : '';
                    alert(`❌ ${message}${suggestion}`);
                } else {
                    alert(`خطأ في إضافة المفتاح: ${data.error || 'خطأ غير معروف'}`);
                }
            }
        } catch (error: any) {
            console.error('Error adding Gemini key:', error);

            // Handle network/HTTP errors that might contain our enhanced error response
            if (error.response?.data) {
                const errorData = error.response.data;

                if (errorData.errorCode === 'DUPLICATE_API_KEY') {
                    // Show detailed Arabic duplicate key message from error response
                    const message = errorData.details?.arabic || errorData.message || errorData.error;
                    const suggestion = errorData.details?.suggestion ? `\n\n💡 ${errorData.details.suggestion}` : '';
                    alert(`❌ ${message}${suggestion}`);
                } else {
                    alert(`خطأ في إضافة المفتاح: ${errorData.error || errorData.message || 'خطأ في الاتصال بالخادم'}`);
                }
            } else {
                alert('خطأ في إضافة المفتاح - تحقق من الاتصال بالإنترنت');
            }
        }
    };


    // Queue Settings State
    const [queueSettings, setQueueSettings] = useState<QueueSettings>({
        batchWaitTime: 5000,
        enabled: true,
        maxBatchSize: 10,
        description: 'إعدادات تجميع الرسائل المتتالية'
    });
    const [queueLoading, setQueueLoading] = useState(false);
    const [queueSaving, setQueueSaving] = useState(false);

    // ✨ Advanced AI Settings State (NEW)
    // ⚠️ هذا هو المصدر الوحيد للقيم الافتراضية - أي تعديل هنا يؤثر على النظام بالكامل
    const [advancedSettings, setAdvancedSettings] = useState<AdvancedAISettings>({
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxTokens: 2048, // ⚠️ المصدر الوحيد للقيمة الافتراضية - تعديل هنا فقط
        responseStyle: 'balanced',
        enableDiversityCheck: true,
        enableToneAdaptation: true,
        enableEmotionalResponse: true,
        enableSmartSuggestions: false,
        enableLongTermMemory: false,
        maxMessagesPerConversation: 50,
        memoryRetentionDays: 30,
        minQualityScore: 70,
        enableLowQualityAlerts: true,
    });
    const [advancedLoading, setAdvancedLoading] = useState(false);
    const [advancedSaving, setAdvancedSaving] = useState(false);

    const loadAISettings = async () => {
        try {
            if (!isAuthenticated) {
                console.log('⚠️ User not authenticated, skipping AI settings load');
                return;
            }

            setLoading(true);
            setAdvancedLoading(true);
            const response = await companyAwareApi.get('/settings/ai');
            const data = response.data;

            if (data.success && data.data) {
                const aiSettings = data.data;
                setSettings(prev => ({
                    ...prev,
                    isEnabled: aiSettings.autoReplyEnabled ?? false,
                    confidenceThreshold: aiSettings.confidenceThreshold ?? 0.7,
                    multimodalEnabled: aiSettings.multimodalEnabled !== false,
                    ragEnabled: aiSettings.ragEnabled !== false,
                    qualityEvaluationEnabled: aiSettings.qualityEvaluationEnabled !== false,
                    replyMode: aiSettings.replyMode || 'all'
                }));

                setAdvancedSettings(prev => ({
                    ...prev,
                    temperature: aiSettings.aiTemperature ?? 0.7,
                    topP: aiSettings.aiTopP ?? 0.9,
                    topK: aiSettings.aiTopK ?? 40,
                    maxTokens: aiSettings.aiMaxTokens ?? 2048,
                    responseStyle: aiSettings.aiResponseStyle || 'balanced',
                    enableDiversityCheck: aiSettings.enableDiversityCheck !== false,
                    enableToneAdaptation: aiSettings.enableToneAdaptation !== false,
                    enableEmotionalResponse: aiSettings.enableEmotionalResponse !== false,
                    enableSmartSuggestions: aiSettings.enableSmartSuggestions || false,
                    enableLongTermMemory: aiSettings.enableLongTermMemory || false,
                    maxMessagesPerConversation: aiSettings.maxMessagesPerConversation || 50,
                    memoryRetentionDays: aiSettings.memoryRetentionDays || 30,
                    minQualityScore: aiSettings.minQualityScore ?? 70,
                    enableLowQualityAlerts: aiSettings.enableLowQualityAlerts !== false,
                }));

                console.log('✅ AI Settings loaded:', aiSettings);
            }
        } catch (error) {
            console.error('Error loading AI settings:', error);
        } finally {
            setLoading(false);
            setAdvancedLoading(false);
        }
    };

    // Removed redundant loadAdvancedSettings and loadSettings functions as they are now merged into loadAISettings


    // ✨ Save Advanced AI Settings (NEW)
    const saveAdvancedSettings = async () => {
        try {
            setAdvancedSaving(true);
            const response = await companyAwareApi.put('/settings/ai', {
                aiTemperature: advancedSettings.temperature,
                aiTopP: advancedSettings.topP,
                aiTopK: advancedSettings.topK,
                aiMaxTokens: advancedSettings.maxTokens,
                aiResponseStyle: advancedSettings.responseStyle,
                enableDiversityCheck: advancedSettings.enableDiversityCheck,
                enableToneAdaptation: advancedSettings.enableToneAdaptation,
                enableEmotionalResponse: advancedSettings.enableEmotionalResponse,
                enableSmartSuggestions: advancedSettings.enableSmartSuggestions,
                enableLongTermMemory: advancedSettings.enableLongTermMemory,
                maxMessagesPerConversation: advancedSettings.maxMessagesPerConversation,
                memoryRetentionDays: advancedSettings.memoryRetentionDays,
                minQualityScore: advancedSettings.minQualityScore,
                enableLowQualityAlerts: advancedSettings.enableLowQualityAlerts,
            });

            if (response.data.success) {
                setNotification({ show: true, message: '✅ تم حفظ الإعدادات المتقدمة بنجاح', type: 'success' });
                setTimeout(() => {
                    setNotification({ show: false, message: '', type: 'success' });
                }, 3000);
            }
        } catch (error) {
            console.error('Error saving advanced settings:', error);
            setNotification({ show: true, message: '❌ خطأ في حفظ الإعدادات المتقدمة', type: 'error' });
            setTimeout(() => {
                setNotification({ show: false, message: '', type: 'error' });
            }, 5000);
        } finally {
            setAdvancedSaving(false);
        }
    };

    useEffect(() => {
        // Only load data if user is authenticated
        if (isAuthenticated && user) {
            loadStats();
            loadGeminiKeys();
            loadSystemPrompts();
            loadMemorySettings();
            loadMemoryStats();
            checkAvailableModels();
            loadAISettings(); // This now loads both basic and advanced settings
            loadQueueSettings();
        }
    }, [isAuthenticated, user]);

    // Redundant loadSettings, loadStats already called in useEffect


    const loadStats = async () => {
        try {
            if (!isAuthenticated) {
                console.log('⚠️ User not authenticated, skipping stats load');
                return;
            }

            const response = await companyAwareApi.get('/ai/stats');
            const data = response.data;

            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error loading AI stats:', error);
        }
    };

    const saveSettings = async () => {
        try {
            if (!isAuthenticated) {
                alert('يجب تسجيل الدخول أولاً');
                return;
            }

            setSaving(true);

            // 🔍 DEBUG: Log what we're sending
            const requestData = {
                autoReplyEnabled: settings.isEnabled,
                confidenceThreshold: settings.confidenceThreshold,
                multimodalEnabled: settings.multimodalEnabled,
                ragEnabled: settings.ragEnabled,
                qualityEvaluationEnabled: settings.qualityEvaluationEnabled,
                replyMode: settings.replyMode, // ✅ Save reply mode
            };
            console.log('🔍 [FRONTEND] Saving AI settings with replyMode:', settings.replyMode);
            console.log('🔍 [FRONTEND] Full request data:', requestData);

            const response = await companyAwareApi.put('/settings/ai', requestData);

            const data = response.data;

            if (data.success) {
                setNotification({ show: true, message: 'تم حفظ الإعدادات بنجاح! ✅', type: 'success' });
                console.log('✅ AI Settings saved:', data.data);

                // Auto-hide notification after 3 seconds
                setTimeout(() => {
                    setNotification({ show: false, message: '', type: 'success' });
                }, 3000);
            } else {
                setNotification({ show: true, message: 'حدث خطأ في حفظ الإعدادات ❌', type: 'error' });
                setTimeout(() => {
                    setNotification({ show: false, message: '', type: 'error' });
                }, 5000);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            setNotification({ show: true, message: 'حدث خطأ في حفظ الإعدادات ❌', type: 'error' });
            setTimeout(() => {
                setNotification({ show: false, message: '', type: 'error' });
            }, 5000);
        } finally {
            setSaving(false);
        }
    };

    const toggleAI = async () => {
        if (!isAuthenticated) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }

        const currentStatus = settings.isEnabled;
        const newIsEnabled = !currentStatus;

        // ⏳ Show loading indicator instead of immediate switch
        setLoading(true);

        try {
            console.log(`🔌 [TOGGLE-AI] Attempting to switch AI ${newIsEnabled ? 'ON' : 'OFF'}...`);

            const response = await companyAwareApi.put('/settings/ai', {
                autoReplyEnabled: newIsEnabled,
                // Send other current settings to ensure they aren't lost
                replyMode: settings.replyMode,
                confidenceThreshold: settings.confidenceThreshold,
                multimodalEnabled: settings.multimodalEnabled,
                ragEnabled: settings.ragEnabled
            });

            console.log('🔌 [TOGGLE-AI] Server response:', response.data);

            if (response.data.success) {
                // ✅ Success: Update state and re-fetch to be 100% sure
                setSettings(prev => ({ ...prev, isEnabled: newIsEnabled }));

                // Force reload from server to confirm persistence
                await loadAISettings();

                setNotification({
                    show: true,
                    message: `✅ تم ${newIsEnabled ? 'تفعيل' : 'إيقاف'} الذكاء الاصطناعي بنجاح (وتم التحقق)`,
                    type: 'success'
                });
            } else {
                throw new Error(response.data.error || 'Server reported failure');
            }

        } catch (error: any) {
            console.error('❌ [TOGGLE-AI] Error:', error);
            alert(`فشل في تغيير الحالة: ${error.message || 'خطأ في الاتصال'}`);
            // Revert/Reload settings to ensure UI matches DB
            await loadAISettings();
        } finally {
            setLoading(false);
            setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
        }
    };

    const clearMemory = async () => {
        if (confirm('هل أنت متأكد من مسح جميع ذاكرة المحادثات؟')) {
            try {
                if (!isAuthenticated) {
                    alert('يجب تسجيل الدخول أولاً');
                    return;
                }

                const response = await companyAwareApi.delete('/ai/memory/clear');

                if (response.data.success) {
                    alert('تم مسح الذاكرة بنجاح! 🧹');
                    loadStats();
                    loadMemoryStats();
                }
            } catch (error) {
                console.error('Error clearing memory:', error);
                alert('حدث خطأ في مسح الذاكرة ❌');
            }
        }
    };

    const updateKnowledgeBase = async () => {
        try {
            if (!isAuthenticated) {
                alert('يجب تسجيل الدخول أولاً');
                return;
            }

            setLoading(true);
            console.log('📚 Updating knowledge base...');

            const response = await companyAwareApi.post('/ai/knowledge-base/update');

            if (response.data.success) {
                alert('تم تحديث قاعدة المعرفة بنجاح! 📚');
            } else {
                alert(`خطأ في تحديث قاعدة المعرفة: ${response.data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error updating knowledge base:', error);
            alert('حدث خطأ في تحديث قاعدة المعرفة');
        } finally {
            setLoading(false);
        }
    };

    // Priority Settings Functions
    const savePrioritySettings = async () => {
        try {
            if (!isAuthenticated) {
                alert('يجب تسجيل الدخول أولاً');
                return;
            }

            setLoading(true);
            console.log('💾 Saving priority settings:', prioritySettings);

            const response = await companyAwareApi.put('/ai/priority-settings', prioritySettings);

            if (response.data.success) {
                alert('✅ تم حفظ إعدادات الأولوية بنجاح!');
            } else {
                alert(`❌ خطأ في حفظ الإعدادات: ${response.data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error saving priority settings:', error);
            alert('❌ حدث خطأ في الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    const resetPrioritySettings = () => {
        setPrioritySettings({
            promptPriority: 'high',
            enforcePersonality: true,
            enforceLanguageStyle: true
        });
        alert('🔄 تم إعادة تعيين الإعدادات للقيم الافتراضية');
    };

    // ❌ REMOVED: testConflictDetection - Pattern System removed

    // Gemini Keys Management
    const loadGeminiKeys = async () => {
        try {
            if (!isAuthenticated) {
                console.log('⚠️ User not authenticated, skipping Gemini keys load');
                return;
            }

            console.log('🔄 Loading Gemini keys...');
            const response = await companyAwareApi.get('/ai/gemini-keys');
            console.log('📦 Gemini keys response:', response);
            console.log('📦 Response status:', response.status);

            const data = response.data;
            if (data.success) {
                setGeminiKeys(data.data);
                console.log('✅ Gemini keys loaded:', data.data?.length || 0);
            } else {
                console.error('❌ Failed to load Gemini keys:', data);
                setGeminiKeys([]);
            }
        } catch (error: any) {
            console.error('❌ Error loading Gemini keys:', error);
            console.error('❌ Error response:', error.response);
            console.error('❌ Error status:', error.response?.status);
            console.error('❌ Error data:', error.response?.data);

            // More specific error messages
            let errorMessage = 'فشل في تحميل مفاتيح Gemini';

            if (error.response?.status === 401) {
                errorMessage = 'يجب تسجيل الدخول مرة أخرى';
            } else if (error.response?.status === 403) {
                errorMessage = 'ليس لديك صلاحية للوصول لهذه البيانات';
            } else if (error.response?.status === 500) {
                errorMessage = 'خطأ في الخادم - يرجى المحاولة لاحقاً';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            // Don't show error if user is not authenticated
            if (isAuthenticated) {
                console.error('⚠️ Showing error to user:', errorMessage);
            } else {
                console.log('⚠️ User not authenticated, suppressing error message');
            }
        }
    };

    const addGeminiKey = async () => {
        if (!newGeminiKey.name || !newGeminiKey.apiKey) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        if (!isAuthenticated) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }

        try {
            const response = await companyAwareApi.post('/ai/gemini-keys', newGeminiKey);
            const data = response.data;

            if (data.success) {
                alert(`تم إضافة مفتاح Gemini بنجاح! ✅\nتم إنشاء ${data.data.modelsCreated} نموذج تلقائياً`);
                setNewGeminiKey({ name: '', apiKey: '', description: '', model: 'gemini-2.5-flash' }); // Reset with model
                loadGeminiKeys();
            } else {
                // Enhanced error handling for duplicate keys
                if (data.errorCode === 'DUPLICATE_API_KEY') {
                    // Show detailed Arabic duplicate key message
                    const message = data.details?.arabic || data.message || data.error;
                    const suggestion = data.details?.suggestion ? `\n\n💡 ${data.details.suggestion}` : '';
                    alert(`❌ ${message}${suggestion}`);
                } else {
                    alert(`خطأ في إضافة المفتاح: ${data.error || 'خطأ غير معروف'}`);
                }
            }
        } catch (error: any) {
            console.error('Error adding Gemini key:', error);

            // Handle network/HTTP errors that might contain our enhanced error response
            if (error.response?.data) {
                const errorData = error.response.data;

                if (errorData.errorCode === 'DUPLICATE_API_KEY') {
                    // Show detailed Arabic duplicate key message from error response
                    const message = errorData.details?.arabic || errorData.message || errorData.error;
                    const suggestion = errorData.details?.suggestion ? `\n\n💡 ${errorData.details.suggestion}` : '';
                    alert(`❌ ${message}${suggestion}`);
                } else {
                    alert(`خطأ في إضافة المفتاح: ${errorData.error || errorData.message || 'خطأ في الاتصال بالخادم'}`);
                }
            } else {
                alert('خطأ في إضافة المفتاح - تحقق من الاتصال بالإنترنت');
            }
        }
    };

    const deleteGeminiKey = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
            try {
                const response = await companyAwareApi.delete(`/ai/gemini-keys/${id}`);

                if (response.data.success) {
                    alert('تم حذف المفتاح بنجاح! 🗑️');
                    loadGeminiKeys();
                }
            } catch (error) {
                console.error('Error deleting Gemini key:', error);
                alert('خطأ في حذف المفتاح');
            }
        }
    };

    const activateGeminiKey = async (id: string) => {
        try {
            const response = await companyAwareApi.post(`/ai/gemini-keys/${id}/activate`);

            if (response.data.success) {
                alert('تم تفعيل المفتاح بنجاح! ✅');
                loadGeminiKeys();
            } else {
                alert('خطأ في تفعيل المفتاح');
            }
        } catch (error) {
            console.error('Error activating Gemini key:', error);
            alert('خطأ في تفعيل المفتاح');
        }
    };

    const deactivateGeminiKey = async (id: string) => {
        try {
            const response = await companyAwareApi.post(`/ai/gemini-keys/${id}/deactivate`);

            if (response.data.success) {
                alert('تم إلغاء تفعيل المفتاح بنجاح! 🚫');
                loadGeminiKeys();
            } else {
                alert('خطأ في إلغاء تفعيل المفتاح');
            }
        } catch (error) {
            console.error('Error deactivating Gemini key:', error);
            alert('خطأ في إلغاء تفعيل المفتاح');
        }
    };

    const editGeminiKey = (id: string) => {
        const key = geminiKeys.find(k => k.id === id);
        if (key) {
            setEditingKey(key.id);
            setNewGeminiKey({
                ...key,
                description: key.description || ''
            });
        }
    };

    const saveGeminiKey = async (id: string) => {
        if (!newGeminiKey.name || !newGeminiKey.apiKey) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        if (!isAuthenticated) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }

        try {
            const response = await companyAwareApi.put(`/ai/gemini-keys/${id}`, newGeminiKey);
            const data = response.data;

            if (data.success) {
                alert('تم تحديث المفتاح بنجاح! ✅');
                setEditingKey(null);
                loadGeminiKeys();
            } else {
                alert(`خطأ في تحديث المفتاح: ${data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error updating Gemini key:', error);
            alert('خطأ في تحديث المفتاح');
        }
    };

    const checkAvailableModels = async () => {
        try {
            const response = await companyAwareApi.get('/ai/available-models');
            const data = response.data;

            if (data.success) {
                setAvailableModels(data.models || []);
            }
        } catch (error) {
            console.error('Error checking available models:', error);
        }
    };

    const loadSystemPrompts = async () => {
        try {
            if (!isAuthenticated) {
                console.log('⚠️ User not authenticated, skipping system prompts load');
                return;
            }

            const response = await companyAwareApi.get('/ai/prompts');
            const data = response.data;

            if (data.success) {
                setSystemPrompts(data.data);
            }
        } catch (error) {
            console.error('Error loading system prompts:', error);
        }
    };

    const addSystemPrompt = async () => {
        if (!newPrompt.name || !newPrompt.content) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        if (!isAuthenticated) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }

        try {
            const response = await companyAwareApi.post('/ai/prompts', newPrompt);
            const data = response.data;

            if (data.success) {
                alert('تم إضافة البرونت بنجاح! ✅');
                setNewPrompt({ name: '', content: '', category: 'general' });
                loadSystemPrompts();
            } else {
                alert(`خطأ في إضافة البرونت: ${data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error adding system prompt:', error);
            alert('خطأ في إضافة البرونت');
        }
    };

    const deleteSystemPrompt = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا البرونت؟')) {
            try {
                const response = await companyAwareApi.delete(`/ai/prompts/${id}`);

                if (response.data.success) {
                    alert('تم حذف البرونت بنجاح! 🗑️');
                    loadSystemPrompts();
                }
            } catch (error) {
                console.error('Error deleting system prompt:', error);
                alert('خطأ في حذف البرونت');
            }
        }
    };

    const handleSelectPromptFromLibrary = (prompt: any) => {
        setNewPrompt({
            name: prompt.nameAr || prompt.name,
            content: prompt.promptContent,
            category: prompt.category || 'general'
        });
        setShowPromptLibrary(false);
        alert('تم تحميل البرومبت من المكتبة! يمكنك تعديله والحفظ.');
    };

    const editSystemPrompt = (id: string) => {
        const prompt = systemPrompts.find(p => p.id === id);
        if (prompt) {
            setEditingPrompt(prompt.id);
            setEditPromptData(prompt);
        }
    };

    const saveSystemPrompt = async (id: string) => {
        if (!editPromptData.name || !editPromptData.content) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        if (!isAuthenticated) {
            alert('يجب تسجيل الدخول أولاً');
            return;
        }

        try {
            const response = await companyAwareApi.put(`/ai/prompts/${id}`, editPromptData);
            const data = response.data;

            if (data.success) {
                alert('تم تحديث البرونت بنجاح! ✅');
                setEditingPrompt(null);
                loadSystemPrompts();
            } else {
                alert(`خطأ في تحديث البرونت: ${data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error updating system prompt:', error);
            alert('خطأ في تحديث البرونت');
        }
    };

    const loadMemorySettings = async () => {
        try {
            if (!isAuthenticated) {
                console.log('⚠️ User not authenticated, skipping memory settings load');
                return;
            }

            const response = await companyAwareApi.get('/ai/memory/settings');
            const data = response.data;

            if (data.success) {
                setMemorySettings(data.data);
            }
        } catch (error) {
            console.error('Error loading memory settings:', error);
        }
    };

    const saveMemorySettings = async () => {
        try {
            if (!isAuthenticated) {
                alert('يجب تسجيل الدخول أولاً');
                return;
            }

            setLoading(true);

            const response = await companyAwareApi.put('/ai/memory/settings', memorySettings);

            if (response.data.success) {
                alert('✅ تم حفظ إعدادات الذاكرة بنجاح!');
            } else {
                alert(`❌ خطأ في حفظ الإعدادات: ${response.data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error saving memory settings:', error);
            alert('❌ حدث خطأ في الاتصال بالخادم');
        } finally {
            setLoading(false);
        }
    };

    const loadMemoryStats = async () => {
        try {
            if (!isAuthenticated) {
                console.log('⚠️ User not authenticated, skipping memory stats load');
                return;
            }

            const response = await companyAwareApi.get('/ai/memory/stats');
            const data = response.data;

            if (data.success) {
                setMemoryStats(data.data);
            }
        } catch (error) {
            console.error('Error loading memory stats:', error);
        }
    };

    const loadQueueSettings = async () => {
        try {
            if (!isAuthenticated) {
                console.log('⚠️ User not authenticated, skipping queue settings load');
                return;
            }

            const response = await companyAwareApi.get('/settings/queue');
            const data = response.data;

            if (data.success) {
                setQueueSettings(data.data);
            }
        } catch (error) {
            console.error('Error loading queue settings:', error);
            // Set default values if API fails
            setQueueSettings({
                batchWaitTime: 5000,
                enabled: true,
                maxBatchSize: 10,
                description: 'إعدادات تجميع الرسائل المتتالية'
            });
        }
    };

    const saveQueueSettings = async () => {
        try {
            if (!isAuthenticated) {
                alert('يجب تسجيل الدخول أولاً');
                return;
            }

            setQueueSaving(true);

            const response = await companyAwareApi.put('/settings/queue', queueSettings);

            if (response.data.success) {
                alert('✅ تم حفظ إعدادات التجميع بنجاح!');
            } else {
                alert(`❌ خطأ في حفظ الإعدادات: ${response.data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error adding Gemini key:', error);
            alert('حدث خطأ في الاتصال بالخادم');
        }
    };

    const toggleGeminiKey = async (keyId: string) => {
        try {
            console.log('🔄 Toggling Gemini key:', keyId);

            const response = await companyAwareApi.put(`/ai/gemini-keys/${keyId}/toggle`);

            console.log('✅ Toggle response:', response.data);

            if (response.data.success) {
                loadGeminiKeys();
                alert('تم تبديل حالة المفتاح بنجاح');
            } else {
                alert('فشل في تبديل حالة المفتاح');
            }
        } catch (error) {
            console.error('Error toggling Gemini key:', error);
            alert('حدث خطأ في تبديل حالة المفتاح');
        }
    };

    const startEditingModel = (keyId: string, currentModel: string) => {
        setEditingKey(keyId);
        setEditModel(currentModel);
    };

    const cancelEditingModel = () => {
        setEditingKey(null);
        setEditModel('');
    };

    const updateGeminiKeyModel = async (keyId: string) => {
        if (!editModel.trim()) {
            alert('يرجى اختيار نموذج صالح');
            return;
        }

        try {
            const response = await companyAwareApi.put(`/ai/gemini-keys/${keyId}/model`, {
                model: editModel
            });

            if (response.data.success) {
                alert('تم تحديث النموذج بنجاح! 🎯');
                loadGeminiKeys();
                cancelEditingModel();
            } else {
                alert(`خطأ في تحديث النموذج: ${response.data.error}`);
            }
        } catch (error) {
            console.error('Error updating Gemini key model:', error);
            alert('حدث خطأ في تحديث النموذج');
        }
    };

    const testGeminiKey = async (keyId: string) => {
        try {
            setLoading(true);
            const response = await companyAwareApi.post(`/ai/gemini-keys/${keyId}/test`);

            const data = response.data;
            if (data.success) {
                alert(`${data.message}

تفاصيل الاختبار:
• النموذج المستخدم: ${data.model}
• الحالة: ${data.status}
• عينة من الرد: ${data.response}`);
            } else {
                alert(`${data.message || '❌ المفتاح لا يعمل'}\n\nسبب الخطأ: ${data.error}`);
            }
        } catch (error) {
            console.error('Error testing Gemini key:', error);
            alert('❌ حدث خطأ في اختبار المفتاح');
        } finally {
            setLoading(false);
        }
    };

    const activatePrompt = async (promptId: string) => {
        try {
            console.log('🔄 Activating prompt:', promptId);

            const response = await companyAwareApi.put(`/ai/prompts/${promptId}/activate`);

            if (response.data.success) {
                alert('تم تفعيل البرومبت بنجاح! ✅');
                loadSystemPrompts();
            } else {
                alert(`خطأ في تفعيل البرومبت: ${response.data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error activating prompt:', error);
            alert('حدث خطأ في تفعيل البرومبت');
        }
    };

    const startEditPrompt = (prompt: any) => {
        setEditingPrompt(prompt);
        setEditPromptData({
            name: prompt.name,
            content: prompt.content,
            category: prompt.category
        });
    };

    const cancelEditPrompt = () => {
        setEditingPrompt(null);
        setEditPromptData({
            name: '',
            content: '',
            category: 'general'
        });
    };

    const updatePrompt = async () => {
        if (!editPromptData.name || !editPromptData.content) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        try {
            console.log('📝 Updating prompt:', editingPrompt.id, editPromptData);

            const response = await companyAwareApi.put(`/ai/prompts/${editingPrompt.id}`, editPromptData);

            if (response.data.success) {
                alert('تم تحديث البرومبت بنجاح! ✅');
                cancelEditPrompt();
                loadSystemPrompts();
            } else {
                alert(`خطأ في تحديث البرومبت: ${response.data.error || 'خطأ غير معروف'}`);
            }
        } catch (error) {
            console.error('Error updating prompt:', error);
            alert('حدث خطأ في تحديث البرومبت');
        }
    };

    const deletePrompt = async (promptId: string) => {
        if (confirm('هل أنت متأكد من حذف هذا البرومبت؟')) {
            try {
                console.log('🗑️ Deleting prompt:', promptId);

                const response = await companyAwareApi.delete(`/ai/prompts/${promptId}`);

                if (response.data.success) {
                    alert('تم حذف البرومبت بنجاح! 🗑️');
                    loadSystemPrompts();
                } else {
                    alert(`خطأ في حذف البرومبت: ${response.data.error || 'خطأ غير معروف'}`);
                }
            } catch (error) {
                console.error('Error deleting prompt:', error);
                alert('حدث خطأ في حذف البرومبت');
            }
        }
    };

    const cleanupMemory = async () => {
        if (confirm('هل أنت متأكد من تنظيف الذاكرة القديمة؟')) {
            try {
                if (!isAuthenticated) {
                    alert('يجب تسجيل الدخول أولاً');
                    return;
                }

                setLoading(true);
                const response = await companyAwareApi.post('/ai/memory/cleanup');

                const data = response.data;
                if (data.success) {
                    alert(`تم تنظيف ${data.deletedCount} سجل من الذاكرة! 🧹`);
                    loadMemoryStats();
                }
            } catch (error) {
                console.error('Error cleaning up memory:', error);
                alert('حدث خطأ في تنظيف الذاكرة ❌');
            } finally {
                setLoading(false);
            }
        }
    };

    // Show loading or login message if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-4">
                        يجب تسجيل الدخول أولاً
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400">
                        يرجى تسجيل الدخول للوصول إلى إدارة الذكاء الاصطناعي
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <style>{customStyles}</style>
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white dark:text-white">إدارة الذكاء الصناعي</h1>
                            <p className="mt-2 text-gray-600 dark:text-gray-400 dark:text-gray-400">تحكم في إعدادات وأداء AI Agent</p>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* AI Status Toggle */}
                            <div className="flex items-center">
                                <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white dark:text-gray-300">
                                    {settings.isEnabled ? 'مفعل' : 'معطل'}
                                </span>
                                <button
                                    onClick={toggleAI}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${settings.isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isEnabled ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Status Indicator */}
                            <div className="flex items-center">
                                {settings.isEnabled ? (
                                    <CheckCircleIcon className="h-6 w-6 text-green-500" />
                                ) : (
                                    <XCircleIcon className="h-6 w-6 text-red-500" />
                                )}
                                <span className={`ml-2 text-sm font-medium ${settings.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    {settings.isEnabled ? 'AI نشط' : 'AI متوقف'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <ChartBarIcon className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400">إجمالي الرسائل</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{stats.totalMessages}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <BoltIcon className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400">ردود AI</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{stats.aiResponses}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <UserGroupIcon className="h-8 w-8 text-orange-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400">تحويل بشري</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{stats.humanHandoffs}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <ClockIcon className="h-8 w-8 text-purple-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 dark:text-gray-400">متوسط الرد</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">{stats.avgResponseTime}ث</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Navigation and Content */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Navigation */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <nav className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 space-y-1">
                            {[
                                { id: 'response-rules', name: '📋 قواعد الاستجابة', icon: CogIcon },
                                { id: 'templates', name: '📋 قوالب الردود', icon: ClipboardDocumentListIcon },
                                { id: 'few-shot', name: '🎓 Few-Shot Learning', icon: BoltIcon, badge: 'جديد' },
                                { id: 'advanced-ai', name: '⚡ إعدادات AI متقدمة', icon: BoltIcon },
                                { id: 'gemini', name: '🔑 مفاتيح Gemini', icon: CogIcon },
                                { id: 'prompts', name: '💬 البرومبت المتقدم', icon: BoltIcon },
                                { id: 'priority', name: '🎯 أولوية النظام', icon: CogIcon },
                                { id: 'memory', name: '🧠 إدارة الذاكرة', icon: ChartBarIcon },
                                { id: 'queue-settings', name: '⏱️ إعدادات الطوابير', icon: ClockIcon },
                                { id: 'settings', name: '⚙️ الإعدادات', icon: CogIcon },
                                { id: 'analytics', name: '📊 التحليلات', icon: ChartBarIcon },
                                { id: 'knowledge', name: '📚 قاعدة المعرفة', icon: BoltIcon }
                            ].map((tab) => {
                                const IconComponent = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabChange(tab.id)}
                                        className={`w-full flex items-center py-3 px-4 rounded-lg font-medium text-sm transition-colors ${activeTab === tab.id
                                            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-r-4 border-blue-600 dark:border-blue-500'
                                            : 'text-gray-600 dark:text-gray-400 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-700/50 dark:hover:bg-gray-700 hover:text-gray-900 dark:text-white dark:hover:text-white'
                                            }`}
                                    >
                                        <IconComponent className="h-5 w-5 ml-3 flex-shrink-0" />
                                        <span className="text-right flex-1">{tab.name}</span>
                                        {tab.badge && (
                                            <span className="mr-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                                                {tab.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-w-0">
                        {activeTab === 'response-rules' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <ResponseRulesSettings />
                            </div>
                        )}

                        {activeTab === 'templates' && (
                            <PromptTemplateManager />
                        )}

                        {activeTab === 'few-shot' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow" style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                                <FewShotTwoColumns />
                            </div>
                        )}

                        {activeTab === 'advanced-ai' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">⚡ إعدادات AI المتقدمة</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">تحكم دقيق في إعدادات التوليد والسلوك الذكي</p>
                                </div>

                                <div className="p-6">
                                    {advancedLoading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-2">جاري تحميل الإعدادات المتقدمة...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {/* Generation Settings */}
                                            <div>
                                                <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-gray-100 mb-4">🔧 إعدادات التوليد</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Temperature */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                                                            Temperature (الإبداع): {advancedSettings.temperature}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="1"
                                                            step="0.1"
                                                            value={advancedSettings.temperature}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, temperature: parseFloat(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">أقل = ردود متوقعة، أعلى = ردود إبداعية</p>
                                                    </div>

                                                    {/* TopP */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                                                            Top P (التنوع): {advancedSettings.topP}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="1"
                                                            step="0.05"
                                                            value={advancedSettings.topP}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, topP: parseFloat(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">يتحكم في تنوع الكلمات المختارة</p>
                                                    </div>

                                                    {/* TopK */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                                                            Top K (عدد الخيارات): {advancedSettings.topK}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="100"
                                                            step="1"
                                                            value={advancedSettings.topK}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, topK: parseInt(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">عدد الكلمات المرشحة في كل خطوة</p>
                                                    </div>

                                                    {/* MaxTokens */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                                                            Max Tokens (طول الرد): {advancedSettings.maxTokens}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="128"
                                                            max="8192"
                                                            step="128"
                                                            value={advancedSettings.maxTokens}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, maxTokens: parseInt(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            <span>128</span>
                                                            <span>8192</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            الحد الأقصى لطول الرد (tokens)
                                                            {advancedSettings.maxTokens > 4096 && (
                                                                <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                                                                    ⚠️ القيم الكبيرة قد تزيد وقت الاستجابة والتكلفة
                                                                </span>
                                                            )}
                                                        </p>
                                                        {advancedSettings.maxTokens > 4096 && (
                                                            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded text-xs text-amber-800 dark:text-amber-200">
                                                                <p className="font-medium mb-1">💡 نصيحة:</p>
                                                                <ul className="list-disc list-inside space-y-1">
                                                                    <li>القيم الكبيرة (4096+) مناسبة للردود الطويلة مثل تفاصيل الطلبات</li>
                                                                    <li>القيم المتوسطة (2048-4096) مناسبة لمعظم الاستخدامات</li>
                                                                    <li>القيم الصغيرة (128-1024) مناسبة للردود السريعة</li>
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Response Style */}
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            أسلوب الرد
                                                        </label>
                                                        <select
                                                            value={advancedSettings.responseStyle}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, responseStyle: e.target.value as 'formal' | 'casual' | 'balanced' })}
                                                            className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                        >
                                                            <option value="formal">رسمي - للمعاملات الاحترافية</option>
                                                            <option value="balanced">متوازن - يناسب معظم الحالات</option>
                                                            <option value="casual">عامي - للتواصل الودي</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Smart Behavior Settings */}
                                            <div>
                                                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">🧠 إعدادات السلوك الذكي</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedSettings.enableDiversityCheck}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, enableDiversityCheck: e.target.checked })}
                                                            className="mr-3 text-blue-600"
                                                        />
                                                        <div>
                                                            <span className="font-medium">🎨 فحص التنوع</span>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">منع تكرار نفس الردود</p>
                                                        </div>
                                                    </label>

                                                    <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedSettings.enableToneAdaptation}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, enableToneAdaptation: e.target.checked })}
                                                            className="mr-3 text-blue-600"
                                                        />
                                                        <div>
                                                            <span className="font-medium">🎭 تكيف الأسلوب</span>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">يتكيف مع أسلوب العميل</p>
                                                        </div>
                                                    </label>

                                                    <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedSettings.enableEmotionalResponse}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, enableEmotionalResponse: e.target.checked })}
                                                            className="mr-3 text-blue-600"
                                                        />
                                                        <div>
                                                            <span className="font-medium">❤️ استجابة عاطفية</span>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">يفهم المشاعر ويستجيب بلطف</p>
                                                        </div>
                                                    </label>

                                                    <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedSettings.enableSmartSuggestions}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, enableSmartSuggestions: e.target.checked })}
                                                            className="mr-3 text-blue-600"
                                                        />
                                                        <div>
                                                            <span className="font-medium">💡 اقتراحات ذكية</span>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">يقترح منتجات وحلول</p>
                                                        </div>
                                                    </label>

                                                    <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedSettings.enableLongTermMemory}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, enableLongTermMemory: e.target.checked })}
                                                            className="mr-3 text-blue-600"
                                                        />
                                                        <div>
                                                            <span className="font-medium">🧠 ذاكرة طويلة المدى</span>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">يتذكر التفاعلات السابقة</p>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Advanced Settings */}
                                            <div>
                                                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">⚙️ إعدادات متقدمة</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            الحد الأقصى للرسائل في المحادثة
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="10"
                                                            max="100"
                                                            value={advancedSettings.maxMessagesPerConversation}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, maxMessagesPerConversation: parseInt(e.target.value) })}
                                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">عدد الرسائل التي يتذكرها في المحادثة</p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            مدة الاحتفاظ بالذاكرة (بالأيام)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="365"
                                                            value={advancedSettings.memoryRetentionDays}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, memoryRetentionDays: parseInt(e.target.value) })}
                                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">فترة الاحتفاظ بسجل المحادثات</p>
                                                    </div>

                                                </div>
                                            </div>

                                            {/* Quality Settings */}
                                            <div>
                                                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">✅ إعدادات الجودة</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            الحد الأدنى لدرجة الجودة: {advancedSettings.minQualityScore}
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            step="5"
                                                            value={advancedSettings.minQualityScore}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, minQualityScore: parseInt(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">الحد الأدنى المقبول لجودة الردود</p>
                                                    </div>

                                                    <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedSettings.enableLowQualityAlerts}
                                                            onChange={(e) => setAdvancedSettings({ ...advancedSettings, enableLowQualityAlerts: e.target.checked })}
                                                            className="mr-3 text-blue-600"
                                                        />
                                                        <div>
                                                            <span className="font-medium">🚨 تنبيهات الجودة المنخفضة</span>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">تنبيه عند انخفاض جودة الردود</p>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={saveAdvancedSettings}
                                                    disabled={advancedSaving}
                                                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {advancedSaving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات المتقدمة'}
                                                </button>

                                                <button
                                                    onClick={loadAISettings}
                                                    disabled={advancedLoading}
                                                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    {advancedLoading ? '⏳ جاري التحديث...' : '🔄 إعادة تحميل'}
                                                </button>
                                            </div>

                                            {/* Help Section */}
                                            <div className="bg-yellow-50 rounded-lg p-4">
                                                <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ ملاحظة هامة:</h4>
                                                <p className="text-sm text-yellow-800">
                                                    هذه الإعدادات متقدمة وتؤثر بشكل مباشر على سلوك الـ AI. يُنصح بعدم تغييرها إلا إذا كنت تفهم تأثير كل إعداد.
                                                    القيم الافتراضية مُحسَّنة لأفضل أداء في معظم الحالات.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'gemini' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">🔑 إدارة مفاتيح Gemini API</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">النظام الجديد متعدد النماذج - مفتاح واحد لجميع النماذج مع تبديل ذكي</p>

                                    {/* Summary Stats */}
                                    {geminiKeys.length > 0 && (
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="bg-blue-50 p-3 rounded-lg">
                                                <div className="text-sm font-medium text-blue-900">إجمالي المفاتيح</div>
                                                <div className="text-2xl font-bold text-blue-600">{geminiKeys.length}</div>
                                            </div>
                                            <div className="bg-green-50 p-3 rounded-lg">
                                                <div className="text-sm font-medium text-green-900">المفاتيح النشطة</div>
                                                <div className="text-2xl font-bold text-green-600">
                                                    {geminiKeys.filter(k => k.isActive).length}
                                                </div>
                                            </div>
                                            <div className="bg-purple-50 p-3 rounded-lg">
                                                <div className="text-sm font-medium text-purple-900">إجمالي النماذج</div>
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {geminiKeys.reduce((sum, k) => sum + (k.totalModels || 0), 0)}
                                                </div>
                                            </div>
                                            <div className="bg-yellow-50 p-3 rounded-lg">
                                                <div className="text-sm font-medium text-yellow-900">النماذج المتاحة</div>
                                                <div className="text-2xl font-bold text-yellow-600">
                                                    {geminiKeys.reduce((sum, k) => sum + (k.availableModels || 0), 0)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6">
                                    {/* Model Info Banner */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <span className="text-2xl">🚀</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-blue-900 mb-1">أحدث نماذج Gemini 2025</h4>
                                                <p className="text-sm text-blue-700 mb-2">
                                                    تم تحديث النماذج لتشمل أحدث إصدارات Gemini مع مميزات التفكير المتقدم والصوت التفاعلي
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                                    <div className="bg-white rounded p-2 border border-blue-100">
                                                        <span className="font-medium text-green-600">⭐ موصى به:</span>
                                                        <br />Gemini 2.5 Flash - أفضل توازن
                                                    </div>
                                                    <div className="bg-white rounded p-2 border border-blue-100">
                                                        <span className="font-medium text-purple-600">🧠 الأقوى:</span>
                                                        <br />Gemini 2.5 Pro - للمهام المعقدة
                                                    </div>
                                                    <div className="bg-white rounded p-2 border border-blue-100">
                                                        <span className="font-medium text-orange-600">⚡ الأسرع:</span>
                                                        <br />Gemini 2.5 Flash Lite - للسرعة
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Add New Key Form */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">إضافة مفتاح جديد</h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المفتاح</label>
                                                <input
                                                    type="text"
                                                    value={newGeminiKey.name}
                                                    onChange={(e) => setNewGeminiKey({ ...newGeminiKey, name: e.target.value })}
                                                    placeholder="مثال: مفتاح رئيسي"
                                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مفتاح API</label>
                                                <input
                                                    type="password"
                                                    value={newGeminiKey.apiKey}
                                                    onChange={(e) => setNewGeminiKey({ ...newGeminiKey, apiKey: e.target.value })}
                                                    placeholder="AIzaSy..."
                                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف (اختياري)</label>
                                            <input
                                                type="text"
                                                value={newGeminiKey.description}
                                                onChange={(e) => setNewGeminiKey({ ...newGeminiKey, description: e.target.value })}
                                                placeholder="وصف المفتاح..."
                                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                            <h5 className="font-medium text-blue-900 mb-2">🚀 النظام الجديد متعدد النماذج</h5>
                                            <p className="text-sm text-blue-800">
                                                سيتم إنشاء جميع النماذج المدعومة تلقائياً لهذا المفتاح:
                                            </p>
                                            <ul className="text-xs text-blue-700 mt-2 space-y-1">
                                                <li>• gemini-2.5-flash (1M طلب) - الأحدث والأفضل</li>
                                                <li>• gemini-2.5-pro (500K طلب) - للمهام المعقدة</li>
                                                <li>• gemini-2.0-flash (750K طلب) - سريع ومستقر</li>
                                                <li>• gemini-2.0-flash-exp (1K طلب) - تجريبي</li>
                                                <li>• gemini-1.5-flash (1.5K طلب) - مُهمل لكن يعمل</li>
                                                <li>• gemini-1.5-pro (50 طلب) - مُهمل لكن قوي</li>
                                            </ul>
                                        </div>

                                        <div className="flex space-x-4 mt-4">
                                            <button
                                                onClick={addGeminiKey}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                            >
                                                ✨ إضافة المفتاح (مع جميع النماذج)
                                            </button>

                                            <button
                                                onClick={loadGeminiKeys}
                                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                                            >
                                                🔄 تحديث القائمة
                                            </button>
                                        </div>
                                    </div>

                                    {/* Keys List */}
                                    <div className="space-y-4">
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white">المفاتيح المحفوظة</h4>

                                        {geminiKeys.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                لا توجد مفاتيح محفوظة. أضف مفتاح جديد للبدء.
                                            </div>
                                        ) : (
                                            geminiKeys.map((key) => (
                                                <div key={key.id} className="border rounded-lg p-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-3">
                                                                <h5 className="font-medium text-gray-900 dark:text-white">{key.name}</h5>
                                                                <span className={`px-2 py-1 text-xs rounded-full ${key.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {key.isActive ? 'نشط' : 'غير نشط'}
                                                                </span>
                                                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                                    أولوية: {key.priority}
                                                                </span>
                                                            </div>

                                                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                                <p>المفتاح: {key.apiKey}</p>
                                                                <p>النماذج المتاحة: {key.availableModels} / {key.totalModels}</p>
                                                                {key.description && <p>الوصف: {key.description}</p>}
                                                                <p>تاريخ الإضافة: {new Date(key.createdAt).toLocaleDateString('ar-EG')}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => testGeminiKey(key.id)}
                                                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                                            >
                                                                اختبار
                                                            </button>

                                                            <button
                                                                onClick={() => toggleGeminiKey(key.id)}
                                                                className={`px-3 py-1 rounded text-sm ${key.isActive
                                                                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                                                    }`}
                                                            >
                                                                {key.isActive ? 'إيقاف' : 'تفعيل'}
                                                            </button>

                                                            <button
                                                                onClick={() => deleteGeminiKey(key.id)}
                                                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                                            >
                                                                حذف
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Models List */}
                                                    {key.models && key.models.length > 0 && (
                                                        <div className="border-t pt-4">
                                                            <h6 className="font-medium text-gray-900 dark:text-white mb-3">النماذج المدعومة:</h6>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {key.models.map((model) => (
                                                                    <div key={model.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="flex items-center space-x-2">
                                                                                <span className="font-medium text-sm">{model.model}</span>
                                                                                {model.model.includes('2.5') && (
                                                                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                                                                        🚀 أحدث
                                                                                    </span>
                                                                                )}
                                                                                {model.model.includes('flash') && (
                                                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                                        ⚡ سريع
                                                                                    </span>
                                                                                )}
                                                                                {model.model.includes('pro') && (
                                                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                                                                                        🧠 متقدم
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <span className={`px-2 py-1 text-xs rounded-full ${model.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                                }`}>
                                                                                {model.isEnabled ? 'مُفعل' : 'معطل'}
                                                                            </span>
                                                                        </div>

                                                                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                                                            <p>الاستخدام: {model.usage.used.toLocaleString()} / {model.usage.limit.toLocaleString()}</p>
                                                                            <p>الأولوية: {model.priority}</p>
                                                                            {model.lastUsed && (
                                                                                <p>آخر استخدام: {new Date(model.lastUsed).toLocaleDateString('ar-EG')}</p>
                                                                            )}
                                                                        </div>

                                                                        {/* Usage Bar for each model */}
                                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                                            <div
                                                                                className={`h-1.5 rounded-full ${(model.usage.used / model.usage.limit) > 0.8 ? 'bg-red-500' :
                                                                                    (model.usage.used / model.usage.limit) > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                                                                                    }`}
                                                                                style={{ width: `${Math.min((model.usage.used / model.usage.limit) * 100, 100)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => testGeminiKey(key.id)}
                                                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                                        >
                                                            اختبار
                                                        </button>

                                                        <button
                                                            onClick={() => toggleGeminiKey(key.id)}
                                                            className={`px-3 py-1 rounded text-sm ${key.isActive
                                                                ? 'bg-gray-600 text-white hover:bg-gray-700'
                                                                : 'bg-green-600 text-white hover:bg-green-700'
                                                                }`}
                                                        >
                                                            {key.isActive ? 'إيقاف' : 'تفعيل'}
                                                        </button>

                                                        <button
                                                            onClick={() => deleteGeminiKey(key.id)}
                                                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                                        >
                                                            حذف
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'priority' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">🎯 إعدادات أولوية النظام</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تحكم في أولوية البرونت والأنماط وحل التعارض بينهما</p>
                                </div>

                                <div className="p-6">
                                    {/* تنبيه مهم */}
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <span className="text-2xl">⚠️</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-yellow-900 mb-1">إعدادات متقدمة</h4>
                                                <p className="text-sm text-yellow-700">
                                                    هذه الإعدادات تؤثر على كيفية عمل البرونت.
                                                    تأكد من فهم كل خيار قبل التغيير.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* إعدادات الأولوية */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                                        {/* أولوية البرونت */}
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                                                📝 أولوية البرونت الأساسي
                                            </h4>
                                            <select
                                                value={prioritySettings.promptPriority}
                                                onChange={(e) => setPrioritySettings({ ...prioritySettings, promptPriority: e.target.value as any })}
                                                className="w-full p-3 border border-blue-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="high">🔥 عالية - البرونت يتحكم في كل شيء</option>
                                                <option value="medium">⚖️ متوسطة - توازن</option>
                                                <option value="low">📉 منخفضة</option>
                                            </select>
                                            <p className="text-xs text-blue-700 mt-2">
                                                {prioritySettings.promptPriority === 'high' && 'البرونت له الأولوية المطلقة في الشخصية والأسلوب'}
                                                {prioritySettings.promptPriority === 'medium' && 'توازن في تطبيق البرونت'}
                                                {prioritySettings.promptPriority === 'low' && 'مرونة أكبر في التطبيق'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* إعدادات إضافية */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={prioritySettings.enforcePersonality}
                                                onChange={(e) => setPrioritySettings({ ...prioritySettings, enforcePersonality: e.target.checked })}
                                                className="mr-3 text-blue-600"
                                            />
                                            <div>
                                                <span className="font-medium">🎭 إجبار الشخصية من البرونت</span>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">الحفاظ على شخصية البوت من البرونت</p>
                                            </div>
                                        </label>

                                        <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={prioritySettings.enforceLanguageStyle}
                                                onChange={(e) => setPrioritySettings({ ...prioritySettings, enforceLanguageStyle: e.target.checked })}
                                                className="mr-3 text-blue-600"
                                            />
                                            <div>
                                                <span className="font-medium">🗣️ إجبار أسلوب اللغة من البرونت</span>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">الحفاظ على أسلوب اللغة من البرونت (عامية/فصحى)</p>
                                            </div>
                                        </label>

                                    </div>

                                    {/* أزرار الحفظ */}
                                    <div className="flex space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={savePrioritySettings}
                                            disabled={loading}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {loading ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
                                        </button>

                                        <button
                                            onClick={resetPrioritySettings}
                                            disabled={loading}
                                            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                                        >
                                            🔄 إعادة تعيين
                                        </button>

                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'prompts' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">💬 البرومبت المتقدم</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إنشاء وإدارة prompts إضافية للحالات الخاصة (متقدم - اختياري)</p>
                                    <div className="bg-amber-50 rounded-lg p-3 mt-2">
                                        <p className="text-xs text-amber-800">
                                            ⚠️ <strong>ملاحظة:</strong> هذا القسم للمستخدمين المتقدمين فقط.
                                            الـ prompt الأساسي يتم إعداده في تبويب "شخصية المساعد".
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {/* Library Button */}
                                    <div className="mb-6">
                                        <button
                                            onClick={() => setShowPromptLibrary(true)}
                                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center justify-center gap-3 shadow-lg"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                            </svg>
                                            <span className="text-lg font-semibold">اختيار برومبت جاهز من المكتبة</span>
                                        </button>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                                            اختر من مجموعة برومبتات جاهزة ومجربة لتوفير الوقت
                                        </p>
                                    </div>

                                    {/* Add New Prompt Form */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">أو أضف برومبت مخصص</h4>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم البرومبت</label>
                                                    <input
                                                        type="text"
                                                        value={newPrompt.name}
                                                        onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                                                        placeholder="مثال: برومبت خدمة العملاء"
                                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفئة</label>
                                                    <select
                                                        value={newPrompt.category}
                                                        onChange={(e) => setNewPrompt({ ...newPrompt, category: e.target.value })}
                                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                    >
                                                        <option value="general">عام</option>
                                                        <option value="customer_service">خدمة العملاء</option>
                                                        <option value="sales">المبيعات</option>
                                                        <option value="support">الدعم الفني</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">محتوى البرومبت</label>
                                                <textarea
                                                    value={newPrompt.content}
                                                    onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                                                    rows={8}
                                                    placeholder="أنت مساعد ذكي لخدمة العملاء في متجر للأحذية..."
                                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    يمكنك استخدام متغيرات مثل {'{customerName}'} و {'{productName}'}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={addSystemPrompt}
                                            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                        >
                                            إضافة البرومبت
                                        </button>
                                    </div>

                                    {/* Prompts List */}
                                    <div className="space-y-4">
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white">البرومبت المحفوظة</h4>

                                        {systemPrompts.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                لا توجد برومبت محفوظة. أضف برومبت جديد للبدء.
                                            </div>
                                        ) : (
                                            systemPrompts.map((prompt) => (
                                                <div key={prompt.id} className="border rounded-lg p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-3">
                                                                <h5 className="font-medium text-gray-900 dark:text-white">{prompt.name}</h5>
                                                                <span className={`px-2 py-1 text-xs rounded-full ${prompt.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {prompt.isActive ? 'نشط' : 'غير نشط'}
                                                                </span>
                                                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                                                    {prompt.category}
                                                                </span>
                                                            </div>

                                                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                                <p className="line-clamp-3">{prompt.content}</p>
                                                                <p className="mt-1 text-xs">تاريخ الإنشاء: {new Date(prompt.createdAt).toLocaleDateString('ar-EG')}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex space-x-2">
                                                            {!prompt.isActive && (
                                                                <button
                                                                    onClick={() => activatePrompt(prompt.id)}
                                                                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                                                >
                                                                    تفعيل
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => startEditPrompt(prompt)}
                                                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                                                            >
                                                                تعديل
                                                            </button>

                                                            <button
                                                                onClick={() => deletePrompt(prompt.id)}
                                                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                                            >
                                                                حذف
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'memory' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">🧠 إدارة الذاكرة</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تحكم في إعدادات ذاكرة المحادثات والتخزين</p>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Memory Settings */}
                                    <div>
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">إعدادات الذاكرة</h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    مدة الاحتفاظ بالذاكرة (بالأيام)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="365"
                                                    value={memorySettings.retentionDays}
                                                    onChange={(e) => setMemorySettings({
                                                        ...memorySettings,
                                                        retentionDays: parseInt(e.target.value)
                                                    })}
                                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">سيتم حذف المحادثات الأقدم من هذه المدة تلقائياً</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    الحد الأقصى للمحادثات لكل مستخدم
                                                </label>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="1000"
                                                    value={memorySettings.maxConversationsPerUser}
                                                    onChange={(e) => setMemorySettings({
                                                        ...memorySettings,
                                                        maxConversationsPerUser: parseInt(e.target.value)
                                                    })}
                                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    الحد الأقصى للرسائل في المحادثة الواحدة
                                                </label>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="500"
                                                    value={memorySettings.maxMessagesPerConversation}
                                                    onChange={(e) => setMemorySettings({
                                                        ...memorySettings,
                                                        maxMessagesPerConversation: parseInt(e.target.value)
                                                    })}
                                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Memory Features */}
                                    <div>
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">مميزات الذاكرة</h4>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">التنظيف التلقائي</span>
                                                    <p className="text-xs text-gray-500">حذف المحادثات القديمة تلقائياً</p>
                                                </div>
                                                <button
                                                    onClick={() => setMemorySettings({
                                                        ...memorySettings,
                                                        autoCleanup: !memorySettings.autoCleanup
                                                    })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${memorySettings.autoCleanup ? 'bg-blue-600' : 'bg-gray-200'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${memorySettings.autoCleanup ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ضغط الذاكرة</span>
                                                    <p className="text-xs text-gray-500">ضغط المحادثات القديمة لتوفير المساحة</p>
                                                </div>
                                                <button
                                                    onClick={() => setMemorySettings({
                                                        ...memorySettings,
                                                        compressionEnabled: !memorySettings.compressionEnabled
                                                    })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${memorySettings.compressionEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${memorySettings.compressionEnabled ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Memory Actions */}
                                    <div>
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">إجراءات الذاكرة</h4>

                                        <div className="flex space-x-4">
                                            <button
                                                onClick={saveMemorySettings}
                                                disabled={saving}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                                            </button>

                                            <button
                                                onClick={cleanupMemory}
                                                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                                            >
                                                تنظيف الذاكرة القديمة
                                            </button>

                                            <button
                                                onClick={clearMemory}
                                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                                            >
                                                مسح جميع الذاكرة
                                            </button>
                                        </div>
                                    </div>

                                    {/* Memory Statistics */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">إحصائيات الذاكرة</h4>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                            <div>
                                                <div className="text-2xl font-bold text-blue-600">{memoryStats.totalMemories.toLocaleString()}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">إجمالي المحادثات</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-600">{memoryStats.totalMessages.toLocaleString()}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">إجمالي الرسائل</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-orange-600">{memoryStats.totalCustomers.toLocaleString()}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">عملاء فريدين</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-purple-600">{memoryStats.shortTermMemorySize}</div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">ذاكرة نشطة</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'queue-settings' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">⏱️ إعدادات تجميع الرسائل المتتالية</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تحكم في كيفية معالجة الرسائل المتتالية من العملاء للحفاظ على السياق الطبيعي للمحادثة</p>
                                    <div className="bg-blue-50 rounded-lg p-3 mt-2">
                                        <p className="text-xs text-blue-800">
                                            💡 <strong>كيف يعمل النظام:</strong> عندما يرسل العميل عدة رسائل متتالية، ينتظر النظام لفترة محددة لتجميعها ومعالجتها كمحادثة واحدة متماسكة.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {queueLoading ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="text-gray-600 dark:text-gray-400 mt-2">جاري تحميل إعدادات الطوابير...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Enable/Disable Queue System */}
                                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-md font-medium text-gray-900 dark:text-white">🚀 تفعيل نظام تجميع الرسائل</h4>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تمكين أو تعطيل معالجة الرسائل المتتالية كمجموعة واحدة</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setQueueSettings({ ...queueSettings, enabled: !queueSettings.enabled })}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${queueSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${queueSettings.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                                                        />
                                                    </button>
                                                </div>

                                                {queueSettings.enabled ? (
                                                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                                        <p className="text-sm text-green-700">
                                                            النظام مُفعل: سيتم تجميع الرسائل المتتالية ومعالجتها كسياق واحد للحصول على ردود أكثر طبيعية وتماسكاً.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                                        <p className="text-sm text-yellow-700">
                                                            النظام مُعطل: سيتم معالجة كل رسالة على حدة فوراً، مما قد يؤدي إلى فقدان السياق في المحادثات السريعة.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Wait Time Configuration */}
                                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                                <h4 className="text-md font-medium text-blue-900 mb-4">⏰ وقت الانتظار لتجميع الرسائل</h4>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-blue-900 mb-2">
                                                            وقت الانتظار (بالثواني)
                                                        </label>

                                                        <div className="flex items-center space-x-4">
                                                            <input
                                                                type="range"
                                                                min="1"
                                                                max="30"
                                                                step="1"
                                                                value={queueSettings.batchWaitTime / 1000}
                                                                onChange={(e) => setQueueSettings({
                                                                    ...queueSettings,
                                                                    batchWaitTime: parseInt(e.target.value) * 1000
                                                                })}
                                                                className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                                                disabled={!queueSettings.enabled}
                                                            />
                                                            <div className="flex items-center space-x-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="30"
                                                                    value={queueSettings.batchWaitTime / 1000}
                                                                    onChange={(e) => {
                                                                        const value = parseInt(e.target.value);
                                                                        if (value >= 1 && value <= 30) {
                                                                            setQueueSettings({ ...queueSettings, batchWaitTime: value * 1000 });
                                                                        }
                                                                    }}
                                                                    className="w-20 px-3 py-1 border border-blue-300 rounded-md text-sm text-center"
                                                                    disabled={!queueSettings.enabled}
                                                                />
                                                                <span className="text-sm text-blue-700">ثانية</span>
                                                            </div>
                                                        </div>

                                                        <p className="text-xs text-blue-600 mt-2">
                                                            النظام ينتظر {queueSettings.batchWaitTime / 1000} ثانية بعد آخر رسالة قبل المعالجة
                                                        </p>
                                                    </div>

                                                    {/* Wait Time Recommendations */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                                                        <div className="bg-white rounded p-3 border border-blue-100">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-medium text-green-600">⚡ سريع</span>
                                                                <button
                                                                    onClick={() => setQueueSettings({ ...queueSettings, batchWaitTime: 2000 })}
                                                                    className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
                                                                    disabled={!queueSettings.enabled}
                                                                >
                                                                    2 ثواني
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">للعملاء السريعين في الكتابة</p>
                                                        </div>

                                                        <div className="bg-white rounded p-3 border border-blue-100">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-medium text-blue-600">⚖️ متوازن</span>
                                                                <button
                                                                    onClick={() => setQueueSettings({ ...queueSettings, batchWaitTime: 5000 })}
                                                                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                                                                    disabled={!queueSettings.enabled}
                                                                >
                                                                    5 ثواني
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">الإعداد الموصى به لمعظم الحالات</p>
                                                        </div>

                                                        <div className="bg-white rounded p-3 border border-blue-100">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-medium text-orange-600">🐌 صبور</span>
                                                                <button
                                                                    onClick={() => setQueueSettings({ ...queueSettings, batchWaitTime: 10000 })}
                                                                    className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded hover:bg-orange-200"
                                                                    disabled={!queueSettings.enabled}
                                                                >
                                                                    10 ثواني
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">للعملاء البطيئين في الكتابة</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={saveQueueSettings}
                                                    disabled={queueSaving}
                                                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {queueSaving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
                                                </button>

                                                <button
                                                    onClick={loadQueueSettings}
                                                    disabled={queueLoading}
                                                    className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
                                                >
                                                    {queueLoading ? '⏳ جاري التحديث...' : '🔄 إعادة تحميل'}
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setQueueSettings({
                                                            batchWaitTime: 5000,
                                                            enabled: true,
                                                            maxBatchSize: 10,
                                                            description: 'إعدادات تجميع الرسائل المتتالية'
                                                        });
                                                    }}
                                                    className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700"
                                                >
                                                    🔄 استعادة الافتراضي
                                                </button>
                                            </div>

                                            {/* Help Section */}
                                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 mt-6">
                                                <h4 className="text-sm font-medium text-yellow-900 mb-2">💡 نصائح لاختيار الإعدادات المناسبة:</h4>
                                                <ul className="text-sm text-yellow-800 space-y-1">
                                                    <li>• <strong>2-3 ثواني:</strong> مناسب للعملاء السريعين والمحادثات العاجلة</li>
                                                    <li>• <strong>5-7 ثواني:</strong> الخيار الأمثل لمعظم العملاء (موصى به)</li>
                                                    <li>• <strong>8-15 ثانية:</strong> مناسب للعملاء الذين يكتبون ببطء أو رسائل طويلة</li>
                                                    <li>• <strong>تذكر:</strong> وقت أطول = سياق أفضل، ولكن استجابة أبطأ</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">إعدادات AI Agent</h3>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Working Hours */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    ساعات العمل
                                                </label>
                                                <p className="text-sm text-gray-500">
                                                    تحديد أوقات عمل الذكاء الصناعي للرد على العملاء
                                                </p>
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="workingHoursEnabled"
                                                    checked={settings.workingHoursEnabled}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        workingHoursEnabled: e.target.checked
                                                    })}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                                                />
                                                <label htmlFor="workingHoursEnabled" className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                                                    تفعيل ساعات العمل
                                                </label>
                                            </div>
                                        </div>

                                        {/* Working Hours Inputs - Only show when enabled */}
                                        {settings.workingHoursEnabled && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">من</label>
                                                    <input
                                                        type="time"
                                                        value={settings.workingHours.start}
                                                        onChange={(e) => setSettings({
                                                            ...settings,
                                                            workingHours: { ...settings.workingHours, start: e.target.value }
                                                        })}
                                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">إلى</label>
                                                    <input
                                                        type="time"
                                                        value={settings.workingHours.end}
                                                        onChange={(e) => setSettings({
                                                            ...settings,
                                                            workingHours: { ...settings.workingHours, end: e.target.value }
                                                        })}
                                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Info message when working hours are disabled */}
                                        {!settings.workingHoursEnabled && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                                <div className="flex">
                                                    <div className="flex-shrink-0">
                                                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div className="mr-3">
                                                        <p className="text-sm text-blue-700">
                                                            الذكاء الصناعي سيعمل على مدار 24 ساعة ولن يتم فحص أوقات العمل.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ✅ NEW: Reply Mode */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                            وضع الرد التلقائي
                                        </label>
                                        <div className="space-y-3">
                                            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:bg-gray-700/50 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="replyMode"
                                                    value="all"
                                                    checked={settings.replyMode === 'all'}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        replyMode: e.target.value as 'new_only' | 'all'
                                                    })}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                                                />
                                                <div className="mr-3">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        الرد على كل المحادثات
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        الـ AI سيرد على كل الرسائل في جميع المحادثات (الجديدة والقديمة)
                                                    </p>
                                                </div>
                                            </label>

                                            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:bg-gray-700/50 transition-colors">
                                                <input
                                                    type="radio"
                                                    name="replyMode"
                                                    value="new_only"
                                                    checked={settings.replyMode === 'new_only'}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        replyMode: e.target.value as 'new_only' | 'all'
                                                    })}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                                                />
                                                <div className="mr-3">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        الرد على المحادثات الجديدة فقط
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        الـ AI سيرد فقط على أول رسالة من العميل (محادثة جديدة)
                                                    </p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Max Replies */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            الحد الأقصى للردود لكل عميل
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={settings.maxRepliesPerCustomer}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                maxRepliesPerCustomer: parseInt(e.target.value)
                                            })}
                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Response Delay */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            تأخير الرد (بالميلي ثانية)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10000"
                                            step="500"
                                            value={settings.responseDelay}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                responseDelay: parseInt(e.target.value)
                                            })}
                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Features Toggle */}
                                    <div className="space-y-4">
                                        <h4 className="text-md font-medium text-gray-900 dark:text-white">المميزات</h4>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">معالجة الوسائط المتعددة</span>
                                            <button
                                                onClick={() => setSettings({
                                                    ...settings,
                                                    multimodalEnabled: !settings.multimodalEnabled
                                                })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.multimodalEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.multimodalEnabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">نظام RAG</span>
                                            <button
                                                onClick={() => setSettings({
                                                    ...settings,
                                                    ragEnabled: !settings.ragEnabled
                                                })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.ragEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.ragEnabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">التقييم الذكي للجودة</span>
                                                <span className="text-xs text-gray-500">تقييم جودة الردود تلقائياً (يستهلك API)</span>
                                            </div>
                                            <button
                                                onClick={() => setSettings({
                                                    ...settings,
                                                    qualityEvaluationEnabled: !settings.qualityEvaluationEnabled
                                                })}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.qualityEvaluationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.qualityEvaluationEnabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex space-x-4 pt-6">
                                        <button
                                            onClick={saveSettings}
                                            disabled={saving}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                                        </button>

                                        <button
                                            onClick={clearMemory}
                                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                                        >
                                            مسح الذاكرة
                                        </button>

                                        <button
                                            onClick={updateKnowledgeBase}
                                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                                        >
                                            تحديث قاعدة المعرفة
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'analytics' && (
                            <div className="space-y-6">
                                {/* Sentiment Distribution */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">توزيع المشاعر</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {stats.sentimentDistribution.positive}%
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">إيجابي</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                                {stats.sentimentDistribution.neutral}%
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">محايد</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">
                                                {stats.sentimentDistribution.negative}%
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">سلبي</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Top Intents */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">أكثر النوايا شيوعاً</h3>
                                    <div className="space-y-3">
                                        {stats.topIntents.map((intent, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{intent.intent}</span>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{intent.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'knowledge' && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">إدارة قاعدة المعرفة</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    قاعدة المعرفة تحتوي على المعلومات التي يستخدمها AI للرد على العملاء.
                                </p>

                                <div className="space-y-4">
                                    <button
                                        onClick={updateKnowledgeBase}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                    >
                                        تحديث قاعدة المعرفة
                                    </button>

                                    <div className="text-sm text-gray-500">
                                        آخر تحديث: منذ ساعتين
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Edit Prompt Modal */}
                        {editingPrompt && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">تعديل البرومبت</h3>
                                        <button
                                            onClick={cancelEditPrompt}
                                            className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم البرومبت</label>
                                                <input
                                                    type="text"
                                                    value={editPromptData.name}
                                                    onChange={(e) => setEditPromptData({ ...editPromptData, name: e.target.value })}
                                                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">محتوى البرومبت</label>
                                            <textarea
                                                value={editPromptData.content}
                                                onChange={(e) => setEditPromptData({ ...editPromptData, content: e.target.value })}
                                                rows={8}
                                                placeholder="أنت مساعد ذكي لخدمة العملاء في متجر للأحذية..."
                                                className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                يمكنك استخدام متغيرات مثل {'{customerName}'} و {'{productName}'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex space-x-4 pt-6">
                                        <button
                                            onClick={updatePrompt}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                        >
                                            تحديث البرومبت
                                        </button>

                                        <button
                                            onClick={cancelEditPrompt}
                                            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add New Gemini Key Modal */}
                {showAddGeminiKeyModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">إضافة مفتاح جيميني جديد</h3>
                                <button
                                    onClick={closeAddGeminiKeyModal}
                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المفتاح</label>
                                        <input
                                            type="text"
                                            value={newGeminiKey.name}
                                            onChange={(e) => setNewGeminiKey({ ...newGeminiKey, name: e.target.value })}
                                            placeholder="مثال: مفتاح رئيسي"
                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مفتاح API</label>
                                        <input
                                            type="password"
                                            value={newGeminiKey.apiKey}
                                            onChange={(e) => setNewGeminiKey({ ...newGeminiKey, apiKey: e.target.value })}
                                            placeholder="AIzaSy..."
                                            className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">النموذج الافتراضي</label>
                                    <select
                                        value={newGeminiKey.model}
                                        onChange={(e) => setNewGeminiKey({ ...newGeminiKey, model: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        {availableModels.map((model) => (
                                            <option key={model} value={model}>
                                                {model} {model.includes('2.5') && '🚀'} {model.includes('flash') && '⚡'} {model.includes('pro') && '🧠'}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        سيتم استخدام هذا النموذج كنموذج افتراضي للمفتاح
                                    </p>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوصف (اختياري)</label>
                                    <input
                                        type="text"
                                        value={newGeminiKey.description}
                                        onChange={(e) => setNewGeminiKey({ ...newGeminiKey, description: e.target.value })}
                                        placeholder="وصف المفتاح..."
                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={closeAddGeminiKeyModal}
                                        className="bg-gray-300 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={handleAddGeminiKey}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                    >
                                        إضافة المفتاح
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Prompt Library Modal */}
                {showPromptLibrary && (
                    <PromptLibraryModal
                        onSelect={handleSelectPromptFromLibrary}
                        onClose={() => setShowPromptLibrary(false)}
                    />
                )}

                {/* Notification Toast */}
                {notification.show && (
                    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${notification.type === 'success'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                        }`}>
                        <div className="flex items-center justify-between">
                            <span>{notification.message}</span>
                            <button
                                onClick={() => setNotification({ show: false, message: '', type: 'success' })}
                                className="ml-3 text-white hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simple Prompt Library Modal Component
const PromptLibraryModal = ({ onSelect, onClose }: any) => {
    const [prompts, setPrompts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        try {
            const response = await fetch(buildApiUrl('prompt-library'), {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setPrompts(data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">مكتبة البرومبتات الجاهزة</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 text-2xl">&times;</button>
                    </div>

                    {loading ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">جاري التحميل...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {prompts.map(prompt => (
                                <div key={prompt.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow dark:bg-gray-700/30">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">{prompt.nameAr || prompt.name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{prompt.category}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{prompt.descriptionAr || prompt.description}</p>

                                            {/* عرض محتوى البرومبت */}
                                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-3 mb-3 max-h-32 overflow-y-auto border border-gray-100 dark:border-gray-700">
                                                <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{prompt.promptContent}</p>
                                            </div>
                                        </div>
                                        <span className="text-3xl mr-3">{prompt.icon || '🤖'}</span>
                                    </div>
                                    <button
                                        onClick={() => onSelect(prompt)}
                                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                                    >
                                        اختيار هذا البرومبت
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIManagement;

