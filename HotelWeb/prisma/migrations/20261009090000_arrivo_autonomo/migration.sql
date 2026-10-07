-- AlterTable
ALTER TABLE `Camera` ADD COLUMN `codiceAccesso` VARCHAR(191) NULL,
    ADD COLUMN `istruzioniArrivo` TEXT NULL;

-- AlterTable
ALTER TABLE `SegmentoSoggiorno` ADD COLUMN `codiceAccesso` VARCHAR(191) NULL;

