-- Modulo Sale ed eventi (approvato il 2026-09-30): clienti/aziende, fasce orarie dell'hotel, sale con
-- allestimenti e tariffe (per fascia + oraria), prenotazioni di sala con occupazioni e servizi.

-- CreateTable
CREATE TABLE `Cliente` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'azienda',
    `denominazione` VARCHAR(191) NOT NULL,
    `partitaIva` VARCHAR(191) NULL,
    `codiceFiscale` VARCHAR(191) NULL,
    `indirizzo` VARCHAR(191) NULL,
    `cap` VARCHAR(191) NULL,
    `comune` VARCHAR(191) NULL,
    `provincia` VARCHAR(2) NULL,
    `referente` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `pec` VARCHAR(191) NULL,
    `codiceDestinatario` VARCHAR(7) NULL,
    `note` TEXT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FasciaOraria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `inizio` VARCHAR(5) NOT NULL,
    `fine` VARCHAR(5) NOT NULL,
    `mostraNelPlanning` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `FasciaOraria_hotelId_nome_key`(`hotelId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sala` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descrizione` VARCHAR(191) NULL,
    `capienzaMax` INTEGER NULL,
    `riassettoMinuti` INTEGER NOT NULL DEFAULT 0,
    `prezzoOrario` DECIMAL(10, 2) NULL,
    `attiva` BOOLEAN NOT NULL DEFAULT true,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Sala_hotelId_nome_key`(`hotelId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AllestimentoSala` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salaId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `capienza` INTEGER NOT NULL,
    `costo` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `attivo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `AllestimentoSala_salaId_nome_key`(`salaId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrezzoFasciaSala` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `salaId` INTEGER NOT NULL,
    `fasciaId` INTEGER NOT NULL,
    `prezzo` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `PrezzoFasciaSala_salaId_fasciaId_key`(`salaId`, `fasciaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PrenotazioneSala` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `clienteId` INTEGER NULL,
    `prenotazioneId` INTEGER NULL,
    `titolo` VARCHAR(191) NOT NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'opzione',
    `scadenzaOpzione` DATE NULL,
    `partecipanti` INTEGER NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OccupazioneSala` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneSalaId` INTEGER NOT NULL,
    `salaId` INTEGER NOT NULL,
    `inizio` DATETIME(3) NOT NULL,
    `fine` DATETIME(3) NOT NULL,
    `fasciaId` INTEGER NULL,
    `allestimentoId` INTEGER NULL,
    `partecipanti` INTEGER NULL,
    `prezzo` DECIMAL(10, 2) NOT NULL,
    `prezzoManuale` BOOLEAN NOT NULL DEFAULT false,
    `costoAllestimento` DECIMAL(10, 2) NOT NULL DEFAULT 0,

    INDEX `OccupazioneSala_salaId_inizio_idx`(`salaId`, `inizio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServizioSala` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneSalaId` INTEGER NOT NULL,
    `servizioCatalogoId` INTEGER NULL,
    `descrizione` VARCHAR(191) NULL,
    `prezzoUnitario` DECIMAL(10, 2) NOT NULL,
    `quantita` INTEGER NOT NULL DEFAULT 1,
    `data` DATE NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cliente` ADD CONSTRAINT `Cliente_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FasciaOraria` ADD CONSTRAINT `FasciaOraria_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sala` ADD CONSTRAINT `Sala_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AllestimentoSala` ADD CONSTRAINT `AllestimentoSala_salaId_fkey` FOREIGN KEY (`salaId`) REFERENCES `Sala`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrezzoFasciaSala` ADD CONSTRAINT `PrezzoFasciaSala_salaId_fkey` FOREIGN KEY (`salaId`) REFERENCES `Sala`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrezzoFasciaSala` ADD CONSTRAINT `PrezzoFasciaSala_fasciaId_fkey` FOREIGN KEY (`fasciaId`) REFERENCES `FasciaOraria`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrenotazioneSala` ADD CONSTRAINT `PrenotazioneSala_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrenotazioneSala` ADD CONSTRAINT `PrenotazioneSala_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrenotazioneSala` ADD CONSTRAINT `PrenotazioneSala_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OccupazioneSala` ADD CONSTRAINT `OccupazioneSala_prenotazioneSalaId_fkey` FOREIGN KEY (`prenotazioneSalaId`) REFERENCES `PrenotazioneSala`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OccupazioneSala` ADD CONSTRAINT `OccupazioneSala_salaId_fkey` FOREIGN KEY (`salaId`) REFERENCES `Sala`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OccupazioneSala` ADD CONSTRAINT `OccupazioneSala_fasciaId_fkey` FOREIGN KEY (`fasciaId`) REFERENCES `FasciaOraria`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OccupazioneSala` ADD CONSTRAINT `OccupazioneSala_allestimentoId_fkey` FOREIGN KEY (`allestimentoId`) REFERENCES `AllestimentoSala`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServizioSala` ADD CONSTRAINT `ServizioSala_prenotazioneSalaId_fkey` FOREIGN KEY (`prenotazioneSalaId`) REFERENCES `PrenotazioneSala`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServizioSala` ADD CONSTRAINT `ServizioSala_servizioCatalogoId_fkey` FOREIGN KEY (`servizioCatalogoId`) REFERENCES `ServizioCatalogo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Dati: fasce orarie predefinite per ogni hotel (modificabili da Impostazioni > Sale).
INSERT INTO `FasciaOraria` (`hotelId`, `nome`, `inizio`, `fine`, `mostraNelPlanning`, `ordine`) SELECT `id`, 'Mattina', '08:00', '13:00', true, 1 FROM `Hotel`;
INSERT INTO `FasciaOraria` (`hotelId`, `nome`, `inizio`, `fine`, `mostraNelPlanning`, `ordine`) SELECT `id`, 'Pomeriggio', '14:00', '19:00', true, 2 FROM `Hotel`;
INSERT INTO `FasciaOraria` (`hotelId`, `nome`, `inizio`, `fine`, `mostraNelPlanning`, `ordine`) SELECT `id`, 'Sera', '19:00', '24:00', true, 3 FROM `Hotel`;
INSERT INTO `FasciaOraria` (`hotelId`, `nome`, `inizio`, `fine`, `mostraNelPlanning`, `ordine`) SELECT `id`, 'Giornata intera', '08:00', '19:00', false, 4 FROM `Hotel`;
