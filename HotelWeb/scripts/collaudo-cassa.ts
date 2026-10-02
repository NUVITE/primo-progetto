/**
 * Collaudo della cassa: incassi di camere ed eventi nel giorno per metodo e operatore, rimborsi,
 * storni (stesso giorno e giorni dopo), chiusura con fondo e conteggio contanti, blocco dei pagamenti
 * su una giornata chiusa, riapertura, pagamenti degli eventi ed eventi da saldare.
 * Primo hotel; i pagamenti di prova hanno data 15/01/2020 (giornata senza chiusure); tutto si cancella.
 *   npx tsx scripts/collaudo-cassa.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { cassaDelGiorno, chiudiGiornata, riapriGiornata } from "../src/lib/cassa";
import { oggiItaliano } from "../src/lib/cassaAperta";
import { creaPrenotazione, registraPagamento, stornaPagamento } from "../src/lib/prenotazioni";
import { dettaglioPrenotazioneSala, eventiDaSaldare, registraPagamentoSala, stornaPagamentoSala } from "../src/lib/sale";

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
const vicino = (a: number, b: number) => Math.abs(a - b) < 0.005;

const NOME = "CollaudoCassa";
const GIORNO = "2020-01-15";
const DOPO = "2020-01-16";

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const sala = await prisma.sala.findFirstOrThrow({ where: { hotelId: hotel.id } });
  const esistenti = await prisma.chiusuraCassa.count({ where: { hotelId: hotel.id, giorno: { in: [new Date(GIORNO), new Date(DOPO)] } } });
  if (esistenti) throw new Error("Ci sono già chiusure di prova nel 2020: cancellale prima.");
  const ids: number[] = [];
  let eventoId = 0;
  const pag = (id: number, importo: number, metodo: string, tipo = "saldo", data = GIORNO, utente = "Anna") =>
    registraPagamento(hotel.id, id, { data, importo, metodo, tipo, nota: "" }, utente);

  try {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento: "B&B", listinoId: listino.id, dataInizio: "2031-12-10", dataFine: "2031-12-11", composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(p.id);
    const evento = await prisma.prenotazioneSala.create({
      data: {
        hotelId: hotel.id,
        titolo: `${NOME} convegno`,
        stato: "confermata",
        occupazioni: { create: { salaId: sala.id, inizio: new Date(`${GIORNO}T09:00:00Z`), fine: new Date(`${GIORNO}T13:00:00Z`), prezzo: 500 } },
      },
    });
    eventoId = evento.id;

    await pag(p.id, 100, "contanti", "acconto");
    await pag(p.id, 50, "carta", "saldo", GIORNO, "Bruno");
    await pag(p.id, 20, "contanti", "rimborso");
    const sbagliato = await pag(p.id, 7, "contanti");
    const idSbagliato = sbagliato.pagamenti.find((x) => Number(x.importo) === 7)!.id;
    await registraPagamentoSala(hotel.id, evento.id, { data: GIORNO, importo: 200, metodo: "bonifico", tipo: "acconto", nota: "" }, "Anna");

    // Uno storno fatto oggi di un pagamento del 15/01/2020: nella giornata del 15 resta, oggi è un movimento contrario.
    await stornaPagamento(hotel.id, idSbagliato, "battuto per errore", "Anna");
    let c = await cassaDelGiorno(hotel.id, GIORNO);
    const met = (m: string) => c.perMetodo.find((x) => x.metodo === m)?.importo ?? 0;
    verifica("Contanti: 100 − 20 + 7 (stornato in un altro giorno) = 87", vicino(met("contanti"), 87), c.perMetodo);
    verifica("Carta 50, bonifico 200 (evento in sala)", vicino(met("carta"), 50) && vicino(met("bonifico"), 200));
    verifica("Totale del giorno 337", vicino(c.totale, 337));
    verifica("Per operatore: Bruno 50", vicino(c.perOperatore.find((o) => o.operatore === "Bruno")?.importo ?? 0, 50));
    verifica("Il pagamento dell'evento rimanda all'evento", c.movimenti.some((m) => m.link === `/sale/prenotazioni/${evento.id}` && vicino(m.importo, 200)));
    const oggi = await cassaDelGiorno(hotel.id, oggiItaliano());
    verifica("Oggi compare lo storno come movimento contrario (−7)", oggi.movimenti.some((m) => m.tipo === "storno" && m.pagamentoId === idSbagliato && vicino(m.importo, -7)));

    // Pagamento stornato lo stesso giorno: visibile ma escluso dal totale.
    const altro = await pag(p.id, 3, "contanti", "saldo", oggiItaliano());
    const idAltro = altro.pagamenti.find((x) => Number(x.importo) === 3 && x.data.toISOString().slice(0, 10) === oggiItaliano())!.id;
    const primaStorno = (await cassaDelGiorno(hotel.id, oggiItaliano())).totale;
    await stornaPagamento(hotel.id, idAltro, "prova", "Anna");
    const dopoStorno = await cassaDelGiorno(hotel.id, oggiItaliano());
    verifica("Stornato lo stesso giorno: visibile ma fuori dal totale", vicino(primaStorno - 3, dopoStorno.totale) && dopoStorno.movimenti.some((m) => m.pagamentoId === idAltro && m.stornato));

    // Chiusura con il fondo cassa.
    const e1 = await errore(() => chiudiGiornata(hotel.id, GIORNO, { fondoIniziale: 100, contantiContati: 180, fondoLasciato: 100, nota: "" }, "Anna"));
    verifica("Contanti che non tornano senza nota: rifiutata", !!e1, e1 ?? "");
    await chiudiGiornata(hotel.id, GIORNO, { fondoIniziale: 100, contantiContati: 182, fondoLasciato: 100, nota: "resto sbagliato" }, "Anna");
    c = await cassaDelGiorno(hotel.id, GIORNO);
    verifica("Chiusa: attesi 187 (fondo 100 + 87), contati 182", vicino(c.chiusura?.attesi ?? 0, 187) && vicino(c.chiusura?.contantiContati ?? 0, 182));
    verifica("Fotografia della chiusura = totale", vicino(c.chiusura!.totale, 337) && c.differenze.length === 0);
    const e2 = await errore(() => chiudiGiornata(hotel.id, GIORNO, { fondoIniziale: null, contantiContati: null, fondoLasciato: null, nota: "" }, "Anna"));
    verifica("Non si chiude due volte", !!e2, e2 ?? "");
    const e3 = await errore(() => pag(p.id, 10, "contanti"));
    verifica("Giornata chiusa: niente pagamenti con quella data", !!e3 && e3.includes("chiusa"), e3 ?? "");
    const e4 = await errore(() => registraPagamentoSala(hotel.id, evento.id, { data: GIORNO, importo: 10, metodo: "contanti", tipo: "saldo", nota: "" }, "Anna"));
    verifica("Giornata chiusa: neanche sugli eventi", !!e4, e4 ?? "");
    const e5 = await errore(() => chiudiGiornata(hotel.id, "2099-01-01", { fondoIniziale: null, contantiContati: null, fondoLasciato: null, nota: "" }, "Anna"));
    verifica("Non si chiude una giornata futura", !!e5, e5 ?? "");

    // Il giorno dopo propone il fondo lasciato.
    const domani = await cassaDelGiorno(hotel.id, DOPO);
    verifica("Il giorno dopo propone il fondo lasciato (100)", domani.fondoProposto === 100);
    await chiudiGiornata(hotel.id, DOPO, { fondoIniziale: null, contantiContati: null, fondoLasciato: null, nota: "" }, "Anna");
    verifica("Chiusura senza fondo cassa (facoltativo)", (await cassaDelGiorno(hotel.id, DOPO)).chiusura?.fondoIniziale === null);

    await riapriGiornata(hotel.id, GIORNO);
    await pag(p.id, 10, "contanti");
    verifica("Riaperta: si registra di nuovo", vicino((await cassaDelGiorno(hotel.id, GIORNO)).totale, 347));

    // Evento: saldo, conti aperti, storno.
    let ev = await dettaglioPrenotazioneSala(hotel.id, evento.id);
    verifica("Evento: totale 500, pagato 200, da pagare 300", vicino(ev.totali.totale, 500) && vicino(ev.totali.pagato, 200) && vicino(ev.totali.daPagare, 300));
    verifica("Evento passato con saldo aperto tra i conti da saldare", (await eventiDaSaldare(hotel.id)).some((e) => e.id === evento.id && vicino(e.daPagare, 300)));
    await riapriGiornata(hotel.id, DOPO);
    const e6 = await errore(() => registraPagamentoSala(hotel.id, evento.id, { data: DOPO, importo: 900, metodo: "bonifico", tipo: "rimborso", nota: "" }, "Anna"));
    verifica("Non si rimborsa più dell'incassato", !!e6 && e6.includes("rimborsare"), e6 ?? "");
    await registraPagamentoSala(hotel.id, evento.id, { data: DOPO, importo: 300, metodo: "bonifico", tipo: "saldo", nota: "" }, "Anna");
    verifica("Saldato: esce dai conti da saldare", !(await eventiDaSaldare(hotel.id)).some((e) => e.id === evento.id));
    ev = await dettaglioPrenotazioneSala(hotel.id, evento.id);
    await stornaPagamentoSala(hotel.id, ev.pagamenti.find((x) => x.importo === 300)!.id, "bonifico non arrivato", "Anna");
    ev = await dettaglioPrenotazioneSala(hotel.id, evento.id);
    verifica("Storno sull'evento: torna da pagare 300", vicino(ev.totali.daPagare, 300));
  } finally {
    await prisma.chiusuraCassa.deleteMany({ where: { hotelId: hotel.id, giorno: { in: [new Date(GIORNO), new Date(DOPO)] } } });
    for (const id of ids) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    if (eventoId) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneSalaId: eventoId } });
      await prisma.prenotazioneSala.delete({ where: { id: eventoId } });
    }
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
