-- Add TRD catalog to Project and ensure content supports long texts
ALTER TABLE `Project`
  ADD COLUMN `trd` JSON NULL;

-- Ensure Document.content can store large bodies
ALTER TABLE `Document`
  MODIFY `content` LONGTEXT NULL;
