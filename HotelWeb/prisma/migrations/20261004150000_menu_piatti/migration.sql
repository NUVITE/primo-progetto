-- CreateTable
CREATE TABLE `Piatto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `descrizione` TEXT NULL,
    `categoria` VARCHAR(191) NOT NULL,
    `prezzo` DECIMAL(10, 2) NULL,
    `repartoId` INTEGER NULL,
    `allergeni` JSON NOT NULL,
    `senzaAllergeni` BOOLEAN NOT NULL DEFAULT false,
    `regimi` JSON NOT NULL,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Piatto_hotelId_nome_key`(`hotelId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Menu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `pasti` JSON NOT NULL,
    `giorno` DATE NULL,
    `dalle` VARCHAR(191) NULL,
    `alle` VARCHAR(191) NULL,
    `roomService` BOOLEAN NOT NULL DEFAULT false,
    `attivo` BOOLEAN NOT NULL DEFAULT true,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Menu_hotelId_giorno_idx`(`hotelId`, `giorno`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VoceMenu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `menuId` INTEGER NOT NULL,
    `piattoId` INTEGER NOT NULL,
    `ordine` INTEGER NOT NULL DEFAULT 0,
    `disponibile` BOOLEAN NOT NULL DEFAULT true,
    `prezzo` DECIMAL(10, 2) NULL,

    UNIQUE INDEX `VoceMenu_menuId_piattoId_key`(`menuId`, `piattoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Piatto` ADD CONSTRAINT `Piatto_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Piatto` ADD CONSTRAINT `Piatto_repartoId_fkey` FOREIGN KEY (`repartoId`) REFERENCES `RepartoAddebito`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Menu` ADD CONSTRAINT `Menu_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VoceMenu` ADD CONSTRAINT `VoceMenu_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VoceMenu` ADD CONSTRAINT `VoceMenu_piattoId_fkey` FOREIGN KEY (`piattoId`) REFERENCES `Piatto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Nuovo permesso "Gestire menu e piatti" ai ruoli Amministratore, Direttore e Cucina (vale solo con il modulo Ristorazione attivo).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'ristorazione.menu')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Cucina') AND NOT JSON_CONTAINS(`permessi`, '"ristorazione.menu"');
