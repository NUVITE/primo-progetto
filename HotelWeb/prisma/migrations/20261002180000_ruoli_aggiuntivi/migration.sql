-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `modalitaUtenti` VARCHAR(191) NOT NULL DEFAULT 'ruoli';

-- CreateTable
CREATE TABLE `RuoloAggiuntivo` (
    `utenteId` INTEGER NOT NULL,
    `hotelId` INTEGER NOT NULL,
    `ruoloId` INTEGER NOT NULL,

    INDEX `RuoloAggiuntivo_ruoloId_idx`(`ruoloId`),
    PRIMARY KEY (`utenteId`, `hotelId`, `ruoloId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RuoloAggiuntivo` ADD CONSTRAINT `RuoloAggiuntivo_utenteId_hotelId_fkey` FOREIGN KEY (`utenteId`, `hotelId`) REFERENCES `UtenteHotel`(`utenteId`, `hotelId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RuoloAggiuntivo` ADD CONSTRAINT `RuoloAggiuntivo_ruoloId_fkey` FOREIGN KEY (`ruoloId`) REFERENCES `Ruolo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

