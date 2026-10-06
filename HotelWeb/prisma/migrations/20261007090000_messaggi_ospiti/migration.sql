-- CreateTable
CREATE TABLE `MessaggioOspite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `prenotazioneId` INTEGER NULL,
    `ospiteId` INTEGER NULL,
    `destinatario` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `daChi` VARCHAR(191) NULL,
    `modo` VARCHAR(191) NULL,
    `recapito` VARCHAR(191) NULL,
    `testo` TEXT NULL,
    `urgente` BOOLEAN NOT NULL DEFAULT false,
    `doveRiposto` VARCHAR(191) NULL,
    `ricevutoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ricevutoDa` VARCHAR(191) NOT NULL,
    `consegnatoIl` DATETIME(3) NULL,
    `consegnatoDa` VARCHAR(191) NULL,
    `consegnaModo` VARCHAR(191) NULL,
    `consegnaNota` VARCHAR(191) NULL,

    INDEX `MessaggioOspite_hotelId_consegnatoIl_idx`(`hotelId`, `consegnatoIl`),
    INDEX `MessaggioOspite_prenotazioneId_idx`(`prenotazioneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MessaggioOspite` ADD CONSTRAINT `MessaggioOspite_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessaggioOspite` ADD CONSTRAINT `MessaggioOspite_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessaggioOspite` ADD CONSTRAINT `MessaggioOspite_ospiteId_fkey` FOREIGN KEY (`ospiteId`) REFERENCES `Ospite`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Nuovo permesso "Portineria" (modulo portineria) ai ruoli che gestiscono il front office.
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'portineria.gestisci')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"portineria.gestisci"');

-- Nuovi ruoli predefiniti: Portiere e Portiere di notte (che incassa anche di notte).
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `createdAt`, `updatedAt`)
SELECT h.id, 'Portiere', JSON_ARRAY('prenotazioni.vedi', 'portineria.gestisci', 'addebiti.registra', 'manutenzioni.segnala', 'pulizie.oggetti'), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Hotel` h WHERE NOT EXISTS (SELECT 1 FROM `Ruolo` x WHERE x.hotelId = h.id AND x.nome = 'Portiere');
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `createdAt`, `updatedAt`)
SELECT h.id, 'Portiere di notte', JSON_ARRAY('prenotazioni.vedi', 'portineria.gestisci', 'addebiti.registra', 'pagamenti.registra', 'importi.vedi', 'manutenzioni.segnala', 'pulizie.oggetti'), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Hotel` h WHERE NOT EXISTS (SELECT 1 FROM `Ruolo` x WHERE x.hotelId = h.id AND x.nome = 'Portiere di notte');
