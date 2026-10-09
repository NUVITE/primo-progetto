/**
 * Collaudo del conto diviso: regola predefinita (camere al cliente, extra e tassa all'ospite), regole
 * "tutto all'ospite/cliente", spostamento di una riga, pagamenti per intestatario, dati per la fattura,
 * segna come inviate, conguaglio e nota di credito dopo modifiche successive.
 * Primo hotel, date nel 2031; dati di prova cancellati alla fine.
 *   npx tsx scripts/collaudo-conto-diviso.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { registraAddebito, stornaAddebito } from "../src/lib/conto";
import { contoDiviso, datiFattura, impostaRegolaConto, segnaFatturate, spostaRiga } from "../src/lib/contoDiviso";
import { creaPrenotazione, impostaPrezzoConcordato, registraPagamento } from "../src/lib/prenotazioni";

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

const NOME = "CollaudoContoDiviso";

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const bar = await prisma.repartoAddebito.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Bar" } });
  const azienda = await prisma.cliente.create({ data: { hotelId: hotel.id, tipo: "azienda", denominazione: `${NOME} Srl`, partitaIva: "01234567890", codiceDestinatario: "ABC1234" } });
  const ids: number[] = [];

  try {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Mario", cognome: NOME },
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Mario", cognome: NOME }, trattamento: "B&B", listinoId: listino.id, dataInizio: "2031-11-10", dataFine: "2031-11-12", composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(p.id);
    const seg = p.segmenti[0].id;
    // Prezzo fisso: il listino di prova può non avere prezzi nel 2031.
    await impostaPrezzoConcordato(hotel.id, seg, 80, "convenzione azienda", "collaudo");
    const caffe = await registraAddebito(
      hotel.id,
      p.id,
      { tipo: "extra", segmentoId: seg, repartoId: bar.id, data: "2031-11-10", descrizione: "Caffè", quantita: 2, prezzoUnitario: 1.5, buono: "", nota: "" },
      "collaudo",
    );

    // Senza cliente pagante c'è un solo intestatario: l'ospite, con tutto il conto.
    let c = await contoDiviso(hotel.id, p.id);
    verifica("Senza cliente: un solo intestatario (ospite)", c.intestatari.length === 1 && c.intestatari[0].chiave === "ospite");
    const totale = c.intestatari[0].totale;

    await prisma.prenotazione.update({ where: { id: p.id }, data: { clientePaganteId: azienda.id } });
    c = await contoDiviso(hotel.id, p.id);
    const cli = `cliente:${azienda.id}`;
    const di = (k: string) => c.intestatari.find((x) => x.chiave === k)!;
    const riga = (tipo: string) => c.righe.find((r) => r.tipo === tipo);
    verifica("Con il cliente pagante: due intestatari", c.intestatari.length === 2 && !!di(cli));
    verifica("Predefinita: camera al cliente", riga("camera")?.intestatario === cli);
    verifica("Predefinita: consumo bar all'ospite", riga("extra")?.intestatario === "ospite");
    if (riga("tassa")) verifica("Predefinita: tassa di soggiorno all'ospite", riga("tassa")?.intestatario === "ospite");
    verifica("La somma dei due conti è il totale", di(cli).totale >= 160 && vicino(di("ospite").totale + di(cli).totale, totale), { ospite: di("ospite").totale, cliente: di(cli).totale, totale });

    // Pagamenti per intestatario.
    await registraPagamento(hotel.id, p.id, { data: "2031-11-12", importo: 3, metodo: "contanti", tipo: "saldo", nota: "", intestatario: "ospite" }, "collaudo");
    c = await contoDiviso(hotel.id, p.id);
    verifica("Pagamento dell'ospite scala solo il suo conto", vicino(di("ospite").pagato, 3) && vicino(di(cli).pagato, 0));
    const e1 = await errore(() => registraPagamento(hotel.id, p.id, { data: "2031-11-12", importo: 1, metodo: "contanti", tipo: "saldo", nota: "", intestatario: "pippo" }, "collaudo"));
    verifica("Intestatario del pagamento non valido rifiutato", !!e1, e1 ?? "");

    // Regole e spostamento di una riga.
    await impostaRegolaConto(hotel.id, p.id, "tutto_cliente");
    c = await contoDiviso(hotel.id, p.id);
    verifica("Tutto al cliente: l'ospite ha conto zero", vicino(di("ospite").totale, 0) && vicino(di(cli).totale, totale));
    await impostaRegolaConto(hotel.id, p.id, "predefinita");
    await spostaRiga(hotel.id, p.id, `addebito-${caffe.id}`, cli);
    c = await contoDiviso(hotel.id, p.id);
    verifica("Riga spostata a mano sul cliente", riga("extra")?.intestatario === cli && riga("extra")?.spostata === true);
    await spostaRiga(hotel.id, p.id, `addebito-${caffe.id}`, null);
    c = await contoDiviso(hotel.id, p.id);
    verifica("Torna alla regola", riga("extra")?.intestatario === "ospite" && !riga("extra")?.spostata);
    const e2 = await errore(() => spostaRiga(hotel.id, p.id, `addebito-${caffe.id}`, "cliente:999999"));
    verifica("Spostamento su un intestatario estraneo rifiutato", !!e2, e2 ?? "");

    // Dati per la fattura del cliente e invio.
    const f = await datiFattura(hotel.id, p.id, cli);
    verifica("Dati fattura: intestatario con P.IVA e codice destinatario", f.intestatario.partitaIva === "01234567890" && f.intestatario.codiceDestinatario === "ABC1234");
    verifica("Dati fattura: totale = conto del cliente, riepilogo IVA coerente", vicino(f.totale, di(cli).totale) && vicino(f.riepilogoIva.reduce((t, v) => t + v.totale, 0), f.totale));
    await segnaFatturate(hotel.id, p.id, cli, "collaudo");
    c = await contoDiviso(hotel.id, p.id);
    verifica("Dopo l'invio: niente da fatturare per il cliente", di(cli).daFatturare.length === 0 && vicino(di(cli).fatturato, di(cli).totale));
    const e3 = await errore(() => segnaFatturate(hotel.id, p.id, cli, "collaudo"));
    verifica("Non si invia due volte la stessa cosa", !!e3, e3 ?? "");

    // Un nuovo consumo spostato sul cliente dopo l'invio: si fattura solo quello.
    const acqua = await registraAddebito(
      hotel.id,
      p.id,
      { tipo: "extra", segmentoId: seg, repartoId: bar.id, data: "2031-11-11", descrizione: "Acqua", quantita: 1, prezzoUnitario: 2, buono: "", nota: "" },
      "collaudo",
    );
    await spostaRiga(hotel.id, p.id, `addebito-${acqua.id}`, cli);
    c = await contoDiviso(hotel.id, p.id);
    verifica("Dopo l'invio si fattura solo la riga nuova", di(cli).daFatturare.length === 1 && vicino(di(cli).daFatturare[0].importo, 2));
    await segnaFatturate(hotel.id, p.id, cli, "collaudo");

    // Storno di una riga già fatturata: nota di credito.
    await stornaAddebito(hotel.id, acqua.id, "non consumata", "collaudo");
    c = await contoDiviso(hotel.id, p.id);
    verifica("Storno dopo l'invio: nota di credito di 2 €", di(cli).notaDiCredito.length === 1 && vicino(di(cli).notaDiCredito[0].importo, -2), di(cli).notaDiCredito);
    await segnaFatturate(hotel.id, p.id, cli, "collaudo");
    c = await contoDiviso(hotel.id, p.id);
    verifica("Nota di credito segnata: tutto in pari", di(cli).daFatturare.length === 0 && di(cli).notaDiCredito.length === 0 && vicino(di(cli).fatturato, di(cli).totale));

    // Il cliente viene tolto: le righe tornano all'ospite, le fatturate al cliente restano da stornare.
    await prisma.prenotazione.update({ where: { id: p.id }, data: { clientePaganteId: null } });
    c = await contoDiviso(hotel.id, p.id);
    verifica("Senza cliente tutte le righe tornano all'ospite", c.righe.every((r) => r.intestatario === "ospite"));
  } finally {
    for (const id of ids) {
      await prisma.rigaFatturata.deleteMany({ where: { prenotazioneId: id } });
      await prisma.intestazioneRigaConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.addebitoConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.cliente.delete({ where: { id: azienda.id } });
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
