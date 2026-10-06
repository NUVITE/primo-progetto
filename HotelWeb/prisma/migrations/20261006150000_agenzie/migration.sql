-- AlterTable
ALTER TABLE `Prenotazione` ADD COLUMN `voucher` VARCHAR(191) NULL,
    ADD COLUMN `voucherCopre` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Allotment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `clienteId` INTEGER NOT NULL,
    `tipoCameraId` INTEGER NOT NULL,
    `dal` DATE NOT NULL,
    `al` DATE NOT NULL,
    `camere` INTEGER NOT NULL,
    `releaseGiorni` INTEGER NOT NULL DEFAULT 7,
    `note` VARCHAR(191) NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `creatoDa` VARCHAR(191) NOT NULL,

    INDEX `Allotment_hotelId_tipoCameraId_idx`(`hotelId`, `tipoCameraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Allotment` ADD CONSTRAINT `Allotment_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Allotment` ADD CONSTRAINT `Allotment_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `Cliente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Allotment` ADD CONSTRAINT `Allotment_tipoCameraId_fkey` FOREIGN KEY (`tipoCameraId`) REFERENCES `TipoCamera`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

