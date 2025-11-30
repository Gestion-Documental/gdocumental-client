-- AlterTable
ALTER TABLE `AppSetting` ADD COLUMN `companyName` VARCHAR(191) NULL,
    ADD COLUMN `defaultProjectVisibility` VARCHAR(191) NULL,
    ADD COLUMN `enable2FA` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `locale` VARCHAR(191) NULL,
    ADD COLUMN `photoIntervalDays` INTEGER NULL,
    ADD COLUMN `requireStrongPassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sessionTimeoutMinutes` INTEGER NULL,
    ADD COLUMN `timezone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Attachment` ADD COLUMN `costActaId` VARCHAR(191) NULL,
    ADD COLUMN `size` INTEGER NULL,
    ADD COLUMN `storagePath` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `AuditLog` ADD COLUMN `actor` VARCHAR(191) NULL,
    ADD COLUMN `actorEmail` VARCHAR(191) NULL,
    ADD COLUMN `diff` JSON NULL,
    ADD COLUMN `entityId` VARCHAR(191) NULL,
    ADD COLUMN `entityType` VARCHAR(191) NULL,
    ADD COLUMN `timestamp` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `Commitment` ADD COLUMN `status` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Communication` ADD COLUMN `assignee` VARCHAR(191) NULL,
    ADD COLUMN `assigneeId` VARCHAR(191) NULL,
    ADD COLUMN `attachments` JSON NULL,
    ADD COLUMN `radicado` VARCHAR(191) NULL,
    ADD COLUMN `responseDueDate` DATETIME(3) NULL,
    ADD COLUMN `sentDate` DATETIME(3) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CostActa` ADD COLUMN `advancePaymentPercentage` DOUBLE NULL,
    ADD COLUMN `approvalDate` DATETIME(3) NULL,
    ADD COLUMN `attachments` JSON NULL,
    ADD COLUMN `observations` VARCHAR(191) NULL,
    ADD COLUMN `paymentDueDate` DATETIME(3) NULL,
    ADD COLUMN `periodValue` DOUBLE NULL,
    ADD COLUMN `status` VARCHAR(191) NULL,
    ADD COLUMN `submissionDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Drawing` ADD COLUMN `code` VARCHAR(191) NULL,
    ADD COLUMN `comments` VARCHAR(191) NULL,
    ADD COLUMN `discipline` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL,
    ADD COLUMN `versions` JSON NULL;

-- AlterTable
ALTER TABLE `EmailVerificationToken` ADD COLUMN `tokenHash` VARCHAR(191) NULL,
    ADD COLUMN `usedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `LogEntry` ADD COLUMN `attachments` JSON NULL,
    ADD COLUMN `author` VARCHAR(191) NULL,
    ADD COLUMN `entryDate` DATETIME(3) NULL,
    ADD COLUMN `folioNumber` INTEGER NULL,
    ADD COLUMN `signatureTasks` JSON NULL,
    ADD COLUMN `signedPdf` VARCHAR(191) NULL,
    ADD COLUMN `signedPdfAttachmentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PasswordResetToken` ADD COLUMN `tokenHash` VARCHAR(191) NULL,
    ADD COLUMN `usedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `PhotoEntry` ADD COLUMN `author` VARCHAR(191) NULL,
    ADD COLUMN `date` DATETIME(3) NULL,
    ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `order` INTEGER NULL;

-- AlterTable
ALTER TABLE `ProjectTask` ADD COLUMN `dependencies` JSON NULL,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `outlineLevel` INTEGER NULL,
    ADD COLUMN `startDate` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Report` ADD COLUMN `comments` VARCHAR(191) NULL,
    ADD COLUMN `number` INTEGER NULL,
    ADD COLUMN `reportScope` VARCHAR(191) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(191) NULL,
    ADD COLUMN `version` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `avatarUrl` VARCHAR(191) NULL,
    ADD COLUMN `canDownload` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `cargo` VARCHAR(191) NULL,
    ADD COLUMN `entity` VARCHAR(191) NULL,
    ADD COLUMN `mustUpdatePassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `status` VARCHAR(191) NULL,
    ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `UserSignature` ADD COLUMN `fileName` VARCHAR(191) NULL,
    ADD COLUMN `mimeType` VARCHAR(191) NULL,
    ADD COLUMN `size` INTEGER NULL,
    ADD COLUMN `storagePath` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;
