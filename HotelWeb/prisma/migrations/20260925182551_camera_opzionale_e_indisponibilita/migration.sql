/*
  Warnings:

  - Added the required column `tipoCameraId` to the `SegmentoSoggiorno` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `SegmentoSoggiorno` DROP FOREIGN KEY `SegmentoSoggiorno_cameraId_fkey`;

-- DropIndex
DROP INDEX `SegmentoSoggiorno_cameraId_fkey` ON `SegmentoSoggiorno`;

-- AlterTable (colonna aggiunta nullable per poter fare il backfill dai dati esistenti)
ALTER TABLE `SegmentoSoggiorno` ADD COLUMN `tipoCameraId` INTEGER NULL,
    MODIFY `cameraId` INTEGER NULL;

-- Backfill: ogni segmento esistente ha gia' una camera, ne ricava il tipo.
UPDATE `SegmentoSoggiorno` s
JOIN `Camera` c ON c.`id` = s.`cameraId`
SET s.`tipoCameraId` = c.`tipoCameraId`
WHERE s.`tipoCameraId` IS NULL;

-- Ora che tutte le righe sono valorizzate, la colonna torna obbligatoria.
ALTER TABLE `SegmentoSoggiorno` MODIFY `tipoCameraId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `CameraIndisponibilita` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cameraId` INTEGER NOT NULL,
    `dal` DATE NOT NULL,
    `al` DATE NOT NULL,
    `motivo` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CameraIndisponibilita` ADD CONSTRAINT `CameraIndisponibilita_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `Camera`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentoSoggiorno` ADD CONSTRAINT `SegmentoSoggiorno_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `Camera`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SegmentoSoggiorno` ADD CONSTRAINT `SegmentoSoggiorno_tipoCameraId_fkey` FOREIGN KEY (`tipoCameraId`) REFERENCES `TipoCamera`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
