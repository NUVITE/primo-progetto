-- Schedina di Polizia (Alloggiati Web): credenziali per hotel (cifrate), stato di invio per persona,
-- registro degli invii, ricevute PDF; permesso adempimenti.invia.

-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `alloggiatiPassword` TEXT NULL,
    ADD COLUMN `alloggiatiUtente` VARCHAR(191) NULL,
    ADD COLUMN `alloggiatiVerificatoIl` DATETIME(3) NULL,
    ADD COLUMN `alloggiatiWskey` TEXT NULL;

-- AlterTable
ALTER TABLE `Presenza` ADD COLUMN `schedinaErrore` TEXT NULL,
    ADD COLUMN `schedinaInviataIl` DATETIME(3) NULL,
    ADD COLUMN `schedinaInvioId` INTEGER NULL;

-- CreateTable
CREATE TABLE `InvioAlloggiati` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `il` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `da` VARCHAR(191) NOT NULL,
    `modalita` VARCHAR(191) NOT NULL,
    `righe` INTEGER NOT NULL,
    `accettate` INTEGER NOT NULL,
    `dettaglio` JSON NULL,

    INDEX `InvioAlloggiati_hotelId_il_idx`(`hotelId`, `il`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RicevutaAlloggiati` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `pdf` LONGBLOB NOT NULL,
    `scaricataIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RicevutaAlloggiati_hotelId_data_key`(`hotelId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Nuovo permesso "Inviare schedine e ISTAT".
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'adempimenti.invia')
WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"adempimenti.invia"');
