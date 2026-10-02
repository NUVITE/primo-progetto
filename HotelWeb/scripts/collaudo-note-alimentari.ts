/**
 * Collaudo delle note alimentari: consenso obbligatorio, validazione, sintesi con le allergie in
 * evidenza, aggiornamento del consenso, cancellazione automatica 7 giorni dopo la partenza (solo per
 * il consenso "soggiorno"), revoca, permesso legato al modulo Ristorazione, altro hotel escluso.
 * Primo hotel; ospiti e prenotazioni di prova si cancellano alla fine.
 *   npx tsx scripts/collaudo-note-alimentari.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { sintesiNota, validaNota, type NotaInput } from "../src/lib/allergeni";
import { cancellaNotaAlimentare, noteDegliOspiti, noteDellaPrenotazione, pulisciNoteScadute, salvaNotaAlimentare } from "../src/lib/noteAlimentari";
import { creaPrenotazione } from "../src/lib/prenotazioni";
import { filtraPerModuli, PERMESSI, RUOLI_PREDEFINITI } from "../src/lib/permessi";

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

const NOME = "CollaudoNote";
const base: NotaInput = { voci: [], regimi: [], esigenze: "", consenso: "soggiorno", consensoModo: "a_voce", consensoDato: true };
const giorno = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const ids: number[] = [];
  const prenota = async (cognome: string, dal: string, al: string) => {
    // Camera da assegnare: le date sono vicine a oggi e non devono scontrarsi con camere occupate.
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome },
      segmenti: [{ cameraId: undefined, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome }, trattamento: "B&B", listinoId: listino.id, dataInizio: dal, dataFine: al, composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(p.id);
    return p;
  };

  try {
    // Regole pure.
    const e1 = await errore(() => validaNota({ ...base, voci: [{ codice: "arachidi", tipo: "allergia" }], consensoDato: false }));
    verifica("Senza consenso esplicito: rifiutata", !!e1, e1 ?? "");
    const e2 = await errore(() => validaNota(base));
    verifica("Nota vuota: rifiutata", !!e2, e2 ?? "");
    const e3 = await errore(() => validaNota({ ...base, voci: [{ codice: "cioccolato" as never, tipo: "allergia" }] }));
    verifica("Allergene inventato: rifiutato", !!e3, e3 ?? "");
    const v = validaNota({ ...base, voci: [{ codice: "latte", tipo: "intolleranza" }, { codice: "latte", tipo: "allergia" }, { testo: "  kiwi ", tipo: "allergia" }, { testo: " ", tipo: "allergia" }], regimi: ["vegetariano"] });
    verifica("Duplicati e righe vuote tolti, testo ripulito", v.voci.length === 2 && v.voci[1].testo === "kiwi", v.voci);
    const s = sintesiNota({ voci: [{ codice: "arachidi", tipo: "allergia" }, { codice: "latte", tipo: "intolleranza" }], regimi: ["halal"], esigenze: "seggiolone" });
    verifica("Sintesi: allergie per prime e segnalate", s.allergie && s.testo === "ALLERGIA: arachidi · intolleranza: latte · halal · seggiolone", s.testo);

    // Permesso legato al modulo Ristorazione.
    verifica("Senza modulo Ristorazione il permesso non vale", !filtraPerModuli([PERMESSI.NOTE_ALIMENTARI], []).length);
    verifica("Con il modulo vale", filtraPerModuli([PERMESSI.NOTE_ALIMENTARI], ["ristorazione"]).length === 1);
    verifica("La Reception lo ha di partenza", RUOLI_PREDEFINITI.find((r) => r.nome === "Reception")!.permessi.includes(PERMESSI.NOTE_ALIMENTARI));

    // Ospite in casa adesso: la nota resta.
    const inCasa = await prenota(`${NOME}A`, giorno(-2), giorno(3));
    const ospA = inCasa.segmenti[0].ospiteId;
    await salvaNotaAlimentare(hotel.id, ospA, { ...base, voci: [{ codice: "glutine", tipo: "allergia" }] }, "Anna");
    let n = await noteDegliOspiti(hotel.id, [ospA]);
    verifica("Nota salvata con chi ha raccolto il consenso", n[ospA]?.consensoDa === "Anna" && n[ospA].allergie);
    const primoConsenso = n[ospA].consensoIl;
    await new Promise((r) => setTimeout(r, 20));
    await salvaNotaAlimentare(hotel.id, ospA, { ...base, voci: [{ codice: "glutine", tipo: "allergia" }, { codice: "sesamo", tipo: "allergia" }] }, "Bruno");
    n = await noteDegliOspiti(hotel.id, [ospA]);
    verifica("Modifica con lo stesso consenso: data del consenso invariata", n[ospA].consensoIl === primoConsenso && n[ospA].aggiornataDa === "Bruno");
    await salvaNotaAlimentare(hotel.id, ospA, { ...base, consenso: "sempre", voci: [{ codice: "glutine", tipo: "allergia" }] }, "Bruno");
    n = await noteDegliOspiti(hotel.id, [ospA]);
    verifica("Consenso cambiato: nuova data e nuovo operatore", n[ospA].consensoIl !== primoConsenso && n[ospA].consensoDa === "Bruno");
    await salvaNotaAlimentare(hotel.id, ospA, { ...base, voci: [{ codice: "glutine", tipo: "allergia" }] }, "Anna");

    // Partito 10 giorni fa: la nota "soggiorno" sparisce, la "sempre" resta.
    const partito = await prenota(`${NOME}B`, giorno(-14), giorno(-10));
    const ospB = partito.segmenti[0].ospiteId;
    const fedele = await prenota(`${NOME}C`, giorno(-14), giorno(-10));
    const ospC = fedele.segmenti[0].ospiteId;
    await salvaNotaAlimentare(hotel.id, ospB, { ...base, regimi: ["vegano"] }, "Anna");
    await salvaNotaAlimentare(hotel.id, ospC, { ...base, consenso: "sempre", regimi: ["kosher"] }, "Anna");
    // Partito 3 giorni fa: dentro i 7 giorni, resta.
    const recente = await prenota(`${NOME}D`, giorno(-6), giorno(-3));
    const ospD = recente.segmenti[0].ospiteId;
    await salvaNotaAlimentare(hotel.id, ospD, { ...base, esigenze: "seggiolone" }, "Anna");
    const cancellate = await pulisciNoteScadute(hotel.id);
    n = await noteDegliOspiti(hotel.id, [ospA, ospB, ospC, ospD]);
    verifica("Partito da più di 7 giorni, consenso soggiorno: cancellata", !n[ospB] && cancellate >= 1);
    verifica("Consenso anche per i prossimi soggiorni: resta", !!n[ospC]);
    verifica("Partito da 3 giorni: resta", !!n[ospD]);
    verifica("Ospite in casa: resta", !!n[ospA]);

    // Riepilogo della prenotazione e revoca.
    const r = await noteDellaPrenotazione(hotel.id, inCasa.id);
    verifica("Riepilogo della prenotazione", r.length === 1 && r[0].camera === null && r[0].allergie, r);
    await cancellaNotaAlimentare(hotel.id, ospA);
    verifica("Revoca: cancellata subito", !(await noteDegliOspiti(hotel.id, [ospA]))[ospA]);
    const e4 = await errore(() => cancellaNotaAlimentare(hotel.id, ospA));
    verifica("Non si cancella due volte", !!e4, e4 ?? "");

    if (altroHotel) {
      const e5 = await errore(() => salvaNotaAlimentare(altroHotel.id, ospD, { ...base, esigenze: "x" }, "Anna"));
      verifica("Ospite di un altro hotel: rifiutato", !!e5);
      verifica("Un altro hotel non vede le note", !(await noteDegliOspiti(altroHotel.id, [ospD]))[ospD]);
    }
  } finally {
    for (const id of ids) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    // Le note se ne vanno con gli ospiti (cancellazione a cascata).
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: { startsWith: NOME } } });
  }
  const residue = await prisma.notaAlimentare.count({ where: { ospite: { cognome: { startsWith: NOME } } } });
  verifica("Nessuna nota di prova rimasta", residue === 0);
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
