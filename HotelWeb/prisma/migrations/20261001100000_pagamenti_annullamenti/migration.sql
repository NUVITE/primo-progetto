-- Nucleo prenotazioni (2026-10-01): conferma/annullamento con motivo e penale, scadenza opzione e
-- acconto, pagamenti con storno, giorni di opzione proposti per hotel, permesso pagamenti.registra.

-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `giorniOpzione` INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE `Prenotazione` ADD COLUMN `accontoEntro` DATE NULL,
    ADD COLUMN `annullataDa` VARCHAR(191) NULL,
    ADD COLUMN `annullataIl` DATETIME(3) NULL,
    ADD COLUMN `confermataIl` DATETIME(3) NULL,
    ADD COLUMN `motivoAnnullamento` VARCHAR(191) NULL,
    ADD COLUMN `notaAnnullamento` VARCHAR(191) NULL,
    ADD COLUMN `penale` DECIMAL(10, 2) NULL,
    ADD COLUMN `scadenzaOpzione` DATE NULL;

-- CreateTable
CREATE TABLE `Pagamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneId` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `importo` DECIMAL(10, 2) NOT NULL,
    `metodo` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `nota` VARCHAR(191) NULL,
    `registratoDa` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `stornatoIl` DATETIME(3) NULL,
    `stornatoDa` VARCHAR(191) NULL,
    `motivoStorno` VARCHAR(191) NULL,

    INDEX `Pagamento_prenotazioneId_idx`(`prenotazioneId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pagamento` ADD CONSTRAINT `Pagamento_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Nuovo permesso "Registrare pagamenti" ai ruoli che gestiscono la cassa.
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'pagamenti.registra')
WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"pagamenti.registra"');

-- L'acconto gia' segnato come ricevuto diventa un pagamento (registrato dal sistema).
INSERT INTO `Pagamento` (`prenotazioneId`, `data`, `importo`, `metodo`, `tipo`, `nota`, `registratoDa`)
SELECT `id`, DATE(`createdAt`), `accontoRicevuto`, 'altro', 'acconto', 'Acconto ricevuto (dato precedente)', 'Sistema'
FROM `Prenotazione` WHERE `accontoRicevuto` IS NOT NULL AND `accontoRicevuto` > 0;
