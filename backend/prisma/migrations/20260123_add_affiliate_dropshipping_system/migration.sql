-- Migration: Add Affiliate & Dropshipping System
-- Date: 2026-01-23

-- CreateTable: merchants
CREATE TABLE `merchants` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `commissionRate` DOUBLE NOT NULL DEFAULT 10.0,
    `autoFulfill` BOOLEAN NOT NULL DEFAULT false,
    `apiKey` VARCHAR(191) NULL,
    `webhookUrl` VARCHAR(191) NULL,
    `settings` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `merchants_email_key`(`email`),
    UNIQUE INDEX `merchants_apiKey_key`(`apiKey`),
    INDEX `merchants_companyId_idx`(`companyId`),
    INDEX `merchants_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: merchant_products
CREATE TABLE `merchant_products` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `merchantSku` VARCHAR(191) NULL,
    `merchantPrice` DECIMAL(10, 2) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `syncEnabled` BOOLEAN NOT NULL DEFAULT true,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `merchant_products_merchantId_productId_key`(`merchantId`, `productId`),
    INDEX `merchant_products_merchantId_idx`(`merchantId`),
    INDEX `merchant_products_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: affiliates
CREATE TABLE `affiliates` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `affiliateCode` VARCHAR(191) NOT NULL,
    `commissionType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `commissionRate` DOUBLE NOT NULL DEFAULT 5.0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `totalEarnings` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `paidEarnings` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `pendingEarnings` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `totalSales` INTEGER NOT NULL DEFAULT 0,
    `totalClicks` INTEGER NOT NULL DEFAULT 0,
    `conversionRate` DOUBLE NOT NULL DEFAULT 0.0,
    `paymentMethod` VARCHAR(191) NULL,
    `paymentDetails` TEXT NULL,
    `minPayout` DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    `canCreateOrdersForOthers` BOOLEAN NOT NULL DEFAULT true,
    `canViewCustomerData` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `affiliates_userId_key`(`userId`),
    UNIQUE INDEX `affiliates_affiliateCode_key`(`affiliateCode`),
    INDEX `affiliates_companyId_idx`(`companyId`),
    INDEX `affiliates_status_idx`(`status`),
    INDEX `affiliates_affiliateCode_idx`(`affiliateCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: affiliate_products
CREATE TABLE `affiliate_products` (
    `id` VARCHAR(191) NOT NULL,
    `affiliateId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `basePrice` DECIMAL(10, 2) NOT NULL,
    `markup` DECIMAL(10, 2) NOT NULL,
    `finalPrice` DECIMAL(10, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `affiliate_products_affiliateId_productId_key`(`affiliateId`, `productId`),
    INDEX `affiliate_products_affiliateId_idx`(`affiliateId`),
    INDEX `affiliate_products_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: affiliate_referrals
CREATE TABLE `affiliate_referrals` (
    `id` VARCHAR(191) NOT NULL,
    `affiliateId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `referralCode` VARCHAR(191) NOT NULL,
    `referralUrl` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `converted` BOOLEAN NOT NULL DEFAULT false,
    `convertedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `affiliate_referrals_affiliateId_idx`(`affiliateId`),
    INDEX `affiliate_referrals_customerId_idx`(`customerId`),
    INDEX `affiliate_referrals_orderId_idx`(`orderId`),
    INDEX `affiliate_referrals_referralCode_idx`(`referralCode`),
    INDEX `affiliate_referrals_converted_idx`(`converted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: commissions
CREATE TABLE `commissions` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `affiliateId` VARCHAR(191) NULL,
    `merchantId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `calculationType` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `rate` DOUBLE NULL,
    `markup` DECIMAL(10, 2) NULL,
    `baseAmount` DECIMAL(10, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'CONFIRMED',
    `orderTotal` DECIMAL(10, 2) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `payoutId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commissions_orderId_idx`(`orderId`),
    INDEX `commissions_affiliateId_idx`(`affiliateId`),
    INDEX `commissions_merchantId_idx`(`merchantId`),
    INDEX `commissions_status_idx`(`status`),
    INDEX `commissions_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: merchant_orders
CREATE TABLE `merchant_orders` (
    `id` VARCHAR(191) NOT NULL,
    `merchantId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `merchantOrderId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `items` TEXT NOT NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `shippingAddress` TEXT NULL,
    `trackingNumber` VARCHAR(191) NULL,
    `syncedAt` DATETIME(3) NULL,
    `fulfilledAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `merchant_orders_orderId_key`(`orderId`),
    INDEX `merchant_orders_merchantId_idx`(`merchantId`),
    INDEX `merchant_orders_orderId_idx`(`orderId`),
    INDEX `merchant_orders_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: affiliate_payouts
CREATE TABLE `affiliate_payouts` (
    `id` VARCHAR(191) NOT NULL,
    `affiliateId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'EGP',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `paymentMethod` VARCHAR(191) NOT NULL,
    `paymentDetails` TEXT NULL,
    `transactionId` VARCHAR(191) NULL,
    `externalReference` VARCHAR(191) NULL,
    `processedAt` DATETIME(3) NULL,
    `processedBy` VARCHAR(191) NULL,
    `isExternalPayment` BOOLEAN NOT NULL DEFAULT true,
    `externalPaymentDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `affiliate_payouts_affiliateId_idx`(`affiliateId`),
    INDEX `affiliate_payouts_status_idx`(`status`),
    INDEX `affiliate_payouts_paymentMethod_idx`(`paymentMethod`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: merchants
ALTER TABLE `merchants` ADD CONSTRAINT `merchants_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: merchant_products
ALTER TABLE `merchant_products` ADD CONSTRAINT `merchant_products_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `merchant_products` ADD CONSTRAINT `merchant_products_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: affiliates
ALTER TABLE `affiliates` ADD CONSTRAINT `affiliates_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliates` ADD CONSTRAINT `affiliates_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: affiliate_products
ALTER TABLE `affiliate_products` ADD CONSTRAINT `affiliate_products_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_products` ADD CONSTRAINT `affiliate_products_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: affiliate_referrals
ALTER TABLE `affiliate_referrals` ADD CONSTRAINT `affiliate_referrals_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_referrals` ADD CONSTRAINT `affiliate_referrals_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `affiliate_referrals` ADD CONSTRAINT `affiliate_referrals_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: commissions
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `commissions` ADD CONSTRAINT `commissions_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `affiliate_payouts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: merchant_orders
ALTER TABLE `merchant_orders` ADD CONSTRAINT `merchant_orders_merchantId_fkey` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `merchant_orders` ADD CONSTRAINT `merchant_orders_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: affiliate_payouts
ALTER TABLE `affiliate_payouts` ADD CONSTRAINT `affiliate_payouts_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: orders - Add affiliate and dropshipping columns
ALTER TABLE `orders` ADD COLUMN `affiliateReferralId` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD COLUMN `affiliateId` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD COLUMN `merchantOrderId` VARCHAR(191) NULL;
ALTER TABLE `orders` ADD COLUMN `isDropshipped` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `orders` ADD COLUMN `orderSource` VARCHAR(191) NOT NULL DEFAULT 'REGULAR';

-- Add indexes for orders
CREATE INDEX `orders_affiliateId_idx` ON `orders`(`affiliateId`);
CREATE INDEX `orders_orderSource_idx` ON `orders`(`orderSource`);

-- Add foreign keys for orders
ALTER TABLE `orders` ADD CONSTRAINT `orders_affiliateReferralId_fkey` FOREIGN KEY (`affiliateReferralId`) REFERENCES `affiliate_referrals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `orders` ADD CONSTRAINT `orders_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `orders` ADD CONSTRAINT `orders_merchantOrderId_fkey` FOREIGN KEY (`merchantOrderId`) REFERENCES `merchant_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: products - Add dropshipping and affiliate columns
ALTER TABLE `products` ADD COLUMN `isDropshipped` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `products` ADD COLUMN `merchantProductId` VARCHAR(191) NULL;
ALTER TABLE `products` ADD COLUMN `basePrice` DECIMAL(10, 2) NULL;
ALTER TABLE `products` ADD COLUMN `allowAffiliateMarkup` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: companies - Add platform commission rate
ALTER TABLE `companies` ADD COLUMN `platformCommissionRate` DOUBLE NULL DEFAULT 5.0;
