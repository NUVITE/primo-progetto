-- CreateTable
CREATE TABLE `ServizioPortineria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `prenotazioneId` INTEGER NULL,
    `destinatario` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `quando` DATETIME(3) NOT NULL,
    `persone` INTEGER NULL,
    `dettagli` TEXT NULL,
    `fornitore` VARCHAR(191) NULL,
    `riferimento` VARCHAR(191) NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'da_confermare',
    `nota` VARCHAR(191) NULL,
    `addebitoId` INTEGER NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creatoDa` VARCHAR(191) NOT NULL,
    `aggiornatoIl` DATETIME(3) NOT NULL,
    `aggiornatoDa` VARCHAR(191) NULL,

    UNIQUE INDEX `ServizioPortineria_addebitoId_key`(`addebitoId`),
    INDEX `ServizioPortineria_hotelId_quando_idx`(`hotelId`, `quando`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServizioPortineria` ADD CONSTRAINT `ServizioPortineria_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServizioPortineria` ADD CONSTRAINT `ServizioPortineria_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServizioPortineria` ADD CONSTRAINT `ServizioPortineria_addebitoId_fkey` FOREIGN KEY (`addebitoId`) REFERENCES `AddebitoConto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

