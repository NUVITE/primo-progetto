-- Ruoli configurabili per hotel + superadmin di piattaforma.
-- Converte i dati esistenti: ogni hotel riceve i ruoli predefiniti (stessi di RUOLI_PREDEFINITI in
-- src/lib/permessi.ts); gli accessi utente-hotel diventano righe UtenteHotel con
-- ADMIN -> "Amministratore" e RECEZIONE -> "Reception" (stessi poteri di prima);
-- admin@nuvite.it (account del gestore della piattaforma) diventa superadmin.

-- CreateTable
CREATE TABLE `Ruolo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `permessi` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ruolo_hotelId_nome_key`(`hotelId`, `nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UtenteHotel` (
    `utenteId` INTEGER NOT NULL,
    `hotelId` INTEGER NOT NULL,
    `ruoloId` INTEGER NOT NULL,

    INDEX `UtenteHotel_hotelId_idx`(`hotelId`),
    INDEX `UtenteHotel_ruoloId_idx`(`ruoloId`),
    PRIMARY KEY (`utenteId`, `hotelId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ruolo` ADD CONSTRAINT `Ruolo_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `UtenteHotel` ADD CONSTRAINT `UtenteHotel_utenteId_fkey` FOREIGN KEY (`utenteId`) REFERENCES `Utente`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UtenteHotel` ADD CONSTRAINT `UtenteHotel_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UtenteHotel` ADD CONSTRAINT `UtenteHotel_ruoloId_fkey` FOREIGN KEY (`ruoloId`) REFERENCES `Ruolo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `Utente` ADD COLUMN `superAdmin` BOOLEAN NOT NULL DEFAULT false;

-- Dati: ruoli predefiniti per ogni hotel esistente
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `updatedAt`) SELECT `id`, 'Amministratore', '["prenotazioni.vedi", "prenotazioni.gestisci", "importi.vedi", "camere.gestisci", "listini.gestisci", "sale.vedi", "sale.gestisci", "sale.configura", "utenti.gestisci", "ruoli.gestisci"]', CURRENT_TIMESTAMP(3) FROM `Hotel`;
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `updatedAt`) SELECT `id`, 'Direttore', '["prenotazioni.vedi", "prenotazioni.gestisci", "importi.vedi", "camere.gestisci", "listini.gestisci", "sale.vedi", "sale.gestisci", "sale.configura", "utenti.gestisci"]', CURRENT_TIMESTAMP(3) FROM `Hotel`;
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `updatedAt`) SELECT `id`, 'Reception', '["prenotazioni.vedi", "prenotazioni.gestisci", "importi.vedi", "sale.vedi", "sale.gestisci"]', CURRENT_TIMESTAMP(3) FROM `Hotel`;
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `updatedAt`) SELECT `id`, 'Eventi / Commerciale', '["prenotazioni.vedi", "importi.vedi", "sale.vedi", "sale.gestisci", "sale.configura"]', CURRENT_TIMESTAMP(3) FROM `Hotel`;
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `updatedAt`) SELECT `id`, 'Governante', '["prenotazioni.vedi"]', CURRENT_TIMESTAMP(3) FROM `Hotel`;
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `updatedAt`) SELECT `id`, 'Cameriera ai piani', '[]', CURRENT_TIMESTAMP(3) FROM `Hotel`;
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `updatedAt`) SELECT `id`, 'Manutenzione', '[]', CURRENT_TIMESTAMP(3) FROM `Hotel`;

-- Dati: accessi esistenti con il ruolo equivalente a quello di prima
INSERT INTO `UtenteHotel` (`utenteId`, `hotelId`, `ruoloId`)
SELECT hu.`B`, hu.`A`, r.`id`
FROM `_HotelToUtente` hu
JOIN `Utente` u ON u.`id` = hu.`B`
JOIN `Ruolo` r ON r.`hotelId` = hu.`A`
  AND r.`nome` = CASE WHEN u.`ruolo` = 'ADMIN' THEN 'Amministratore' ELSE 'Reception' END;

-- Dati: gestore della piattaforma
UPDATE `Utente` SET `superAdmin` = true WHERE `email` = 'admin@nuvite.it';

-- DropForeignKey
ALTER TABLE `_HotelToUtente` DROP FOREIGN KEY `_HotelToUtente_A_fkey`;
ALTER TABLE `_HotelToUtente` DROP FOREIGN KEY `_HotelToUtente_B_fkey`;

-- DropTable
DROP TABLE `_HotelToUtente`;

-- AlterTable
ALTER TABLE `Utente` DROP COLUMN `ruolo`;
