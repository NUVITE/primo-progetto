-- AlterTable
ALTER TABLE `Prenotazione` ADD COLUMN `sollecitoIl` DATE NULL,
    ADD COLUMN `sospesoClienteId` INTEGER NULL,
    ADD COLUMN `sospesoDa` VARCHAR(191) NULL,
    ADD COLUMN `sospesoIl` DATETIME(3) NULL,
    ADD COLUMN `sospesoNota` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Prenotazione` ADD CONSTRAINT `Prenotazione_sospesoClienteId_fkey` FOREIGN KEY (`sospesoClienteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

