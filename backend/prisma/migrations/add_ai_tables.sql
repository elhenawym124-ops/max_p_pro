-- إضافة جداول AI Agent System

-- جدول ذاكرة المحادثات
CREATE TABLE IF NOT EXISTS "ConversationMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "userMessage" TEXT NOT NULL,
    "aiResponse" TEXT NOT NULL,
    "intent" TEXT,
    "sentiment" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول تفاعلات AI
CREATE TABLE IF NOT EXISTS "AIInteraction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "intent" TEXT,
    "sentiment" TEXT,
    "confidence" REAL,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "responseTime" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول إعدادات AI
CREATE TABLE IF NOT EXISTS "AISettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول قاعدة المعرفة
CREATE TABLE IF NOT EXISTS "KnowledgeBase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول تحليلات AI
CREATE TABLE IF NOT EXISTS "AIAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATE NOT NULL,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "aiResponses" INTEGER NOT NULL DEFAULT 0,
    "humanHandoffs" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" REAL,
    "avgConfidence" REAL,
    "topIntents" TEXT,
    "sentimentDistribution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول ملفات الوسائط المتعددة
CREATE TABLE IF NOT EXISTS "MediaFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "analysis" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء الفهارس
CREATE INDEX IF NOT EXISTS "ConversationMemory_conversationId_idx" ON "ConversationMemory"("conversationId");
CREATE INDEX IF NOT EXISTS "ConversationMemory_senderId_idx" ON "ConversationMemory"("senderId");
CREATE INDEX IF NOT EXISTS "ConversationMemory_timestamp_idx" ON "ConversationMemory"("timestamp");

CREATE INDEX IF NOT EXISTS "AIInteraction_senderId_idx" ON "AIInteraction"("senderId");
CREATE INDEX IF NOT EXISTS "AIInteraction_createdAt_idx" ON "AIInteraction"("createdAt");
CREATE INDEX IF NOT EXISTS "AIInteraction_intent_idx" ON "AIInteraction"("intent");

CREATE INDEX IF NOT EXISTS "KnowledgeBase_category_idx" ON "KnowledgeBase"("category");
CREATE INDEX IF NOT EXISTS "KnowledgeBase_isActive_idx" ON "KnowledgeBase"("isActive");

CREATE INDEX IF NOT EXISTS "AIAnalytics_date_idx" ON "AIAnalytics"("date");

CREATE INDEX IF NOT EXISTS "MediaFile_conversationId_idx" ON "MediaFile"("conversationId");
CREATE INDEX IF NOT EXISTS "MediaFile_fileType_idx" ON "MediaFile"("fileType");

-- إدراج الإعدادات الافتراضية
INSERT OR IGNORE INTO "AISettings" ("id", "key", "value", "description", "category") VALUES
('ai_enabled', 'ai_enabled', 'true', 'تفعيل/إيقاف AI Agent', 'general'),
('working_hours_start', 'working_hours_start', '09:00', 'بداية ساعات العمل', 'schedule'),
('working_hours_end', 'working_hours_end', '18:00', 'نهاية ساعات العمل', 'schedule'),
('max_replies_per_customer', 'max_replies_per_customer', '5', 'الحد الأقصى للردود لكل عميل', 'limits'),
('escalation_keywords', 'escalation_keywords', 'شكوى,مشكلة,غاضب,مدير', 'كلمات التحويل للبشر', 'escalation'),
('response_delay', 'response_delay', '2000', 'تأخير الرد بالميلي ثانية', 'performance'),
('confidence_threshold', 'confidence_threshold', '0.7', 'حد الثقة المطلوب', 'quality'),
('memory_retention_days', 'memory_retention_days', '30', 'أيام الاحتفاظ بالذاكرة', 'memory'),
('multimodal_enabled', 'multimodal_enabled', 'true', 'تفعيل معالجة الوسائط المتعددة', 'features'),
('rag_enabled', 'rag_enabled', 'true', 'تفعيل نظام RAG', 'features');

-- إدراج بيانات قاعدة المعرفة الأساسية
INSERT OR IGNORE INTO "KnowledgeBase" ("id", "title", "content", "category", "tags") VALUES
('kb_payment_methods', 'طرق الدفع', 'نقبل الدفع نقداً عند الاستلام، فودافون كاش، والتحويل البنكي', 'payment', 'دفع,فودافون,نقدي'),
-- تم حذف معلومات الشحن من هنا - موجودة في البرومبت الأساسي
('kb_return_policy', 'سياسة الإرجاع', 'يمكن إرجاع المنتج خلال 14 يوم من تاريخ الاستلام بشرط عدم الاستخدام', 'returns', 'إرجاع,استبدال,ضمان'),
('kb_working_hours', 'ساعات العمل', 'نعمل يومياً من 9 صباحاً حتى 6 مساءً، عدا يوم الجمعة', 'general', 'ساعات,عمل,وقت'),
('kb_warranty', 'الضمان', 'جميع منتجاتنا مضمونة ضد عيوب التصنيع لمدة 6 أشهر من تاريخ الشراء', 'warranty', 'ضمان,عيوب,شهور');
