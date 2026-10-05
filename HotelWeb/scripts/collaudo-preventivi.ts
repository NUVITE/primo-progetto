/**
 * Collaudo di richieste e preventivi: validazione, disponibilità, prezzo dal listino e prezzo offerto,
 * pagina pubblica (visto alla prima apertura), accettazione online che crea la prenotazione in opzione
 * con acconto e prezzo concordato, rifiuto, scadenza, chiusura con motivo, invio email (trasporto
 * finto) e statistiche. Primo hotel, date nel 2033; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-preventivi.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { camereLibere, conversione } from "../src/lib/preventiviRegole";
import {
  accettaPreventivo,
  anteprimaEmailPreventivo,
  calcolaProposta,
  chiudiRichiestaDisp,
  creaPreventivo,
  creaRichiestaDisp,
  dettaglioRichiestaDisp,
  disponibilitaTipo,
  elencoRichiesteDisp,
  inviaPreventivo,
  paginaPreventivo,
  rifiutaPreventivo,
  risposteDaVedere,
  segnaPreventivoInviato,
  segnaRispostaVista,
  statisticheRichieste,
  type RichiestaDispInput,
} from "../src/lib/preventivi";
import { salvaConfigurazioneEmail, type Trasporto } from "../src/lib/email";

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

const NOME = "CollaudoPreventivi";
const base: RichiestaDispInput = {
  canale: "email",
  nome: "Mario",
  cognome: NOME,
  email: "mario@esempio.invalid",
  telefono: "",
  lingua: "it",
  dal: "2033-06-10",
  al: "2033-06-13",
  adulti: 2,
  etaBambini: [],
  camere: 1,
  trattamento: "",
  budget: "",
  note: "",
};

async function main() {
  verifica("Camere libere: minimo notte per notte", camereLibere(4, [1, 3, 2]) === 1 && camereLibere(4, []) === 4 && camereLibere(2, [3]) === 0);
  verifica("Conversione in percentuale", conversione(1, 3) === 33.3 && conversione(0, 0) === 0);

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const configPrima = await prisma.configurazioneEmail.findUnique({ where: { hotelId: hotel.id } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  // Un tipo di camera con almeno una camera attiva.
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } });
  const tipoId = camera.tipoCameraId;
  const inviati: { to: string; subject: string; text: string }[] = [];
  const finto: Trasporto = { invia: async (m) => void inviati.push(m) };

  try {
    const e1 = await errore(() => creaRichiestaDisp(hotel.id, { ...base, al: base.dal }, "Anna"));
    verifica("Partenza uguale all'arrivo: rifiutata", !!e1, e1 ?? "");
    const e2 = await errore(() => creaRichiestaDisp(hotel.id, { ...base, email: "mario" }, "Anna"));
    verifica("Email non valida: rifiutata", !!e2, e2 ?? "");
    const rid = await creaRichiestaDisp(hotel.id, base, "Anna");

    const calc = await calcolaProposta(hotel.id, rid, { tipoCameraId: tipoId, listinoId: listino.id, trattamento });
    const libere = await disponibilitaTipo(hotel.id, tipoId, new Date(base.dal), new Date(base.al));
    verifica("Proposta: camere libere coerenti con la disponibilità del tipo", calc.libere === libere && libere >= 1, calc);

    const e3 = await errore(() => creaPreventivo(hotel.id, rid, { validoFino: "2020-01-01", accontoRichiesto: null, messaggio: "", proposte: [{ tipoCameraId: tipoId, listinoId: listino.id, trattamento, prezzo: 300, nota: "" }] }, "Anna"));
    verifica("Validità già passata: rifiutato", !!e3, e3 ?? "");
    const e4 = await errore(() => creaPreventivo(hotel.id, rid, { validoFino: "2033-01-01", accontoRichiesto: null, messaggio: "", proposte: [] }, "Anna"));
    verifica("Senza proposte: rifiutato", !!e4, e4 ?? "");

    // Prezzo offerto 450 (diverso dal listino): all'accettazione diventa prezzo concordato.
    const pid = await creaPreventivo(
      hotel.id,
      rid,
      { validoFino: "2033-01-01", accontoRichiesto: 100, messaggio: "Vista mare garantita", proposte: [{ tipoCameraId: tipoId, listinoId: listino.id, trattamento, prezzo: 450, nota: "con late check-out" }] },
      "Anna",
    );
    let d = await dettaglioRichiestaDisp(hotel.id, rid);
    verifica("Preventivo da inviare con il prezzo offerto e quello del listino", d.preventivi[0].stato === "bozza" && d.preventivi[0].proposte[0].prezzo === 450 && d.preventivi[0].proposte[0].prezzoCalcolato === calc.prezzo);
    verifica("Bozza: il link non mostra ancora nulla", (await paginaPreventivo(d.preventivi[0].codice)) === null);

    // Email del preventivo con trasporto finto.
    if (configPrima) await prisma.configurazioneEmail.delete({ where: { hotelId: hotel.id } });
    await salvaConfigurazioneEmail(hotel.id, { host: "smtp.esempio.invalid", porta: 465, sicurezza: "ssl", utente: "x@esempio.invalid", password: "prova", mittenteNome: "Hotel", mittenteEmail: "x@esempio.invalid", rispondiA: "" }, "Anna");
    const a = await anteprimaEmailPreventivo(hotel.id, pid, "it", "https://hotel.esempio.invalid");
    verifica("Email del preventivo: link e scadenza compilati", a.corpo.includes(`https://hotel.esempio.invalid/pv/${d.preventivi[0].codice}`) && a.destinatario === "mario@esempio.invalid" && !a.mancanti.some((m) => m === "link_preventivo" || m === "valido_fino"), a.mancanti);
    const corpo = a.corpo.replace(/\{\{\s*[a-z_]+\s*\}\}/g, "");
    await inviaPreventivo(hotel.id, pid, { destinatario: a.destinatario, oggetto: a.oggetto, corpo, lingua: "it" }, "Anna", finto);
    d = await dettaglioRichiestaDisp(hotel.id, rid);
    verifica("Inviato: preventivo e richiesta aggiornati, email nello storico della richiesta", d.preventivi[0].stato === "inviato" && d.stato === "preventivo" && d.emailInviate.length === 1 && inviati.length === 1);

    // Pagina pubblica.
    const pg = await paginaPreventivo(d.preventivi[0].codice);
    verifica("Pagina dell'ospite: proposta, prezzo a notte, acconto, messaggio", pg?.proposte[0].prezzo === 450 && pg.proposte[0].aNotte === 150 && pg.accontoRichiesto === 100 && pg.messaggio === "Vista mare garantita");
    d = await dettaglioRichiestaDisp(hotel.id, rid);
    verifica("Alla prima apertura il preventivo risulta visto", d.preventivi[0].stato === "visto" && !!d.preventivi[0].vistoIl);
    verifica("Codice sconosciuto: nessuna pagina", (await paginaPreventivo("x".repeat(24))) === null);

    // Accettazione.
    const e5 = await errore(() => accettaPreventivo(d.preventivi[0].codice, 999999));
    verifica("Proposta inesistente: rifiutata", !!e5, e5 ?? "");
    const prenId = await accettaPreventivo(d.preventivi[0].codice, d.preventivi[0].proposte[0].id);
    const pren = await prisma.prenotazione.findUniqueOrThrow({ where: { id: prenId }, include: { segmenti: true, ospitePrenotante: true } });
    verifica("Prenotazione in opzione, con l'acconto e camere da assegnare", pren.stato === "OPZIONE" && Number(pren.accontoRichiesto) === 100 && pren.segmenti.length === 1 && pren.segmenti[0].cameraId === null);
    verifica("Prezzo offerto diventato prezzo concordato (150 a notte)", Number(pren.segmenti[0].prezzoConcordato) === 150);
    verifica("Ospite creato con l'email della richiesta", pren.ospitePrenotante.email === "mario@esempio.invalid" && pren.mezzo === "email");
    d = await dettaglioRichiestaDisp(hotel.id, rid);
    verifica("Richiesta accettata e collegata alla prenotazione, risposta da vedere", d.stato === "accettata" && d.prenotazioneId === prenId && d.preventivi[0].daVedere);
    verifica("Avviso per la reception", (await risposteDaVedere(hotel.id)) >= 1);
    await segnaRispostaVista(hotel.id, rid);
    verifica("Vista: l'avviso sparisce", !(await dettaglioRichiestaDisp(hotel.id, rid)).preventivi[0].daVedere);
    const e6 = await errore(() => accettaPreventivo(d.preventivi[0].codice, d.preventivi[0].proposte[0].id));
    verifica("Non si accetta due volte", !!e6, e6 ?? "");

    // Rifiuto online.
    const rid2 = await creaRichiestaDisp(hotel.id, { ...base, dal: "2033-09-01", al: "2033-09-03", canale: "telefono" }, "Anna");
    const pid2 = await creaPreventivo(hotel.id, rid2, { validoFino: "2033-08-01", accontoRichiesto: null, messaggio: "", proposte: [{ tipoCameraId: tipoId, listinoId: listino.id, trattamento, prezzo: 200, nota: "" }] }, "Anna");
    await segnaPreventivoInviato(hotel.id, pid2);
    const cod2 = (await dettaglioRichiestaDisp(hotel.id, rid2)).preventivi[0].codice;
    await rifiutaPreventivo(cod2, "troppo caro");
    const d2 = await dettaglioRichiestaDisp(hotel.id, rid2);
    verifica("Rifiutato online: motivo registrato, richiesta rifiutata", d2.stato === "rifiutata" && d2.preventivi[0].motivoRifiuto === "troppo caro");

    // Scadenza.
    const rid3 = await creaRichiestaDisp(hotel.id, { ...base, dal: "2033-10-01", al: "2033-10-02" }, "Anna");
    const pid3 = await creaPreventivo(hotel.id, rid3, { validoFino: "2033-01-01", accontoRichiesto: null, messaggio: "", proposte: [{ tipoCameraId: tipoId, listinoId: listino.id, trattamento, prezzo: 99, nota: "" }] }, "Anna");
    await segnaPreventivoInviato(hotel.id, pid3);
    await prisma.preventivo.update({ where: { id: pid3 }, data: { validoFino: new Date("2020-01-01") } });
    await elencoRichiesteDisp(hotel.id, "aperte");
    const d3 = await dettaglioRichiestaDisp(hotel.id, rid3);
    verifica("Oltre la validità: preventivo e richiesta scaduti", d3.preventivi[0].stato === "scaduto" && d3.stato === "scaduta");
    const e7 = await errore(() => accettaPreventivo(d3.preventivi[0].codice, d3.preventivi[0].proposte[0].id));
    verifica("Scaduto: non si accetta", !!e7, e7 ?? "");

    // Chiusura a mano con motivo.
    const rid4 = await creaRichiestaDisp(hotel.id, { ...base, dal: "2033-11-01", al: "2033-11-02", canale: "web" }, "Anna");
    await chiudiRichiestaDisp(hotel.id, rid4, "date");
    verifica("Chiusa a mano: date non disponibili", (await dettaglioRichiestaDisp(hotel.id, rid4)).motivoRinuncia === "date");

    const st = await statisticheRichieste(hotel.id, 1);
    verifica("Statistiche: richieste di oggi contate, una accettata", st.richieste >= 4 && st.accettate >= 1 && st.perCanale.some((c) => c.canale === "email"));
  } finally {
    const richieste = await prisma.richiestaDisponibilita.findMany({ where: { hotelId: hotel.id, cognome: NOME }, select: { id: true, prenotazioneId: true } });
    await prisma.emailInviata.deleteMany({ where: { richiestaId: { in: richieste.map((r) => r.id) } } });
    await prisma.richiestaDisponibilita.deleteMany({ where: { id: { in: richieste.map((r) => r.id) } } });
    for (const id of richieste.map((r) => r.prenotazioneId).filter((x): x is number => x !== null)) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.configurazioneEmail.deleteMany({ where: { hotelId: hotel.id } });
    if (configPrima) await prisma.configurazioneEmail.create({ data: configPrima });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (nessuna email inviata davvero, dati di prova cancellati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
