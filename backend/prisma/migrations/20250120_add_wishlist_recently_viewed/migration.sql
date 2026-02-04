-- CreateTable: Wishlist
CREATE TABLE `wishlists` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `wishlists_sessionId_productId_variantId_companyId_key`(`sessionId`, `productId`, `variantId`, `companyId`),
    INDEX `wishlists_sessionId_idx`(`sessionId`),
    INDEX `wishlists_customerId_idx`(`customerId`),
    INDEX `wishlists_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: RecentlyViewed
CREATE TABLE `recently_viewed` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `viewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `recently_viewed_sessionId_productId_companyId_key`(`sessionId`, `productId`, `companyId`),
    INDEX `recently_viewed_sessionId_companyId_idx`(`sessionId`, `companyId`),
    INDEX `recently_viewed_viewedAt_idx`(`viewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: Wishlist -> Product
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Wishlist -> Company
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RecentlyViewed -> Product
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: RecentlyViewed -> Company
ALTER TABLE `recently_viewed` ADD CONSTRAINT `recently_viewed_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

