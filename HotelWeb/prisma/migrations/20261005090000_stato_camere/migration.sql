-- AlterTable
ALTER TABLE `Camera` ADD COLUMN `nonDisturbare` DATE NULL,
    ADD COLUMN `statoPulizia` VARCHAR(191) NOT NULL DEFAULT 'pronta',
    ADD COLUMN `statoPuliziaDa` VARCHAR(191) NULL,
    ADD COLUMN `statoPuliziaIl` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `controlloGovernante` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `ControlloCamera` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cameraId` INTEGER NOT NULL,
    `giorno` DATE NOT NULL,
    `trovata` VARCHAR(191) NOT NULL,
    `nota` VARCHAR(191) NULL,
    `da` VARCHAR(191) NOT NULL,
    `creatoIl` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ControlloCamera_cameraId_giorno_key`(`cameraId`, `giorno`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ControlloCamera` ADD CONSTRAINT `ControlloCamera_cameraId_fkey` FOREIGN KEY (`cameraId`) REFERENCES `Camera`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Permessi delle pulizie (valgono solo con il modulo Pulizie attivo). Le camere esistenti partono "pronte".
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'pulizie.vedi')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception', 'Governante', 'Cameriera ai piani') AND NOT JSON_CONTAINS(`permessi`, '"pulizie.vedi"');
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'pulizie.gestisci')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception', 'Governante') AND NOT JSON_CONTAINS(`permessi`, '"pulizie.gestisci"');
