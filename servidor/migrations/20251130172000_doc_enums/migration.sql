-- Update Document enum values to align with app types
ALTER TABLE `Document` MODIFY `type` ENUM('INBOUND', 'OUTBOUND', 'INTERNAL') NOT NULL,
    MODIFY `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'PENDING_SCAN', 'RADICADO', 'ARCHIVED', 'VOID') NOT NULL DEFAULT 'DRAFT';
