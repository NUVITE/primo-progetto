-- AlterTable
ALTER TABLE `Utente` ADD COLUMN `codiciRiserva` JSON NULL,
    ADD COLUMN `totpAttivoIl` DATETIME(3) NULL,
    ADD COLUMN `totpInAttesaCifrato` VARCHAR(191) NULL,
    ADD COLUMN `totpSegretoCifrato` VARCHAR(191) NULL,
    ADD COLUMN `totpUltimoPasso` INTEGER NULL;

-- CreateTable
CREATE TABLE `DispositivoFidato` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `utenteId` INTEGER NOT NULL,
    `impronta` VARCHAR(191) NOT NULL,
    `scadeIl` DATETIME(3) NOT NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DispositivoFidato_impronta_key`(`impronta`),
    INDEX `DispositivoFidato_utenteId_idx`(`utenteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DispositivoFidato` ADD CONSTRAINT `DispositivoFidato_utenteId_fkey` FOREIGN KEY (`utenteId`) REFERENCES `Utente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

