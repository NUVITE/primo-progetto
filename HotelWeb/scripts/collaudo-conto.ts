/**
 * Collaudo del conto: righe automatiche e a mano, IVA per voce e scorporo, riepilogo per aliquota,
 * coerenza con il totale della prenotazione, storni, abbuoni, esborsi, camere in casa per i reparti.
 * Primo hotel, date nel 2031; prenotazioni e servizi di prova si cancellano alla fine.
 *   npx tsx scripts/collaudo-conto.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { camereInCasa, contoPrenotazione, registraAddebito, scorporo, stornaAddebito, type AddebitoInput } from "../src/lib/conto";
import { annullaPrenotazione, creaPrenotazione } from "../src/lib/prenotazioni";
import { aggiungiServizioAPrenotazione } from "../src/lib/servizi";

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

const NOME = "CollaudoConto";

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const bar = await prisma.repartoAddebito.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Bar" } });
  const esborsi = await prisma.repartoAddebito.findFirstOrThrow({ where: { hotelId: hotel.id, esborso: true } });
  const aliquotaAlloggio = Number((await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id } })).aliquotaAlloggio);
  const servizio = await prisma.servizioCatalogo.create({ data: { hotelId: hotel.id, nome: `${NOME} Garage`, prezzo: 15, addebito: "per_notte", aliquotaIva: 22 } });
  const ids: number[] = [];
  const add = (prenotazioneId: number, d: Partial<AddebitoInput>) =>
    registraAddebito(
      hotel.id,
      prenotazioneId,
      { tipo: "extra", segmentoId: null, repartoId: bar.id, data: "2031-09-10", descrizione: "", quantita: 1, prezzoUnitario: 1, buono: "", nota: "", ...d },
      "collaudo",
    );

  try {
    verifica("Scorporo 10%: 3,00 € = 2,73 + 0,27", JSON.stringify(scorporo(3, 10)) === JSON.stringify({ imponibile: 2.73, iva: 0.27 }));
    verifica("Scorporo 22%: 100 € = 81,97 + 18,03", JSON.stringify(scorporo(100, 22)) === JSON.stringify({ imponibile: 81.97, iva: 18.03 }));
    verifica("Fuori campo: niente IVA", JSON.stringify(scorporo(30, null)) === JSON.stringify({ imponibile: 30, iva: 0 }));

    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento: "B&B", listinoId: listino.id, dataInizio: "2031-09-10", dataFine: "2031-09-12", composizione: { adulti: 2, etaBambini: [] } }],
    });
    ids.push(p.id);
    const seg = p.segmenti[0].id;
    await aggiungiServizioAPrenotazione(hotel.id, p.id, { servizioCatalogoId: servizio.id, prezzoUnitario: 15, quantita: 1, segmentoIds: [seg] });

    await add(p.id, { segmentoId: seg, quantita: 2, prezzoUnitario: 1.5, descrizione: "2 caffè", buono: "B-12" });
    await add(p.id, { tipo: "esborso", repartoId: esborsi.id, prezzoUnitario: 30, descrizione: "Taxi aeroporto" });
    const e1 = await errore(() => add(p.id, { tipo: "abbuono", repartoId: null, prezzoUnitario: 5 }));
    verifica("Abbuono senza motivo rifiutato", !!e1, e1 ?? "");
    await add(p.id, { tipo: "abbuono", repartoId: null, prezzoUnitario: 5, nota: "attesa per la camera" });
    const e2 = await errore(() => add(p.id, { repartoId: null, prezzoUnitario: 4 }));
    verifica("Consumo senza reparto rifiutato", !!e2, e2 ?? "");

    let c = await contoPrenotazione(hotel.id, p.id);
    const r = (tipo: string) => c.righe.filter((x) => x.tipo === tipo);
    verifica("Riga camera all'aliquota dell'alloggio", r("camera").length === 1 && r("camera")[0].aliquota === aliquotaAlloggio, r("camera")[0]);
    verifica("Servizio a catalogo con la sua IVA (22%), 2 notti × 15 €", r("servizio")[0]?.aliquota === 22 && r("servizio")[0]?.importo === 30, r("servizio")[0]);
    const caffe = r("extra")[0];
    verifica("Consumo bar: 3,00 € al 10%, imponibile 2,73", caffe?.importo === 3 && caffe.aliquota === 10 && caffe.imponibile === 2.73 && caffe.buono === "B-12", caffe);
    verifica("Esborso fuori campo IVA", r("esborso")[0]?.aliquota === null && r("esborso")[0]?.importo === 30);
    verifica("Abbuono: −5 € sull'aliquota dell'alloggio", r("abbuono")[0]?.importo === -5 && r("abbuono")[0]?.aliquota === aliquotaAlloggio);
    if (r("tassa").length) verifica("Tassa di soggiorno fuori campo IVA", r("tassa")[0].aliquota === null);
    verifica("Totale del conto = totale della prenotazione (extra compresi)", Math.abs(c.totale - c.totalePrenotazione) < 0.005, { conto: c.totale, prenotazione: c.totalePrenotazione });
    const somma = c.riepilogoIva.reduce((t, v) => t + v.totale, 0);
    verifica("Il riepilogo IVA somma al totale", Math.abs(somma - c.totale) < 0.005, c.riepilogoIva);
    verifica("Riepilogo: imponibile + IVA = totale per ogni aliquota", c.riepilogoIva.every((v) => Math.abs(v.imponibile + v.iva - v.totale) < 0.005));

    const prima = c.totale;
    await stornaAddebito(hotel.id, caffe.addebitoId!, "battuto due volte", "collaudo");
    c = await contoPrenotazione(hotel.id, p.id);
    verifica("Storno: la riga resta visibile ma esce dal totale (−3 €)", c.righe.some((x) => x.addebitoId === caffe.addebitoId && x.stornato) && Math.abs(prima - 3 - c.totale) < 0.005);
    const e3 = await errore(() => stornaAddebito(hotel.id, caffe.addebitoId!, "x", "collaudo"));
    verifica("Non si storna due volte", !!e3, e3 ?? "");

    // Reparti: la camera compare tra quelle in casa solo dopo l'arrivo.
    let inCasa = await camereInCasa(hotel.id, "2031-09-11");
    verifica("Prima del check-in la camera non è in casa", !inCasa.some((x) => x.segmentoId === seg));
    await prisma.presenza.updateMany({ where: { segmentoId: seg }, data: { stato: "arrivato", arrivoIl: new Date() } });
    inCasa = await camereInCasa(hotel.id, "2031-09-11");
    verifica("Dopo il check-in la camera è tra quelle in casa", inCasa.some((x) => x.segmentoId === seg && x.camera === camera.codice));

    // Prenotazione annullata: niente addebiti.
    const q = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento: "B&B", listinoId: listino.id, dataInizio: "2031-10-10", dataFine: "2031-10-11", composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(q.id);
    await annullaPrenotazione(hotel.id, q.id, { motivo: "cliente", nota: "", penale: 20, rimborsaEccedenza: false }, "collaudo");
    const e4 = await errore(() => add(q.id, { prezzoUnitario: 2 }));
    verifica("Prenotazione annullata: niente addebiti", !!e4, e4 ?? "");
    const cq = await contoPrenotazione(hotel.id, q.id);
    verifica("Annullata: una sola riga di penale fuori campo", cq.righe.length === 1 && cq.righe[0].tipo === "penale" && cq.righe[0].aliquota === null && cq.totale === 20);
  } finally {
    for (const id of ids) {
      await prisma.addebitoConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiunto: { prenotazioneId: id } } });
      await prisma.servizioAggiunto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.servizioCatalogo.delete({ where: { id: servizio.id } });
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
