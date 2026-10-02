-- AlterTable
ALTER TABLE `Pagamento` ADD COLUMN `intestatario` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Prenotazione` ADD COLUMN `regolaConto` VARCHAR(191) NOT NULL DEFAULT 'predefinita';

-- CreateTable
CREATE TABLE `IntestazioneRigaConto` (
    `prenotazioneId` INTEGER NOT NULL,
    `chiave` VARCHAR(191) NOT NULL,
    `intestatario` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`prenotazioneId`, `chiave`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RigaFatturata` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneId` INTEGER NOT NULL,
    `chiave` VARCHAR(191) NOT NULL,
    `intestatario` VARCHAR(191) NOT NULL,
    `descrizione` VARCHAR(191) NOT NULL,
    `importo` DECIMAL(10, 2) NOT NULL,
    `aliquota` DECIMAL(4, 2) NULL,
    `natura` VARCHAR(191) NULL,
    `lotto` VARCHAR(191) NOT NULL,
    `inviataIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `da` VARCHAR(191) NOT NULL,

    INDEX `RigaFatturata_prenotazioneId_chiave_idx`(`prenotazioneId`, `chiave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IntestazioneRigaConto` ADD CONSTRAINT `IntestazioneRigaConto_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RigaFatturata` ADD CONSTRAINT `RigaFatturata_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

