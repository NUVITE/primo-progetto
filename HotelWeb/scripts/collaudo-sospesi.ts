/**
 * Collaudo dei conti aperti e sospesi: partenza con saldo da pagare, sospeso con nota, sollecito,
 * chiusura con il pagamento, penale di annullamento da incassare. Primo hotel, date nel 2031; i
 * dati di prova si cancellano alla fine, anche in caso di errore.
 *   npx tsx scripts/collaudo-sospesi.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { fotografaStatoCamere } from "./statoCamereCollaudo";
import { checkoutCamera } from "../src/lib/checkin";
import { contiAperti, registraSollecito, sospendiConto, statoConto } from "../src/lib/contiSospesi";
import { annullaPrenotazione, calcolaTotaliPrenotazione, creaPrenotazione, registraPagamento, trovaPrenotazione } from "../src/lib/prenotazioni";

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

const NOME = "CollaudoSospesi";

async function main() {
  // Il check-out segna le camere "da pulire": alla fine tornano come erano.
  const ripristinaCamere = await fotografaStatoCamere();
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const utente = await prisma.utente.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const ids: number[] = [];
  let clienteId: number | null = null;
  const nuova = async (dal: string, al: string) => {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [
        { cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento: "B&B", listinoId: listino.id, dataInizio: dal, dataFine: al, composizione: { adulti: 1, etaBambini: [] } },
      ],
    });
    ids.push(p.id);
    return p;
  };

  try {
    const agenzia = await prisma.cliente.create({ data: { hotelId: hotel.id, tipo: "agenzia", denominazione: `${NOME} Viaggi` } });
    clienteId = agenzia.id;

    const p = await nuova("2031-08-10", "2031-08-12");
    const seg = p.segmenti[0].id;
    await prisma.presenza.updateMany({ where: { segmentoId: seg }, data: { stato: "arrivato", arrivoIl: new Date() } });
    let s = statoConto(await trovaPrenotazione(hotel.id, p.id));
    verifica("Ospite in casa: il conto non è ancora da chiudere", !s.aperto);
    await checkoutCamera(hotel.id, utente.id, seg, "2031-08-12");
    const dopo = await trovaPrenotazione(hotel.id, p.id);
    const totali = calcolaTotaliPrenotazione(dopo);
    s = statoConto(dopo);
    verifica("Tutti partiti con saldo da pagare: conto aperto, non sospeso", s.aperto && !s.sospeso && s.daPagare === totali.daPagare && s.daPagare > 0, s);
    let elenco = await contiAperti(hotel.id);
    verifica("Compare tra i partiti con il conto da saldare", elenco.some((r) => r.id === p.id && r.gruppo === "da_decidere"));

    const e1 = await errore(() => sospendiConto(hotel.id, p.id, { clienteId: agenzia.id, nota: "  " }, "collaudo"));
    verifica("Sospeso senza nota rifiutato", !!e1, e1 ?? "");
    await sospendiConto(hotel.id, p.id, { clienteId: agenzia.id, nota: "bonifico a 30 giorni" }, "collaudo");
    elenco = await contiAperti(hotel.id);
    const riga = elenco.find((r) => r.id === p.id);
    verifica("Sospeso a carico dell'agenzia con la nota", riga?.gruppo === "sospesi" && riga.sospeso?.aCarico === `${NOME} Viaggi` && riga.sospeso.nota === "bonifico a 30 giorni", riga);
    await registraSollecito(hotel.id, p.id, "2031-09-15");
    elenco = await contiAperti(hotel.id);
    verifica("Sollecito registrato", elenco.find((r) => r.id === p.id)?.sospeso?.sollecitoIl === "2031-09-15");

    await registraPagamento(hotel.id, p.id, { data: "2031-09-20", importo: s.daPagare, metodo: "bonifico", tipo: "saldo", nota: "" }, "collaudo");
    elenco = await contiAperti(hotel.id);
    verifica("Pagato il saldo: sparisce dall'elenco", !elenco.some((r) => r.id === p.id));
    const e2 = await errore(() => sospendiConto(hotel.id, p.id, { clienteId: null, nota: "x" }, "collaudo"));
    verifica("Conto saldato: niente da lasciare in sospeso", !!e2, e2 ?? "");

    // Penale più alta dell'incassato: va tra le penali da incassare.
    const q = await nuova("2031-10-10", "2031-10-12");
    await annullaPrenotazione(hotel.id, q.id, { motivo: "no_show", nota: "", penale: 80, rimborsaEccedenza: true }, "collaudo");
    elenco = await contiAperti(hotel.id);
    const pen = elenco.find((r) => r.id === q.id);
    verifica("Penale non incassata tra le penali da incassare", pen?.gruppo === "penali" && pen.daPagare === 80, pen);
  } finally {
    await ripristinaCamere();
    for (const id of ids) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    if (clienteId) await prisma.cliente.delete({ where: { id: clienteId } });
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
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
