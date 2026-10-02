-- AlterTable
ALTER TABLE `Pagamento` ADD COLUMN `hotelId` INTEGER NULL,
    ADD COLUMN `prenotazioneSalaId` INTEGER NULL,
    MODIFY `prenotazioneId` INTEGER NULL;

-- Pagamenti esistenti: l'hotel e' quello della prenotazione.
UPDATE `Pagamento` pg JOIN `Prenotazione` p ON p.id = pg.prenotazioneId SET pg.hotelId = p.hotelId;
ALTER TABLE `Pagamento` MODIFY `hotelId` INTEGER NOT NULL;
-- CreateTable
CREATE TABLE `ChiusuraCassa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `giorno` DATE NOT NULL,
    `totali` JSON NOT NULL,
    `totale` DECIMAL(10, 2) NOT NULL,
    `fondoIniziale` DECIMAL(10, 2) NULL,
    `contantiContati` DECIMAL(10, 2) NULL,
    `fondoLasciato` DECIMAL(10, 2) NULL,
    `nota` TEXT NULL,
    `chiusaDa` VARCHAR(191) NOT NULL,
    `chiusaIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `ChiusuraCassa_hotelId_giorno_key`(`hotelId`, `giorno`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CreateIndex
CREATE INDEX `Pagamento_prenotazioneSalaId_idx` ON `Pagamento`(`prenotazioneSalaId`);
-- CreateIndex
CREATE INDEX `Pagamento_hotelId_data_idx` ON `Pagamento`(`hotelId`, `data`);
-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_prenotazioneSalaId_fkey` FOREIGN KEY (`prenotazioneSalaId`) REFERENCES `PrenotazioneSala`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `ChiusuraCassa` ADD CONSTRAINT `ChiusuraCassa_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Nuovo permesso "Chiusura di cassa" ai ruoli Amministratore, Direttore e Reception.
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'cassa.chiudi')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"cassa.chiudi"');
