/**
 * Collaudo della custodia in portineria: bagagli (cartellino numerato anche con registrazioni
 * contemporanee, ritiro solo con il numero giusto), valori in cassaforte (ricevuta numerata, prelievo
 * non oltre il contante, ritiro che chiude), chiavi consegnate/restituite, avvisi per il check-out,
 * isolamento fra hotel. Primo hotel; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-custodia.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { saldoValori, validaBagagli, validaChiavi } from "../src/lib/custodiaRegole";
import {
  apriCustodia,
  cartellinoBagagli,
  chiaviFuori,
  custodiaDellaPrenotazione,
  depositaBagagli,
  elencoBagagli,
  elencoValori,
  impostaChiavi,
  movimentoCustodia,
  ricevutaValori,
  ritiraBagagli,
} from "../src/lib/custodia";
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

const COGNOME = "CollaudoCustodia";
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));

async function main() {
  // Regole pure.
  verifica(
    "Saldo dei contanti",
    saldoValori([
      { tipo: "deposito", importo: 500 },
      { tipo: "prelievo", importo: 120.5 },
      { tipo: "versamento", importo: 20 },
      { tipo: "deposito", importo: null },
    ]) === 399.5,
  );
  verifica("Bagagli: zero colli rifiutato", !!(await errore(async () => validaBagagli({ prenotazioneId: null, nome: "X", colli: 0, descrizione: "", posizione: "" }))));
  verifica("Bagagli: senza ospite né nome rifiutato", !!(await errore(async () => validaBagagli({ prenotazioneId: null, nome: " ", colli: 1, descrizione: "", posizione: "" }))));
  verifica("Chiavi: più restituite che consegnate rifiutato", !!(await errore(async () => validaChiavi(1, 2))));

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const tipi = await prisma.tipoCamera.findMany({ where: { hotelId: hotel.id, camere: { some: { attivo: true } } } });
  const ids: number[] = [];
  const prenota = async (nome: string, dal: string, al: string) => {
    let ultimo: unknown;
    for (const t of tipi) {
      try {
        const p = await creaPrenotazioneGenerica(hotel.id, {
          ospitePrenotante: { nome, cognome: COGNOME },
          listinoId: listino.id,
          trattamento,
          dataInizio: dal,
          dataFine: al,
          richieste: [{ tipoCameraId: t.id, quantita: 1, composizione: { adulti: 1, etaBambini: [] } }],
        });
        ids.push(p.id);
        return p;
      } catch (e) {
        ultimo = e;
      }
    }
    throw ultimo;
  };
  const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });

  try {
    const p = await prenota("Carla", giorno(0), giorno(2));
    const annullata = await prenota("Dario", "2033-10-01", "2033-10-03");

    // Bagagli.
    const b1 = await depositaBagagli(hotel.id, { prenotazioneId: p.id, nome: "", colli: 2, descrizione: "2 trolley blu", posizione: "deposito" }, "Marco");
    const b2 = await depositaBagagli(hotel.id, { prenotazioneId: null, nome: `Ospite di passaggio ${COGNOME}`, colli: 1, descrizione: "", posizione: "" }, "Marco");
    verifica("Cartellini con numeri consecutivi", b2.numero === b1.numero + 1);
    const insieme = await Promise.all([1, 2, 3].map((n) => depositaBagagli(hotel.id, { prenotazioneId: null, nome: `Insieme ${n} ${COGNOME}`, colli: 1, descrizione: "", posizione: "" }, "Marco")));
    const numeri = insieme.map((x) => x.numero).sort((a, b) => a - b);
    verifica("Tre depositi registrati insieme: numeri tutti diversi e consecutivi", new Set(numeri).size === 3 && numeri[2] - numeri[0] === 2 && numeri[0] > b2.numero, numeri);
    const c = await cartellinoBagagli(hotel.id, b1.id);
    verifica("Cartellino: numero, nome di chi ha prenotato, colli", c.numero === b1.numero && c.nome === `Carla ${COGNOME}` && c.colli === 2);
    const eNum = await errore(() => ritiraBagagli(hotel.id, b1.id, b1.numero + 1, "", "Marco"));
    verifica("Ritiro con il numero sbagliato: rifiutato", !!eNum?.includes("non corrisponde"), eNum ?? "");
    if (altroHotel) verifica("Ritiro da un altro hotel: non trovato", !!(await errore(() => ritiraBagagli(altroHotel.id, b1.id, b1.numero, "", "X"))));
    await ritiraBagagli(hotel.id, b1.id, b1.numero, "ritirati dalla figlia", "Marco");
    verifica("Ritirati una volta sola", !!(await errore(() => ritiraBagagli(hotel.id, b1.id, b1.numero, "", "Marco"))));
    const eb = await elencoBagagli(hotel.id);
    verifica("Elenco: il ritirato passa fra i ritirati con la nota", !eb.inDeposito.some((x) => x.id === b1.id) && eb.ritirati.some((x) => x.id === b1.id && x.ritiroNota === "ritirati dalla figlia") && eb.inDeposito.some((x) => x.id === b2.id));

    // Valori.
    verifica("Custodia senza descrizione: rifiutata", !!(await errore(() => apriCustodia(hotel.id, { prenotazioneId: p.id, descrizione: " ", importo: null }, "Marco"))));
    const v1 = await apriCustodia(hotel.id, { prenotazioneId: p.id, descrizione: "Busta chiusa firmata sui lembi", importo: 500 }, "Marco");
    const v2 = await apriCustodia(hotel.id, { prenotazioneId: p.id, descrizione: "Orologio", importo: null }, "Marco");
    verifica("Ricevute numerate in ordine", v2.numero === v1.numero + 1);
    const ePrel = await errore(() => movimentoCustodia(hotel.id, v1.id, "prelievo", "", 600, "Marco"));
    verifica("Prelievo oltre il contante in custodia: rifiutato", !!ePrel?.includes("solo"), ePrel ?? "");
    await movimentoCustodia(hotel.id, v1.id, "prelievo", "per la cena", 200, "Marco");
    await movimentoCustodia(hotel.id, v1.id, "versamento", "", 50, "Marco");
    let ev = await elencoValori(hotel.id);
    verifica("Saldo dopo prelievo e versamento: 350 €", ev.aperte.find((x) => x.id === v1.id)?.saldo === 350);
    verifica("Al check-out: 2 custodie aperte", (await custodiaDellaPrenotazione(hotel.id, p.id)).valoriAperti === 2);
    await movimentoCustodia(hotel.id, v1.id, "ritiro", "", null, "Marco");
    const r = await ricevutaValori(hotel.id, v1.id);
    verifica("Ritiro: restituisce i 350 € rimasti e chiude la ricevuta", !!r.chiusaIl && r.saldo === 0 && r.movimenti.length === 4 && r.movimenti[3].importo === 350, r.movimenti.map((m) => [m.tipo, m.importo]));
    verifica("Ricevuta chiusa: niente altri movimenti", !!(await errore(() => movimentoCustodia(hotel.id, v1.id, "versamento", "", 10, "Marco"))));
    await movimentoCustodia(hotel.id, v2.id, "ritiro", "", null, "Marco");
    ev = await elencoValori(hotel.id);
    verifica("Chiuse fra le chiuse, la seconda ritirata senza contanti", ev.chiuse.some((x) => x.id === v2.id && x.movimenti.at(-1)?.importo === null) && !ev.aperte.some((x) => x.prenotazioneId === p.id));
    if (altroHotel) verifica("Ricevuta di un altro hotel: non trovata", !!(await errore(() => ricevutaValori(altroHotel.id, v1.id))));
    await prisma.prenotazione.update({ where: { id: annullata.id }, data: { stato: "ANNULLATA" } });
    verifica("Prenotazione annullata: niente custodia", !!(await errore(() => apriCustodia(hotel.id, { prenotazioneId: annullata.id, descrizione: "x", importo: null }, "Marco"))));

    // Chiavi.
    const seg = p.segmenti[0].id;
    await impostaChiavi(hotel.id, seg, 2, 0);
    verifica("Chiavi fuori: la camera con 2 chiavi consegnate", (await chiaviFuori(hotel.id)).some((k) => k.segmentoId === seg && k.consegnate === 2 && k.restituite === 0));
    verifica("Al check-out: mancano 2 chiavi", (await custodiaDellaPrenotazione(hotel.id, p.id)).chiaviMancanti === 2);
    verifica("Restituite più delle consegnate: rifiutato", !!(await errore(() => impostaChiavi(hotel.id, seg, 2, 3))));
    if (altroHotel) verifica("Chiavi da un altro hotel: non trovato", !!(await errore(() => impostaChiavi(altroHotel.id, seg, 1, 1))));
    await impostaChiavi(hotel.id, seg, 2, 2);
    verifica("Tutte rientrate: non è più fra le chiavi fuori", !(await chiaviFuori(hotel.id)).some((k) => k.segmentoId === seg) && (await custodiaDellaPrenotazione(hotel.id, p.id)).chiaviMancanti === 0);
  } finally {
    await prisma.custodiaValori.deleteMany({ where: { prenotazioneId: { in: ids } } });
    await prisma.depositoBagagli.deleteMany({ where: { hotelId: hotel.id, OR: [{ prenotazioneId: { in: ids } }, { nome: { contains: COGNOME } }] } });
    for (const id of ids) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
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
