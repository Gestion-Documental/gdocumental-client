-- AlterTable
ALTER TABLE `Document` ADD COLUMN `assignedToUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Document_assignedToUserId_idx` ON `Document`(`assignedToUserId`);

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_assignedToUserId_fkey` FOREIGN KEY (`assignedToUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
