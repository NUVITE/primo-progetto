-- CreateTable
CREATE TABLE `ServizioCatalogo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `prezzo` DECIMAL(10, 2) NOT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServizioAggiunto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneId` INTEGER NOT NULL,
    `servizioCatalogoId` INTEGER NULL,
    `descrizione` VARCHAR(191) NULL,
    `prezzoUnitario` DECIMAL(10, 2) NOT NULL,
    `quantita` INTEGER NOT NULL DEFAULT 1,
    `data` DATE NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServizioAggiuntoSegmento` (
    `servizioAggiuntoId` INTEGER NOT NULL,
    `segmentoId` INTEGER NOT NULL,

    PRIMARY KEY (`servizioAggiuntoId`, `segmentoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServizioCatalogo` ADD CONSTRAINT `ServizioCatalogo_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServizioAggiunto` ADD CONSTRAINT `ServizioAggiunto_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServizioAggiunto` ADD CONSTRAINT `ServizioAggiunto_servizioCatalogoId_fkey` FOREIGN KEY (`servizioCatalogoId`) REFERENCES `ServizioCatalogo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServizioAggiuntoSegmento` ADD CONSTRAINT `ServizioAggiuntoSegmento_servizioAggiuntoId_fkey` FOREIGN KEY (`servizioAggiuntoId`) REFERENCES `ServizioAggiunto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServizioAggiuntoSegmento` ADD CONSTRAINT `ServizioAggiuntoSegmento_segmentoId_fkey` FOREIGN KEY (`segmentoId`) REFERENCES `SegmentoSoggiorno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
