/**
 * Collaudo di conferma/annullamento/riattivazione e pagamenti su una prenotazione di prova nel primo
 * hotel (date nel 2031); la prenotazione viene cancellata alla fine, anche in caso di errore.
 *   npx tsx scripts/collaudo-nucleo.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  annullaCamera,
  annullaPrenotazione,
  calcolaTotaliPrenotazione,
  confermaPrenotazione,
  creaPrenotazione,
  registraPagamento,
  riattivaPrenotazione,
  stornaPagamento,
  trovaPrenotazione,
} from "../src/lib/prenotazioni";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio ? ` — ${dettaglio}` : ""}`);
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

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camere = await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, take: 2, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const seg = (c: (typeof camere)[number]) => ({
    cameraId: c.id,
    tipoCameraId: c.tipoCameraId,
    ospite: { nome: "Collaudo", cognome: "Nucleo" },
    trattamento: "B&B",
    listinoId: listino.id,
    dataInizio: "2031-05-10",
    dataFine: "2031-05-12",
    composizione: { adulti: 2, etaBambini: [] },
  });
  const p = await creaPrenotazione(hotel.id, { ospitePrenotante: { nome: "Collaudo", cognome: "Nucleo" }, accontoRichiesto: 100, segmenti: camere.map(seg) });
  const id = p.id;
  try {
    verifica("Nasce in opzione con scadenza proposta", p.stato === "OPZIONE" && !!p.scadenzaOpzione, p.scadenzaOpzione?.toISOString().slice(0, 10));
    const totaleIniziale = calcolaTotaliPrenotazione(p).totale;

    await registraPagamento(hotel.id, id, { data: "2031-01-10", importo: 100, metodo: "bonifico", tipo: "acconto", nota: "" }, "collaudo");
    let t = calcolaTotaliPrenotazione(await trovaPrenotazione(hotel.id, id));
    verifica("Acconto: pagato 100, da pagare = totale - 100", t.pagato === 100 && Math.abs(t.daPagare - (totaleIniziale - 100)) < 0.01, `${t.pagato} / ${t.daPagare}`);

    const e1 = await errore(() => registraPagamento(hotel.id, id, { data: "2031-01-11", importo: 150, metodo: "contanti", tipo: "rimborso", nota: "" }, "collaudo"));
    verifica("Rimborso oltre l'incassato rifiutato", !!e1, e1 ?? "");

    await confermaPrenotazione(hotel.id, id);
    const conf = await trovaPrenotazione(hotel.id, id);
    verifica("Conferma", conf.stato === "CONFERMATA" && !!conf.confermataIl);

    const primo = conf.segmenti[0].id;
    await annullaCamera(hotel.id, primo);
    const dopoCamera = await trovaPrenotazione(hotel.id, id);
    t = calcolaTotaliPrenotazione(dopoCamera);
    verifica("Annulla una camera: il totale scende", t.totale < totaleIniziale, `${totaleIniziale} -> ${t.totale}`);
    const tassaCamera = await prisma.tassaNotte.count({ where: { notte: { segmentoId: primo } } });
    verifica("Camera annullata senza tassa", tassaCamera === 0);
    const e2 = await errore(() => annullaCamera(hotel.id, dopoCamera.segmenti[1].id));
    verifica("L'ultima camera non si annulla da sola", !!e2, e2 ?? "");

    const e3 = await errore(() => annullaPrenotazione(hotel.id, id, { motivo: "cliente", nota: "", incassi: null }, "collaudo"));
    verifica("Con incassi serve decidere penale o rimborso", !!e3, e3 ?? "");

    await annullaPrenotazione(hotel.id, id, { motivo: "cliente", nota: "disdetta", incassi: "trattieni" }, "collaudo");
    const ann = await trovaPrenotazione(hotel.id, id);
    t = calcolaTotaliPrenotazione(ann);
    verifica("Annullata con penale: dovuto 100, da pagare 0", ann.stato === "ANNULLATA" && t.totale === 100 && t.daPagare === 0, `${t.totale} / ${t.daPagare}`);
    const tasse = await prisma.tassaNotte.count({ where: { notte: { segmento: { prenotazioneId: id } } } });
    verifica("Annullata: nessuna tassa", tasse === 0);
    verifica("Annullata: camere libere (segmenti annullati)", ann.segmenti.every((s) => s.stato === "ANNULLATO"));

    await riattivaPrenotazione(hotel.id, id);
    const ria = await trovaPrenotazione(hotel.id, id);
    t = calcolaTotaliPrenotazione(ria);
    verifica("Riattivata: in opzione, camere attive, penale tolta", ria.stato === "OPZIONE" && ria.segmenti.every((s) => s.stato === "PREVISTO") && ria.penale === null, `totale ${t.totale}`);

    const pag = ria.pagamenti[0];
    await stornaPagamento(hotel.id, pag.id, "importo sbagliato", "collaudo");
    t = calcolaTotaliPrenotazione(await trovaPrenotazione(hotel.id, id));
    verifica("Storno: pagato torna 0", t.pagato === 0);

    await registraPagamento(hotel.id, id, { data: "2031-01-12", importo: 80, metodo: "contanti", tipo: "acconto", nota: "" }, "collaudo");
    await annullaPrenotazione(hotel.id, id, { motivo: "no_show", nota: "", incassi: "rimborsa", metodoRimborso: "contanti" }, "collaudo");
    const rimb = await trovaPrenotazione(hotel.id, id);
    t = calcolaTotaliPrenotazione(rimb);
    verifica("Annullata con rimborso: pagato 0, dovuto 0", t.pagato === 0 && t.totale === 0 && rimb.motivoAnnullamento === "no_show", `${t.pagato} / ${t.totale}`);
  } finally {
    await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
    await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
    await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
    await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
    await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
    await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
    await prisma.prenotazione.delete({ where: { id } });
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, nome: "Collaudo", cognome: "Nucleo" } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (prenotazione di prova cancellata)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main();
