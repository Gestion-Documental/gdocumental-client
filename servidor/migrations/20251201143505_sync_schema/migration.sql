/*
  Warnings:

  - Added the required column `title` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Attachment` ADD COLUMN `documentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Document` ADD COLUMN `content` LONGTEXT NULL,
    ADD COLUMN `title` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Project` ADD COLUMN `trd` JSON NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lockedUntil` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
