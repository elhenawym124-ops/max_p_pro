-- AlterTable
ALTER TABLE `guest_orders` 
ADD COLUMN `turboShipmentId` VARCHAR(191) NULL,
ADD COLUMN `turboTrackingNumber` VARCHAR(191) NULL,
ADD COLUMN `turboShipmentStatus` VARCHAR(191) NULL,
ADD COLUMN `turboLabelUrl` TEXT NULL,
ADD COLUMN `turboMetadata` TEXT NULL;

-- CreateIndex
CREATE INDEX `guest_orders_turboShipmentId_idx` ON `guest_orders`(`turboShipmentId`);

-- CreateIndex
CREATE INDEX `guest_orders_turboTrackingNumber_idx` ON `guest_orders`(`turboTrackingNumber`);
