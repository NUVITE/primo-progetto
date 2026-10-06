-- CreateTable
CREATE TABLE `ConsegnaTurno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `testo` TEXT NOT NULL,
    `importante` BOOLEAN NOT NULL DEFAULT false,
    `creataIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creataDa` VARCHAR(191) NOT NULL,
    `creataDaId` INTEGER NOT NULL,
    `chiusaIl` DATETIME(3) NULL,
    `chiusaDa` VARCHAR(191) NULL,

    INDEX `ConsegnaTurno_hotelId_creataIl_idx`(`hotelId`, `creataIl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LetturaConsegna` (
    `consegnaId` INTEGER NOT NULL,
    `utenteId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `lettaIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`consegnaId`, `utenteId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reclamo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `prenotazioneId` INTEGER NULL,
    `ospiteId` INTEGER NULL,
    `nome` VARCHAR(191) NOT NULL,
    `camera` VARCHAR(191) NULL,
    `categoria` VARCHAR(191) NOT NULL,
    `descrizione` TEXT NOT NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'aperto',
    `soluzione` TEXT NULL,
    `gesto` VARCHAR(191) NULL,
    `analisi` TEXT NULL,
    `abbuonoId` INTEGER NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creatoDa` VARCHAR(191) NOT NULL,
    `risoltoIl` DATETIME(3) NULL,
    `risoltoDa` VARCHAR(191) NULL,

    UNIQUE INDEX `Reclamo_abbuonoId_key`(`abbuonoId`),
    INDEX `Reclamo_hotelId_creatoIl_idx`(`hotelId`, `creatoIl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ConsegnaTurno` ADD CONSTRAINT `ConsegnaTurno_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LetturaConsegna` ADD CONSTRAINT `LetturaConsegna_consegnaId_fkey` FOREIGN KEY (`consegnaId`) REFERENCES `ConsegnaTurno`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reclamo` ADD CONSTRAINT `Reclamo_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reclamo` ADD CONSTRAINT `Reclamo_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reclamo` ADD CONSTRAINT `Reclamo_ospiteId_fkey` FOREIGN KEY (`ospiteId`) REFERENCES `Ospite`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reclamo` ADD CONSTRAINT `Reclamo_abbuonoId_fkey` FOREIGN KEY (`abbuonoId`) REFERENCES `AddebitoConto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Nuovo permesso "Reclami" (modulo portineria) ai ruoli del front office.
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'reclami.gestisci')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception', 'Portiere', 'Portiere di notte') AND NOT JSON_CONTAINS(`permessi`, '"reclami.gestisci"');
