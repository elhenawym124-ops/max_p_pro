-- CreateTable
CREATE TABLE `few_shot_examples` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `customerMessage` TEXT NOT NULL,
    `aiResponse` TEXT NOT NULL,
    `category` VARCHAR(191) NULL,
    `tags` TEXT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `lastUsedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `few_shot_examples_companyId_idx`(`companyId`),
    INDEX `few_shot_examples_category_idx`(`category`),
    INDEX `few_shot_examples_isActive_idx`(`isActive`),
    INDEX `few_shot_examples_priority_idx`(`priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `few_shot_settings` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `maxExamplesPerPrompt` INTEGER NOT NULL DEFAULT 3,
    `selectionStrategy` VARCHAR(191) NOT NULL DEFAULT 'priority',
    `autoLearnFromGood` BOOLEAN NOT NULL DEFAULT false,
    `minQualityScore` DOUBLE NOT NULL DEFAULT 80.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `few_shot_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
