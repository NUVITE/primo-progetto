-- Listino completo (approvato 2026-09-30): a camera o a persona, supplemento singola, supplementi
-- per trattamento, riduzioni per eta', condizioni di gruppo, composizione della camera, supplementi
-- a richiesta per notte/persona, letti aggiunti e animali per tipo camera.

-- AlterTable
ALTER TABLE `Listino` ADD COLUMN `categoria` VARCHAR(191) NULL,
    ADD COLUMN `gratuitaOgni` INTEGER NULL,
    ADD COLUMN `minPersone` INTEGER NULL,
    ADD COLUMN `modalita` VARCHAR(191) NOT NULL DEFAULT 'camera',
    ADD COLUMN `supplementoSingola` DECIMAL(10, 2) NULL,
    ADD COLUMN `supplementoSingolaPercentuale` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `NotteSoggiorno` ADD COLUMN `dettaglio` JSON NULL;

-- AlterTable
ALTER TABLE `SegmentoSoggiorno` ADD COLUMN `adulti` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `etaBambini` JSON NULL;

-- AlterTable
ALTER TABLE `ServizioAggiunto` ADD COLUMN `addebito` VARCHAR(191) NOT NULL DEFAULT 'una_tantum',
    ADD COLUMN `unita` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `ServizioCatalogo` ADD COLUMN `addebito` VARCHAR(191) NOT NULL DEFAULT 'una_tantum',
    ADD COLUMN `effetto` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TipoCamera` ADD COLUMN `animaliAmmessi` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lettiAggiuntiMax` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `SupplementoTrattamento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listinoId` INTEGER NOT NULL,
    `trattamentoId` INTEGER NOT NULL,
    `importo` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `SupplementoTrattamento_listinoId_trattamentoId_key`(`listinoId`, `trattamentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RiduzioneListino` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listinoId` INTEGER NOT NULL,
    `etaDa` INTEGER NOT NULL,
    `etaA` INTEGER NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `valore` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `dalTerzoLetto` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SupplementoTrattamento` ADD CONSTRAINT `SupplementoTrattamento_listinoId_fkey` FOREIGN KEY (`listinoId`) REFERENCES `Listino`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplementoTrattamento` ADD CONSTRAINT `SupplementoTrattamento_trattamentoId_fkey` FOREIGN KEY (`trattamentoId`) REFERENCES `Trattamento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RiduzioneListino` ADD CONSTRAINT `RiduzioneListino_listinoId_fkey` FOREIGN KEY (`listinoId`) REFERENCES `Listino`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Dati: la composizione delle camere gia' prenotate = persone registrate (almeno 1 adulto).
-- I prezzi gia' fissati non cambiano: si ricalcolano solo su richiesta.
UPDATE `SegmentoSoggiorno` s
SET s.`adulti` = GREATEST(1, (SELECT COUNT(*) FROM `Presenza` p WHERE p.`segmentoId` = s.`id`));
