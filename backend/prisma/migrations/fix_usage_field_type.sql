-- Migration: تغيير نوع حقل usage من VARCHAR(191) إلى TEXT
-- التاريخ: 2025-11-25

-- تغيير نوع حقل usage في جدول gemini_key_models
ALTER TABLE `gemini_key_models` 
MODIFY COLUMN `usage` TEXT NOT NULL;

-- ملاحظة: بعد تنفيذ هذه Migration، يجب إصلاح النماذج المقطوعة
-- يمكن استخدام السكريبت: backend/scripts/fixAllTruncatedModels.js


