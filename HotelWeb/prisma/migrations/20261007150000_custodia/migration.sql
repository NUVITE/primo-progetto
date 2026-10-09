-- AlterTable
ALTER TABLE `SegmentoSoggiorno` ADD COLUMN `chiaviConsegnate` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `chiaviRestituite` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `DepositoBagagli` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `prenotazioneId` INTEGER NULL,
    `nome` VARCHAR(191) NOT NULL,
    `colli` INTEGER NOT NULL,
    `descrizione` VARCHAR(191) NULL,
    `posizione` VARCHAR(191) NULL,
    `depositatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `depositatoDa` VARCHAR(191) NOT NULL,
    `ritiratoIl` DATETIME(3) NULL,
    `ritiratoDa` VARCHAR(191) NULL,
    `ritiroNota` VARCHAR(191) NULL,

    UNIQUE INDEX `DepositoBagagli_hotelId_numero_key`(`hotelId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustodiaValori` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `numero` INTEGER NOT NULL,
    `prenotazioneId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `camera` VARCHAR(191) NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `creataIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creataDa` VARCHAR(191) NOT NULL,
    `chiusaIl` DATETIME(3) NULL,
    `chiusaDa` VARCHAR(191) NULL,

    UNIQUE INDEX `CustodiaValori_hotelId_numero_key`(`hotelId`, `numero`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MovimentoValori` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `custodiaId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descrizione` VARCHAR(191) NULL,
    `importo` DECIMAL(10, 2) NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `registratoDa` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DepositoBagagli` ADD CONSTRAINT `DepositoBagagli_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DepositoBagagli` ADD CONSTRAINT `DepositoBagagli_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustodiaValori` ADD CONSTRAINT `CustodiaValori_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustodiaValori` ADD CONSTRAINT `CustodiaValori_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MovimentoValori` ADD CONSTRAINT `MovimentoValori_custodiaId_fkey` FOREIGN KEY (`custodiaId`) REFERENCES `CustodiaValori`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

