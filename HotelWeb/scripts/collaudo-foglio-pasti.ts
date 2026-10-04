/**
 * Collaudo del foglio del giorno: regola dei pasti (N notti = N colazioni/pranzi/cene), mezza
 * pensione con pranzo al posto della cena, coperti per servizio, bambini e sotto i 3 anni, coperti in
 * più o in meno, tavolo, note alimentari solo con il permesso, esclusi annullati e uso diurno.
 * Primo hotel, date nel 2032; si contano solo le prenotazioni di prova, che si cancellano alla fine.
 *   npx tsx scripts/collaudo-foglio-pasti.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { contaPasti, pastiEffettivi, pastoCompreso } from "../src/lib/pastiRegole";
import { foglioDelGiorno, impostaPastoPrincipale, impostaTavolo, impostaVariazionePasto } from "../src/lib/foglioPasti";
import { salvaNotaAlimentare } from "../src/lib/noteAlimentari";
import { annullaPrenotazione, creaPrenotazione } from "../src/lib/prenotazioni";

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

const NOME = "CollaudoFoglio";
const BB = { colazione: true, pranzo: false, cena: false };
const HB = { colazione: true, pranzo: false, cena: true };
const FB = { colazione: true, pranzo: true, cena: true };

async function main() {
  // Regole pure.
  verifica("B&B 3 notti: 3 colazioni", JSON.stringify(contaPasti("2032-05-10", "2032-05-13", BB)) === JSON.stringify({ colazione: 3, pranzo: 0, cena: 0 }));
  verifica("Mezza pensione 3 notti: 3 colazioni e 3 cene", JSON.stringify(contaPasti("2032-05-10", "2032-05-13", HB)) === JSON.stringify({ colazione: 3, pranzo: 0, cena: 3 }));
  verifica("Pensione completa 3 notti: 3 + 3 + 3", JSON.stringify(contaPasti("2032-05-10", "2032-05-13", FB)) === JSON.stringify({ colazione: 3, pranzo: 3, cena: 3 }));
  verifica("Giorno di arrivo: cena sì, colazione no", pastoCompreso("cena", "2032-05-10", "2032-05-10", "2032-05-13", HB) && !pastoCompreso("colazione", "2032-05-10", "2032-05-10", "2032-05-13", HB));
  verifica("Giorno di partenza: colazione e pranzo sì, cena no", pastoCompreso("colazione", "2032-05-13", "2032-05-10", "2032-05-13", FB) && pastoCompreso("pranzo", "2032-05-13", "2032-05-10", "2032-05-13", FB) && !pastoCompreso("cena", "2032-05-13", "2032-05-10", "2032-05-13", FB));
  verifica("Mezza pensione col pranzo: pranzo al posto della cena", JSON.stringify(pastiEffettivi(HB, "pranzo")) === JSON.stringify({ colazione: true, pranzo: true, cena: false }));
  verifica("Pensione completa: lo scambio non si applica", JSON.stringify(pastiEffettivi(FB, "pranzo")) === JSON.stringify(FB));

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const tratt = await prisma.trattamento.findMany({ where: { hotelId: hotel.id } });
  const nomeDi = (t: typeof HB) => tratt.find((x) => x.colazione === t.colazione && x.pranzo === t.pranzo && x.cena === t.cena)?.nome;
  if (!nomeDi(BB) || !nomeDi(HB) || !nomeDi(FB)) throw new Error("Al primo hotel mancano trattamenti B&B, mezza pensione o pensione completa con i pasti impostati.");
  const ids: number[] = [];
  const prenota = async (cognome: string, trattamento: string, dal: string, al: string, adulti: number, etaBambini: number[] = []) => {
    // Camera da assegnare: nessuno scontro con le camere vere.
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome },
      segmenti: [{ tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome }, trattamento, listinoId: listino.id, dataInizio: dal, dataFine: al, composizione: { adulti, etaBambini } }],
    });
    ids.push(p.id);
    return p;
  };

  try {
    const famiglia = await prenota(`${NOME}A`, nomeDi(HB)!, "2032-05-10", "2032-05-13", 2, [8, 1]);
    const coppia = await prenota(`${NOME}B`, nomeDi(BB)!, "2032-05-11", "2032-05-12", 2);
    const gruppo = await prenota(`${NOME}C`, nomeDi(FB)!, "2032-05-09", "2032-05-11", 3);
    const annullata = await prenota(`${NOME}D`, nomeDi(FB)!, "2032-05-10", "2032-05-12", 2);
    await annullaPrenotazione(hotel.id, annullata.id, { motivo: "errore", nota: "", penale: 0, rimborsaEccedenza: false }, "collaudo");
    const mie = new Set([famiglia, coppia, gruppo, annullata].map((p) => p.segmenti[0].id));
    const segF = famiglia.segmenti[0].id;
    const segB = coppia.segmenti[0].id;

    const conta = async (giorno: string, conNote = true) => {
      const f = await foglioDelGiorno(hotel.id, giorno, conNote);
      const filtra = (p: "colazione" | "pranzo" | "cena") => f.servizi[p].righe.filter((r) => mie.has(r.segmentoId));
      return { f, col: filtra("colazione"), pra: filtra("pranzo"), cen: filtra("cena") };
    };
    const tot = (righe: { coperti: number }[]) => righe.reduce((t, r) => t + r.coperti, 0);

    // 11/05: famiglia (HB, 4 persone) in casa; coppia (B&B) arriva; gruppo (FB, 3) parte.
    let g = await conta("2032-05-11");
    verifica("Colazione 11/05: famiglia 4 + gruppo 3 = 7 (la coppia arriva oggi)", tot(g.col) === 7, g.col.map((r) => [r.nome, r.coperti]));
    verifica("Pranzo 11/05: solo il gruppo che parte (3)", tot(g.pra) === 3 && g.pra[0].partenza);
    verifica("Cena 11/05: solo la famiglia (4)", tot(g.cen) === 4);
    const rf = g.cen.find((r) => r.segmentoId === segF)!;
    verifica("Famiglia: 2 adulti, 2 bambini di cui 1 sotto i 3 anni", rf.adulti === 2 && rf.bambini === 2 && rf.piccoli === 1);
    verifica("La prenotazione annullata non conta", !g.col.some((r) => r.nome.includes(`${NOME}D`)));

    // Mezza pensione col pranzo.
    await impostaPastoPrincipale(hotel.id, segF, "pranzo");
    g = await conta("2032-05-11");
    verifica("Famiglia col pranzo: 4 a pranzo, nessuno a cena", tot(g.pra) === 7 && tot(g.cen) === 0);
    await impostaPastoPrincipale(hotel.id, segF, null);
    const e1 = await errore(() => impostaPastoPrincipale(hotel.id, segB, "pranzo"));
    verifica("B&B: niente scelta pranzo/cena", !!e1, e1 ?? "");

    // Coperti in più o in meno.
    await impostaVariazionePasto(hotel.id, segF, "2032-05-11", "cena", -4, "cena fuori", "Anna");
    await impostaVariazionePasto(hotel.id, segB, "2032-05-11", "cena", 2, "cena extra", "Anna");
    g = await conta("2032-05-11");
    const rfv = g.cen.find((r) => r.segmentoId === segF);
    verifica("Cena fuori: la famiglia resta in elenco con 0 coperti e la nota", rfv?.coperti === 0 && rfv.notaVariazione === "cena fuori");
    verifica("Cena extra per la coppia in B&B: 2 coperti", g.cen.find((r) => r.segmentoId === segB)?.coperti === 2 && tot(g.cen) === 2);
    const e2 = await errore(() => impostaVariazionePasto(hotel.id, segF, "2032-05-11", "cena", -5, "", "Anna"));
    verifica("Non si tolgono più coperti di quelli previsti", !!e2, e2 ?? "");
    const e3 = await errore(() => impostaVariazionePasto(hotel.id, segF, "2032-05-20", "cena", 1, "", "Anna"));
    verifica("Giorno fuori dal soggiorno: rifiutato", !!e3, e3 ?? "");
    await impostaVariazionePasto(hotel.id, segF, "2032-05-11", "cena", 0, "", "Anna");
    g = await conta("2032-05-11");
    verifica("Come da trattamento: tornano 4 coperti", g.cen.find((r) => r.segmentoId === segF)?.coperti === 4);
    g = await conta("2032-05-12");
    verifica("La variazione vale solo per quel giorno", g.cen.find((r) => r.segmentoId === segF)?.coperti === 4 && !g.cen.some((r) => r.segmentoId === segB));

    // Tavolo e note alimentari.
    await impostaTavolo(hotel.id, segF, "12");
    await salvaNotaAlimentare(hotel.id, famiglia.segmenti[0].ospiteId, { voci: [{ codice: "arachidi", tipo: "allergia" }], regimi: [], esigenze: "", consenso: "soggiorno", consensoModo: "a_voce", consensoDato: true }, "Anna");
    g = await conta("2032-05-12");
    const conNote = g.cen.find((r) => r.segmentoId === segF)!;
    verifica("Tavolo e allergia nella riga della cena", conNote.tavolo === "12" && conNote.note[0]?.allergie === true, conNote.note);
    g = await conta("2032-05-12", false);
    verifica("Senza il permesso le note non arrivano", g.cen.find((r) => r.segmentoId === segF)?.note.length === 0 && !g.f.conNote);
    const e4 = await errore(() => impostaTavolo(hotel.id, segF, "x".repeat(30)));
    verifica("Tavolo troppo lungo: rifiutato", !!e4);
  } finally {
    for (const id of ids) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: { startsWith: NOME } } });
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
