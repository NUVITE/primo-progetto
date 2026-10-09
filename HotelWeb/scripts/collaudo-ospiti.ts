/**
 * Collaudo della scheda ospite: doppioni, soggiorni passati e ospite abituale, filtri dell'elenco,
 * ospiti da conoscere nella prenotazione, validazioni, consenso marketing, unione delle schede
 * (dati completati, prenotazioni spostate, traccia) e unioni rifiutate. Primo hotel, prenotazioni
 * nel 2021-2022 (passate) e nel 2033; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-ospiti.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { etichettaRitorno, trovaDoppioni, unisciTesti } from "../src/lib/ospitiRegole";
import { elencoOspiti, impostaConsensoMarketing, ospitiDaConoscere, salvaOspite, schedaOspite, soggiorniPassati, unisciOspiti, type DatiOspite } from "../src/lib/ospiti";
import { creaPrenotazioneGenerica } from "../src/lib/prenotazioni";

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

const COGNOME = "CollaudoScheda";

async function main() {
  // Regole pure.
  const o = (id: number, nome: string, cognome: string, extra: Partial<{ dataNascita: string; email: string; telefono: string; documentoNumero: string }> = {}) => ({
    id,
    nome,
    cognome,
    dataNascita: extra.dataNascita ?? null,
    email: extra.email ?? null,
    telefono: extra.telefono ?? null,
    documentoNumero: extra.documentoNumero ?? null,
  });
  verifica("Omonimi con date di nascita diverse: non sono doppioni", trovaDoppioni([o(1, "Mario", "Rossi", { dataNascita: "1950-01-01" }), o(2, "Mario", "Rossi", { dataNascita: "1980-01-01" })]).length === 0);
  const scambiati = trovaDoppioni([o(1, "Mario", "D'Angelo"), o(2, "dangelo", "Mário")]);
  verifica("Nome e cognome scambiati, accenti e apostrofi: doppioni", scambiati.length === 1 && scambiati[0].motivi[0] === "stesso nome e cognome", scambiati);
  verifica("Stessa email ma cognome diverso (in famiglia): non doppioni", trovaDoppioni([o(1, "Anna", "Bianchi", { email: "x@y.it" }), o(2, "Luca", "Verdi", { email: "x@y.it" })]).length === 0);
  verifica("Stesso telefono (+39 e spazi) e stesso cognome: doppioni", trovaDoppioni([o(1, "Anna", "Bianchi", { telefono: "+39 333 1234567" }), o(2, "Annina", "Bianchi", { telefono: "3331234567" })]).length === 1);
  verifica("Stesso documento: doppioni anche con nomi diversi", trovaDoppioni([o(1, "A", "B", { documentoNumero: "AX 123" }), o(2, "C", "D", { documentoNumero: "ax123" })]).length === 1);
  verifica("Testi uniti senza ripetere", unisciTesti("cuscino basso", "cuscino basso") === "cuscino basso" && unisciTesti("a", "b") === "a\nb" && unisciTesti(null, "b") === "b");
  verifica("Etichetta del ritorno", etichettaRitorno(0) === null && etichettaRitorno(1)!.startsWith("Già") && etichettaRitorno(3)!.startsWith("Ospite abituale"));

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { hotelId: hotel.id, camere: { some: { attivo: true } } } });
  const ids: number[] = [];
  const prenota = async (ospite: number, dal: string, al: string) => {
    const p = await creaPrenotazioneGenerica(hotel.id, {
      ospitePrenotante: { id: ospite },
      listinoId: listino.id,
      trattamento,
      dataInizio: dal,
      dataFine: al,
      richieste: [{ tipoCameraId: tipo.id, quantita: 1, composizione: { adulti: 2, etaBambini: [] } }],
    });
    ids.push(p.id);
    return p;
  };

  try {
    const a = await prisma.ospite.create({ data: { hotelId: hotel.id, nome: "Ospite", cognome: COGNOME, dataNascita: new Date("1980-01-01"), telefono: "0801234567" } });
    const b = await prisma.ospite.create({ data: { hotelId: hotel.id, nome: "Ospite", cognome: COGNOME, email: "ospite.collaudo@example.invalid", preferenze: "cuscino basso", riguardo: true, note: "arriva tardi" } });
    const c = await prisma.ospite.create({ data: { hotelId: hotel.id, nome: "Ospite", cognome: COGNOME, dataNascita: new Date("1975-05-05") } });
    const p1 = await prenota(a.id, "2021-03-01", "2021-03-03");
    const p2 = await prenota(b.id, "2022-05-10", "2022-05-12");
    const p3 = await prenota(b.id, "2033-08-01", "2033-08-03");

    const s = await soggiorniPassati(hotel.id, [a.id, b.id, c.id]);
    verifica("Soggiorni passati: uno per A e uno per B (il futuro non conta), nessuno per C", s.get(a.id)?.soggiorni === 1 && s.get(b.id)?.soggiorni === 1 && !s.has(c.id) && s.get(b.id)?.ultimo === "2022-05-12", [...s]);

    const dop = await elencoOspiti(hotel.id, COGNOME, "doppioni");
    const idsDop = dop.ospiti.map((x) => x.id);
    verifica("Filtro doppioni: A-B e B-C (A e C hanno nascite diverse ma B è senza data)", idsDop.includes(a.id) && idsDop.includes(b.id) && idsDop.includes(c.id));
    const rig = await elencoOspiti(hotel.id, COGNOME, "riguardo");
    verifica("Filtro di riguardo: solo B", rig.ospiti.length === 1 && rig.ospiti[0].id === b.id);
    verifica("Ricerca per email", (await elencoOspiti(hotel.id, "ospite.collaudo@example", "tutti")).ospiti.some((x) => x.id === b.id));

    const daC = await ospitiDaConoscere(hotel.id, p3.id);
    verifica("Prenotazione futura di B: B da conoscere (di riguardo, 1 soggiorno passato, preferenze)", daC.length === 1 && daC[0].riguardo && daC[0].soggiorni === 1 && daC[0].preferenze === "cuscino basso", daC);
    verifica("La prenotazione passata di A non conta sé stessa", (await ospitiDaConoscere(hotel.id, p1.id)).length === 0);

    // Validazioni.
    const base: DatiOspite = { nome: "Ospite", cognome: COGNOME, telefono: "", email: "", dataNascita: "1980-01-01", lingua: "", note: "", preferenze: "", riguardo: false };
    verifica("Email non valida: rifiutata", !!(await errore(() => salvaOspite(hotel.id, a.id, { ...base, email: "non-una-email" }))));
    verifica("Nascita nel futuro: rifiutata", !!(await errore(() => salvaOspite(hotel.id, a.id, { ...base, dataNascita: "2099-01-01" }))));
    verifica("Cognome vuoto: rifiutato", !!(await errore(() => salvaOspite(hotel.id, a.id, { ...base, cognome: " " }))));
    const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
    if (altroHotel) verifica("Ospite di un altro hotel: non trovato", !!(await errore(() => salvaOspite(altroHotel.id, a.id, base))));

    // Consenso marketing.
    verifica("Revocare un consenso mai dato: rifiutato", !!(await errore(() => impostaConsensoMarketing(hotel.id, a.id, false, null, "Anna"))));
    verifica("Consenso senza modo: rifiutato", !!(await errore(() => impostaConsensoMarketing(hotel.id, b.id, true, null, "Anna"))));
    await impostaConsensoMarketing(hotel.id, b.id, true, "modulo", "Anna");
    let sb = await schedaOspite(hotel.id, b.id);
    verifica("Consenso registrato con modo e operatore", sb.ospite.consensoMarketing && sb.ospite.consensoMarketingModo === "modulo" && sb.ospite.consensoMarketingDa === "Anna");
    verifica("Filtro marketing: B", (await elencoOspiti(hotel.id, COGNOME, "marketing")).ospiti.map((x) => x.id).join() === `${b.id}`);

    // Unioni rifiutate.
    verifica("Unire A e C (nascite diverse): rifiutato", !!(await errore(() => unisciOspiti(hotel.id, a.id, c.id, "Anna"))));
    const d = await prisma.ospite.create({ data: { hotelId: hotel.id, nome: "Ospite", cognome: COGNOME } });
    // La prenotazione di A ha già la sua presenza (prenotante in camera): si aggiunge D nella stessa camera.
    verifica("A è già nella camera della sua prenotazione", !!(await prisma.presenza.findFirst({ where: { segmentoId: p1.segmenti[0].id, ospiteId: a.id } })));
    await prisma.presenza.create({ data: { segmentoId: p1.segmenti[0].id, ospiteId: d.id } });
    const eStessa = await errore(() => unisciOspiti(hotel.id, a.id, d.id, "Anna"));
    verifica("Unire due persone nella stessa camera: rifiutato", !!eStessa, eStessa ?? "");
    await prisma.presenza.deleteMany({ where: { ospiteId: d.id } });
    await prisma.presenza.create({ data: { segmentoId: p1.segmenti[0].id, ospiteId: d.id, tipoAlloggiato: 19, capoOspiteId: b.id } });

    // Unione B -> A.
    await unisciOspiti(hotel.id, a.id, b.id, "Anna");
    const sa = await schedaOspite(hotel.id, a.id);
    verifica("B eliminato, traccia dell'unione", !(await prisma.ospite.findUnique({ where: { id: b.id } })) && sa.unioni.length === 1 && sa.unioni[0].unitoDa === "Anna");
    verifica("Prenotazioni di B passate ad A (storico di 3)", sa.storico.length === 3 && sa.storico.some((x) => x.id === p2.id) && sa.storico.some((x) => x.id === p3.id && x.quando === "futuro"));
    verifica("A ora è abituale (2 soggiorni passati, 4 notti)", sa.riepilogo.soggiorni === 2 && sa.riepilogo.notti === 4 && sa.riepilogo.prossimo === "2033-08-01", sa.riepilogo);
    verifica("Dati completati: email e preferenze da B, telefono e nascita di A restano", sa.ospite.email === "ospite.collaudo@example.invalid" && sa.ospite.preferenze === "cuscino basso" && sa.ospite.telefono === "0801234567" && sa.ospite.dataNascita === "1980-01-01");
    verifica("Riguardo, note e consenso marketing passati ad A", sa.ospite.riguardo && sa.ospite.note === "arriva tardi" && sa.ospite.consensoMarketing && sa.ospite.consensoMarketingModo === "modulo");
    const pd = await prisma.presenza.findFirstOrThrow({ where: { ospiteId: d.id } });
    verifica("Il capofamiglia della presenza di D ora è A", pd.capoOspiteId === a.id);
    const intestatari = await prisma.segmentoSoggiorno.findMany({ where: { prenotazioneId: { in: [p2.id, p3.id] } }, select: { ospiteId: true } });
    verifica("Le camere di B ora sono intestate ad A", intestatari.every((x) => x.ospiteId === a.id));
    sb = sa;
    verifica("Non restano doppioni A-B: A resta doppione solo di D (senza nascita)", (await elencoOspiti(hotel.id, COGNOME, "doppioni")).ospiti.every((x) => x.id !== b.id) && sb.ospite.id === a.id);
  } finally {
    const ospiti = (await prisma.ospite.findMany({ where: { hotelId: hotel.id, cognome: COGNOME }, select: { id: true } })).map((x) => x.id);
    for (const id of ids) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospiteUnito.deleteMany({ where: { hotelId: hotel.id, ospiteTenutoId: { in: ospiti } } });
    await prisma.ospite.deleteMany({ where: { id: { in: ospiti } } });
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
