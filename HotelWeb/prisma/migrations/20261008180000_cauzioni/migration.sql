-- AlterTable
ALTER TABLE `TipoCamera` ADD COLUMN `cauzione` DECIMAL(10, 2) NULL;

-- CreateTable
CREATE TABLE `Cauzione` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `prenotazioneId` INTEGER NOT NULL,
    `importo` DECIMAL(10, 2) NOT NULL,
    `metodo` VARCHAR(191) NOT NULL,
    `incassataIl` DATE NOT NULL,
    `incassataDa` VARCHAR(191) NOT NULL,
    `restituitaIl` DATE NULL,
    `restituitaDa` VARCHAR(191) NULL,
    `metodoRestituzione` VARCHAR(191) NULL,
    `importoRestituito` DECIMAL(10, 2) NULL,
    `trattenuta` DECIMAL(10, 2) NULL,
    `motivoTrattenuta` VARCHAR(191) NULL,
    `addebitoId` INTEGER NULL,
    `pagamentoId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Cauzione_prenotazioneId_key`(`prenotazioneId`),
    UNIQUE INDEX `Cauzione_addebitoId_key`(`addebitoId`),
    UNIQUE INDEX `Cauzione_pagamentoId_key`(`pagamentoId`),
    INDEX `Cauzione_hotelId_incassataIl_idx`(`hotelId`, `incassataIl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Cauzione` ADD CONSTRAINT `Cauzione_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cauzione` ADD CONSTRAINT `Cauzione_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cauzione` ADD CONSTRAINT `Cauzione_addebitoId_fkey` FOREIGN KEY (`addebitoId`) REFERENCES `AddebitoConto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cauzione` ADD CONSTRAINT `Cauzione_pagamentoId_fkey` FOREIGN KEY (`pagamentoId`) REFERENCES `Pagamento`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

