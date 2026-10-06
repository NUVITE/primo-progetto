/**
 * Collaudo di agenzie e allotment: release, camere bloccate e usate, disponibilità per gli altri e per
 * l'agenzia, avviso nella nuova prenotazione, voucher che divide il conto, estratto conto con
 * commissione, pagamenti dell'agenzia e saldo. Primo hotel, date nel 2033 (e intorno a oggi per il
 * release); agenzia, allotment e prenotazioni di prova si cancellano alla fine.
 *   npx tsx scripts/collaudo-agenzie.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { bloccateNotte, commissione, giornoRelease } from "../src/lib/agenzieRegole";
import { avvisoAllotment, bloccatePerNotte, elencoAllotment, estrattoContoAgenzia, impostaVoucher, salvaAllotment, type AllotmentInput } from "../src/lib/agenzie";
import { disponibilitaTipo } from "../src/lib/preventivi";
import { dividiConto } from "../src/lib/contoDiviso";
import { nottiTraDate } from "../src/lib/pricing";
import { creaPrenotazioneGenerica, impostaPrezzoConcordato, registraPagamento, trovaPrenotazione } from "../src/lib/prenotazioni";

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

const NOME = "CollaudoAgenzie";
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));

async function main() {
  // Regole pure.
  verifica("Release: a 10 giorni dalla notte, con release 7, le camere restano bloccate", bloccateNotte(3, 1, "2033-07-11", "2033-07-01", 7) === 2);
  verifica("Release: a 5 giorni, con release 7, le camere tornano in vendita", bloccateNotte(3, 1, "2033-07-06", "2033-07-01", 7) === 0);
  verifica("Giorno del release e commissione", giornoRelease("2033-07-31", 14) === "2033-07-17" && commissione(1000, 15) === 150 && commissione(1000, null) === 0);

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  // Un tipo di camera con almeno 2 camere.
  const tipi = await prisma.tipoCamera.findMany({ where: { hotelId: hotel.id }, include: { _count: { select: { camere: { where: { attivo: true } } } } } });
  const tipo = tipi.find((t) => t._count.camere >= 2);
  if (!tipo) throw new Error("Serve un tipo di camera con almeno 2 camere.");
  const totali = tipo._count.camere;
  const agenzia = await prisma.cliente.create({ data: { hotelId: hotel.id, tipo: "agenzia", denominazione: `${NOME} Viaggi`, commissione: 15 } });
  const azienda = await prisma.cliente.create({ data: { hotelId: hotel.id, tipo: "azienda", denominazione: `${NOME} Srl` } });
  const ids: number[] = [];
  const base: AllotmentInput = { clienteId: agenzia.id, tipoCameraId: tipo.id, dal: "2033-07-01", al: "2033-07-05", camere: 2, releaseGiorni: 7, note: "" };

  try {
    const e1 = await errore(() => salvaAllotment(hotel.id, null, { ...base, clienteId: azienda.id }, "Anna"));
    verifica("Allotment con un'azienda: rifiutato", !!e1, e1 ?? "");
    const e2 = await errore(() => salvaAllotment(hotel.id, null, { ...base, camere: totali + 1 }, "Anna"));
    verifica("Più camere di quelle del tipo: rifiutato", !!e2, e2 ?? "");
    await salvaAllotment(hotel.id, null, base, "Anna");

    const notti = nottiTraDate(new Date("2033-07-01"), new Date("2033-07-05"));
    verifica("Senza prenotazioni: 2 camere bloccate ogni notte", (await bloccatePerNotte(hotel.id, tipo.id, notti)).every((x) => x === 2));
    verifica("Per l'agenzia stessa non sono bloccate", (await bloccatePerNotte(hotel.id, tipo.id, notti, agenzia.id)).every((x) => x === 0));
    const libereAltri = await disponibilitaTipo(hotel.id, tipo.id, new Date("2033-07-01"), new Date("2033-07-05"));
    verifica("Preventivi ai clienti diretti: 2 camere in meno", libereAltri === totali - 2, { libereAltri, totali });

    // L'agenzia usa una camera per le prime due notti.
    const p = await creaPrenotazioneGenerica(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      listinoId: listino.id,
      trattamento,
      dataInizio: "2033-07-01",
      dataFine: "2033-07-03",
      richieste: [{ tipoCameraId: tipo.id, quantita: 1, composizione: { adulti: 2, etaBambini: [] } }],
      provenienza: { canale: "agenzia", intermediarioId: agenzia.id },
    });
    ids.push(p.id);
    const b = await bloccatePerNotte(hotel.id, tipo.id, notti);
    verifica("Camera usata dall'agenzia: 1 bloccata le prime due notti, 2 le altre", b.join() === "1,1,2,2", b);
    const el = (await elencoAllotment(hotel.id, agenzia.id))[0];
    verifica("Elenco: usate al massimo 1", el?.usateMassimo === 1 && el.camere === 2);

    const avviso = await avvisoAllotment(hotel.id, tipo.id, new Date("2033-07-01"), new Date("2033-07-03"), totali - 1, null);
    verifica("Nuova prenotazione che prende tutte le libere: avviso dell'allotment", !!avviso, avviso ?? "");
    verifica("La stessa per l'agenzia: nessun avviso", (await avvisoAllotment(hotel.id, tipo.id, new Date("2033-07-01"), new Date("2033-07-03"), totali - 1, agenzia.id)) === null);

    // Release: un allotment che inizia fra 3 giorni con release 7 non blocca più niente.
    await salvaAllotment(hotel.id, null, { ...base, dal: giorno(3), al: giorno(5) }, "Anna");
    const vicine = await bloccatePerNotte(hotel.id, tipo.id, nottiTraDate(new Date(giorno(3)), new Date(giorno(5))));
    verifica("Notti entro il release: camere tornate in vendita", vicine.every((x) => x === 0), vicine);

    // Voucher e conto diviso.
    const pid = p.id;
    const e3 = await errore(async () => {
      await prisma.prenotazione.update({ where: { id: pid }, data: { intermediarioId: null } });
      await impostaVoucher(hotel.id, pid, "V-123", "soggiorno");
    });
    verifica("Voucher senza agenzia nella provenienza: rifiutato", !!e3, e3 ?? "");
    await prisma.prenotazione.update({ where: { id: pid }, data: { intermediarioId: agenzia.id } });
    await impostaPrezzoConcordato(hotel.id, p.segmenti[0].id, 100, "contratto agenzia", "collaudo");
    await impostaVoucher(hotel.id, pid, "V-123", "soggiorno");
    let pr = await trovaPrenotazione(hotel.id, pid);
    const diviso = dividiConto(pr, Number(hotel.aliquotaAlloggio));
    const quota = () => diviso.intestatari.find((x) => x.chiave === `cliente:${agenzia.id}`);
    verifica("Voucher «camere e trattamento»: l'agenzia paga le camere (200 €), la tassa resta all'ospite", pr.clientePaganteId === agenzia.id && quota()?.totale === 200 && diviso.righe.filter((r) => r.tipo === "tassa").every((r) => r.intestatario === "ospite"));
    await impostaVoucher(hotel.id, pid, "V-123", "tutto");
    pr = await trovaPrenotazione(hotel.id, pid);
    verifica("Voucher «tutto»: regola tutto al cliente", pr.regolaConto === "tutto_cliente");
    await impostaVoucher(hotel.id, pid, "V-123", "soggiorno");

    // Estratto conto con un pagamento dell'agenzia.
    await registraPagamento(hotel.id, pid, { data: "2033-07-03", importo: 50, metodo: "bonifico", tipo: "acconto", nota: "", intestatario: `cliente:${agenzia.id}` }, "collaudo");
    const e = await estrattoContoAgenzia(hotel.id, agenzia.id, "2033-07-01", "2033-07-31");
    const r = e.righe.find((x) => x.prenotazioneId === pid);
    verifica("Estratto: soggiorno 200, commissione 15% = 30, netto 170", r?.soggiorno === 200 && r.commissione === 30 && r.netto === 170, r);
    verifica("Estratto: a carico dell'agenzia 200, pagato 50, saldo 150, voucher indicato", r?.aCaricoAgenzia === 200 && r.pagatoAgenzia === 50 && r.saldoAgenzia === 150 && r.voucher === "V-123");
    const fuori = await estrattoContoAgenzia(hotel.id, agenzia.id, "2033-08-01", "2033-08-31");
    verifica("Partenza fuori dal periodo: non c'è", fuori.righe.length === 0);
    const e4 = await errore(() => estrattoContoAgenzia(hotel.id, azienda.id, "2033-07-01", "2033-07-31"));
    verifica("Estratto di un cliente che non è un'agenzia: rifiutato", !!e4, e4 ?? "");

    await impostaVoucher(hotel.id, pid, "", null);
    pr = await trovaPrenotazione(hotel.id, pid);
    verifica("Voucher tolto: niente più cliente pagante", pr.voucher === null && pr.clientePaganteId === null);
  } finally {
    for (const id of ids) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.allotment.deleteMany({ where: { clienteId: agenzia.id } });
    await prisma.cliente.deleteMany({ where: { id: { in: [agenzia.id, azienda.id] } } });
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
