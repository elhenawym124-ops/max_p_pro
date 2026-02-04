-- Add new storefront features settings
ALTER TABLE `storefront_settings`
-- Product Navigation Settings
ADD COLUMN `navigationEnabled` BOOLEAN NOT NULL DEFAULT false COMMENT 'تفعيل التنقل بين المنتجات',
ADD COLUMN `navigationType` VARCHAR(191) NOT NULL DEFAULT 'sameCategory' COMMENT 'نوع التنقل: sameCategory | allProducts',
ADD COLUMN `showNavigationButtons` BOOLEAN NOT NULL DEFAULT true COMMENT 'إظهار أزرار السابق/التالي',
ADD COLUMN `keyboardShortcuts` BOOLEAN NOT NULL DEFAULT true COMMENT 'اختصارات لوحة المفاتيح',

-- Sold Number Display Settings
ADD COLUMN `soldNumberEnabled` BOOLEAN NOT NULL DEFAULT false COMMENT 'تفعيل عرض عدد المبيعات',
ADD COLUMN `soldNumberType` VARCHAR(191) NOT NULL DEFAULT 'real' COMMENT 'نوع العدد: real | fake',
ADD COLUMN `soldNumberMin` INT NOT NULL DEFAULT 10 COMMENT 'الحد الأدنى (للعشوائي)',
ADD COLUMN `soldNumberMax` INT NOT NULL DEFAULT 500 COMMENT 'الحد الأقصى (للعشوائي)',
ADD COLUMN `soldNumberText` VARCHAR(191) NOT NULL DEFAULT 'تم بيع {count} قطعة' COMMENT 'نص العرض',

-- Variant Styles Settings
ADD COLUMN `variantColorStyle` VARCHAR(191) NOT NULL DEFAULT 'buttons' COMMENT 'نمط عرض الألوان: buttons | circles | thumbnails | dropdown | swatches',
ADD COLUMN `variantColorShowName` BOOLEAN NOT NULL DEFAULT true COMMENT 'إظهار اسم اللون',
ADD COLUMN `variantColorSize` VARCHAR(191) NOT NULL DEFAULT 'medium' COMMENT 'حجم العرض: small | medium | large',
ADD COLUMN `variantSizeStyle` VARCHAR(191) NOT NULL DEFAULT 'buttons' COMMENT 'نمط عرض المقاسات: buttons | table | dropdown | grid',
ADD COLUMN `variantSizeShowGuide` BOOLEAN NOT NULL DEFAULT false COMMENT 'إظهار دليل المقاسات',
ADD COLUMN `variantSizeShowStock` BOOLEAN NOT NULL DEFAULT true COMMENT 'إظهار المخزون',

-- Stock Progress Bar Settings
ADD COLUMN `stockProgressEnabled` BOOLEAN NOT NULL DEFAULT false COMMENT 'تفعيل شريط تقدم المخزون',
ADD COLUMN `stockProgressType` VARCHAR(191) NOT NULL DEFAULT 'percentage' COMMENT 'نوع العرض: percentage | count | text',
ADD COLUMN `stockProgressLowColor` VARCHAR(191) NOT NULL DEFAULT '#ef4444' COMMENT 'لون المخزون القليل',
ADD COLUMN `stockProgressMediumColor` VARCHAR(191) NOT NULL DEFAULT '#f59e0b' COMMENT 'لون المخزون المتوسط',
ADD COLUMN `stockProgressHighColor` VARCHAR(191) NOT NULL DEFAULT '#10b981' COMMENT 'لون المخزون العالي',
ADD COLUMN `stockProgressThreshold` INT NOT NULL DEFAULT 10 COMMENT 'عتبة المخزون القليل',

-- Security Badges Settings
ADD COLUMN `securityBadgesEnabled` BOOLEAN NOT NULL DEFAULT false COMMENT 'تفعيل شارات الأمان',
ADD COLUMN `badgeSecurePayment` BOOLEAN NOT NULL DEFAULT true COMMENT 'شارة دفع آمن',
ADD COLUMN `badgeFreeShipping` BOOLEAN NOT NULL DEFAULT true COMMENT 'شارة شحن مجاني',
ADD COLUMN `badgeQualityGuarantee` BOOLEAN NOT NULL DEFAULT true COMMENT 'شارة ضمان الجودة',
ADD COLUMN `badgeCashOnDelivery` BOOLEAN NOT NULL DEFAULT true COMMENT 'شارة دفع عند الاستلام',
ADD COLUMN `badgeBuyerProtection` BOOLEAN NOT NULL DEFAULT true COMMENT 'شارة حماية المشتري',
ADD COLUMN `badgeHighRating` BOOLEAN NOT NULL DEFAULT true COMMENT 'شارة تقييمات عالية',
ADD COLUMN `badgeCustom1` BOOLEAN NOT NULL DEFAULT false COMMENT 'شارة مخصصة 1',
ADD COLUMN `badgeCustom1Text` VARCHAR(191) NULL COMMENT 'نص الشارة المخصصة 1',
ADD COLUMN `badgeCustom2` BOOLEAN NOT NULL DEFAULT false COMMENT 'شارة مخصصة 2',
ADD COLUMN `badgeCustom2Text` VARCHAR(191) NULL COMMENT 'نص الشارة المخصصة 2',
ADD COLUMN `badgeLayout` VARCHAR(191) NOT NULL DEFAULT 'horizontal' COMMENT 'تخطيط الشارات: horizontal | vertical',

-- Reasons to Purchase Settings
ADD COLUMN `reasonsToPurchaseEnabled` BOOLEAN NOT NULL DEFAULT false COMMENT 'تفعيل أسباب الشراء',
ADD COLUMN `reasonsToPurchaseType` VARCHAR(191) NOT NULL DEFAULT 'global' COMMENT 'نوع العرض: global | perProduct',
ADD COLUMN `reasonsToPurchaseList` TEXT NULL COMMENT 'قائمة الأسباب (JSON array)',
ADD COLUMN `reasonsToPurchaseMaxItems` INT NOT NULL DEFAULT 4 COMMENT 'عدد الأسباب المعروضة',
ADD COLUMN `reasonsToPurchaseStyle` VARCHAR(191) NOT NULL DEFAULT 'list' COMMENT 'نمط العرض: list | icons',

-- Online Visitors Count Settings
ADD COLUMN `onlineVisitorsEnabled` BOOLEAN NOT NULL DEFAULT false COMMENT 'تفعيل عرض الزوار المتصلين',
ADD COLUMN `onlineVisitorsType` VARCHAR(191) NOT NULL DEFAULT 'fake' COMMENT 'نوع العدد: real | fake',
ADD COLUMN `onlineVisitorsMin` INT NOT NULL DEFAULT 5 COMMENT 'الحد الأدنى (للعشوائي)',
ADD COLUMN `onlineVisitorsMax` INT NOT NULL DEFAULT 50 COMMENT 'الحد الأقصى (للعشوائي)',
ADD COLUMN `onlineVisitorsUpdateInterval` INT NOT NULL DEFAULT 30 COMMENT 'فترة التحديث (بالثواني)',
ADD COLUMN `onlineVisitorsText` VARCHAR(191) NOT NULL DEFAULT '{count} شخص يشاهدون هذا المنتج الآن' COMMENT 'نص العرض';


