-- Migration: Add turboSenderNumber field to Company table
-- تاريخ: 2025-12-21
-- الوصف: إضافة حقل رقم الراسل لإعدادات Turbo

-- Add turboSenderNumber column to companies table
ALTER TABLE companies 
ADD COLUMN turboSenderNumber VARCHAR(255) NULL;

-- Add comment for documentation
COMMENT ON COLUMN companies.turboSenderNumber IS 'رقم هاتف الراسل المستخدم في api_followup_phone عند إنشاء شحنة Turbo';

-- Create index for better performance (optional)
CREATE INDEX IF NOT EXISTS idx_companies_turbo_sender_number ON companies(turboSenderNumber);

-- تسجيل المهمة في السجل
INSERT INTO migration_logs (name, executed_at, description) 
VALUES ('add_turbo_sender_number', NOW(), 'Added turboSenderNumber field for Turbo shipping sender phone number')
ON CONFLICT (name) DO NOTHING;
