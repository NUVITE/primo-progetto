-- AlterTable
ALTER TABLE `RegolamentoTassa` ADD COLUMN `rendicontoGiorno` INTEGER NOT NULL DEFAULT 16,
    ADD COLUMN `rendicontoNota` TEXT NULL,
    ADD COLUMN `rendicontoPeriodo` VARCHAR(191) NOT NULL DEFAULT 'trimestrale',
    ADD COLUMN `versamentoGiorno` INTEGER NULL;


-- Periodicità e scadenze del rendiconto per Comune (fonti in TASSA_SOGGIORNO_REGOLAMENTI.md).
UPDATE `RegolamentoTassa` r JOIN `Comune` c ON c.id = r.comuneId SET r.rendicontoPeriodo = 'trimestrale', r.rendicontoGiorno = 16, r.versamentoGiorno = NULL,
  r.rendicontoNota = 'Comunicazione e versamento sul portale GECOS (PagoPA o F24) entro il 16° giorno dopo il trimestre, anche a zero ospiti: numero di ospiti e pernottamenti INCLUSI gli esenti. Versamento arrotondato all''euro. Dichiarazione annuale entro il 30 giugno.'
  WHERE c.codiceIstat = '058091';
UPDATE `RegolamentoTassa` r JOIN `Comune` c ON c.id = r.comuneId SET r.rendicontoPeriodo = 'trimestrale', r.rendicontoGiorno = 15, r.versamentoGiorno = NULL,
  r.rendicontoNota = 'Per ogni ospite: comunicazione su PayTourist entro 7 giorni dalla partenza. Versamento con comunicazione riepilogativa entro 15 giorni dalla fine del trimestre (a zero se nessun ospite). Importi fino a 0,49 € non dovuti. Dichiarazione annuale entro il 30 giugno.'
  WHERE c.codiceIstat = '072006';
UPDATE `RegolamentoTassa` r JOIN `Comune` c ON c.id = r.comuneId SET r.rendicontoPeriodo = 'semestrale', r.rendicontoGiorno = 16, r.versamentoGiorno = NULL,
  r.rendicontoNota = 'Per ogni ospite: comunicazione sul portale del Comune entro 7 giorni dall''arrivo. Versamento semestrale con PagoPA entro il 16 luglio (gennaio-giugno) e il 16 gennaio (luglio-dicembre), a zero se nessun ospite. Dichiarazione annuale entro il 30 giugno.'
  WHERE c.codiceIstat = '110009';
UPDATE `RegolamentoTassa` r JOIN `Comune` c ON c.id = r.comuneId SET r.rendicontoPeriodo = 'trimestrale', r.rendicontoGiorno = 20, r.versamentoGiorno = 31,
  r.rendicontoNota = 'Per ogni ospite: comunicazione su Staytour entro 7 giorni dalla partenza. Comunicazione trimestrale entro il 20 del mese successivo (anche a zero), versamento entro la fine del mese; somme sotto 12 € si riportano al trimestre successivo. Dichiarazione annuale entro il 30 giugno.'
  WHERE c.codiceIstat = '110003';
UPDATE `RegolamentoTassa` r JOIN `Comune` c ON c.id = r.comuneId SET r.rendicontoPeriodo = 'trimestrale', r.rendicontoGiorno = 15, r.versamentoGiorno = NULL,
  r.rendicontoNota = 'Dichiarazione trimestrale entro il 15° giorno dopo il trimestre, distinguendo pernottamenti tenuti al pagamento, esenti ed esclusi perché residenti; versamento entro lo stesso termine.'
  WHERE c.codiceIstat = '068028';
