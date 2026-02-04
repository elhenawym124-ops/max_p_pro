-- CreateTable: BackInStockNotification
CREATE TABLE `back_in_stock_notifications` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerPhone` VARCHAR(191) NULL,
    `notifyEmail` BOOLEAN NOT NULL DEFAULT true,
    `notifySMS` BOOLEAN NOT NULL DEFAULT false,
    `isNotified` BOOLEAN NOT NULL DEFAULT false,
    `notifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `back_in_stock_notifications_productId_idx`(`productId`),
    INDEX `back_in_stock_notifications_companyId_idx`(`companyId`),
    INDEX `back_in_stock_notifications_isNotified_idx`(`isNotified`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: BackInStockNotification -> Product
ALTER TABLE `back_in_stock_notifications` ADD CONSTRAINT `back_in_stock_notifications_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: BackInStockNotification -> Company
ALTER TABLE `back_in_stock_notifications` ADD CONSTRAINT `back_in_stock_notifications_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

