-- AlterTable
ALTER TABLE `SegmentoSoggiorno` ADD COLUMN `codiceRoomService` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `OrdineRoomService` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `segmentoId` INTEGER NOT NULL,
    `stato` VARCHAR(191) NOT NULL DEFAULT 'ricevuto',
    `canale` VARCHAR(191) NOT NULL DEFAULT 'qr',
    `perQuando` DATETIME(3) NULL,
    `nota` TEXT NULL,
    `totale` DECIMAL(10, 2) NOT NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creatoDa` VARCHAR(191) NULL,
    `aggiornatoIl` DATETIME(3) NOT NULL,
    `aggiornatoDa` VARCHAR(191) NULL,
    `consegnatoIl` DATETIME(3) NULL,
    `motivoAnnullato` VARCHAR(191) NULL,

    INDEX `OrdineRoomService_hotelId_stato_idx`(`hotelId`, `stato`),
    INDEX `OrdineRoomService_segmentoId_idx`(`segmentoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RigaOrdineRoomService` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ordineId` INTEGER NOT NULL,
    `piattoId` INTEGER NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `quantita` INTEGER NOT NULL,
    `prezzoUnitario` DECIMAL(10, 2) NOT NULL,
    `repartoId` INTEGER NULL,
    `allergeni` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `SegmentoSoggiorno_codiceRoomService_key` ON `SegmentoSoggiorno`(`codiceRoomService`);

-- AddForeignKey
ALTER TABLE `OrdineRoomService` ADD CONSTRAINT `OrdineRoomService_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrdineRoomService` ADD CONSTRAINT `OrdineRoomService_segmentoId_fkey` FOREIGN KEY (`segmentoId`) REFERENCES `SegmentoSoggiorno`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RigaOrdineRoomService` ADD CONSTRAINT `RigaOrdineRoomService_ordineId_fkey` FOREIGN KEY (`ordineId`) REFERENCES `OrdineRoomService`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RigaOrdineRoomService` ADD CONSTRAINT `RigaOrdineRoomService_piattoId_fkey` FOREIGN KEY (`piattoId`) REFERENCES `Piatto`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Nuovo permesso "Room service" (vale solo con il modulo Ristorazione attivo).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'ristorazione.roomservice')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception', 'Cucina', 'Sala') AND NOT JSON_CONTAINS(`permessi`, '"ristorazione.roomservice"');

-- Ruolo "Room service" (chi porta gli ordini in camera) per gli hotel che non lo hanno.
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `createdAt`, `updatedAt`)
SELECT h.id, 'Room service', JSON_ARRAY('ristorazione.roomservice'), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Hotel` h WHERE NOT EXISTS (SELECT 1 FROM `Ruolo` x WHERE x.hotelId = h.id AND x.nome = 'Room service');
