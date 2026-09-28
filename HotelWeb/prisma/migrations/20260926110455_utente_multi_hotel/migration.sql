/*
  Warnings:

  - You are about to drop the column `hotelId` on the `Utente` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Utente` DROP FOREIGN KEY `Utente_hotelId_fkey`;

-- DropIndex
DROP INDEX `Utente_hotelId_fkey` ON `Utente`;

-- AlterTable
ALTER TABLE `Utente` DROP COLUMN `hotelId`;

-- CreateTable
CREATE TABLE `_HotelToUtente` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_HotelToUtente_AB_unique`(`A`, `B`),
    INDEX `_HotelToUtente_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_HotelToUtente` ADD CONSTRAINT `_HotelToUtente_A_fkey` FOREIGN KEY (`A`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_HotelToUtente` ADD CONSTRAINT `_HotelToUtente_B_fkey` FOREIGN KEY (`B`) REFERENCES `Utente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
