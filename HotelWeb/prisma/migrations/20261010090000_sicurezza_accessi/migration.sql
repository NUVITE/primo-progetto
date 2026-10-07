-- AlterTable
ALTER TABLE `Utente` ADD COLUMN `cambioPasswordObbligatorio` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `passwordCambiataIl` DATETIME(3) NULL,
    ADD COLUMN `versioneSessione` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `EventoAccesso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utenteId` INTEGER NULL,
    `email` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `dettaglio` VARCHAR(191) NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventoAccesso_email_creatoIl_idx`(`email`, `creatoIl`),
    INDEX `EventoAccesso_ip_creatoIl_idx`(`ip`, `creatoIl`),
    INDEX `EventoAccesso_utenteId_creatoIl_idx`(`utenteId`, `creatoIl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventoAccesso` ADD CONSTRAINT `EventoAccesso_utenteId_fkey` FOREIGN KEY (`utenteId`) REFERENCES `Utente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

