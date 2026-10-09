/**
 * Collaudo dell'arrivo autonomo: regole pure (codice su una riga, testi con una o più unità, codice del
 * soggiorno che sostituisce quello fisso), istruzioni e codice per camera, codice per soggiorno,
 * valori dell'email "Istruzioni di arrivo" (it/en) e promemoria degli arrivi vicini senza istruzioni
 * inviate (non per le annullate, non dopo l'invio). Primo hotel, prenotazioni nel 2034; camere,
 * prenotazioni ed email di prova tornano come prima.
 *   npx tsx scripts/collaudo-arrivo.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { codiceEffettivo, normalizzaCodice, normalizzaIstruzioni, testiArrivo } from "../src/lib/arrivoRegole";
import { arriviSenzaIstruzioni, datiArrivo, impostaArrivoCamera, impostaCodiceSoggiorno, valoriArrivo } from "../src/lib/arrivo";
import { anteprimaEmail } from "../src/lib/email";
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
const COGNOME = "CollaudoArrivo";
const ISTRUZIONI = "Portone in via Roma 12, cassetta delle chiavi a destra del citofono.";

async function main() {
  verifica("Codice su più righe: rifiutato", !!(await errore(async () => normalizzaCodice("12\n34"))));
  verifica("Codice troppo lungo: rifiutato", !!(await errore(async () => normalizzaCodice("x".repeat(41)))));
  verifica("Codice e istruzioni vuoti = nessuno", normalizzaCodice("  ") === null && normalizzaIstruzioni(" \n ") === null);
  verifica("Codice del soggiorno al posto di quello fisso", codiceEffettivo("9999", "1234") === "9999" && codiceEffettivo(null, "1234") === "1234" && codiceEffettivo(null, null) === null);
  const una = testiArrivo([{ nome: "Camera 1", istruzioni: "Entra", codice: "11" }]);
  verifica("Una sola unità: testi così come sono", una.istruzioni_arrivo === "Entra" && una.codice_accesso === "11", una);
  const due = testiArrivo([
    { nome: "Camera 1", istruzioni: "Entra", codice: "11" },
    { nome: "Camera 2", istruzioni: null, codice: "22" },
  ]);
  verifica("Più unità: ciascuna con il suo nome", due.istruzioni_arrivo === "Camera 1:\nEntra" && due.codice_accesso === "Camera 1: 11, Camera 2: 22", due);

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const camere = await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" }, take: 2 });
  if (camere.length < 2) throw new Error("Servono 2 camere attive nel primo hotel.");
  const [a, b] = camere;
  const ids: number[] = [];
  const prenota = async (nome: string, quali: typeof camere, dal: string, al: string) => {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome, cognome: COGNOME },
      segmenti: quali.map((c) => ({ cameraId: c.id, tipoCameraId: c.tipoCameraId, ospite: { nome, cognome: COGNOME }, trattamento, listinoId: listino.id, dataInizio: dal, dataFine: al, composizione: { adulti: 1, etaBambini: [] } })),
    });
    ids.push(p.id);
    return p;
  };

  try {
    const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
    if (altroHotel) verifica("Camera di un altro hotel: rifiutata", !!(await errore(() => impostaArrivoCamera(altroHotel.id, a.id, "x", "1"))));
    await impostaArrivoCamera(hotel.id, a.id, `  ${ISTRUZIONI}  `, " 1234 ");
    await impostaArrivoCamera(hotel.id, b.id, "", "5678");
    const ca = await prisma.camera.findUniqueOrThrow({ where: { id: a.id } });
    verifica("Istruzioni e codice della camera salvati (senza spazi in più)", ca.istruzioniArrivo === ISTRUZIONI && ca.codiceAccesso === "1234");

    // Una camera, arrivo il 10 gennaio 2034.
    const p = await prenota("Anna", [a], "2034-01-10", "2034-01-13");
    let d = await datiArrivo(hotel.id, p.id);
    verifica("Riquadro: codice fisso della camera", d.unita.length === 1 && d.unita[0].codice === "1234" && d.unita[0].codiceSoggiorno === null && d.unita[0].istruzioni && !d.inviata, d);
    const seg = p.segmenti[0].id;
    await impostaCodiceSoggiorno(hotel.id, p.id, seg, "9999");
    d = await datiArrivo(hotel.id, p.id);
    verifica("Codice di questo soggiorno: sostituisce quello fisso", d.unita[0].codice === "9999" && d.unita[0].codiceSoggiorno === "9999" && d.unita[0].codiceUnita === "1234");
    verifica("Codice di un soggiorno di un'altra prenotazione: rifiutato", !!(await errore(() => impostaCodiceSoggiorno(hotel.id, p.id + 100000, seg, "1"))));
    let v = await valoriArrivo(hotel.id, p.id, "it");
    verifica("Email: istruzioni della camera e codice del soggiorno", v.istruzioni_arrivo === ISTRUZIONI && v.codice_accesso === "9999", v);
    await impostaCodiceSoggiorno(hotel.id, p.id, seg, "");
    v = await valoriArrivo(hotel.id, p.id, "it");
    verifica("Codice del soggiorno tolto: torna quello fisso", v.codice_accesso === "1234");
    const ant = await anteprimaEmail(hotel.id, p.id, "arrivo", "it", true, (l) => valoriArrivo(hotel.id, p.id, l));
    verifica(
      "Anteprima del modello: istruzioni e codice compilati",
      ant.corpo.includes(ISTRUZIONI) && ant.corpo.includes("Codice di accesso: 1234") && !ant.mancanti.includes("istruzioni_arrivo") && !ant.mancanti.includes("codice_accesso"),
      ant.mancanti,
    );

    // Due camere: ciascuna con il suo nome; in inglese "Room"/"Apartment".
    const q = await prenota("Bruno", [a, b], "2034-01-20", "2034-01-22");
    const it = await valoriArrivo(hotel.id, q.id, "it");
    const en = await valoriArrivo(hotel.id, q.id, "en");
    verifica("Due camere: istruzioni solo di quella che le ha, codici di entrambe", it.istruzioni_arrivo.endsWith(`${a.codice}:\n${ISTRUZIONI}`) && it.codice_accesso.includes(`${a.codice}: 1234`) && it.codice_accesso.includes(`${b.codice}: 5678`), it);
    verifica("In inglese le unità hanno il nome inglese", /^(Room|Apartment) /.test(en.codice_accesso), en);

    // Promemoria: dal 7 gennaio l'arrivo del 10 è nei 3 giorni; dal 1° no.
    const arrivi = (g: string) => arriviSenzaIstruzioni(hotel.id, g).then((r) => r.filter((x) => ids.includes(x.prenotazioneId)));
    let r = await arrivi("2034-01-07");
    verifica("Promemoria: arrivo fra 3 giorni senza istruzioni", r.length === 1 && r[0].prenotazioneId === p.id && r[0].camere.join() === a.codice, r);
    verifica("Promemoria: arrivo fra 9 giorni ancora no", (await arrivi("2034-01-01")).length === 0);
    await prisma.emailInviata.create({ data: { hotelId: hotel.id, prenotazioneId: p.id, modello: "errore-finto", lingua: "it", destinatario: "x@example.com", oggetto: "x", corpo: "x", esito: "inviata", inviataDa: "Collaudo" } });
    await prisma.emailInviata.create({ data: { hotelId: hotel.id, prenotazioneId: p.id, modello: "arrivo", lingua: "it", destinatario: "x@example.com", oggetto: "x", corpo: "x", esito: "errore", inviataDa: "Collaudo" } });
    verifica("Promemoria: un'altra email o un invio fallito non bastano", (await arrivi("2034-01-07")).length === 1);
    await prisma.emailInviata.create({ data: { hotelId: hotel.id, prenotazioneId: p.id, modello: "arrivo", lingua: "it", destinatario: "x@example.com", oggetto: "x", corpo: "x", esito: "inviata", inviataDa: "Collaudo" } });
    verifica("Promemoria: istruzioni inviate, sparisce", (await arrivi("2034-01-07")).length === 0);
    d = await datiArrivo(hotel.id, p.id);
    verifica("Riquadro: istruzioni inviate a chi", d.inviata?.a === "x@example.com" && d.inviata.da === "Collaudo");
    r = await arrivi("2034-01-18");
    verifica("Promemoria: la prenotazione con due camere compare una volta sola", r.length === 1 && r[0].prenotazioneId === q.id && r[0].camere.length === 2, r);
    await prisma.prenotazione.update({ where: { id: q.id }, data: { stato: "ANNULLATA" } });
    verifica("Promemoria: le annullate no", (await arrivi("2034-01-18")).length === 0);
  } finally {
    for (const id of ids) {
      await prisma.emailInviata.deleteMany({ where: { prenotazioneId: id } });
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
    for (const c of camere) await prisma.camera.update({ where: { id: c.id }, data: { istruzioniArrivo: c.istruzioniArrivo, codiceAccesso: c.codiceAccesso } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati, camere ripristinate)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
