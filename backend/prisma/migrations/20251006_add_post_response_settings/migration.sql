-- CreateTable
CREATE TABLE `post_response_settings` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `responseMethod` VARCHAR(191) NOT NULL,
    `fixedMessage` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `post_response_settings_postId_companyId_key`(`postId`, `companyId`),
    INDEX `post_response_settings_postId_idx`(`postId`),
    INDEX `post_response_settings_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `post_response_settings` ADD CONSTRAINT `post_response_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;