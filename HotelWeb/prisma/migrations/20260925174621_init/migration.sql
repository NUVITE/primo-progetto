-- CreateTable
CREATE TABLE `Hotel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `comuneId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `categoria` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comune` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codiceIstat` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `provincia` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Comune_codiceIstat_key`(`codiceIstat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TipoCamera` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `codice` VARCHAR(191) NOT NULL,
    `descrizione` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `TipoCamera_hotelId_codice_key`(`hotelId`, `codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Camera` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `codice` VARCHAR(191) NOT NULL,
    `tipoCameraId` INTEGER NOT NULL,
    `piano` VARCHAR(191) NULL,
    `capienzaAdulti` INTEGER NOT NULL DEFAULT 2,
    `capienzaBambini` INTEGER NOT NULL DEFAULT 0,
    `attivo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `Camera_hotelId_codice_key`(`hotelId`, `codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ospite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cognome` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `dataNascita` DATE NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ospite_hotelId_cognome_nome_idx`(`hotelId`, `cognome`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Gruppo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Prenotazione` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `gruppoId` INTEGER NULL,
    `ospitePrenotanteId` INTEGER NOT NULL,
    `ospitePaganteId` INTEGER NULL,
    `canale` VARCHAR(191) NOT NULL DEFAULT 'diretta',
    `stato` ENUM('OPZIONE', 'CONFERMATA', 'ANNULLATA') NOT NULL DEFAULT 'OPZIONE',
    `accontoRichiesto` DECIMAL(10, 2) NULL,
    `accontoRicevuto` DECIMAL(10, 2) NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SegmentoSoggiorno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneId` INTEGER NOT NULL,
    `cameraId` INTEGER NOT NULL,
    `ospiteId` INTEGER NOT NULL,
    `trattamento` VARCHAR(191) NOT NULL DEFAULT 'Mezza pensione',
    `listinoId` INTEGER NOT NULL,
    `dataInizio` DATE NOT NULL,
    `dataFine` DATE NOT NULL,
    `stato` ENUM('PREVISTO', 'IN_CORSO', 'CONCLUSO', 'ANNULLATO') NOT NULL DEFAULT 'PREVISTO',
    `segmentoPrecedenteId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SegmentoSoggiorno_segmentoPrecedenteId_key`(`segmentoPrecedenteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotteSoggiorno` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `segmentoId` INTEGER NOT NULL,
    `data` DATE NOT NULL,
    `prezzo` DECIMAL(10, 2) NOT NULL,
    `motivoPrezzo` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `NotteSoggiorno_segmentoId_data_key`(`segmentoId`, `data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Listino` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `codice` VARCHAR(191) NOT NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'base',

    UNIQUE INDEX `Listino_hotelId_codice_key`(`hotelId`, `codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PeriodoTariffario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listinoId` INTEGER NOT NULL,
    `tipoCameraId` INTEGER NOT NULL,
    `dal` DATE NOT NULL,
    `al` DATE NOT NULL,
    `prezzoNotte` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegolamentoTassaComune` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `comuneId` INTEGER NOT NULL,
    `aliquota` DECIMAL(6, 2) NOT NULL,
    `tettoNotti` INTEGER NOT NULL,
    `tettoNottiTipo` VARCHAR(191) NOT NULL DEFAULT 'per_soggiorno',
    `validoDal` DATE NOT NULL,
    `validoAl` DATE NULL,
    `stagionalitaDal` VARCHAR(191) NULL,
    `stagionalitaAl` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MotivoEsenzioneTassa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `regolamentoId` INTEGER NOT NULL,
    `codice` VARCHAR(191) NOT NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `etaSoglia` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TassaNotte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `notteId` INTEGER NOT NULL,
    `regolamentoId` INTEGER NOT NULL,
    `importo` DECIMAL(6, 2) NOT NULL,
    `esente` BOOLEAN NOT NULL DEFAULT false,
    `motivoEsenzioneId` INTEGER NULL,

    UNIQUE INDEX `TassaNotte_notteId_key`(`notteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Hotel` ADD CONSTRAINT `Hotel_comuneId_fkey` FOREIGN KEY (`comuneId`) REFERENCES `Comune`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TipoCamera` ADD CONSTRAINT `TipoCamera_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Camera` ADD CONSTRAINT `Camera_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Camera` ADD CONSTRAINT `Camera_tipoCameraId_fkey` FOREIGN KEY (`tipoCameraId`) REFERENCES `TipoCamera`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ospite` ADD CONSTRAINT `Ospite_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Gruppo` ADD CONSTRAINT `Gruppo_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prenotazione` ADD CONSTRAINT `Prenotazione_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prenotazione` ADD CONSTRAINT `Prenotazione_gruppoId_fkey` FOREIGN KEY (`gruppoId`) REFERENCES `Gruppo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prenotazione` ADD CONSTRAINT `Prenotazione_ospitePrenotanteId_fkey` FOREIGN KEY (`ospitePrenotanteId`) REFERENCES `Ospite`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prenotazione` ADD CONSTRAINT `Prenotazione_ospitePaganteId_fkey` FOREIGN KEY (`ospitePaganteId`) REFERENCES `Ospite`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentoSoggiorno` ADD CONSTRAINT `SegmentoSoggiorno_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentoSoggiorno` ADD CONSTRAINT `SegmentoSoggiorno_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `Camera`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentoSoggiorno` ADD CONSTRAINT `SegmentoSoggiorno_ospiteId_fkey` FOREIGN KEY (`ospiteId`) REFERENCES `Ospite`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentoSoggiorno` ADD CONSTRAINT `SegmentoSoggiorno_listinoId_fkey` FOREIGN KEY (`listinoId`) REFERENCES `Listino`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentoSoggiorno` ADD CONSTRAINT `SegmentoSoggiorno_segmentoPrecedenteId_fkey` FOREIGN KEY (`segmentoPrecedenteId`) REFERENCES `SegmentoSoggiorno`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotteSoggiorno` ADD CONSTRAINT `NotteSoggiorno_segmentoId_fkey` FOREIGN KEY (`segmentoId`) REFERENCES `SegmentoSoggiorno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listino` ADD CONSTRAINT `Listino_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeriodoTariffario` ADD CONSTRAINT `PeriodoTariffario_listinoId_fkey` FOREIGN KEY (`listinoId`) REFERENCES `Listino`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeriodoTariffario` ADD CONSTRAINT `PeriodoTariffario_tipoCameraId_fkey` FOREIGN KEY (`tipoCameraId`) REFERENCES `TipoCamera`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegolamentoTassaComune` ADD CONSTRAINT `RegolamentoTassaComune_comuneId_fkey` FOREIGN KEY (`comuneId`) REFERENCES `Comune`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MotivoEsenzioneTassa` ADD CONSTRAINT `MotivoEsenzioneTassa_regolamentoId_fkey` FOREIGN KEY (`regolamentoId`) REFERENCES `RegolamentoTassaComune`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TassaNotte` ADD CONSTRAINT `TassaNotte_notteId_fkey` FOREIGN KEY (`notteId`) REFERENCES `NotteSoggiorno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TassaNotte` ADD CONSTRAINT `TassaNotte_regolamentoId_fkey` FOREIGN KEY (`regolamentoId`) REFERENCES `RegolamentoTassaComune`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TassaNotte` ADD CONSTRAINT `TassaNotte_motivoEsenzioneId_fkey` FOREIGN KEY (`motivoEsenzioneId`) REFERENCES `MotivoEsenzioneTassa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
