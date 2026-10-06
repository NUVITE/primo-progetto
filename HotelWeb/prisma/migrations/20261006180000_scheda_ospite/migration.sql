-- AlterTable
ALTER TABLE `Ospite` ADD COLUMN `consensoMarketing` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `consensoMarketingDa` VARCHAR(191) NULL,
    ADD COLUMN `consensoMarketingIl` DATETIME(3) NULL,
    ADD COLUMN `consensoMarketingModo` VARCHAR(191) NULL,
    ADD COLUMN `preferenze` TEXT NULL,
    ADD COLUMN `riguardo` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `OspiteUnito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `ospiteTenutoId` INTEGER NOT NULL,
    `eliminatoId` INTEGER NOT NULL,
    `datiEliminato` JSON NOT NULL,
    `unitoDa` VARCHAR(191) NOT NULL,
    `unitoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OspiteUnito_hotelId_ospiteTenutoId_idx`(`hotelId`, `ospiteTenutoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


-- Nuovo permesso "Unire ospiti doppi".
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'ospiti.unisci')
  WHERE `nome` IN ('Amministratore', 'Direttore') AND NOT JSON_CONTAINS(`permessi`, '"ospiti.unisci"');
