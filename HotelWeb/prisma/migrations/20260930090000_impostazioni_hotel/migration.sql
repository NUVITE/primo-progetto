-- Impostazioni dell'hotel: orari di check-in/out, trattamenti configurabili per hotel (prima scritti
-- nel codice in tre punti), nuovo permesso "hotel.configura" (dati struttura, trattamenti).

-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `orarioCheckIn` VARCHAR(191) NULL,
    ADD COLUMN `orarioCheckOut` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Trattamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `Trattamento_hotelId_nome_key`(`hotelId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Trattamento` ADD CONSTRAINT `Trattamento_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Dati: i trattamenti usati finora, per ogni hotel, più eventuali altri nomi già presenti nelle prenotazioni.
INSERT INTO `Trattamento` (`hotelId`, `nome`, `ordine`) SELECT `id`, 'B&B', 1 FROM `Hotel`;
INSERT INTO `Trattamento` (`hotelId`, `nome`, `ordine`) SELECT `id`, 'Mezza pensione', 2 FROM `Hotel`;
INSERT INTO `Trattamento` (`hotelId`, `nome`, `ordine`) SELECT `id`, 'Pensione completa', 3 FROM `Hotel`;
INSERT IGNORE INTO `Trattamento` (`hotelId`, `nome`, `ordine`)
SELECT DISTINCT p.`hotelId`, s.`trattamento`, 9 FROM `SegmentoSoggiorno` s JOIN `Prenotazione` p ON p.`id` = s.`prenotazioneId`;

-- Nuovo permesso ai ruoli Amministratore e Direttore già esistenti.
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'hotel.configura')
WHERE `nome` IN ('Amministratore', 'Direttore') AND NOT JSON_CONTAINS(`permessi`, '"hotel.configura"');
