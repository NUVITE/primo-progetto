-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `linkRecensioni` VARCHAR(191) NULL,
    ADD COLUMN `ringraziamentoAuto` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `Questionario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `prenotazioneId` INTEGER NOT NULL,
    `ospiteId` INTEGER NULL,
    `codice` VARCHAR(191) NOT NULL,
    `lingua` VARCHAR(191) NOT NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `compilatoIl` DATETIME(3) NULL,
    `generale` INTEGER NULL,
    `voti` JSON NULL,
    `consiglia` BOOLEAN NULL,
    `commento` TEXT NULL,
    `lettoIl` DATETIME(3) NULL,
    `lettoDa` VARCHAR(191) NULL,

    UNIQUE INDEX `Questionario_prenotazioneId_key`(`prenotazioneId`),
    UNIQUE INDEX `Questionario_codice_key`(`codice`),
    INDEX `Questionario_hotelId_compilatoIl_idx`(`hotelId`, `compilatoIl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Questionario` ADD CONSTRAINT `Questionario_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Questionario` ADD CONSTRAINT `Questionario_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Questionario` ADD CONSTRAINT `Questionario_ospiteId_fkey` FOREIGN KEY (`ospiteId`) REFERENCES `Ospite`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Nuovo permesso "Vedere i questionari".
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'questionari.vedi')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"questionari.vedi"');
