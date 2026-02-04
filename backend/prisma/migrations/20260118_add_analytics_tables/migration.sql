-- CreateTable
CREATE TABLE `store_visits` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `referrer` TEXT NULL,
    `landingPage` TEXT NULL,
    `visitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `duration` INTEGER NULL,
    `pagesViewed` INTEGER NOT NULL DEFAULT 1,

    INDEX `store_visits_companyId_visitedAt_idx`(`companyId`, `visitedAt`),
    INDEX `store_visits_sessionId_companyId_idx`(`sessionId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_visits` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `visitedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `duration` INTEGER NULL,
    `source` VARCHAR(191) NULL,
    `addedToCart` BOOLEAN NOT NULL DEFAULT false,
    `purchased` BOOLEAN NOT NULL DEFAULT false,

    INDEX `product_visits_companyId_productId_visitedAt_idx`(`companyId`, `productId`, `visitedAt`),
    INDEX `product_visits_sessionId_companyId_idx`(`sessionId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversion_events` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `value` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` TEXT NULL,

    INDEX `conversion_events_companyId_eventType_createdAt_idx`(`companyId`, `eventType`, `createdAt`),
    INDEX `conversion_events_sessionId_companyId_idx`(`sessionId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `totalVisits` INTEGER NOT NULL DEFAULT 0,
    `uniqueVisitors` INTEGER NOT NULL DEFAULT 0,
    `totalProductViews` INTEGER NOT NULL DEFAULT 0,
    `totalAddToCarts` INTEGER NOT NULL DEFAULT 0,
    `totalCheckouts` INTEGER NOT NULL DEFAULT 0,
    `totalPurchases` INTEGER NOT NULL DEFAULT 0,
    `totalRevenue` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `conversionRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `avgOrderValue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `bounceRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `avgSessionDuration` INTEGER NOT NULL DEFAULT 0,

    INDEX `daily_analytics_companyId_date_idx`(`companyId`, `date`),
    UNIQUE INDEX `daily_analytics_companyId_date_key`(`companyId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `uniqueViews` INTEGER NOT NULL DEFAULT 0,
    `addToCarts` INTEGER NOT NULL DEFAULT 0,
    `purchases` INTEGER NOT NULL DEFAULT 0,
    `revenue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `conversionRate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `avgViewDuration` INTEGER NOT NULL DEFAULT 0,

    INDEX `product_analytics_companyId_date_idx`(`companyId`, `date`),
    INDEX `product_analytics_productId_companyId_idx`(`productId`, `companyId`),
    UNIQUE INDEX `product_analytics_companyId_productId_date_key`(`companyId`, `productId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `store_visits` ADD CONSTRAINT `store_visits_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_visits` ADD CONSTRAINT `product_visits_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_visits` ADD CONSTRAINT `product_visits_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversion_events` ADD CONSTRAINT `conversion_events_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversion_events` ADD CONSTRAINT `conversion_events_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversion_events` ADD CONSTRAINT `conversion_events_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_analytics` ADD CONSTRAINT `daily_analytics_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_analytics` ADD CONSTRAINT `product_analytics_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_analytics` ADD CONSTRAINT `product_analytics_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
