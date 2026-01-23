-- AlterTable
ALTER TABLE `document` ADD COLUMN `size` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NULL,
    ADD COLUMN `visibility` VARCHAR(191) NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE `staff` ADD COLUMN `workingDays` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `unit` ADD COLUMN `emergencyContact` VARCHAR(191) NULL,
    ADD COLUMN `leaseEndDate` DATETIME(3) NULL,
    ADD COLUMN `leaseStartDate` DATETIME(3) NULL,
    ADD COLUMN `maintenanceCharges` DOUBLE NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `parkingSlot` VARCHAR(191) NULL,
    ADD COLUMN `rentAmount` DOUBLE NULL,
    ADD COLUMN `securityDeposit` DOUBLE NULL,
    ADD COLUMN `vehicleNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `vendor` ADD COLUMN `company` VARCHAR(191) NULL,
    ADD COLUMN `completedJobs` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `contactPerson` VARCHAR(191) NULL,
    ADD COLUMN `contractEnd` DATETIME(3) NULL,
    ADD COLUMN `contractStart` DATETIME(3) NULL,
    ADD COLUMN `contractValue` DOUBLE NULL,
    ADD COLUMN `gst` VARCHAR(191) NULL,
    ADD COLUMN `pan` VARCHAR(191) NULL,
    ADD COLUMN `paymentTerms` VARCHAR(191) NULL,
    ADD COLUMN `rating` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `totalJobs` INTEGER NOT NULL DEFAULT 0;
