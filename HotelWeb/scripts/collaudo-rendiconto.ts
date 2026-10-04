/**
 * Collaudo del rendiconto della tassa di soggiorno e della riconciliazione con la Polizia, nella
 * struttura di Roma (Case per ferie, 6 €, esenti sotto i 10 anni, tetto 10 notti) con date nel 2031.
 * Le prenotazioni di prova si cancellano alla fine, anche in caso di errore.
 *   npx tsx scripts/collaudo-rendiconto.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { fotografaStatoCamere } from "./statoCamereCollaudo";
import { aggiungiOccupante, checkoutCamera } from "../src/lib/checkin";
import { creaPrenotazione } from "../src/lib/prenotazioni";
import { configRendiconto, periodiAnno, rendicontoTassa } from "../src/lib/rendicontoTassa";
import { ricalcolaTassaPosizione } from "../src/lib/tassaSoggiorno";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};

const COGNOME = "CollaudoRendiconto";

async function main() {
  // Il check-out segna le camere "da pulire": alla fine tornano come erano.
  const ripristinaCamere = await fotografaStatoCamere();
  const comune = await prisma.comune.findFirstOrThrow({ where: { codiceIstat: "058091" } });
  const hotel = await prisma.hotel.findFirstOrThrow({ where: { comuneId: comune.id } });
  const utente = await prisma.utente.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camere = await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, take: 3, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const ids: number[] = [];

  async function soggiorno(camera: (typeof camere)[number], nome: string, dal: string, al: string, adulti = 1) {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome, cognome: COGNOME },
      segmenti: [
        {
          cameraId: camera.id,
          tipoCameraId: camera.tipoCameraId,
          ospite: { nome, cognome: COGNOME },
          trattamento: "B&B",
          listinoId: listino.id,
          dataInizio: dal,
          dataFine: al,
          composizione: { adulti, etaBambini: [] },
        },
      ],
    });
    ids.push(p.id);
    return { prenotazioneId: p.id, segmentoId: p.segmenti[0].id };
  }
  // Arrivo confermato e schedina inviata con i giorni previsti in quel momento.
  async function arrivatoConSchedina(segmentoId: number, giorni: number) {
    await prisma.presenza.updateMany({ where: { segmentoId }, data: { stato: "arrivato", arrivoIl: new Date(), schedinaInviataIl: new Date(), schedinaGiorni: giorni } });
  }

  try {
    // A: coppia con bambina di 8 anni, prevista 10-15 aprile, parte il 13 (schedina già inviata con 5 giorni).
    const a = await soggiorno(camere[0], "Adulto", "2031-04-10", "2031-04-15", 2);
    await aggiungiOccupante(hotel.id, a.segmentoId, { nome: "Bambina", cognome: COGNOME });
    const bambina = await prisma.ospite.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Bambina", cognome: COGNOME } });
    await prisma.ospite.update({ where: { id: bambina.id }, data: { dataNascita: new Date("2023-01-01") } });
    await ricalcolaTassaPosizione(prisma, a.prenotazioneId, bambina.id);
    await arrivatoConSchedina(a.segmentoId, 5);
    await checkoutCamera(hotel.id, utente.id, a.segmentoId, "2031-04-13");

    // B: a cavallo tra 2° e 3° trimestre, 29 giugno - 2 luglio.
    const b = await soggiorno(camere[1], "Cavallo", "2031-06-29", "2031-07-02");
    await arrivatoConSchedina(b.segmentoId, 3);

    // C: 12 notti in maggio, oltre il tetto di 10.
    const c = await soggiorno(camere[2], "Lungo", "2031-05-01", "2031-05-13");
    await arrivatoConSchedina(c.segmentoId, 12);

    // D: prenotata ma mai arrivata: non conta.
    const d = await soggiorno(camere[2], "Assente", "2031-06-01", "2031-06-03");
    void d;

    const t2 = await rendicontoTassa(hotel.id, "2031-04-01", "2031-06-30");
    const n = t2.numeri;
    verifica("T2: ospiti (adulto, bambina, cavallo, lungo)", n.ospiti === 4, n.ospiti);
    verifica("T2: pernottamenti 3+3+2+12 = 20 (inclusi esenti)", n.pernottamenti === 20, n.pernottamenti);
    verifica("T2: notti tassate 3+2+10 = 15", n.tassate.notti + n.ridotte.notti === 15, n.tassate.notti);
    verifica("T2: imposta 15 × 6 € = 90 €", n.dovuto === 90, n.dovuto);
    const eta = n.esenti.find((e) => /10|minor|età/i.test(e.motivo));
    verifica("T2: esenzione per età, 1 persona 3 notti", !!eta && eta.persone === 1 && eta.notti === 3, n.esenti);
    const tetto = n.altri.find((x) => x.esito === "oltre_tetto");
    verifica("T2: 2 notti oltre il tetto", tetto?.notti === 2, n.altri);
    verifica("T2: elenco per ospite di 4 righe", t2.ospiti.length === 4);
    verifica("T2: chi non è arrivato non compare", !t2.ospiti.some((o) => o.nome.includes("Assente")));

    const ric = new Map(t2.riconciliazione.righe.map((r) => [r.nome.split(" ")[1], r]));
    const ad = ric.get("Adulto")!;
    verifica("Riconciliazione adulto: Polizia 5, effettive 3, tassate 3", ad.giorniPolizia === 5 && ad.nottiEffettive === 3 && ad.nottiTassate === 3, ad);
    verifica("Causa: partenza anticipata", ad.cause.some((x) => x.startsWith("Partenza anticipata")), ad.cause);
    const bb = ric.get("Bambina")!;
    verifica("Bambina: Polizia 5, effettive 3, tassate 0, esente", bb.giorniPolizia === 5 && bb.nottiEffettive === 3 && bb.nottiTassate === 0 && bb.cause.some((x) => x.includes("per esenzione")), bb);
    const cv = ric.get("Cavallo")!;
    verifica("A cavallo: soggiorno intero (3 notti) e nessuna differenza", cv.nottiEffettive === 3 && cv.nottiTassate === 3 && cv.cause.length === 0, cv);
    const lg = ric.get("Lungo")!;
    verifica("Lungo: 2 notti oltre il tetto spiegate", lg.nottiTassate === 10 && lg.cause.some((x) => x.includes("oltre il tetto")), lg.cause);
    verifica("Totali riconciliazione: Polizia 25, effettive 21", t2.riconciliazione.giorniPolizia === 25 && t2.riconciliazione.nottiEffettive === 21, t2.riconciliazione);

    const t3 = await rendicontoTassa(hotel.id, "2031-07-01", "2031-09-30");
    verifica("T3: la notte del 1° luglio va nel 3° trimestre", t3.numeri.ospiti === 1 && t3.numeri.pernottamenti === 1 && t3.numeri.dovuto === 6, t3.numeri);
    verifica("T3: nessun arrivo da riconciliare", t3.riconciliazione.righe.length === 0);

    // Rifiuto di pagamento: si segnala e non si versa.
    await prisma.posizioneTassa.updateMany({ where: { prenotazioneId: c.prenotazioneId }, data: { rifiutoPagamento: true } });
    const r = await rendicontoTassa(hotel.id, "2031-04-01", "2031-06-30");
    verifica("Rifiuto: dovuto 90, da versare 30", r.numeri.dovuto === 90 && r.numeri.daVersare === 30 && r.numeri.rifiuti.persone === 1, r.numeri.rifiuti);

    // Periodi e scadenze per Comune.
    const roma = periodiAnno(2031, await configRendiconto(hotel.id));
    verifica("Roma: trimestrale, 2° trimestre entro il 16 luglio", roma.find((p) => p.codice === "2031-T2")?.scadenza === "2031-07-16");
    verifica("Dichiarazione annuale entro il 30 giugno dell'anno dopo", roma.find((p) => p.codice === "2031-A")?.scadenza === "2032-06-30");
    const trani = periodiAnno(2031, { rendicontoPeriodo: "semestrale", rendicontoGiorno: 16, versamentoGiorno: null });
    verifica("Trani: semestri al 16 luglio e 16 gennaio", trani[0].scadenza === "2031-07-16" && trani[1].scadenza === "2032-01-16", trani.map((p) => p.scadenza));
    const bisceglie = periodiAnno(2031, { rendicontoPeriodo: "trimestrale", rendicontoGiorno: 20, versamentoGiorno: 31 });
    verifica("Bisceglie: comunicazione il 20, versamento a fine mese", bisceglie[0].scadenza === "2031-04-20" && bisceglie[0].versamento === "2031-04-30", bisceglie[0]);
  } finally {
    await ripristinaCamere();
    for (const id of ids) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (prenotazioni di prova cancellate)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
