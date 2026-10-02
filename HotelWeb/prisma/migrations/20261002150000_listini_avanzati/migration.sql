-- AlterTable
ALTER TABLE `Listino` ADD COLUMN `giorniWeekend` JSON NULL;

-- AlterTable
ALTER TABLE `PeriodoTariffario` ADD COLUMN `prezzoWeekend` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `SegmentoSoggiorno` ADD COLUMN `prezzoConcordato` DECIMAL(10, 2) NULL,
    ADD COLUMN `prezzoConcordatoDa` VARCHAR(191) NULL,
    ADD COLUMN `prezzoConcordatoNota` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `SupplementoStagionale` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listinoId` INTEGER NOT NULL,
    `trattamentoId` INTEGER NOT NULL,
    `dal` DATE NOT NULL,
    `al` DATE NOT NULL,
    `importo` DECIMAL(10, 2) NOT NULL,

    INDEX `SupplementoStagionale_listinoId_trattamentoId_dal_idx`(`listinoId`, `trattamentoId`, `dal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SupplementoStagionale` ADD CONSTRAINT `SupplementoStagionale_listinoId_fkey` FOREIGN KEY (`listinoId`) REFERENCES `Listino`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplementoStagionale` ADD CONSTRAINT `SupplementoStagionale_trattamentoId_fkey` FOREIGN KEY (`trattamentoId`) REFERENCES `Trattamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Nuovo permesso "Modificare i prezzi" ai ruoli Amministratore e Direttore di ogni hotel.
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'prezzi.modifica')
  WHERE `nome` IN ('Amministratore', 'Direttore') AND NOT JSON_CONTAINS(`permessi`, '"prezzi.modifica"');
