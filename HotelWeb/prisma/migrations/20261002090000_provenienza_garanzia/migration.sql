-- AlterTable
ALTER TABLE `Cliente` ADD COLUMN `commissione` DECIMAL(5, 2) NULL;

-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `orarioLimiteArrivo` VARCHAR(191) NOT NULL DEFAULT '18:00';

-- AlterTable
ALTER TABLE `Listino` ADD COLUMN `politicaId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Prenotazione` ADD COLUMN `clientePaganteId` INTEGER NULL,
    ADD COLUMN `garanzia` VARCHAR(191) NOT NULL DEFAULT 'nessuna',
    ADD COLUMN `intermediarioId` INTEGER NULL,
    ADD COLUMN `mezzo` VARCHAR(191) NULL,
    ADD COLUMN `oraArrivo` VARCHAR(191) NULL,
    ADD COLUMN `politica` JSON NULL,
    ADD COLUMN `politicaId` INTEGER NULL;

-- CreateTable
CREATE TABLE `PoliticaCancellazione` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `scaglioni` JSON NOT NULL,
    `noShow` JSON NOT NULL,
    `predefinita` BOOLEAN NOT NULL DEFAULT false,
    `attiva` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Prenotazione` ADD CONSTRAINT `Prenotazione_intermediarioId_fkey` FOREIGN KEY (`intermediarioId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prenotazione` ADD CONSTRAINT `Prenotazione_clientePaganteId_fkey` FOREIGN KEY (`clientePaganteId`) REFERENCES `Cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Listino` ADD CONSTRAINT `Listino_politicaId_fkey` FOREIGN KEY (`politicaId`) REFERENCES `PoliticaCancellazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PoliticaCancellazione` ADD CONSTRAINT `PoliticaCancellazione_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

