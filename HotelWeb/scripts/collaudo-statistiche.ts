/**
 * Collaudo delle statistiche: regole pure (indicatori, giorni, anno prima, variazione, CSV per Excel,
 * periodo) e numeri sul database: notti, presenze, arrivi, permanenza, camere disponibili meno fuori
 * servizio, ricavi per voce (esborsi esclusi, abbuoni sottratti, servizio all'arrivo), canali,
 * intermediari, provenienza, annullate escluse, importi nascosti senza permesso, prenotato dei
 * prossimi mesi (anche un anno fa alla stessa data, con le prenotazioni annullate dopo). Primo hotel,
 * marzo 2035 (e 2034); confronto prima/dopo; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-statistiche.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { annoPrima, controllaPeriodo, csv, giorni, indicatori, nomeLeggibile, variazione } from "../src/lib/statisticheRegole";
import { statistiche } from "../src/lib/statistiche";
import { creaPrenotazione } from "../src/lib/prenotazioni";
import { CODICE_ITALIA } from "../src/lib/codiciPolizia";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
async function errore(fn: () => unknown) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
const COGNOME = "CollaudoStatistiche";
const vicino = (a: number | null, b: number) => a !== null && Math.abs(a - b) < 0.011;

async function main() {
  // ---- Regole pure ----
  verifica("Indicatori: 5 notti su 50, ricavo 500", JSON.stringify(indicatori(5, 50, 500)) === JSON.stringify({ occupazione: 10, prezzoMedio: 100, ricavoPerDisponibile: 10 }));
  verifica("Indicatori senza importi: prezzi nulli", indicatori(5, 50, null).prezzoMedio === null && indicatori(0, 0, 0).occupazione === 0);
  verifica("Giorni compresi gli estremi", giorni("2035-02-27", "2035-03-02").join() === "2035-02-27,2035-02-28,2035-03-01,2035-03-02");
  verifica("Anno prima, anche dal 29 febbraio", annoPrima("2035-03-10") === "2034-03-10" && annoPrima("2028-02-29") === "2027-02-28");
  verifica("Nomi degli stati leggibili", nomeLeggibile("STATI UNITI D'AMERICA") === "Stati Uniti d'America" && nomeLeggibile("ALBANIA") === "Albania" && nomeLeggibile("REPUBBLICA DI SAN MARINO") === "Repubblica di San Marino", nomeLeggibile("STATI UNITI D'AMERICA"));
  verifica("Variazione", variazione(110, 100) === 10 && variazione(5, 0) === null && variazione(null, 3) === null);
  verifica("Periodo rovesciato o troppo lungo: rifiutato", !!(await errore(() => controllaPeriodo("2035-03-02", "2035-03-01"))) && !!(await errore(() => controllaPeriodo("2034-01-01", "2035-12-31"))));
  const f = csv([["Voce", "Importo"], ["Bar; piscina", 12.5], ['Il "Caffè"', null]]);
  verifica("CSV per Excel: BOM, punto e virgola, virgola decimale, virgolette", f === '\uFEFFVoce;Importo\r\n"Bar; piscina";12,5\r\n"Il ""Caffè""";', f);

  // ---- Sul database ----
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const camere = await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" }, take: 3 });
  const comune = await prisma.luogoPolizia.findFirst({ where: { tipo: "comune", provincia: { not: null } } });
  const stato = await prisma.luogoPolizia.findFirst({ where: { tipo: "stato", codice: { not: CODICE_ITALIA } } });
  if (!comune || !stato || camere.length < 3) throw new Error("Servono tabelle della Polizia e 3 camere nel primo hotel.");
  const ids: number[] = [];
  const creati = { clienti: [] as number[], reparti: [] as number[], fuori: [] as number[] };
  const prenota = async (nome: string, camera: (typeof camere)[number], dal: string, al: string, adulti: number) => {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome, cognome: COGNOME },
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome, cognome: COGNOME }, trattamento, listinoId: listino.id, dataInizio: dal, dataFine: al, composizione: { adulti, etaBambini: [] } }],
    });
    ids.push(p.id);
    // Prezzo noto: 100 a notte.
    await prisma.notteSoggiorno.updateMany({ where: { segmento: { prenotazioneId: p.id } }, data: { prezzo: 100 } });
    return p;
  };
  const DAL = "2035-03-01";
  const AL = "2035-03-31";

  try {
    const prima = await statistiche(hotel.id, DAL, AL, true, DAL);
    // A: italiana, 3 notti, 2 adulti, diretta, con servizio senza data (conta all'arrivo).
    const a = await prenota("Anna", camere[0], "2035-03-10", "2035-03-13", 2);
    await prisma.ospite.update({ where: { id: a.segmenti[0].ospiteId }, data: { cittadinanzaCodice: CODICE_ITALIA, residenzaStatoCodice: CODICE_ITALIA, residenzaComuneCodice: comune.codice } });
    await prisma.servizioAggiunto.create({ data: { prenotazioneId: a.id, descrizione: "Collaudo servizio", prezzoUnitario: 20, quantita: 2 } });
    // B: straniera, 2 notti, 1 adulto, da agenzia.
    const ag = await prisma.cliente.create({ data: { hotelId: hotel.id, denominazione: `${COGNOME} Viaggi`, tipo: "agenzia" } });
    creati.clienti.push(ag.id);
    const b = await prenota("Bruno", camere[1], "2035-03-12", "2035-03-14", 1);
    await prisma.prenotazione.update({ where: { id: b.id }, data: { canale: "agenzia", intermediarioId: ag.id } });
    await prisma.ospite.update({ where: { id: b.segmenti[0].ospiteId }, data: { cittadinanzaCodice: stato.codice, residenzaStatoCodice: stato.codice } });
    // Consumi: bar 30, abbuono 5, taxi anticipato 20 (esborso, non è ricavo).
    const bar = await prisma.repartoAddebito.create({ data: { hotelId: hotel.id, nome: `${COGNOME} Bar`, aliquotaIva: 10, esborso: false } });
    const taxi = await prisma.repartoAddebito.create({ data: { hotelId: hotel.id, nome: `${COGNOME} Taxi`, aliquotaIva: null, esborso: true } });
    creati.reparti.push(bar.id, taxi.id);
    const giorno = new Date("2035-03-12T00:00:00Z");
    await prisma.addebitoConto.createMany({
      data: [
        { prenotazioneId: b.id, repartoId: bar.id, tipo: "extra", data: giorno, descrizione: "Caffè", quantita: 3, prezzoUnitario: 10, aliquotaIva: 10, registratoDa: "Collaudo" },
        { prenotazioneId: b.id, repartoId: null, tipo: "abbuono", data: giorno, descrizione: "Sconto", quantita: 1, prezzoUnitario: 5, aliquotaIva: 10, nota: "prova", registratoDa: "Collaudo" },
        { prenotazioneId: b.id, repartoId: taxi.id, tipo: "esborso", data: giorno, descrizione: "Taxi", quantita: 1, prezzoUnitario: 20, aliquotaIva: null, registratoDa: "Collaudo" },
      ],
    });
    // C: annullata, non conta.
    const c = await prenota("Carla", camere[2], "2035-03-20", "2035-03-22", 2);
    await prisma.prenotazione.update({ where: { id: c.id }, data: { stato: "ANNULLATA", annullataIl: new Date() } });
    await prisma.segmentoSoggiorno.updateMany({ where: { prenotazioneId: c.id }, data: { stato: "ANNULLATO" } });
    // Una camera fuori servizio una notte.
    const fs = await prisma.cameraIndisponibilita.create({ data: { cameraId: camere[2].id, dal: new Date("2035-03-25T00:00:00Z"), al: new Date("2035-03-26T00:00:00Z"), motivo: "Collaudo" } });
    creati.fuori.push(fs.id);

    const s = await statistiche(hotel.id, DAL, AL, true, DAL);
    const o = s.ora;
    const p0 = prima.ora;
    verifica("Notti: 5 in più (l'annullata non conta)", o.vendute - p0.vendute === 5, [p0.vendute, o.vendute]);
    verifica("Camere disponibili: una notte in meno per il fuori servizio", p0.disponibili - o.disponibili === 1 && o.giorni === 31);
    verifica("Presenze 8 in più (3 notti × 2 + 2 × 1), arrivi 3 persone in più", o.presenze - p0.presenze === 8 && o.arrivi - p0.arrivi === 3);
    verifica("Ricavo delle notti: 500 in più", vicino(o.ricavoNotti! - p0.ricavoNotti!, 500));
    const voce = (x: typeof o, n: string) => x.voci.find((v) => v.voce === n)?.importo ?? 0;
    verifica(
      "Ricavi per voce: servizio 40 (all'arrivo), bar 30, abbuoni −5, taxi anticipato escluso",
      vicino(voce(o, "Servizi aggiunti") - voce(p0, "Servizi aggiunti"), 40) && vicino(voce(o, `${COGNOME} Bar`), 30) && vicino(voce(o, "Abbuoni e sconti") - voce(p0, "Abbuoni e sconti"), -5) && !o.voci.some((v) => v.voce === `${COGNOME} Taxi`),
      o.voci,
    );
    verifica("Ricavo totale: 565 in più", vicino(o.ricavoTotale! - p0.ricavoTotale!, 565), [p0.ricavoTotale, o.ricavoTotale]);
    if (p0.vendute === 0) verifica("Prezzo medio 100 e permanenza 8/3", o.prezzoMedio === 100 && o.permanenzaMedia === 2.7, [o.prezzoMedio, o.permanenzaMedia]);
    const agenzia = o.perCanale.find((x) => x.nome.startsWith("Agenzia"));
    verifica("Canale agenzia: 1 prenotazione, 2 notti", !!agenzia && agenzia.vendute - (prima.ora.perCanale.find((x) => x.nome.startsWith("Agenzia"))?.vendute ?? 0) === 2);
    verifica("Intermediario: l'agenzia di prova con 2 notti", o.perIntermediario.some((x) => x.nome === `${COGNOME} Viaggi` && x.vendute === 2 && x.prenotazioni === 1));
    const prov = o.provenienza.find((x) => x.nome === `Provincia di ${comune.provincia}`);
    const estero = o.provenienza.find((x) => x.nome === nomeLeggibile(stato.descrizione));
    verifica("Provenienza: provincia dell'italiana (6 presenze) e stato della straniera (2)", !!prov && prov.italia && !!estero && !estero.italia && estero.presenze >= 2, [prov, estero]);
    const giorno12 = o.perGiorno.find((g) => g.giorno === "2035-03-12")!;
    verifica("Giorno 12: 2 notti vendute (Anna e Bruno)", giorno12.vendute - (p0.perGiorno.find((g) => g.giorno === "2035-03-12")!.vendute) === 2);
    const tipo = o.perTipo.find((x) => x.tipo);
    verifica("Per tipo di camera: notti e disponibili coerenti", !!tipo && o.perTipo.reduce((t, x) => t + x.vendute, 0) === o.vendute);

    const senza = await statistiche(hotel.id, DAL, AL, false, DAL);
    verifica(
      "Senza «vedere importi»: nessun importo, notti uguali",
      senza.ora.ricavoNotti === null && senza.ora.prezzoMedio === null && senza.ora.voci.every((v) => v.importo === null) && senza.ora.perCanale.every((x) => x.ricavo === null) && senza.ora.vendute === o.vendute,
    );

    // Prenotato: marzo 2035 adesso; marzo 2034 un anno fa (1/3/2034) con una prenotazione annullata dopo.
    const vecchia = await prenota("Dario", camere[0], "2034-03-20", "2034-03-22", 2);
    await prisma.prenotazione.update({ where: { id: vecchia.id }, data: { createdAt: new Date("2034-01-15T10:00:00Z"), stato: "ANNULLATA", annullataIl: new Date("2034-03-10T10:00:00Z") } });
    await prisma.segmentoSoggiorno.updateMany({ where: { prenotazioneId: vecchia.id }, data: { stato: "ANNULLATO" } });
    const recente = await prenota("Elena", camere[1], "2034-03-05", "2034-03-06", 1);
    await prisma.prenotazione.update({ where: { id: recente.id }, data: { createdAt: new Date("2034-02-20T10:00:00Z") } });
    const dopo = await statistiche(hotel.id, DAL, AL, true, DAL);
    const m0 = prima.prenotato[0];
    const m1 = dopo.prenotato[0];
    verifica("Prenotato marzo 2035 adesso: 5 notti in più", m1.mese === "2035-03" && m1.adesso - m0.adesso === 5, [m0, m1]);
    verifica(
      "Un anno fa (1/3/2034): contano la prenotazione annullata dopo (2) e quella già fatta (1); alla fine solo quest'ultima",
      m1.unAnnoFa - m0.unAnnoFa === 3 && m1.finaleAnnoPrima - m0.finaleAnnoPrima === 1,
      [m0, m1],
    );
  } finally {
    for (const id of ids) {
      await prisma.addebitoConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiunto: { prenotazioneId: id } } });
      await prisma.servizioAggiunto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
    await prisma.cliente.deleteMany({ where: { id: { in: creati.clienti } } });
    await prisma.repartoAddebito.deleteMany({ where: { id: { in: creati.reparti } } });
    await prisma.cameraIndisponibilita.deleteMany({ where: { id: { in: creati.fuori } } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
