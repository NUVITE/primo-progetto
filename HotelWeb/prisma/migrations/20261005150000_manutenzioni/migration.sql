-- CreateTable
CREATE TABLE `Segnalazione` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hotelId` INTEGER NOT NULL,
    `cameraId` INTEGER NULL,
    `zona` VARCHAR(191) NULL,
    `descrizione` TEXT NOT NULL,
    `priorita` VARCHAR(191) NOT NULL DEFAULT 'normale',
    `stato` VARCHAR(191) NOT NULL DEFAULT 'aperta',
    `origine` VARCHAR(191) NOT NULL DEFAULT 'personale',
    `segnalataDa` VARCHAR(191) NOT NULL,
    `creataIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assegnataAId` INTEGER NULL,
    `presaIl` DATETIME(3) NULL,
    `chiusaIl` DATETIME(3) NULL,
    `chiusaDa` VARCHAR(191) NULL,
    `esito` TEXT NULL,
    `fuoriServizioId` INTEGER NULL,

    INDEX `Segnalazione_hotelId_stato_idx`(`hotelId`, `stato`),
    INDEX `Segnalazione_cameraId_idx`(`cameraId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Segnalazione` ADD CONSTRAINT `Segnalazione_hotelId_fkey` FOREIGN KEY (`hotelId`) REFERENCES `Hotel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Segnalazione` ADD CONSTRAINT `Segnalazione_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `Camera`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Segnalazione` ADD CONSTRAINT `Segnalazione_assegnataAId_fkey` FOREIGN KEY (`assegnataAId`) REFERENCES `Utente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Segnalazione` ADD CONSTRAINT `Segnalazione_fuoriServizioId_fkey` FOREIGN KEY (`fuoriServizioId`) REFERENCES `CameraIndisponibilita`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Permessi delle manutenzioni (valgono solo con il modulo Manutenzioni attivo).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'manutenzioni.segnala')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception', 'Governante', 'Cameriera ai piani', 'Manutenzione') AND NOT JSON_CONTAINS(`permessi`, '"manutenzioni.segnala"');
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'manutenzioni.gestisci')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Manutenzione') AND NOT JSON_CONTAINS(`permessi`, '"manutenzioni.gestisci"');
