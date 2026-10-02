-- AlterTable
ALTER TABLE `SegmentoSoggiorno` ADD COLUMN `oraAl` VARCHAR(191) NULL,
    ADD COLUMN `oraDal` VARCHAR(191) NULL,
    ADD COLUMN `prezzoUsoDiurno` DECIMAL(10, 2) NULL,
    ADD COLUMN `usoDiurno` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `TipoCamera` ADD COLUMN `prezzoOraUsoDiurno` DECIMAL(10, 2) NULL;

