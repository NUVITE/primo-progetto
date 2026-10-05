/**
 * Collaudo di richieste degli ospiti (dal QR e dal personale), guasti segnalati dall'ospite e registro
 * degli oggetti smarriti (probabile proprietario, da smaltire, restituzione, smaltimento).
 * Primo hotel (moduli Pulizie e Manutenzioni accesi per il collaudo, poi tornano com'erano), due
 * camere libere intorno a oggi; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-richieste-oggetti.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { codiceCartoncino, paginaOspite } from "../src/lib/roomService";
import {
  chiudiRichiesta,
  creaRichiesta,
  elencoOggetti,
  elencoRichieste,
  guastoDaQr,
  impostaConservazione,
  registraOggetto,
  restituisciOggetto,
  richiestaDaQr,
  smaltisciOggetto,
} from "../src/lib/richieste";
import { creaPrenotazione } from "../src/lib/prenotazioni";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
async function errore(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

const NOME = "CollaudoRichieste";
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const prima = { moduli: hotel.moduli ?? [], mesiConservazioneOggetti: hotel.mesiConservazioneOggetti };
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const conModuli = (m: string[]) => prisma.hotel.update({ where: { id: hotel.id }, data: { moduli: m } });
  const base = ((prima.moduli as string[]) ?? []).filter((m) => !["pulizie", "manutenzioni", "ristorazione"].includes(m));

  const dal = new Date(giorno(-3));
  const al = new Date(giorno(3));
  const libere = [];
  for (const c of await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } })) {
    const occupata = await prisma.segmentoSoggiorno.count({ where: { cameraId: c.id, stato: { not: "ANNULLATO" }, prenotazione: { stato: { not: "ANNULLATA" } }, dataInizio: { lt: al }, dataFine: { gt: dal } } });
    if (!occupata) libere.push(c);
    if (libere.length === 2) break;
  }
  if (libere.length < 2) throw new Error("Servono due camere libere intorno a oggi: il collaudo non si può fare adesso.");
  const [camA, camB] = libere;
  const ids: number[] = [];
  const prenota = async (camera: typeof camA, da: number, a: number) => {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento, listinoId: listino.id, dataInizio: giorno(da), dataFine: giorno(a), composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(p.id);
    return p;
  };

  try {
    await conModuli([...base, "pulizie", "manutenzioni"]);
    const pA = await prenota(camA, -1, 2);
    const segA = pA.segmenti[0];
    await prisma.presenza.updateMany({ where: { segmentoId: segA.id }, data: { stato: "arrivato", arrivoIl: new Date() } });
    const { codice } = await codiceCartoncino(hotel.id, segA.id);

    let pg = await paginaOspite(codice);
    verifica("QR con Pulizie e Manutenzioni (senza Ristorazione): richieste e guasti sì, room service no", pg?.attivo === true && pg.servizi.richieste && pg.servizi.guasti && !pg.servizi.roomService);

    const e1 = await errore(() => richiestaDaQr(codice, { tipo: "champagne" as never, dettaglio: "", perQuando: null }));
    verifica("Richiesta di un tipo inventato: rifiutata", !!e1, e1 ?? "");
    const e2 = await errore(() => richiestaDaQr(codice, { tipo: "sveglia", dettaglio: "", perQuando: null }));
    verifica("Sveglia senza ora: rifiutata", !!e2, e2 ?? "");
    const e3 = await errore(() => richiestaDaQr(codice, { tipo: "altro", dettaglio: " ", perQuando: null }));
    verifica("«Altro» senza testo: rifiutata", !!e3, e3 ?? "");
    await richiestaDaQr(codice, { tipo: "asciugamani", dettaglio: "due teli doccia", perQuando: null });
    await richiestaDaQr(codice, { tipo: "sveglia", dettaglio: "", perQuando: `${giorno(1)}T07:00` });
    for (let i = 0; i < 3; i++) await richiestaDaQr(codice, { tipo: "cuscino", dettaglio: "", perQuando: null });
    const e4 = await errore(() => richiestaDaQr(codice, { tipo: "coperta", dettaglio: "", perQuando: null }));
    verifica("Dal QR al massimo 5 richieste in attesa", !!e4, e4 ?? "");
    await creaRichiesta(hotel.id, camB.id, { tipo: "culla", dettaglio: "per domani", perQuando: null }, "Reception");
    let aperte = (await elencoRichieste(hotel.id, "aperte")).filter((r) => r.camera === camA.codice || r.camera === camB.codice);
    verifica("Elenco: la sveglia viene prima delle altre", aperte[0]?.tipo === "sveglia", aperte.map((r) => r.tipo));
    verifica("La richiesta del personale c'è, senza ospite in casa", aperte.some((r) => r.camera === camB.codice && r.tipo === "culla" && r.origine === "personale"));

    const asciugamani = aperte.find((r) => r.tipo === "asciugamani")!;
    await chiudiRichiesta(hotel.id, asciugamani.id, "fatta", "", "Maria");
    const e5 = await errore(() => chiudiRichiesta(hotel.id, asciugamani.id, "fatta", "", "Maria"));
    verifica("Già fatta: non si chiude di nuovo", !!e5, e5 ?? "");
    const culla = aperte.find((r) => r.tipo === "culla")!;
    const e6 = await errore(() => chiudiRichiesta(hotel.id, culla.id, "annullata", "", "Maria"));
    verifica("Annullare richiede il motivo", !!e6, e6 ?? "");
    pg = await paginaOspite(codice);
    verifica("L'ospite vede la sua richiesta fatta", pg?.attivo === true && pg.richieste.some((r) => r.tipo === "asciugamani" && r.stato === "fatta"));

    // Guasti dall'ospite.
    await guastoDaQr(codice, `${NOME}: la luce del bagno non si accende`);
    const g = await prisma.segnalazione.findFirst({ where: { cameraId: camA.id, origine: "ospite" } });
    verifica("Guasto dall'ospite: segnalazione di priorità normale, origine ospite", g?.priorita === "normale" && g.stato === "aperta");
    await guastoDaQr(codice, `${NOME}: rubinetto`);
    await guastoDaQr(codice, `${NOME}: tapparella`);
    const e7 = await errore(() => guastoDaQr(codice, `${NOME}: altro`));
    verifica("Dal QR al massimo 3 guasti aperti", !!e7, e7 ?? "");

    await conModuli([...base, "manutenzioni"]);
    const e8 = await errore(() => richiestaDaQr(codice, { tipo: "cuscino", dettaglio: "", perQuando: null }));
    verifica("Modulo Pulizie spento: niente richieste dal QR", !!e8, e8 ?? "");
    await conModuli([...base, "pulizie", "manutenzioni"]);

    await prisma.presenza.updateMany({ where: { segmentoId: segA.id }, data: { stato: "partito", partenzaIl: new Date() } });
    const e9 = await errore(() => richiestaDaQr(codice, { tipo: "cuscino", dettaglio: "", perQuando: null }));
    verifica("Dopo la partenza il QR non accetta richieste", !!e9, e9 ?? "");

    // Oggetti smarriti.
    const pB = await prenota(camB, -3, -1);
    const e10 = await errore(() => registraOggetto(hotel.id, { trovatoIl: giorno(1), cameraId: camB.id, zona: "", descrizione: `${NOME} occhiali`, conservatoIn: "" }, "Maria"));
    verifica("Data futura: rifiutata", !!e10, e10 ?? "");
    const oB = await registraOggetto(hotel.id, { trovatoIl: giorno(0), cameraId: camB.id, zona: "", descrizione: `${NOME} caricabatterie`, conservatoIn: "armadio governante" }, "Maria");
    const oA = await registraOggetto(hotel.id, { trovatoIl: giorno(0), cameraId: camA.id, zona: "", descrizione: `${NOME} libro`, conservatoIn: "" }, "Maria");
    const oZ = await registraOggetto(hotel.id, { trovatoIl: giorno(0), cameraId: null, zona: "piscina", descrizione: `${NOME} telo mare`, conservatoIn: "" }, "Maria");
    const vecchio = await registraOggetto(hotel.id, { trovatoIl: giorno(-250), cameraId: null, zona: "hall", descrizione: `${NOME} ombrello`, conservatoIn: "" }, "Maria");
    let elenco = (await elencoOggetti(hotel.id, "deposito")).oggetti;
    const trova = (id: number) => elenco.find((o) => o.id === id);
    verifica("Camera lasciata ieri: probabile proprietario chi è partito", trova(oB)?.proprietario?.prenotazioneId === pB.id, trova(oB)?.proprietario);
    verifica("Camera occupata: probabile proprietario l'ospite in camera", trova(oA)?.proprietario?.prenotazioneId === pA.id);
    verifica("Zona comune: nessun proprietario proposto", trova(oZ)?.proprietario === null);
    verifica("Dopo 6 mesi in deposito: da smaltire", trova(vecchio)?.daSmaltire === true && trova(oZ)?.daSmaltire === false);

    const e11 = await errore(() => restituisciOggetto(hotel.id, oB, " ", "", "Maria"));
    verifica("Restituito senza dire a chi: rifiutato", !!e11, e11 ?? "");
    await restituisciOggetto(hotel.id, oB, "Ospite " + NOME, "spedito con corriere", "Maria");
    const e12 = await errore(() => smaltisciOggetto(hotel.id, vecchio, "", "Maria"));
    verifica("Smaltito senza dire come: rifiutato", !!e12, e12 ?? "");
    await smaltisciOggetto(hotel.id, vecchio, "donato alla Caritas", "Maria");
    const chiusi = (await elencoOggetti(hotel.id, "chiusi")).oggetti;
    verifica("Restituito e smaltito tra i chiusi", chiusi.some((o) => o.id === oB && o.stato === "restituito") && chiusi.some((o) => o.id === vecchio && o.stato === "smaltito"));
    const e13 = await errore(() => restituisciOggetto(hotel.id, oB, "altro", "", "Maria"));
    verifica("Già restituito: non si restituisce di nuovo", !!e13, e13 ?? "");
    const e14 = await errore(() => impostaConservazione(hotel.id, 0));
    verifica("Conservazione di 0 mesi: rifiutata", !!e14, e14 ?? "");
    elenco = (await elencoOggetti(hotel.id, "deposito")).oggetti;
  } finally {
    await prisma.richiestaOspite.deleteMany({ where: { cameraId: { in: [camA.id, camB.id] }, creataIl: { gte: new Date(Date.now() - 3600000) } } });
    await prisma.segnalazione.deleteMany({ where: { descrizione: { startsWith: NOME } } });
    await prisma.oggettoSmarrito.deleteMany({ where: { descrizione: { startsWith: NOME } } });
    for (const id of ids) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.hotel.update({ where: { id: hotel.id }, data: { moduli: prima.moduli, mesiConservazioneOggetti: prima.mesiConservazioneOggetti } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati, moduli dell'hotel ripristinati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
