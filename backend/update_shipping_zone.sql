-- تحديث جدول shipping_zones لإضافة الحقول الجديدة
-- يمكن تشغيل هذا مباشرة في MySQL

-- إضافة الحقول الجديدة إذا لم تكن موجودة
ALTER TABLE shipping_zones 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT '' AFTER id,
ADD COLUMN IF NOT EXISTS governorateIds LONGTEXT DEFAULT '[]' AFTER name,
ADD COLUMN IF NOT EXISTS pricingType VARCHAR(50) DEFAULT 'flat' AFTER governorates,
ADD COLUMN IF NOT EXISTS pricingTiers LONGTEXT DEFAULT '[]' AFTER price,
ADD COLUMN IF NOT EXISTS deliveryTimeType VARCHAR(50) DEFAULT 'custom' AFTER deliveryTime,
ADD COLUMN IF NOT EXISTS freeShippingThreshold DECIMAL(10,2) NULL AFTER deliveryTimeType;

-- تحديث updatedAt ليكون له قيمة افتراضية
ALTER TABLE shipping_zones 
MODIFY COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP;

-- إضافة indexes للأداء
ALTER TABLE shipping_zones 
ADD INDEX IF NOT EXISTS idx_pricingType (pricingType);
