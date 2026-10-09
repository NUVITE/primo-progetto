-- AlterTable
ALTER TABLE `SupplementoStagionale` ADD COLUMN `tipoCameraId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `SupplementoStagionale` ADD CONSTRAINT `SupplementoStagionale_tipoCameraId_fkey` FOREIGN KEY (`tipoCameraId`) REFERENCES `TipoCamera`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

