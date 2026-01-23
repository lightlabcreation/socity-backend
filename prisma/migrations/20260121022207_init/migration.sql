/*
  Warnings:

  - You are about to drop the column `count` on the `parcel` table. All the data in the column will be lost.
  - You are about to drop the column `receivedAt` on the `parcel` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `parcel` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `unitvehicle` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `visitor` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(7))` to `VarChar(191)`.
  - Added the required column `updatedAt` to the `EmergencyContact` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courierName` to the `Parcel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ParkingSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `make` to the `UnitVehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `societyId` to the `UnitVehicle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UnitVehicle` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `emergencycontact` DROP FOREIGN KEY `EmergencyContact_residentId_fkey`;

-- DropIndex
DROP INDEX `EmergencyContact_residentId_fkey` ON `emergencycontact`;

-- AlterTable
ALTER TABLE `amenitybooking` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `complaint` ADD COLUMN `escalatedToTech` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isPrivate` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `emergencybarcode` ADD COLUMN `label` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `emergencycontact` ADD COLUMN `available` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `societyId` INTEGER NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `residentId` INTEGER NULL;

-- AlterTable
ALTER TABLE `marketplaceitem` ADD COLUMN `priceType` VARCHAR(191) NULL DEFAULT 'fixed';

-- AlterTable
ALTER TABLE `parcel` DROP COLUMN `count`,
    DROP COLUMN `receivedAt`,
    DROP COLUMN `type`,
    ADD COLUMN `collectedBy` VARCHAR(191) NULL,
    ADD COLUMN `courierName` VARCHAR(191) NOT NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `receivedBy` VARCHAR(191) NULL,
    ADD COLUMN `trackingNumber` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `parkingslot` ADD COLUMN `block` VARCHAR(191) NULL,
    ADD COLUMN `floor` VARCHAR(191) NULL,
    ADD COLUMN `monthlyCharge` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `serviceinquiry` ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `vendorId` INTEGER NULL;

-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `bankAccountId` INTEGER NULL;

-- AlterTable
ALTER TABLE `unitmember` ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `profileImg` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `unitvehicle` DROP COLUMN `name`,
    ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `make` VARCHAR(191) NOT NULL,
    ADD COLUMN `ownerName` VARCHAR(191) NULL,
    ADD COLUMN `parkingSlot` VARCHAR(191) NULL,
    ADD COLUMN `societyId` INTEGER NOT NULL,
    ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `visitor` ADD COLUMN `residentId` INTEGER NULL,
    MODIFY `purpose` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `ParkingPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `paymentId` VARCHAR(191) NOT NULL,
    `slotId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `amount` DOUBLE NOT NULL,
    `month` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `paymentDate` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `societyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ParkingPayment_paymentId_key`(`paymentId`),
    UNIQUE INDEX `ParkingPayment_slotId_month_societyId_key`(`slotId`, `month`, `societyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceNo` VARCHAR(191) NOT NULL,
    `societyId` INTEGER NOT NULL,
    `unitId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `amount` DOUBLE NOT NULL,
    `maintenance` DOUBLE NOT NULL,
    `utilities` DOUBLE NOT NULL,
    `penalty` DOUBLE NOT NULL DEFAULT 0,
    `description` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `paidDate` DATETIME(3) NULL,
    `paymentMode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_invoiceNo_key`(`invoiceNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VendorInvoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `vendorId` INTEGER NOT NULL,
    `societyId` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `gstAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL,
    `invoiceDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `paymentDate` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `transactionRef` VARCHAR(191) NULL,
    `bankAccountId` INTEGER NULL,
    `remarks` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VendorInvoice_societyId_invoiceNumber_vendorId_key`(`societyId`, `invoiceNumber`, `vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyAlert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `resolution` TEXT NULL,
    `societyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BuzzLike` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `buzzId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BuzzLike_buzzId_userId_key`(`buzzId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Meeting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `date` DATETIME(3) NOT NULL,
    `time` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `attendees` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SCHEDULED',
    `societyId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Asset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `purchaseDate` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `societyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `societyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `date` DATETIME(3) NOT NULL,
    `time` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'UPCOMING',
    `societyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prNumber` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `items` JSON NULL,
    `societyId` INTEGER NOT NULL,
    `requestedById` INTEGER NOT NULL,
    `department` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_CM',
    `estimatedAmount` DOUBLE NOT NULL,
    `cmActionBy` INTEGER NULL,
    `cmActionDate` DATETIME(3) NULL,
    `financeActionBy` INTEGER NULL,
    `financeActionDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PurchaseRequest_societyId_prNumber_key`(`societyId`, `prNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `societyId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `participantId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Conversation_societyId_type_participantId_key`(`societyId`, `type`, `participantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversationId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `attachments` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LedgerAccount` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `societyId` INTEGER NOT NULL,
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `bankDetails` JSON NULL,

    UNIQUE INDEX `LedgerAccount_societyId_code_key`(`societyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JournalEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `voucherNo` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `narration` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `societyId` INTEGER NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `JournalEntry_societyId_voucherNo_key`(`societyId`, `voucherNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JournalLine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `journalEntryId` INTEGER NOT NULL,
    `accountId` INTEGER NOT NULL,
    `debit` DOUBLE NOT NULL DEFAULT 0,
    `credit` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseOrder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poNumber` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `items` JSON NOT NULL,
    `subtotal` DOUBLE NOT NULL DEFAULT 0,
    `taxAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expectedDeliveryDate` DATETIME(3) NULL,
    `deliveryDate` DATETIME(3) NULL,
    `paymentTerms` VARCHAR(191) NULL,
    `societyId` INTEGER NOT NULL,
    `vendorId` INTEGER NOT NULL,
    `prId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PurchaseOrder_prId_key`(`prId`),
    UNIQUE INDEX `PurchaseOrder_societyId_poNumber_key`(`societyId`, `poNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoodsReceipt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grNumber` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `description` VARCHAR(191) NULL,
    `items` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `receivedBy` VARCHAR(191) NULL,
    `qualityCheckStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `invoiceNumber` VARCHAR(191) NULL,
    `societyId` INTEGER NOT NULL,
    `vendorId` INTEGER NOT NULL,
    `poId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `GoodsReceipt_societyId_grNumber_key`(`societyId`, `grNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Incident` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `location` VARCHAR(191) NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `societyId` INTEGER NOT NULL,
    `reportedById` INTEGER NULL,
    `assignedToId` INTEGER NULL,
    `images` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PatrolLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `area` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'completed',
    `societyId` INTEGER NOT NULL,
    `guardId` INTEGER NOT NULL,
    `startTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endTime` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'GUARD',
    `phone` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `shift` VARCHAR(191) NULL,
    `gate` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OFF_DUTY',
    `attendanceStatus` VARCHAR(191) NULL,
    `checkInTime` VARCHAR(191) NULL,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `photo` VARCHAR(191) NULL,
    `joiningDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `address` VARCHAR(191) NULL,
    `emergencyContact` VARCHAR(191) NULL,
    `idProof` VARCHAR(191) NULL,
    `idNumber` VARCHAR(191) NULL,
    `societyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MoveRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('MOVE_IN', 'MOVE_OUT') NOT NULL,
    `unitId` INTEGER NULL,
    `residentName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `timeSlot` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `vehicleType` VARCHAR(191) NULL,
    `vehicleNumber` VARCHAR(191) NULL,
    `nocStatus` ENUM('PENDING', 'OBTAINED', 'ISSUED') NOT NULL DEFAULT 'PENDING',
    `depositStatus` ENUM('PAID', 'REFUND_PENDING', 'REFUNDED') NULL,
    `depositAmount` DOUBLE NULL,
    `checklistItems` JSON NULL,
    `notes` TEXT NULL,
    `societyId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ParkingPayment` ADD CONSTRAINT `ParkingPayment_slotId_fkey` FOREIGN KEY (`slotId`) REFERENCES `ParkingSlot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParkingPayment` ADD CONSTRAINT `ParkingPayment_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ParkingPayment` ADD CONSTRAINT `ParkingPayment_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visitor` ADD CONSTRAINT `Visitor_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_bankAccountId_fkey` FOREIGN KEY (`bankAccountId`) REFERENCES `LedgerAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorInvoice` ADD CONSTRAINT `VendorInvoice_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VendorInvoice` ADD CONSTRAINT `VendorInvoice_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyAlert` ADD CONSTRAINT `EmergencyAlert_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyAlert` ADD CONSTRAINT `EmergencyAlert_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyContact` ADD CONSTRAINT `EmergencyContact_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmergencyContact` ADD CONSTRAINT `EmergencyContact_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuzzLike` ADD CONSTRAINT `BuzzLike_buzzId_fkey` FOREIGN KEY (`buzzId`) REFERENCES `CommunityBuzz`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuzzLike` ADD CONSTRAINT `BuzzLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UnitVehicle` ADD CONSTRAINT `UnitVehicle_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Asset` ADD CONSTRAINT `Asset_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseRequest` ADD CONSTRAINT `PurchaseRequest_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseRequest` ADD CONSTRAINT `PurchaseRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversation` ADD CONSTRAINT `Conversation_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LedgerAccount` ADD CONSTRAINT `LedgerAccount_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalEntry` ADD CONSTRAINT `JournalEntry_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalLine` ADD CONSTRAINT `JournalLine_journalEntryId_fkey` FOREIGN KEY (`journalEntryId`) REFERENCES `JournalEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JournalLine` ADD CONSTRAINT `JournalLine_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `LedgerAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseOrder` ADD CONSTRAINT `PurchaseOrder_prId_fkey` FOREIGN KEY (`prId`) REFERENCES `PurchaseRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `Vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoodsReceipt` ADD CONSTRAINT `GoodsReceipt_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `PurchaseOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatrolLog` ADD CONSTRAINT `PatrolLog_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatrolLog` ADD CONSTRAINT `PatrolLog_guardId_fkey` FOREIGN KEY (`guardId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MoveRequest` ADD CONSTRAINT `MoveRequest_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `Unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MoveRequest` ADD CONSTRAINT `MoveRequest_societyId_fkey` FOREIGN KEY (`societyId`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
