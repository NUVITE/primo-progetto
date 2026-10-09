-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `iban` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Ospite` ADD COLUMN `lingua` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ConfigurazioneEmail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `host` VARCHAR(191) NOT NULL,
    `porta` INTEGER NOT NULL,
    `sicurezza` VARCHAR(191) NOT NULL,
    `utente` VARCHAR(191) NOT NULL,
    `passwordCifrata` TEXT NOT NULL,
    `mittenteNome` VARCHAR(191) NOT NULL,
    `mittenteEmail` VARCHAR(191) NOT NULL,
    `rispondiA` VARCHAR(191) NULL,
    `aggiornataIl` DATETIME(3) NOT NULL,
    `aggiornataDa` VARCHAR(191) NOT NULL,
    `ultimaProvaIl` DATETIME(3) NULL,
    `ultimaProvaEsito` TEXT NULL,

    UNIQUE INDEX `ConfigurazioneEmail_hotelId_key`(`hotelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModelloEmail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `chiave` VARCHAR(191) NOT NULL,
    `lingua` VARCHAR(191) NOT NULL,
    `oggetto` VARCHAR(191) NOT NULL,
    `corpo` TEXT NOT NULL,
    `aggiornatoIl` DATETIME(3) NOT NULL,
    `aggiornatoDa` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ModelloEmail_hotelId_chiave_lingua_key`(`hotelId`, `chiave`, `lingua`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailInviata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `prenotazioneId` INTEGER NULL,
    `ospiteId` INTEGER NULL,
    `modello` VARCHAR(191) NULL,
    `lingua` VARCHAR(191) NOT NULL,
    `destinatario` VARCHAR(191) NOT NULL,
    `oggetto` VARCHAR(191) NOT NULL,
    `corpo` TEXT NOT NULL,
    `esito` VARCHAR(191) NOT NULL,
    `errore` TEXT NULL,
    `inviataIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `inviataDa` VARCHAR(191) NOT NULL,

    INDEX `EmailInviata_hotelId_inviataIl_idx`(`hotelId`, `inviataIl`),
    INDEX `EmailInviata_prenotazioneId_idx`(`prenotazioneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConfigurazioneEmail` ADD CONSTRAINT `ConfigurazioneEmail_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModelloEmail` ADD CONSTRAINT `ModelloEmail_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailInviata` ADD CONSTRAINT `EmailInviata_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailInviata` ADD CONSTRAINT `EmailInviata_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailInviata` ADD CONSTRAINT `EmailInviata_ospiteId_fkey` FOREIGN KEY (`ospiteId`) REFERENCES `Ospite`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Nuovo permesso "Inviare email agli ospiti".
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'comunicazioni.invia')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"comunicazioni.invia"');
