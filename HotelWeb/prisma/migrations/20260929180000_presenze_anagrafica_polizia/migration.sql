-- Fase 2 (check-in), modello approvato il 2026-09-29.
-- La camera prenotata (SegmentoSoggiorno) resta l'unità di prezzo; le PERSONE nella camera diventano
-- Presenze e la tassa di soggiorno si calcola per persona. Anagrafica ospite completa per schedina PS
-- e ISTAT, tabelle ufficiali Polizia, sistema ISTAT dell'hotel.
-- Scritta a mano: il diff automatico proponeva di ricreare un vincolo già esistente
-- (DichiarazioneTassa_posizioneId_fkey) e dimenticava di ricreare TassaNotte_notteId_fkey.

-- La tassa per notte è una cache ricalcolabile (scripts/ricalcola-tasse.ts, lanciato dal deploy):
-- si svuota perché d'ora in poi ogni riga appartiene a una persona.
DELETE FROM `TassaNotte`;

-- TassaNotte: la notte non è più unica (una riga per persona presente)
ALTER TABLE `TassaNotte` DROP FOREIGN KEY `TassaNotte_notteId_fkey`;
DROP INDEX `TassaNotte_notteId_key` ON `TassaNotte`;
ALTER TABLE `TassaNotte` ADD COLUMN `presenzaId` INTEGER NOT NULL;
CREATE INDEX `TassaNotte_notteId_idx` ON `TassaNotte`(`notteId`);
CREATE UNIQUE INDEX `TassaNotte_presenzaId_notteId_key` ON `TassaNotte`(`presenzaId`, `notteId`);

-- Hotel: sistema ISTAT regionale
ALTER TABLE `Hotel` ADD COLUMN `sistemaIstat` VARCHAR(191) NULL;

-- Ospite: anagrafica per Alloggiati Web e ISTAT
ALTER TABLE `Ospite` ADD COLUMN `cittadinanzaCodice` VARCHAR(9) NULL,
    ADD COLUMN `comuneNascitaCodice` VARCHAR(9) NULL,
    ADD COLUMN `documentoNumero` VARCHAR(20) NULL,
    ADD COLUMN `documentoRilascioCodice` VARCHAR(9) NULL,
    ADD COLUMN `documentoTipoCodice` VARCHAR(5) NULL,
    ADD COLUMN `residenzaComuneCodice` VARCHAR(9) NULL,
    ADD COLUMN `residenzaStatoCodice` VARCHAR(9) NULL,
    ADD COLUMN `sesso` CHAR(1) NULL,
    ADD COLUMN `statoNascitaCodice` VARCHAR(9) NULL;

-- CreateTable
CREATE TABLE `Presenza` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `segmentoId` INTEGER NOT NULL,
    `ospiteId` INTEGER NOT NULL,
    `dal` DATE NULL,
    `al` DATE NULL,
    `tipoAlloggiato` INTEGER NULL,
    `capoOspiteId` INTEGER NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'attesa',
    `arrivoIl` DATETIME(3) NULL,
    `partenzaIl` DATETIME(3) NULL,
    `occupaPostoLetto` BOOLEAN NOT NULL DEFAULT true,
    `motivoViaggio` VARCHAR(191) NULL,
    `mezzoArrivo` VARCHAR(191) NULL,
    `mezzoMovimento` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Presenza_segmentoId_ospiteId_key`(`segmentoId`, `ospiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LuogoPolizia` (
    `codice` VARCHAR(9) NOT NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `provincia` VARCHAR(2) NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `dataFineVal` DATETIME(3) NULL,
    `aggiornatoIl` DATETIME(3) NOT NULL,

    INDEX `LuogoPolizia_descrizione_idx`(`descrizione`),
    PRIMARY KEY (`codice`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentoPolizia` (
    `codice` VARCHAR(5) NOT NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `aggiornatoIl` DATETIME(3) NOT NULL,

    PRIMARY KEY (`codice`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TassaNotte` ADD CONSTRAINT `TassaNotte_notteId_fkey` FOREIGN KEY (`notteId`) REFERENCES `NotteSoggiorno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `TassaNotte` ADD CONSTRAINT `TassaNotte_presenzaId_fkey` FOREIGN KEY (`presenzaId`) REFERENCES `Presenza`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Presenza` ADD CONSTRAINT `Presenza_segmentoId_fkey` FOREIGN KEY (`segmentoId`) REFERENCES `SegmentoSoggiorno`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Presenza` ADD CONSTRAINT `Presenza_ospiteId_fkey` FOREIGN KEY (`ospiteId`) REFERENCES `Ospite`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Dati: ogni camera prenotata esistente ha come unica occupante l'intestataria (come prima).
INSERT INTO `Presenza` (`segmentoId`, `ospiteId`, `stato`, `occupaPostoLetto`, `updatedAt`)
SELECT `id`, `ospiteId`, 'attesa', true, CURRENT_TIMESTAMP(3) FROM `SegmentoSoggiorno`;
