-- AlterTable
ALTER TABLE `EmailInviata` ADD COLUMN `richiestaId` INTEGER NULL;

-- CreateTable
CREATE TABLE `RichiestaDisponibilita` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `canale` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `cognome` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `lingua` VARCHAR(191) NOT NULL DEFAULT 'it',
    `dal` DATE NOT NULL,
    `al` DATE NOT NULL,
    `adulti` INTEGER NOT NULL,
    `etaBambini` JSON NOT NULL,
    `camere` INTEGER NOT NULL DEFAULT 1,
    `trattamento` VARCHAR(191) NULL,
    `budget` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'nuova',
    `motivoRinuncia` VARCHAR(191) NULL,
    `creataIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creataDa` VARCHAR(191) NOT NULL,
    `prenotazioneId` INTEGER NULL,

    INDEX `RichiestaDisponibilita_hotelId_stato_idx`(`hotelId`, `stato`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Preventivo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `richiestaId` INTEGER NOT NULL,
    `codice` VARCHAR(191) NOT NULL,
    `validoFino` DATE NOT NULL,
    `accontoRichiesto` DECIMAL(10, 2) NULL,
    `messaggio` TEXT NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'bozza',
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creatoDa` VARCHAR(191) NOT NULL,
    `inviatoIl` DATETIME(3) NULL,
    `vistoIl` DATETIME(3) NULL,
    `rispostaIl` DATETIME(3) NULL,
    `propostaAccettataId` INTEGER NULL,
    `motivoRifiuto` VARCHAR(191) NULL,
    `daVedere` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Preventivo_codice_key`(`codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropostaPreventivo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `preventivoId` INTEGER NOT NULL,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `tipoCameraId` INTEGER NOT NULL,
    `listinoId` INTEGER NOT NULL,
    `trattamento` VARCHAR(191) NOT NULL,
    `prezzoCalcolato` DECIMAL(10, 2) NOT NULL,
    `prezzo` DECIMAL(10, 2) NOT NULL,
    `nota` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmailInviata` ADD CONSTRAINT `EmailInviata_richiestaId_fkey` FOREIGN KEY (`richiestaId`) REFERENCES `RichiestaDisponibilita`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RichiestaDisponibilita` ADD CONSTRAINT `RichiestaDisponibilita_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RichiestaDisponibilita` ADD CONSTRAINT `RichiestaDisponibilita_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Preventivo` ADD CONSTRAINT `Preventivo_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Preventivo` ADD CONSTRAINT `Preventivo_richiestaId_fkey` FOREIGN KEY (`richiestaId`) REFERENCES `RichiestaDisponibilita`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropostaPreventivo` ADD CONSTRAINT `PropostaPreventivo_preventivoId_fkey` FOREIGN KEY (`preventivoId`) REFERENCES `Preventivo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropostaPreventivo` ADD CONSTRAINT `PropostaPreventivo_tipoCameraId_fkey` FOREIGN KEY (`tipoCameraId`) REFERENCES `TipoCamera`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropostaPreventivo` ADD CONSTRAINT `PropostaPreventivo_listinoId_fkey` FOREIGN KEY (`listinoId`) REFERENCES `Listino`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

