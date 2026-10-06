/**
 * Collaudo della cauzione: regole pure (trattenuta non negativa, non oltre la cauzione, motivata),
 * proposta dai tipi delle camere, incasso (una volta, non su prenotazioni annullate), restituzione con
 * trattenuta che diventa addebito "Risarcimento danni" fuori campo IVA pagato dalla cauzione, cassa del
 * giorno (le cauzioni contano nei contanti ma non sono incassi; la trattenuta passa agli incassi senza
 * contare due volte), avviso al check-out. Primo hotel, prenotazioni nel 2033, cassa di oggi; tutto si
 * cancella alla fine. Se la cassa di oggi è già chiusa, la parte sul database si salta.
 *   npx tsx scripts/collaudo-cauzioni.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calcolaRestituzione, cauzioneProposta, NOME_REPARTO_DANNI } from "../src/lib/cauzioniRegole";
import { cauzioneDaRestituire, cauzioniDelGiorno, datiCauzione, incassaCauzione, restituisciCauzione } from "../src/lib/cauzioni";
import { cassaDelGiorno } from "../src/lib/cassa";
import { oggiItaliano } from "../src/lib/cassaAperta";
import { calcolaTotaliPrenotazione, creaPrenotazioneGenerica, trovaPrenotazione } from "../src/lib/prenotazioni";

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
const COGNOME = "CollaudoCauzione";
const vicino = (a: number, b: number) => Math.abs(a - b) < 0.005;

async function main() {
  verifica("Trattenuta negativa: rifiutata", !!(await errore(async () => calcolaRestituzione(100, -1, "x"))));
  verifica("Trattenuta oltre la cauzione: rifiutata", !!(await errore(async () => calcolaRestituzione(100, 120, "x"))));
  verifica("Trattenuta senza motivo: rifiutata", !!(await errore(async () => calcolaRestituzione(100, 20, " "))));
  const r = calcolaRestituzione(200, 35.5, "telecomando rotto");
  verifica("Restituzione: 200 meno 35,50 di trattenuta = 164,50", r.restituito === 164.5 && r.trattenuta === 35.5);
  verifica("Proposta: somma delle cauzioni dei tipi", cauzioneProposta([{ cauzione: 200 }, { cauzione: null }, { cauzione: 150 }]) === 350);

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const oggi = oggiItaliano();
  if (await prisma.chiusuraCassa.findUnique({ where: { hotelId_giorno: { hotelId: hotel.id, giorno: new Date(oggi) } } })) {
    console.log("NOTA la cassa di oggi è già chiusa: parte sul database saltata.");
    console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (solo regole pure)");
    await prisma.$disconnect();
    process.exit(falliti ? 1 : 0);
  }
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { hotelId: hotel.id, camere: { some: { attivo: true } } } });
  const cauzionePrima = tipo.cauzione;
  const repartoPrima = await prisma.repartoAddebito.findFirst({ where: { hotelId: hotel.id, nome: NOME_REPARTO_DANNI } });
  const ids: number[] = [];
  const prenota = async (nome: string, quante: number) => {
    const p = await creaPrenotazioneGenerica(hotel.id, {
      ospitePrenotante: { nome, cognome: COGNOME },
      listinoId: listino.id,
      trattamento,
      dataInizio: "2033-12-01",
      dataFine: "2033-12-03",
      richieste: [{ tipoCameraId: tipo.id, quantita: quante, composizione: { adulti: 2, etaBambini: [] } }],
    });
    ids.push(p.id);
    return p;
  };

  try {
    await prisma.tipoCamera.update({ where: { id: tipo.id }, data: { cauzione: 200 } });
    const p = await prenota("Anna", 2);
    verifica("Proposta della prenotazione con 2 camere da 200: 400", (await datiCauzione(hotel.id, p.id)).proposta === 400);
    const cassaPrima = await cassaDelGiorno(hotel.id, oggi);
    const movPrima = (await cauzioniDelGiorno(hotel.id, oggi)).movimenti.length;

    verifica("Metodo non previsto: rifiutato", !!(await errore(() => incassaCauzione(hotel.id, p.id, 400, "assegni-esteri", "Marco"))));
    await incassaCauzione(hotel.id, p.id, 400, "contanti", "Marco");
    verifica("Seconda cauzione sulla stessa prenotazione: rifiutata", !!(await errore(() => incassaCauzione(hotel.id, p.id, 50, "contanti", "Marco"))));
    verifica("Da restituire al check-out: 400", (await cauzioneDaRestituire(hotel.id, p.id)) === 400);
    let cassa = await cassaDelGiorno(hotel.id, oggi);
    verifica("Cassa: la cauzione non è un incasso (totale invariato) ma conta nei contanti (+400)", vicino(cassa.totale, cassaPrima.totale) && vicino(cassa.contantiCauzioni - cassaPrima.contantiCauzioni, 400), { totale: [cassaPrima.totale, cassa.totale], cauzioni: [cassaPrima.contantiCauzioni, cassa.contantiCauzioni] });

    verifica("Restituzione con trattenuta oltre la cauzione: rifiutata", !!(await errore(() => restituisciCauzione(hotel.id, p.id, 500, "danni", "contanti", "Marco"))));
    await restituisciCauzione(hotel.id, p.id, 50, "Telecomando rotto", "contanti", "Marco");
    const c = (await datiCauzione(hotel.id, p.id)).cauzione!;
    verifica("Restituiti 350, trattenuti 50 con il motivo", c.importoRestituito === 350 && c.trattenuta === 50 && c.motivoTrattenuta === "Telecomando rotto" && !!c.restituitaIl);
    const ad = await prisma.addebitoConto.findFirstOrThrow({ where: { prenotazioneId: p.id, descrizione: "Risarcimento danni" }, include: { reparto: true } });
    verifica("Addebito 'Risarcimento danni' di 50, fuori campo IVA, reparto dei danni", Number(ad.prezzoUnitario) === 50 && ad.aliquotaIva === null && ad.reparto?.nome === NOME_REPARTO_DANNI && ad.reparto.aliquotaIva === null);
    const tot = calcolaTotaliPrenotazione(await trovaPrenotazione(hotel.id, p.id));
    verifica("Conto: 50 di extra e 50 pagati con la cauzione", vicino(tot.extra, 50) && vicino(tot.pagato, 50), tot);
    cassa = await cassaDelGiorno(hotel.id, oggi);
    const mov = (await cauzioniDelGiorno(hotel.id, oggi)).movimenti.slice(movPrima);
    verifica("Movimenti delle cauzioni: +400, −350 restituiti, −50 passati al conto", mov.map((m) => `${m.tipo}:${m.importo}`).join() === "incasso:400,restituzione:-350,trattenuta:-50", mov);
    verifica(
      "Cassa: incassi +50 (il risarcimento), cauzioni in contanti di nuovo a saldo zero: nel cassetto restano 50",
      vicino(cassa.totale - cassaPrima.totale, 50) && vicino(cassa.contantiCauzioni - cassaPrima.contantiCauzioni, 0) && vicino(cassa.contanti + cassa.contantiCauzioni - (cassaPrima.contanti + cassaPrima.contantiCauzioni), 50),
    );
    verifica("Già restituita: rifiutato", !!(await errore(() => restituisciCauzione(hotel.id, p.id, 0, "", "contanti", "Marco"))));
    verifica("Dopo la restituzione: niente da restituire", (await cauzioneDaRestituire(hotel.id, p.id)) === null);

    const a = await prenota("Bruno", 1);
    await prisma.prenotazione.update({ where: { id: a.id }, data: { stato: "ANNULLATA" } });
    verifica("Prenotazione annullata: niente cauzione", !!(await errore(() => incassaCauzione(hotel.id, a.id, 100, "contanti", "Marco"))));
    const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
    if (altroHotel) verifica("Cauzione da un altro hotel: rifiutata", !!(await errore(() => incassaCauzione(altroHotel.id, p.id, 10, "contanti", "X"))));
  } finally {
    await prisma.cauzione.deleteMany({ where: { prenotazioneId: { in: ids } } });
    for (const id of ids) {
      await prisma.addebitoConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiunto: { prenotazioneId: id } } });
      await prisma.servizioAggiunto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
    await prisma.tipoCamera.update({ where: { id: tipo.id }, data: { cauzione: cauzionePrima } });
    // Il reparto dei danni creato dal collaudo si toglie se non c'era e non ha altri addebiti.
    if (!repartoPrima) await prisma.repartoAddebito.deleteMany({ where: { hotelId: hotel.id, nome: NOME_REPARTO_DANNI, addebiti: { none: {} } } });
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
