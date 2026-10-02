-- AlterTable
ALTER TABLE `ServizioSala` ADD COLUMN `pacchetto` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PacchettoSala` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descrizione` VARCHAR(191) NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PacchettoSala_hotelId_nome_key`(`hotelId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RigaPacchettoSala` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pacchettoId` INTEGER NOT NULL,
    `servizioCatalogoId` INTEGER NULL,
    `descrizione` VARCHAR(191) NULL,
    `prezzoUnitario` DECIMAL(10, 2) NOT NULL,
    `quantitaPer` VARCHAR(191) NOT NULL DEFAULT 'persona',
    `ordine` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonaEvento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneSalaId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `ruolo` VARCHAR(191) NOT NULL DEFAULT 'relatore',
    `telefono` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `note` VARCHAR(191) NULL,
    `prenotazioneId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PacchettoSala` ADD CONSTRAINT `PacchettoSala_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RigaPacchettoSala` ADD CONSTRAINT `RigaPacchettoSala_pacchettoId_fkey` FOREIGN KEY (`pacchettoId`) REFERENCES `PacchettoSala`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RigaPacchettoSala` ADD CONSTRAINT `RigaPacchettoSala_servizioCatalogoId_fkey` FOREIGN KEY (`servizioCatalogoId`) REFERENCES `ServizioCatalogo`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonaEvento` ADD CONSTRAINT `PersonaEvento_prenotazioneSalaId_fkey` FOREIGN KEY (`prenotazioneSalaId`) REFERENCES `PrenotazioneSala`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonaEvento` ADD CONSTRAINT `PersonaEvento_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

