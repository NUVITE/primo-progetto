-- CreateTable
CREATE TABLE `NotaAlimentare` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `ospiteId` INTEGER NOT NULL,
    `voci` JSON NOT NULL,
    `regimi` JSON NOT NULL,
    `esigenze` TEXT NULL,
    `consenso` VARCHAR(191) NOT NULL,
    `consensoModo` VARCHAR(191) NOT NULL,
    `consensoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `consensoDa` VARCHAR(191) NOT NULL,
    `aggiornataIl` DATETIME(3) NOT NULL,
    `aggiornataDa` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `NotaAlimentare_ospiteId_key`(`ospiteId`),
    INDEX `NotaAlimentare_hotelId_idx`(`hotelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotaAlimentare` ADD CONSTRAINT `NotaAlimentare_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotaAlimentare` ADD CONSTRAINT `NotaAlimentare_ospiteId_fkey` FOREIGN KEY (`ospiteId`) REFERENCES `Ospite`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Nuovo permesso "Note alimentari" ai ruoli Amministratore, Direttore e Reception (vale solo con il modulo Ristorazione attivo).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'ristorazione.note')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"ristorazione.note"');
