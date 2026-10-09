/**
 * Collaudo di provenienza, garanzia, caparra e politiche di cancellazione (penale proposta e
 * annullamento con penale). Usa il primo hotel con date nel 2031; prenotazioni, politiche e clienti
 * di prova si cancellano alla fine, anche in caso di errore.
 *   npx tsx scripts/collaudo-politiche.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calcolaPenale, descriviPolitica, istanteItalia, MODELLI_POLITICA, validaPolitica, type PoliticaCopiata } from "../src/lib/politicheRegole";
import { salvaPolitica } from "../src/lib/politiche";
import {
  aggiornaProvenienza,
  annullaPrenotazione,
  calcolaTotaliPrenotazione,
  creaPrenotazione,
  penaleProposta,
  registraPagamento,
  trovaPrenotazione,
} from "../src/lib/prenotazioni";
import { canaleRoss1000, caratteristicaSpot } from "../src/lib/movimentoIstat";

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

const NOME = "CollaudoPolitiche";

function regole() {
  const standard: PoliticaCopiata = { id: 1, ...MODELLI_POLITICA[0] };
  const arrivo = istanteItalia("2031-05-10", "14:00");
  const ore = (h: number) => new Date(arrivo.getTime() - h * 3_600_000);
  // 3 notti: 100 + 120 + 120 su una camera, 80 la prima notte su un'altra.
  const notti = [
    { data: "2031-05-10", importo: 100 },
    { data: "2031-05-11", importo: 120 },
    { data: "2031-05-12", importo: 120 },
    { data: "2031-05-10", importo: 80 },
  ];
  const d = (adesso: Date) => ({ arrivo, adesso, nottiPerData: notti, soggiorno: 420 });
  verifica("Istante d'arrivo in ora italiana (estate, UTC+2)", arrivo.toISOString() === "2031-05-10T12:00:00.000Z", arrivo.toISOString());
  verifica("Inverno: UTC+1", istanteItalia("2031-01-10", "14:00").toISOString() === "2031-01-10T13:00:00.000Z");
  verifica("72 ore prima: nessuna penale", calcolaPenale(standard, "cliente", d(ore(72))).importo === 0);
  verifica("Esattamente 48 ore prima: ancora gratis", calcolaPenale(standard, "cliente", d(ore(48))).importo === 0);
  verifica("30 ore prima: la prima notte di tutte le camere (100 + 80)", calcolaPenale(standard, "cliente", d(ore(30))).importo === 180);
  verifica("10 ore prima: tutto il soggiorno", calcolaPenale(standard, "cliente", d(ore(10))).importo === 420);
  verifica("Dopo l'orario di arrivo: tutto", calcolaPenale(standard, "cliente", d(ore(-5))).importo === 420);
  const ns = calcolaPenale(standard, "no_show", d(ore(-20)));
  verifica("No-show: penale del mancato arrivo", ns.importo === 420 && ns.spiegazione.includes("mancato arrivo"), ns);
  verifica("Errore di inserimento: nessuna penale", calcolaPenale(standard, "errore", d(ore(1))).importo === 0);
  verifica("Senza politica: penale da decidere", calcolaPenale(null, "cliente", d(ore(1))).importo === null);
  const nr: PoliticaCopiata = { id: 2, ...MODELLI_POLITICA[1] };
  verifica("Non rimborsabile: tutto anche un mese prima", calcolaPenale(nr, "cliente", d(ore(720))).importo === 420);
  const fisso: PoliticaCopiata = { id: 3, nome: "Fisso", scaglioni: [{ oreMin: 0, tipo: "importo", valore: 50 }], noShow: { tipo: "notti", valore: 2 } };
  verifica("Importo fisso", calcolaPenale(fisso, "cliente", d(ore(5))).importo === 50);
  verifica("No-show 2 notti (prime due date: 100 + 80 + 120)", calcolaPenale(fisso, "no_show", d(ore(-1))).importo === 300);
  verifica("Testo per il cliente", descriviPolitica(MODELLI_POLITICA[0]).length === 4 && descriviPolitica(MODELLI_POLITICA[0])[0].includes("48 ore"), descriviPolitica(MODELLI_POLITICA[0]));
  const v = (x: Parameters<typeof validaPolitica>[0]) => {
    try {
      validaPolitica(x);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  };
  verifica("Manca lo scaglione fino all'arrivo: rifiutata", !!v({ nome: "x", scaglioni: [{ oreMin: 24, tipo: "nessuna", valore: 0 }], noShow: { tipo: "nessuna", valore: 0 } }));
  verifica("Percentuale oltre 100: rifiutata", !!v({ nome: "x", scaglioni: [{ oreMin: 0, tipo: "percentuale", valore: 150 }], noShow: { tipo: "nessuna", valore: 0 } }));
  verifica("Scaglioni riordinati dal più largo", validaPolitica({ nome: "x", scaglioni: [{ oreMin: 0, tipo: "percentuale", valore: 100 }, { oreMin: 48, tipo: "nessuna", valore: 0 }], noShow: { tipo: "nessuna", valore: 0 } }).scaglioni[0].oreMin === 48);

  verifica("ISTAT Ross1000: diretta al telefono", canaleRoss1000({ canale: "diretta", mezzoPrenotazione: "telefono" }) === "DIRETTA TRADIZIONALE");
  verifica("ISTAT Ross1000: diretta dal sito", canaleRoss1000({ canale: "diretta", mezzoPrenotazione: "web" }) === "DIRETTA WEB");
  verifica("ISTAT Ross1000: agenzia via email", canaleRoss1000({ canale: "agenzia", mezzoPrenotazione: "email" }) === "INDIRETTA TRADIZIONALE");
  verifica("ISTAT Ross1000: portale", canaleRoss1000({ canale: "portale", mezzoPrenotazione: null }) === "INDIRETTA WEB");
  verifica("ISTAT SPOT: agenzia", caratteristicaSpot({ canale: "agenzia", mezzoPrenotazione: null }) === "AGENZIA");
  verifica("ISTAT SPOT: azienda = non indicato", caratteristicaSpot({ canale: "azienda", mezzoPrenotazione: "email" }) === null);
}

async function main() {
  regole();

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const predefinitaPrima = await prisma.politicaCancellazione.findFirst({ where: { hotelId: hotel.id, predefinita: true, attiva: true } });
  const idsPrenotazioni: number[] = [];
  const idsClienti: number[] = [];
  const idsPolitiche: number[] = [];

  try {
    // Politica predefinita di prova (se l'hotel ne ha già una, si toglie temporaneamente il flag).
    if (predefinitaPrima) await prisma.politicaCancellazione.update({ where: { id: predefinitaPrima.id }, data: { predefinita: false } });
    const p = await prisma.politicaCancellazione.create({
      data: { hotelId: hotel.id, nome: `${NOME} standard`, scaglioni: MODELLI_POLITICA[0].scaglioni, noShow: MODELLI_POLITICA[0].noShow, predefinita: true },
    });
    idsPolitiche.push(p.id);
    const agenzia = await prisma.cliente.create({ data: { hotelId: hotel.id, tipo: "agenzia", denominazione: `${NOME} Viaggi`, commissione: 12 } });
    idsClienti.push(agenzia.id);

    const nuova = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      provenienza: { canale: "agenzia", mezzo: "email", intermediarioId: agenzia.id, garanzia: "caparra", oraArrivo: "21:30" },
      segmenti: [
        {
          cameraId: camera.id,
          tipoCameraId: camera.tipoCameraId,
          ospite: { nome: "Ospite", cognome: NOME },
          trattamento: "B&B",
          listinoId: listino.id,
          dataInizio: "2031-06-10",
          dataFine: "2031-06-13",
          composizione: { adulti: 2, etaBambini: [] },
        },
      ],
    });
    idsPrenotazioni.push(nuova.id);
    verifica(
      "Nuova prenotazione: provenienza e garanzia salvate",
      nuova.canale === "agenzia" && nuova.mezzo === "email" && nuova.intermediarioId === agenzia.id && nuova.garanzia === "caparra" && nuova.oraArrivo === "21:30",
    );
    verifica("Nuova prenotazione: politica predefinita copiata", (nuova.politica as PoliticaCopiata | null)?.nome === `${NOME} standard`);

    // La politica dell'hotel cambia dopo: la prenotazione conserva quella accettata.
    await salvaPolitica(hotel.id, p.id, { nome: `${NOME} cambiata`, scaglioni: [{ oreMin: 0, tipo: "percentuale", valore: 100 }], noShow: { tipo: "percentuale", valore: 100 } });
    const dopo = await trovaPrenotazione(hotel.id, nuova.id);
    verifica("La politica copiata non cambia se l'hotel la modifica", (dopo.politica as PoliticaCopiata).nome === `${NOME} standard`);

    const e1 = await errore(() => aggiornaProvenienza(hotel.id, nuova.id, { canale: "inventato" }));
    verifica("Canale non valido rifiutato", !!e1, e1 ?? "");
    const e2 = await errore(() => aggiornaProvenienza(hotel.id, nuova.id, { oraArrivo: "25:00" }));
    verifica("Ora di arrivo non valida rifiutata", !!e2, e2 ?? "");
    if (altroHotel) {
      const estraneo = await prisma.cliente.create({ data: { hotelId: altroHotel.id, tipo: "azienda", denominazione: `${NOME} altro hotel` } });
      idsClienti.push(estraneo.id);
      const e3 = await errore(() => aggiornaProvenienza(hotel.id, nuova.id, { clientePaganteId: estraneo.id }));
      verifica("Pagante di un altro hotel rifiutato", !!e3, e3 ?? "");
    }

    // Due anni prima dell'arrivo: per la politica nessuna penale, ma la caparra si trattiene.
    let prop = await penaleProposta(hotel.id, nuova.id, "cliente");
    verifica("Molto prima dell'arrivo, senza caparra: penale 0", prop.importo === 0, prop);
    await registraPagamento(hotel.id, nuova.id, { data: "2031-01-10", importo: 50, metodo: "bonifico", tipo: "caparra", nota: "" }, "collaudo");
    prop = await penaleProposta(hotel.id, nuova.id, "cliente");
    verifica("Con caparra di 50: penale proposta 50", prop.importo === 50 && prop.spiegazione.includes("caparra"), prop);
    prop = await penaleProposta(hotel.id, nuova.id, "errore");
    verifica("Errore di inserimento: nessuna penale anche con caparra", prop.importo === 0);

    // Penale maggiore dell'incassato: il resto resta da incassare.
    await annullaPrenotazione(hotel.id, nuova.id, { motivo: "no_show", nota: "", penale: 120, rimborsaEccedenza: true }, "collaudo");
    let t = calcolaTotaliPrenotazione(await trovaPrenotazione(hotel.id, nuova.id));
    verifica("Penale 120 con 50 incassati: da pagare 70", t.totale === 120 && t.pagato === 50 && t.daPagare === 70, t);

    // Seconda prenotazione: penale minore dell'incassato, si rimborsa la differenza.
    const seconda = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [
        {
          cameraId: camera.id,
          tipoCameraId: camera.tipoCameraId,
          ospite: { nome: "Ospite", cognome: NOME },
          trattamento: "B&B",
          listinoId: listino.id,
          dataInizio: "2031-07-10",
          dataFine: "2031-07-12",
          composizione: { adulti: 2, etaBambini: [] },
        },
      ],
    });
    idsPrenotazioni.push(seconda.id);
    verifica("Senza indicazioni: diretta e non garantita", seconda.canale === "diretta" && seconda.garanzia === "nessuna" && seconda.intermediarioId === null);
    await registraPagamento(hotel.id, seconda.id, { data: "2031-01-10", importo: 100, metodo: "contanti", tipo: "acconto", nota: "" }, "collaudo");
    await annullaPrenotazione(hotel.id, seconda.id, { motivo: "cliente", nota: "", penale: 30, rimborsaEccedenza: true, metodoRimborso: "contanti" }, "collaudo");
    const s2 = await trovaPrenotazione(hotel.id, seconda.id);
    t = calcolaTotaliPrenotazione(s2);
    const rimborso = s2.pagamenti.find((x) => x.tipo === "rimborso");
    verifica("Penale 30 con 100 incassati e rimborso: rimborsati 70, saldo 0", Number(rimborso?.importo) === 70 && t.totale === 30 && t.daPagare === 0, t);
  } finally {
    for (const id of idsPrenotazioni) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.cliente.deleteMany({ where: { id: { in: idsClienti } } });
    await prisma.politicaCancellazione.deleteMany({ where: { id: { in: idsPolitiche } } });
    if (predefinitaPrima) await prisma.politicaCancellazione.update({ where: { id: predefinitaPrima.id }, data: { predefinita: true } });
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
