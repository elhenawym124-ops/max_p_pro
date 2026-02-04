-- إضافة حقل aiEnabled إلى جدول المحادثات
-- Add aiEnabled field to conversations table

ALTER TABLE conversations 
ADD COLUMN aiEnabled BOOLEAN NOT NULL DEFAULT true;

-- إضافة فهرس للأداء
-- Add index for performance
CREATE INDEX idx_conversations_ai_enabled ON conversations(aiEnabled);

-- تحديث المحادثات الموجودة لتفعيل الذكاء الاصطناعي افتراضياً
-- Update existing conversations to enable AI by default
UPDATE conversations SET aiEnabled = true WHERE aiEnabled IS NULL;
