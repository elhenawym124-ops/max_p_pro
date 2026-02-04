-- إنشاء جدول أرشيف الرسائل
-- هذا الجدول سيحتوي على الرسائل القديمة (أكثر من 6 شهور)

CREATE TABLE IF NOT EXISTS `message_archive` (
  `id` VARCHAR(191) NOT NULL,
  `conversationId` VARCHAR(191) NOT NULL,
  `senderId` VARCHAR(191) NULL,
  `type` ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'STICKER', 'VOICE', 'INTERACTIVE', 'BUTTON', 'LIST', 'TEMPLATE', 'PRODUCT') NOT NULL DEFAULT 'TEXT',
  `content` TEXT NOT NULL,
  `attachments` TEXT NULL,
  `metadata` TEXT NULL,
  `isFromCustomer` BOOLEAN NOT NULL DEFAULT true,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `readAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `archivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  
  PRIMARY KEY (`id`),
  INDEX `message_archive_conversationId_idx` (`conversationId`),
  INDEX `message_archive_senderId_idx` (`senderId`),
  INDEX `message_archive_createdAt_idx` (`createdAt`),
  INDEX `message_archive_archivedAt_idx` (`archivedAt`),
  INDEX `message_archive_isFromCustomer_idx` (`isFromCustomer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- إضافة ملاحظة للتوثيق
-- هذا الجدول يحتوي على نسخة من الرسائل القديمة
-- يمكن استرجاعها عند الحاجة لكنها لا تؤثر على الأداء اليومي
