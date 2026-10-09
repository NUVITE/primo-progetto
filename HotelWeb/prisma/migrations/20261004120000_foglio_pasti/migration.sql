-- AlterTable
ALTER TABLE `SegmentoSoggiorno` ADD COLUMN `pastoPrincipale` VARCHAR(191) NULL,
    ADD COLUMN `tavolo` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Trattamento` ADD COLUMN `cena` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `colazione` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pranzo` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `VariazionePasto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `segmentoId` INTEGER NOT NULL,
    `giorno` DATE NOT NULL,
    `pasto` VARCHAR(191) NOT NULL,
    `delta` INTEGER NOT NULL,
    `nota` VARCHAR(191) NULL,
    `da` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VariazionePasto_segmentoId_giorno_pasto_key`(`segmentoId`, `giorno`, `pasto`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VariazionePasto` ADD CONSTRAINT `VariazionePasto_segmentoId_fkey` FOREIGN KEY (`segmentoId`) REFERENCES `SegmentoSoggiorno`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Pasti compresi nei trattamenti esistenti, ricavati dal nome (si correggono in Impostazioni > Trattamenti).
UPDATE `Trattamento` SET `colazione` = true WHERE LOWER(`nome`) IN ('b&b', 'bb', 'bed & breakfast', 'bed and breakfast', 'pernottamento e colazione', 'camera e colazione');
UPDATE `Trattamento` SET `colazione` = true, `cena` = true WHERE LOWER(`nome`) LIKE '%mezza pensione%' OR LOWER(`nome`) = 'hb';
UPDATE `Trattamento` SET `colazione` = true, `pranzo` = true, `cena` = true
  WHERE LOWER(`nome`) LIKE '%pensione completa%' OR LOWER(`nome`) LIKE '%all inclusive%' OR LOWER(`nome`) = 'fb';

-- Nuovo permesso "Foglio del giorno" ai ruoli Amministratore, Direttore e Reception (vale solo con il modulo Ristorazione attivo).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'ristorazione.foglio')
  WHERE `nome` IN ('Amministratore', 'Direttore', 'Reception') AND NOT JSON_CONTAINS(`permessi`, '"ristorazione.foglio"');

-- Ruoli Cucina e Sala per gli hotel che ancora non li hanno.
INSERT INTO `Ruolo` (`hotelId`, `nome`, `permessi`, `createdAt`, `updatedAt`)
SELECT h.id, r.nome, JSON_ARRAY('ristorazione.foglio', 'ristorazione.note'), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `Hotel` h CROSS JOIN (SELECT 'Cucina' AS nome UNION ALL SELECT 'Sala') r
WHERE NOT EXISTS (SELECT 1 FROM `Ruolo` x WHERE x.hotelId = h.id AND x.nome = r.nome);
