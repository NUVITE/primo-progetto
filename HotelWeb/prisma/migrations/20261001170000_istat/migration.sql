-- ISTAT (Ross1000 / SPOT): credenziali Ross1000 (password cifrata), primo giorno SPOT, periodi di chiusura,
-- registro dei giorni comunicati; giorni di permanenza dichiarati nella schedina di Polizia.

-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `ross1000Codice` VARCHAR(191) NULL,
    ADD COLUMN `ross1000Indirizzo` VARCHAR(191) NULL,
    ADD COLUMN `ross1000Password` TEXT NULL,
    ADD COLUMN `ross1000Utente` VARCHAR(191) NULL,
    ADD COLUMN `istatPrimoGiorno` DATE NULL;

-- AlterTable
ALTER TABLE `Presenza` ADD COLUMN `schedinaGiorni` INTEGER NULL;

-- CreateTable
CREATE TABLE `PeriodoChiusura` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `dal` DATE NOT NULL,
    `al` DATE NOT NULL,
    `nota` VARCHAR(191) NULL,

    INDEX `PeriodoChiusura_hotelId_dal_idx`(`hotelId`, `dal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvioIstat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `sistema` VARCHAR(191) NOT NULL,
    `giorno` DATE NOT NULL,
    `stato` VARCHAR(191) NOT NULL,
    `impronta` VARCHAR(191) NULL,
    `esito` TEXT NULL,
    `il` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `da` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `InvioIstat_hotelId_giorno_key`(`hotelId`, `giorno`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

