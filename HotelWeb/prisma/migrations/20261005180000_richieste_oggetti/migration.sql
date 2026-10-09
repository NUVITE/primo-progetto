-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `mesiConservazioneOggetti` INTEGER NOT NULL DEFAULT 6;

-- CreateTable
CREATE TABLE `RichiestaOspite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `cameraId` INTEGER NULL,
    `segmentoId` INTEGER NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `dettaglio` VARCHAR(191) NULL,
    `perQuando` DATETIME(3) NULL,
    `origine` VARCHAR(191) NOT NULL DEFAULT 'personale',
    `stato` VARCHAR(191) NOT NULL DEFAULT 'aperta',
    `creataIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creataDa` VARCHAR(191) NULL,
    `chiusaIl` DATETIME(3) NULL,
    `chiusaDa` VARCHAR(191) NULL,
    `nota` VARCHAR(191) NULL,

    INDEX `RichiestaOspite_hotelId_stato_idx`(`hotelId`, `stato`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OggettoSmarrito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `trovatoIl` DATE NOT NULL,
    `cameraId` INTEGER NULL,
    `zona` VARCHAR(191) NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `trovatoDa` VARCHAR(191) NOT NULL,
    `conservatoIn` VARCHAR(191) NULL,
    `prenotazioneId` INTEGER NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'in_deposito',
    `restituitoA` VARCHAR(191) NULL,
    `chiusoIl` DATETIME(3) NULL,
    `chiusoDa` VARCHAR(191) NULL,
    `nota` VARCHAR(191) NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OggettoSmarrito_hotelId_stato_idx`(`hotelId`, `stato`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RichiestaOspite` ADD CONSTRAINT `RichiestaOspite_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RichiestaOspite` ADD CONSTRAINT `RichiestaOspite_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `Camera`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RichiestaOspite` ADD CONSTRAINT `RichiestaOspite_segmentoId_fkey` FOREIGN KEY (`segmentoId`) REFERENCES `SegmentoSoggiorno`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OggettoSmarrito` ADD CONSTRAINT `OggettoSmarrito_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OggettoSmarrito` ADD CONSTRAINT `OggettoSmarrito_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `Camera`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OggettoSmarrito` ADD CONSTRAINT `OggettoSmarrito_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Nuovo permesso "Oggetti smarriti" (vale solo con il modulo Pulizie attivo).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'pulizie.oggetti')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception', 'Governante', 'Cameriera ai piani') AND NOT JSON_CONTAINS(`permessi`, '"pulizie.oggetti"');
