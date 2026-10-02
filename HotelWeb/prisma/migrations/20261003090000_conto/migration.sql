-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `aliquotaAlloggio` DECIMAL(4, 2) NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE `ServizioAggiunto` ADD COLUMN `aliquotaIva` DECIMAL(4, 2) NULL;

-- AlterTable
ALTER TABLE `ServizioCatalogo` ADD COLUMN `aliquotaIva` DECIMAL(4, 2) NULL;

-- CreateTable
CREATE TABLE `RepartoAddebito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `aliquotaIva` DECIMAL(4, 2) NULL,
    `esborso` BOOLEAN NOT NULL DEFAULT false,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `RepartoAddebito_hotelId_nome_key`(`hotelId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AddebitoConto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneId` INTEGER NOT NULL,
    `segmentoId` INTEGER NULL,
    `repartoId` INTEGER NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'extra',
    `data` DATE NOT NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `quantita` INTEGER NOT NULL DEFAULT 1,
    `prezzoUnitario` DECIMAL(10, 2) NOT NULL,
    `aliquotaIva` DECIMAL(4, 2) NULL,
    `buono` VARCHAR(191) NULL,
    `nota` VARCHAR(191) NULL,
    `registratoDa` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `stornatoIl` DATETIME(3) NULL,
    `stornatoDa` VARCHAR(191) NULL,
    `motivoStorno` VARCHAR(191) NULL,

    INDEX `AddebitoConto_prenotazioneId_idx`(`prenotazioneId`),
    INDEX `AddebitoConto_data_idx`(`data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RepartoAddebito` ADD CONSTRAINT `RepartoAddebito_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AddebitoConto` ADD CONSTRAINT `AddebitoConto_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AddebitoConto` ADD CONSTRAINT `AddebitoConto_segmentoId_fkey` FOREIGN KEY (`segmentoId`) REFERENCES `SegmentoSoggiorno`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AddebitoConto` ADD CONSTRAINT `AddebitoConto_repartoId_fkey` FOREIGN KEY (`repartoId`) REFERENCES `RepartoAddebito`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Reparti iniziali per ogni hotel (aliquote di partenza DA VERIFICARE con il commercialista).
INSERT INTO `RepartoAddebito` (`hotelId`, `nome`, `aliquotaIva`, `esborso`, `ordine`)
SELECT h.id, r.nome, r.aliquota, r.esborso, r.ordine FROM `Hotel` h
CROSS JOIN (
  SELECT 'Bar' AS nome, 10.00 AS aliquota, 0 AS esborso, 1 AS ordine
  UNION ALL SELECT 'Ristorante', 10.00, 0, 2
  UNION ALL SELECT 'Frigobar', 10.00, 0, 3
  UNION ALL SELECT 'Lavanderia', 22.00, 0, 4
  UNION ALL SELECT 'Garage', 22.00, 0, 5
  UNION ALL SELECT 'Telefono', 22.00, 0, 6
  UNION ALL SELECT 'Esborsi (spese anticipate)', NULL, 1, 7
) r;

-- Nuovo permesso "Registrare addebiti" ai ruoli Amministratore, Direttore e Reception.
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'addebiti.registra')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"addebiti.registra"');
