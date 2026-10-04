-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `cambioAsciugamaniOgni` INTEGER NULL,
    ADD COLUMN `cambioLenzuolaOgni` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `couverture` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `AssegnazionePulizia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `giorno` DATE NOT NULL,
    `cameraId` INTEGER NOT NULL,
    `utenteId` INTEGER NOT NULL,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `esito` VARCHAR(191) NULL,
    `nota` VARCHAR(191) NULL,
    `aggiornatoIl` DATETIME(3) NOT NULL,

    INDEX `AssegnazionePulizia_hotelId_giorno_idx`(`hotelId`, `giorno`),
    UNIQUE INDEX `AssegnazionePulizia_cameraId_giorno_key`(`cameraId`, `giorno`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ArticoloReparto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `repartoId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `prezzo` DECIMAL(10, 2) NOT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ArticoloReparto_repartoId_nome_key`(`repartoId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AssegnazionePulizia` ADD CONSTRAINT `AssegnazionePulizia_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssegnazionePulizia` ADD CONSTRAINT `AssegnazionePulizia_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `Camera`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssegnazionePulizia` ADD CONSTRAINT `AssegnazionePulizia_utenteId_fkey` FOREIGN KEY (`utenteId`) REFERENCES `Utente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticoloReparto` ADD CONSTRAINT `ArticoloReparto_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ArticoloReparto` ADD CONSTRAINT `ArticoloReparto_repartoId_fkey` FOREIGN KEY (`repartoId`) REFERENCES `RepartoAddebito`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Nuovo permesso "Pulire le proprie camere" (vale solo con il modulo Pulizie attivo).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'pulizie.mie')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Cameriera ai piani') AND NOT JSON_CONTAINS(`permessi`, '"pulizie.mie"');
