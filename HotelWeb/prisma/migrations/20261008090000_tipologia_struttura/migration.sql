-- AlterTable
ALTER TABLE `Hotel` ADD COLUMN `tipologia` VARCHAR(191) NOT NULL DEFAULT 'albergo';


-- Strutture esistenti: tutte "albergo" (predefinito), tranne le case per ferie riconoscibili dal nome.
UPDATE `Hotel` SET `tipologia` = 'casa_per_ferie' WHERE `nome` LIKE 'Casa per ferie%';
