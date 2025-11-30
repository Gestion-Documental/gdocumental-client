/*
  Warnings:

  - You are about to alter the column `observations` on the `CostActa` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Json`.
  - You are about to drop the column `author` on the `PhotoEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Acta` ADD COLUMN `date` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Attachment` ADD COLUMN `attachment` JSON NULL,
    ADD COLUMN `logEntryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Comment` ADD COLUMN `logEntryId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Commitment` ADD COLUMN `actaId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Communication` ADD COLUMN `statusHistory` JSON NULL;

-- AlterTable
ALTER TABLE `ContractItem` ADD COLUMN `executedQuantity` DOUBLE NULL,
    ADD COLUMN `itemCode` VARCHAR(191) NULL,
    ADD COLUMN `unit` VARCHAR(191) NULL,
    ADD COLUMN `unitPrice` DOUBLE NULL;

-- AlterTable
ALTER TABLE `CostActa` ADD COLUMN `relatedProgress` JSON NULL,
    MODIFY `observations` JSON NULL;

-- AlterTable
ALTER TABLE `LogEntry` ADD COLUMN `assignees` JSON NULL,
    ADD COLUMN `authorId` VARCHAR(191) NULL,
    ADD COLUMN `contractorReviewCompleted` BOOLEAN NULL,
    ADD COLUMN `reviewTasks` JSON NULL,
    ADD COLUMN `status` VARCHAR(191) NULL,
    ADD COLUMN `title` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `LogEntrySignatureTask` ADD COLUMN `assignedAt` DATETIME(3) NULL,
    ADD COLUMN `signerId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Notification` ADD COLUMN `commentId` VARCHAR(191) NULL,
    ADD COLUMN `recipientId` VARCHAR(191) NULL,
    ADD COLUMN `relatedItemId` VARCHAR(191) NULL,
    ADD COLUMN `relatedItemType` VARCHAR(191) NULL,
    ADD COLUMN `relatedView` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Observation` ADD COLUMN `text` VARCHAR(191) NULL,
    ADD COLUMN `timestamp` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `PhotoEntry` DROP COLUMN `author`,
    ADD COLUMN `attachment` VARCHAR(191) NULL,
    ADD COLUMN `authorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Project` ADD COLUMN `contractId` VARCHAR(191) NULL,
    ADD COLUMN `contractorName` VARCHAR(191) NULL,
    ADD COLUMN `initialEndDate` DATETIME(3) NULL,
    ADD COLUMN `initialValue` DOUBLE NULL,
    ADD COLUMN `object` VARCHAR(191) NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `supervisorName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Report` ADD COLUMN `authorId` VARCHAR(191) NULL,
    ADD COLUMN `submissionDate` DATETIME(3) NULL,
    ADD COLUMN `summary` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Signature` ADD COLUMN `logEntryId` VARCHAR(191) NULL,
    ADD COLUMN `reportId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `StatusHistory` ADD COLUMN `timestamp` DATETIME(3) NULL,
    ADD COLUMN `userId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `password` VARCHAR(191) NULL,
    MODIFY `role` ENUM('SUPER_ADMIN', 'DIRECTOR', 'ENGINEER', 'GUEST', 'RESIDENT') NOT NULL;

-- CreateTable
CREATE TABLE `LogEntryReviewTask` (
    `id` VARCHAR(191) NOT NULL,
    `logEntryId` VARCHAR(191) NOT NULL,
    `assignedTo` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContractItemExecution` (
    `id` VARCHAR(191) NOT NULL,
    `contractItemId` VARCHAR(191) NOT NULL,
    `executedQuantity` DOUBLE NOT NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatbotInteraction` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `inputText` VARCHAR(191) NOT NULL,
    `responseText` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatbotUsage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `lastUsed` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatbotFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `feedbackText` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_logEntryId_fkey` FOREIGN KEY (`logEntryId`) REFERENCES `LogEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogEntrySignatureTask` ADD CONSTRAINT `LogEntrySignatureTask_signerId_fkey` FOREIGN KEY (`signerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoEntry` ADD CONSTRAINT `PhotoEntry_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Commitment` ADD CONSTRAINT `Commitment_actaId_fkey` FOREIGN KEY (`actaId`) REFERENCES `Acta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_logEntryId_fkey` FOREIGN KEY (`logEntryId`) REFERENCES `LogEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Signature` ADD CONSTRAINT `Signature_logEntryId_fkey` FOREIGN KEY (`logEntryId`) REFERENCES `LogEntry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Signature` ADD CONSTRAINT `Signature_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusHistory` ADD CONSTRAINT `StatusHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogEntryReviewTask` ADD CONSTRAINT `LogEntryReviewTask_logEntryId_fkey` FOREIGN KEY (`logEntryId`) REFERENCES `LogEntry`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContractItemExecution` ADD CONSTRAINT `ContractItemExecution_contractItemId_fkey` FOREIGN KEY (`contractItemId`) REFERENCES `ContractItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatbotInteraction` ADD CONSTRAINT `ChatbotInteraction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatbotUsage` ADD CONSTRAINT `ChatbotUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatbotFeedback` ADD CONSTRAINT `ChatbotFeedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
