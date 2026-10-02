-- Tassa di soggiorno v2 (modello approvato il 2026-09-29).
-- Sostituisce RegolamentoTassaComune/MotivoEsenzioneTassa con regolamento versionato, tariffe per
-- categoria e regole (età, dichiarate, riduzioni, tetto annuo), posizione tassa per ospite e
-- registro chiusure/riaperture. I dati caricati sotto vengono da TASSA_SOGGIORNO_REGOLAMENTI.md
-- (fonti ufficiali); i punti non chiariti sono nel campo daConfermare di ogni regolamento.

-- DropForeignKey
ALTER TABLE `MotivoEsenzioneTassa` DROP FOREIGN KEY `MotivoEsenzioneTassa_regolamentoId_fkey`;

-- DropForeignKey
ALTER TABLE `RegolamentoTassaComune` DROP FOREIGN KEY `RegolamentoTassaComune_comuneId_fkey`;

-- DropForeignKey
ALTER TABLE `TassaNotte` DROP FOREIGN KEY `TassaNotte_motivoEsenzioneId_fkey`;

-- DropForeignKey
ALTER TABLE `TassaNotte` DROP FOREIGN KEY `TassaNotte_regolamentoId_fkey`;

-- DropIndex
DROP INDEX `TassaNotte_motivoEsenzioneId_fkey` ON `TassaNotte`;

-- DropIndex
DROP INDEX `TassaNotte_regolamentoId_fkey` ON `TassaNotte`;

-- La tassa per notte è una cache ricalcolabile: si svuota e si ricalcola con il nuovo motore
-- (scripts/ricalcola-tasse.ts, lanciato dal deploy). Non esistono ancora soggiorni chiusi.
DELETE FROM `TassaNotte`;

-- AlterTable
ALTER TABLE `TassaNotte` DROP COLUMN `esente`,
    DROP COLUMN `motivoEsenzioneId`,
    ADD COLUMN `esito` VARCHAR(191) NOT NULL,
    ADD COLUMN `regolaId` INTEGER NULL,
    ADD COLUMN `tariffaId` INTEGER NULL;

-- DropTable
DROP TABLE `MotivoEsenzioneTassa`;

-- DropTable
DROP TABLE `RegolamentoTassaComune`;

-- CreateTable
CREATE TABLE `RegolamentoTassa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `comuneId` INTEGER NOT NULL,
    `validoDal` DATE NOT NULL,
    `validoAl` DATE NULL,
    `attoRiferimento` VARCHAR(191) NULL,
    `fonteUrl` VARCHAR(500) NULL,
    `note` TEXT NULL,
    `daConfermare` TEXT NULL,
    `esclusiResidenti` BOOLEAN NOT NULL DEFAULT true,
    `stagionalitaDal` VARCHAR(191) NULL,
    `stagionalitaAl` VARCHAR(191) NULL,
    `azzeraAnnoSolare` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TariffaTassa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `regolamentoId` INTEGER NOT NULL,
    `categoria` VARCHAR(191) NOT NULL,
    `importo` DECIMAL(6, 2) NOT NULL,
    `tettoNotti` INTEGER NULL,
    `modoTetto` VARCHAR(191) NOT NULL DEFAULT 'consecutive_struttura',
    `predefinita` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `TariffaTassa_regolamentoId_categoria_key`(`regolamentoId`, `categoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegolaTassa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `regolamentoId` INTEGER NOT NULL,
    `codice` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descrizione` VARCHAR(500) NOT NULL,
    `articolo` VARCHAR(191) NULL,
    `documentoRichiesto` VARCHAR(500) NULL,
    `limite` VARCHAR(500) NULL,
    `etaSotto` INTEGER NULL,
    `etaDa` INTEGER NULL,
    `percentualeRiduzione` INTEGER NULL,
    `nottiTettoAnnuo` INTEGER NULL,

    UNIQUE INDEX `RegolaTassa_regolamentoId_codice_key`(`regolamentoId`, `codice`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PosizioneTassa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prenotazioneId` INTEGER NOT NULL,
    `ospiteId` INTEGER NOT NULL,
    `residente` BOOLEAN NOT NULL DEFAULT false,
    `nottiPrecedentiAltrove` INTEGER NOT NULL DEFAULT 0,
    `nottiAnnoDichiarate` INTEGER NOT NULL DEFAULT 0,
    `rifiutoPagamento` BOOLEAN NOT NULL DEFAULT false,
    `notaRifiuto` TEXT NULL,
    `definitiva` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PosizioneTassa_prenotazioneId_ospiteId_key`(`prenotazioneId`, `ospiteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DichiarazioneTassa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `posizioneId` INTEGER NOT NULL,
    `regolaId` INTEGER NOT NULL,
    `dal` DATE NULL,
    `al` DATE NULL,
    `tipoDocumento` VARCHAR(191) NULL,
    `estremiDocumento` VARCHAR(191) NULL,
    `consegnataIl` DATE NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventoTassa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `posizioneId` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `utenteId` INTEGER NOT NULL,
    `nota` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RegolamentoTassa` ADD CONSTRAINT `RegolamentoTassa_comuneId_fkey` FOREIGN KEY (`comuneId`) REFERENCES `Comune`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TariffaTassa` ADD CONSTRAINT `TariffaTassa_regolamentoId_fkey` FOREIGN KEY (`regolamentoId`) REFERENCES `RegolamentoTassa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegolaTassa` ADD CONSTRAINT `RegolaTassa_regolamentoId_fkey` FOREIGN KEY (`regolamentoId`) REFERENCES `RegolamentoTassa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PosizioneTassa` ADD CONSTRAINT `PosizioneTassa_prenotazioneId_fkey` FOREIGN KEY (`prenotazioneId`) REFERENCES `Prenotazione`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PosizioneTassa` ADD CONSTRAINT `PosizioneTassa_ospiteId_fkey` FOREIGN KEY (`ospiteId`) REFERENCES `Ospite`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DichiarazioneTassa` ADD CONSTRAINT `DichiarazioneTassa_posizioneId_fkey` FOREIGN KEY (`posizioneId`) REFERENCES `PosizioneTassa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DichiarazioneTassa` ADD CONSTRAINT `DichiarazioneTassa_regolaId_fkey` FOREIGN KEY (`regolaId`) REFERENCES `RegolaTassa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoTassa` ADD CONSTRAINT `EventoTassa_posizioneId_fkey` FOREIGN KEY (`posizioneId`) REFERENCES `PosizioneTassa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventoTassa` ADD CONSTRAINT `EventoTassa_utenteId_fkey` FOREIGN KEY (`utenteId`) REFERENCES `Utente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TassaNotte` ADD CONSTRAINT `TassaNotte_regolamentoId_fkey` FOREIGN KEY (`regolamentoId`) REFERENCES `RegolamentoTassa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TassaNotte` ADD CONSTRAINT `TassaNotte_tariffaId_fkey` FOREIGN KEY (`tariffaId`) REFERENCES `TariffaTassa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TassaNotte` ADD CONSTRAINT `TassaNotte_regolaId_fkey` FOREIGN KEY (`regolaId`) REFERENCES `RegolaTassa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== Dati: comuni e regolamenti =====
INSERT INTO `Comune` (`codiceIstat`,`nome`,`provincia`) SELECT '072006','Bari','BA' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Comune` WHERE `codiceIstat`='072006');
INSERT INTO `Comune` (`codiceIstat`,`nome`,`provincia`) SELECT '068028','Pescara','PE' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `Comune` WHERE `codiceIstat`='068028');

-- 058091: D.A.C. 34/2024 (regolamento), D.G.C. 255/2023 (tariffe dal 01/10/2023)
INSERT INTO `RegolamentoTassa` (`comuneId`,`validoDal`,`attoRiferimento`,`fonteUrl`,`note`,`daConfermare`,`esclusiResidenti`,`updatedAt`) SELECT `id`,'2023-10-01','D.A.C. 34/2024 (regolamento), D.G.C. 255/2023 (tariffe dal 01/10/2023)','https://www.comune.roma.it/web/it/informazione-di-servizio.page?contentId=IDS1017236','Esenzioni oggettive non modellate: ostelli della gioventù e strutture dell''enclave Polline e Martignano (art. 5 c. 1). Documenti di esenzione da conservare 5 anni.','Tetto annuo di studenti e lavoratori: si contano le notti in questa struttura più quelle dichiarate dall''ospite (il regolamento dice "in città"). A cavallo del 31/12 il conteggio riparte dal 1° gennaio (lettura letterale, nessun chiarimento ufficiale).',true,CURRENT_TIMESTAMP(3) FROM `Comune` WHERE `codiceIstat`='058091';
SET @r = LAST_INSERT_ID();
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 1 stella',4.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 2 stelle',5.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 3 stelle',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 4 stelle',7.50,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 5 stelle e superiori',10.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Agriturismo',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Residenza turistico-alberghiera',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Guest house / Affittacamere cat. 1',7.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Guest house / Affittacamere cat. 2',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Guest house / Affittacamere cat. 3',5.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Hostel / Ostello',3.50,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Casa / appartamento per vacanze cat. 1',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Casa / appartamento per vacanze cat. 2',5.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Case per ferie',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Bed and Breakfast',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Country house',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Rifugio montano o escursionistico',3.50,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Alloggio per uso turistico',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Locazione breve',6.00,10,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Struttura all''aria aperta (campeggio, villaggio)',3.00,5,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Tipologia non prevista (tariffa più bassa)',3.00,10,'consecutive_struttura',true);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'MINORI10','eta','Minori fino al compimento del 10° anno','art. 5 c. 2 lett. a',NULL,NULL,10,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'CURE','dichiarata','Chi necessita di cure; chi assiste degenti ricoverati; genitori di minori in cura','art. 5 c. 2 lett. b','Autocertificazione D.P.R. 445/2000 con generalità di paziente e accompagnatore, luogo di cura e periodo','1 accompagnatore per paziente ricoverato (i genitori per i minori di 18 anni). Vale solo per il periodo di cura/ricovero',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTISTI','dichiarata','Autisti di pullman e accompagnatori turistici di gruppi organizzati da agenzie','art. 5 c. 2 lett. c','Autocertificazione D.P.R. 445/2000 con generalità, periodo e numero componenti del gruppo','Tutti gli autisti; 1 accompagnatore turistico ogni 25 partecipanti',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'FORZE_ORDINE','dichiarata','Polizia di Stato e forze armate per attività di ordine e sicurezza pubblica','art. 5 c. 2 lett. d','Documentazione dell''organismo di appartenenza con numero operatori e periodo','Solo per il periodo di servizio',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'PERSONALE','dichiarata','Personale della struttura che vi presta attività lavorativa','art. 5 c. 2 lett. e',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'PROTEZIONE_CIVILE','dichiarata','Assistenza alloggiativa di primo soccorso attivata dalla Protezione Civile','art. 5 c. 2 lett. f',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTORITA','dichiarata','Alloggiati per provvedimenti di autorità pubbliche (emergenze, calamità, soccorso umanitario)','art. 5 c. 2 lett. g',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'VOLONTARI','dichiarata','Volontari in servizio per eventi calamitosi o soccorso umanitario','art. 5 c. 2 lett. h','Autocertificazione D.P.R. 445/2000 con circostanze, numero operatori e durata',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'DISABILI','dichiarata','Disabili gravi (L. 104/92 art. 3 c. 3) e caregiver familiare','art. 5 c. 2 lett. i','Autocertificazione D.P.R. 445/2000',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'STUDENTI_LAVORATORI','tetto_annuo','Studenti e lavoratori: massimo 10 notti tassate nell''anno solare, anche non consecutive','art. 6 c. 2','Autocertificazione D.P.R. 445/2000 (ragioni di studio o di lavoro documentabili)',NULL,NULL,NULL,NULL,10);

-- 110009: D.C.C. 4/2026 (regolamento), D.G.C. 20/2026 (tariffe)
INSERT INTO `RegolamentoTassa` (`comuneId`,`validoDal`,`attoRiferimento`,`fonteUrl`,`note`,`daConfermare`,`esclusiResidenti`,`updatedAt`) SELECT `id`,'2026-05-01','D.C.C. 4/2026 (regolamento), D.G.C. 20/2026 (tariffe)','https://www.comune.trani.bt.it/it/documenti_pubblici/imposta-di-soggiorno','Esenzioni su Modello 1 del Comune (anche per i minori, secondo le FAQ). Rifiuto di pagare: Modello 2 o 3 e segnalazione via PEC entro 48 ore.','Tariffa alberghi: 1,50 € secondo la delibera pubblicata al MEF, 2,00 € secondo le FAQ ufficiali del Comune (caricata 1,50, da confermare con l''Ufficio Tributi). Residenti: il regolamento non li esclude esplicitamente (lasciati soggetti, da verificare).',false,CURRENT_TIMESTAMP(3) FROM `Comune` WHERE `codiceIstat`='110009';
SET @r = LAST_INSERT_ID();
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Alberghi, residenze turistico-alberghiere, villaggi turistici',1.50,6,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'B&B, agriturismi, case e appartamenti vacanza',1.50,6,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Affittacamere, case per ferie, campeggi, ostelli, locazioni brevi, altri esercizi',1.00,6,'consecutive_struttura',true);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'MINORI16','eta','Minori fino al compimento del 16° anno','art. 5 lett. a','Modello 1 del Comune compilato dall''accompagnatore',NULL,16,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'DISABILI','dichiarata','Disabili con indennità di accompagnamento e un accompagnatore','art. 5 lett. b','Modello 1 del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'PERSONALE','dichiarata','Chi soggiorna nella struttura alle cui dipendenze lavora','art. 5 lett. c','Modello 1 del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTISTI','dichiarata','Autisti di pullman e accompagnatori turistici','art. 5 lett. d','Modello 1 del Comune','Tutti gli autisti; 1 accompagnatore turistico ogni 20 partecipanti',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'FORZE_ORDINE','dichiarata','Forze di polizia statale, provinciale, locale e Vigili del Fuoco in servizio','art. 5 lett. e','Modello 1 del Comune','Solo per il periodo di servizio',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTORITA','dichiarata','Alloggiati per provvedimenti di autorità pubbliche','art. 5 lett. f','Modello 1 del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'VOLONTARI','dichiarata','Volontari in occasione di calamità','art. 5 lett. g','Modello 1 del Comune',NULL,NULL,NULL,NULL,NULL);

-- 110003: D.C.C. 13/2026 (regolamento)
INSERT INTO `RegolamentoTassa` (`comuneId`,`validoDal`,`attoRiferimento`,`fonteUrl`,`note`,`daConfermare`,`esclusiResidenti`,`updatedAt`) SELECT `id`,'2026-04-01','D.C.C. 13/2026 (regolamento)','https://www.comune.bisceglie.bt.it/documento_pubblico/regolamento-per-la-disciplina-dellimposta-di-soggiorno/','Tetto di 7 notti consecutive anche tra strutture diverse, con la ricevuta dell''ospite. Portale Staytour.','Delibera di Giunta con le tariffe per categoria non trovata: 1,00 € ricavato dai comunicati del Comune ("quasi tutte le strutture"), 2,00 € per le locazioni brevi. Nessun atto risulta sul portale MEF.',true,CURRENT_TIMESTAMP(3) FROM `Comune` WHERE `codiceIstat`='110003';
SET @r = LAST_INSERT_ID();
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Strutture ricettive',1.00,7,'consecutive_anche_altrove',true);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Locazione breve',2.00,7,'consecutive_anche_altrove',false);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'MINORI14','eta','Minori fino al compimento del 14° anno','art. 5 lett. a',NULL,NULL,14,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'ACCOMPAGNATORI_DEGENTI','dichiarata','Chi assiste degenti ricoverati in strutture sanitarie del territorio, anche in day hospital','art. 5 lett. b','Autocertificazione D.P.R. 445/2000 con generalità e periodo','Massimo 2 accompagnatori per paziente; solo per il periodo del ricovero',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'DAY_HOSPITAL','dichiarata','Pazienti in day hospital','art. 5 lett. c',NULL,'Subordinata alla comunicazione del paziente al Comune',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'PERSONALE','dichiarata','Dipendenti della struttura che vi soggiornano per esigenze lavorative','art. 5 lett. e','Autocertificazione D.P.R. 445/2000',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'OPERATORI_TURISMO','dichiarata','Operatori del turismo che soggiornano per ragioni di lavoro','art. 5 lett. f',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'VITTIME_VIOLENZA','dichiarata','Donne vittime di violenza e figli in pronta accoglienza','art. 5 lett. g',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTORITA','dichiarata','Alloggiati per provvedimenti di autorità pubbliche','art. 5 lett. h',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'VOLONTARI','dichiarata','Volontari in occasione di calamità','art. 5 lett. i',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTISTI','dichiarata','Autisti di pullman, guide e accompagnatori turistici','art. 5 lett. j',NULL,'1 ogni 20 partecipanti',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'DISABILI','dichiarata','Disabili gravi (L. 104/92 art. 3 c. 3) e un accompagnatore','art. 5 lett. k',NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'FORZE_ORDINE','dichiarata','Forze dell''ordine, Vigili del Fuoco e Protezione Civile in servizio','art. 5 lett. l','Autocertificazione D.P.R. 445/2000','Solo per la durata del servizio',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'SCUOLE','riduzione','Gruppi scolastici (scuole medie e superiori) in visita didattica','art. 6 lett. a','Attestazione del Dirigente scolastico',NULL,NULL,NULL,50,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'SPORTIVI_U16','riduzione','Sportivi under 16 in gruppi partecipanti a iniziative organizzate con il Comune','art. 6 lett. b','Attestazione della Federazione',NULL,NULL,NULL,50,NULL);

-- 072006: Disciplinare e D.G.C. 640/2023 (tariffe)
INSERT INTO `RegolamentoTassa` (`comuneId`,`validoDal`,`attoRiferimento`,`fonteUrl`,`note`,`daConfermare`,`esclusiResidenti`,`updatedAt`) SELECT `id`,'2023-10-01','Disciplinare e D.G.C. 640/2023 (tariffe)','https://www.comune.bari.it/-/imposta-di-soggiorno-giunta-comunale-approva-disciplinare-tariffe','Tetto di 4 notti consecutive anche tra strutture diverse, con la ricevuta dell''ospite. Comunicazione entro 7 giorni dalla partenza (PayTourist). Riduzione corporate valida solo se la struttura deposita le convenzioni entro il 30 aprile.','Minori: "entro il quattordicesimo anno di età" è ambiguo (caricato come esenti sotto i 14 anni, da confermare con l''Ufficio Tributi).',true,CURRENT_TIMESTAMP(3) FROM `Comune` WHERE `codiceIstat`='072006';
SET @r = LAST_INSERT_ID();
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 5 stelle lusso e 5 stelle',4.00,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 4 stelle',3.00,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 3 stelle',2.00,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 2 e 1 stella',1.50,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Residenza turistico-alberghiera 4 stelle',3.00,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Residenza turistico-alberghiera 3 stelle',2.00,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Residenza turistico-alberghiera 2 stelle',1.50,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Campeggio / villaggio 4 stelle',3.00,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Campeggio / villaggio 3 stelle',2.00,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Campeggio / villaggio 2 e 1 stella',1.50,4,'consecutive_anche_altrove',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Affittacamere, B&B, agriturismi, case vacanza, case per ferie, ostelli, locazioni brevi, altri esercizi',2.00,4,'consecutive_anche_altrove',true);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'MINORI14','eta','Minori entro il 14° anno di età','art. 4 lett. b',NULL,NULL,14,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTISTI','dichiarata','Autisti di pullman e accompagnatori turistici di gruppi di agenzie','art. 4 lett. c','Autocertificazione D.P.R. 445/2000 su modulistica del Comune','Tutti gli autisti; 1 accompagnatore ogni 20 partecipanti',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'CURE','dichiarata','Malati e chi assiste degenti ricoverati, anche in day hospital','art. 4 lett. d','Certificazione della struttura sanitaria + Autocertificazione D.P.R. 445/2000 dell''accompagnatore','Massimo 2 accompagnatori per paziente; solo per il periodo di cura',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'STUDENTI_UNIVERSITARI','dichiarata','Studenti universitari fuori sede iscritti a università con sede a Bari (anche master e specializzazioni)','art. 4 lett. e','Autocertificazione D.P.R. 445/2000 su modulistica del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'DISABILI','dichiarata','Disabili con indennità di accompagnamento e/o un accompagnatore','art. 4 lett. f','Autocertificazione D.P.R. 445/2000 su modulistica del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'FORZE_ORDINE','dichiarata','Forze di polizia statale, provinciale, locale e Vigili del Fuoco in servizio','art. 4 lett. g','Autocertificazione D.P.R. 445/2000 su modulistica del Comune','Solo per il periodo di servizio',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTORITA','dichiarata','Alloggiati per provvedimenti di autorità pubbliche','art. 4 lett. h','Autocertificazione D.P.R. 445/2000 su modulistica del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'VOLONTARI','dichiarata','Volontari in occasione di calamità','art. 4 lett. i','Autocertificazione D.P.R. 445/2000 su modulistica del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'PERSONALE','dichiarata','Personale dipendente della struttura (non il nucleo familiare)','art. 4 lett. j','Autocertificazione D.P.R. 445/2000 su modulistica del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'CONCORSI','dichiarata','Visitatori in viaggio per motivi concorsuali','art. 4 lett. k','Autocertificazione D.P.R. 445/2000 su modulistica del Comune',NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'CORPORATE','riduzione','Ospiti con convenzioni aziendali (corporate) del segmento business','art. 5 lett. a',NULL,'Solo se la struttura ha depositato le convenzioni al Comune entro il 30 aprile',NULL,NULL,50,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'SCUOLE','riduzione','Gruppi scolastici (scuole medie e superiori) in visita didattica','art. 5 lett. b','Attestazione del Dirigente scolastico',NULL,NULL,NULL,50,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'SPORTIVI_U16','riduzione','Sportivi under 16 in gruppi partecipanti a tornei organizzati con il Comune','art. 5 lett. c','Attestazione della Federazione',NULL,NULL,NULL,50,NULL);

-- 068028: D.C.C. 52/2016 (regolamento), D.G.C. 317/2025 (tariffe dal 01/07/2025)
INSERT INTO `RegolamentoTassa` (`comuneId`,`validoDal`,`attoRiferimento`,`fonteUrl`,`note`,`daConfermare`,`esclusiResidenti`,`updatedAt`) SELECT `id`,'2025-07-01','D.C.C. 52/2016 (regolamento), D.G.C. 317/2025 (tariffe dal 01/07/2025)','https://www.comune.pescara.it/imposta-di-soggiorno/','Dichiarazione trimestrale distinguendo tenuti al pagamento, esenti ed esclusi perché residenti.','Regolamento disponibile solo in scansione: non verificati il modo di conteggio delle 7 notti (anno solare? cumulo tra strutture?) né i documenti richiesti per le esenzioni diverse dalle cure.',true,CURRENT_TIMESTAMP(3) FROM `Comune` WHERE `codiceIstat`='068028';
SET @r = LAST_INSERT_ID();
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 1 stella',1.00,7,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 2 stelle',1.50,7,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Albergo 3, 4 e 5 stelle',2.00,7,'consecutive_struttura',false);
INSERT INTO `TariffaTassa` (`regolamentoId`,`categoria`,`importo`,`tettoNotti`,`modoTetto`,`predefinita`) VALUES (@r,'Extralberghiero (agriturismi, B&B, case vacanza, ostelli, affittacamere, campeggi, non classificate)',2.00,7,'consecutive_struttura',true);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'MINORI12','eta','Minori fino al compimento del 12° anno',NULL,NULL,NULL,12,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'OVER70','eta','Persone che hanno compiuto il 70° anno di età',NULL,NULL,NULL,NULL,70,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'CURE','dichiarata','Chi assiste degenti ricoverati in strutture sanitarie del territorio comunale',NULL,'Autocertificazione D.P.R. 445/2000 con generalità di accompagnatore e paziente, periodo e finalità','1 accompagnatore per paziente; solo per il periodo del ricovero',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'DISABILI','dichiarata','Disabili con indennità di accompagnamento',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'FORZE_ORDINE','dichiarata','Polizia di Stato e locale, Forze Armate, Vigili del Fuoco in servizio',NULL,NULL,'Solo per il periodo di servizio',NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'AUTORITA','dichiarata','Alloggiati per provvedimenti di autorità pubbliche',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO `RegolaTassa` (`regolamentoId`,`codice`,`tipo`,`descrizione`,`articolo`,`documentoRichiesto`,`limite`,`etaSotto`,`etaDa`,`percentualeRiduzione`,`nottiTettoAnnuo`) VALUES (@r,'PERSONALE','dichiarata','Personale della struttura',NULL,NULL,NULL,NULL,NULL,NULL,NULL);

-- Categoria degli hotel esistenti allineata alle categorie delle tariffe del loro comune
UPDATE `Hotel` h JOIN `Comune` c ON c.`id`=h.`comuneId` SET h.`categoria`='Alberghi, residenze turistico-alberghiere, villaggi turistici' WHERE c.`codiceIstat`='110009' AND h.`categoria`='Hotel';
UPDATE `Hotel` h JOIN `Comune` c ON c.`id`=h.`comuneId` SET h.`categoria`='Strutture ricettive' WHERE c.`codiceIstat`='110003' AND h.`categoria`='Hotel';
UPDATE `Hotel` h JOIN `Comune` c ON c.`id`=h.`comuneId` SET h.`categoria`='Case per ferie' WHERE c.`codiceIstat`='058091' AND h.`categoria`='Casa per ferie';

-- Nuovo permesso "soggiorni.riapri" ai ruoli Amministratore e Direttore già esistenti (decisione 2026-09-29).
UPDATE `Ruolo` SET `permessi` = JSON_ARRAY_APPEND(`permessi`, '$', 'soggiorni.riapri')
WHERE `nome` IN ('Amministratore', 'Direttore') AND NOT JSON_CONTAINS(`permessi`, '"soggiorni.riapri"');
