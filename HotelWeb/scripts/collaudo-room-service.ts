/**
 * Collaudo del room service: link del QR valido solo con gli ospiti in casa, menu e orari, limiti
 * dell'ordine, avanzamento degli stati, addebito sul conto alla consegna (solo righe con prezzo, una
 * volta sola), annullamento, allergie dell'ospite segnalate al personale, nuovo codice, altro hotel.
 * Primo hotel (il modulo Ristorazione si accende per il collaudo e torna com'era); tutto si cancella.
 *   npx tsx scripts/collaudo-room-service.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { aggiungiPiattoAlMenu, salvaMenu, salvaPiatto } from "../src/lib/menu";
import { salvaNotaAlimentare } from "../src/lib/noteAlimentari";
import { creaPrenotazione } from "../src/lib/prenotazioni";
import { cambiaStatoOrdine, codiceCartoncino, elencoOrdini, ordinaAlTelefono, ordinaDaQr, paginaOspite } from "../src/lib/roomService";

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

const NOME = "CollaudoRoomService";
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));
const oraRoma = Number(new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(new Date()));

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
  const moduliPrima = hotel.moduli;
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { hotelId: hotel.id } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const prenotazioni: number[] = [];
  await prisma.hotel.update({ where: { id: hotel.id }, data: { moduli: [...new Set([...((moduliPrima as string[]) ?? []), "ristorazione"])] } });

  try {
    await salvaPiatto(hotel.id, null, { nome: `${NOME} Club sandwich`, descrizione: "", categoria: "secondi", prezzo: 12.5, repartoId: null, allergeni: ["glutine", "uova"], senzaAllergeni: false, regimi: [], attivo: true });
    await salvaPiatto(hotel.id, null, { nome: `${NOME} Acqua`, descrizione: "", categoria: "bevande", prezzo: null, repartoId: null, allergeni: [], senzaAllergeni: true, regimi: [], attivo: true });
    await salvaPiatto(hotel.id, null, { nome: `${NOME} Colazione`, descrizione: "", categoria: "colazione", prezzo: 15, repartoId: null, allergeni: ["latte"], senzaAllergeni: false, regimi: [], attivo: true });
    const [sandwich, acqua, colazione] = await Promise.all(
      ["Club sandwich", "Acqua", "Colazione"].map((n) => prisma.piatto.findFirstOrThrow({ where: { hotelId: hotel.id, nome: `${NOME} ${n}` } })),
    );
    const sempre = await salvaMenu(hotel.id, null, { nome: `${NOME} sempre`, pasti: [], giorno: null, dalle: "00:00", alle: "23:59", roomService: true, attivo: true, note: "" });
    await aggiungiPiattoAlMenu(hotel.id, sempre, sandwich.id);
    await aggiungiPiattoAlMenu(hotel.id, sempre, acqua.id);
    // Un menu con orari che adesso non valgono.
    const [dalle, alle] = oraRoma < 12 ? ["20:00", "21:00"] : ["06:00", "07:00"];
    const ristretto = await salvaMenu(hotel.id, null, { nome: `${NOME} orari`, pasti: [], giorno: null, dalle, alle, roomService: true, attivo: true, note: "" });
    await aggiungiPiattoAlMenu(hotel.id, ristretto, colazione.id);
    const voci = await prisma.voceMenu.findMany({ where: { menuId: { in: [sempre, ristretto] } } });
    const voce = (piattoId: number) => voci.find((v) => v.piattoId === piattoId)!.id;

    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [{ tipoCameraId: tipo.id, ospite: { nome: "Ospite", cognome: NOME }, trattamento, listinoId: listino.id, dataInizio: giorno(-1), dataFine: giorno(2), composizione: { adulti: 1, etaBambini: [] } }],
    });
    prenotazioni.push(p.id);
    const seg = p.segmenti[0];
    await salvaNotaAlimentare(hotel.id, seg.ospiteId, { voci: [{ codice: "glutine", tipo: "allergia" }], regimi: [], esigenze: "", consenso: "soggiorno", consensoModo: "a_voce", consensoDato: true }, "collaudo");
    const { codice } = await codiceCartoncino(hotel.id, seg.id);
    const ordine = (righe: { voceId: number; quantita: number }[], perQuando: string | null = null) => ordinaDaQr(codice, { righe, perQuando, nota: "" });

    verifica("Codice sconosciuto: nessuna pagina", (await paginaOspite("x".repeat(24))) === null);
    let pg = await paginaOspite(codice);
    verifica("Prima dell'arrivo il link non è attivo", pg?.attivo === false);
    const e0 = await errore(() => ordine([{ voceId: voce(sandwich.id), quantita: 1 }]));
    verifica("Prima dell'arrivo non si ordina", !!e0, e0 ?? "");

    await prisma.presenza.updateMany({ where: { segmentoId: seg.id }, data: { stato: "arrivato", arrivoIl: new Date() } });
    pg = await paginaOspite(codice);
    verifica("Ospite in casa: menu room service visibile", pg?.attivo === true && pg.menu.some((m) => m.nome === `${NOME} sempre`));
    verifica("La pagina dell'ospite non contiene dati personali", !JSON.stringify(pg).includes(NOME + "\"") && !JSON.stringify(pg).includes("ALLERGIA"));

    const e1 = await errore(() => ordine([{ voceId: voce(colazione.id), quantita: 1 }]));
    verifica(`Fuori dagli orari del menu (${dalle}–${alle}): rifiutato`, !!e1, e1 ?? "");
    const e2 = await errore(() => ordine([{ voceId: voce(sandwich.id), quantita: 11 }]));
    verifica("Quantità oltre 10: rifiutata", !!e2, e2 ?? "");
    const e3 = await errore(() => ordine([{ voceId: voce(sandwich.id), quantita: 1 }], `${giorno(-1)}T08:00`));
    verifica("Orario già passato: rifiutato", !!e3, e3 ?? "");
    const e4 = await errore(() => ordine([]));
    verifica("Ordine vuoto: rifiutato", !!e4, e4 ?? "");

    const id1 = await ordine([{ voceId: voce(sandwich.id), quantita: 2 }, { voceId: voce(acqua.id), quantita: 1 }]);
    await ordine([{ voceId: voce(acqua.id), quantita: 1 }]);
    await ordine([{ voceId: voce(acqua.id), quantita: 2 }]);
    const e5 = await errore(() => ordine([{ voceId: voce(acqua.id), quantita: 1 }]));
    verifica("Dal QR al massimo 3 ordini in corso", !!e5, e5 ?? "");
    const idTel = await ordinaAlTelefono(hotel.id, seg.id, { righe: [{ voceId: voce(acqua.id), quantita: 1 }], perQuando: null, nota: "lasciare fuori dalla porta" }, "Reception");
    verifica("Al telefono la reception può inserirne ancora", idTel > 0);

    let lista = await elencoOrdini(hotel.id, true);
    const o1 = lista.ordini.find((o) => o.id === id1)!;
    verifica("Ordine 1: totale 25 € (2 × 12,50, acqua compresa)", o1.totale === 25);
    verifica("Il personale vede l'allergia al glutine sul club sandwich", o1.conflitti.some((c) => c.allergia && c.piatto === `${NOME} Club sandwich`), o1.conflitti);
    lista = await elencoOrdini(hotel.id, false);
    verifica("Senza il permesso note: nessun conflitto mostrato", lista.ordini.find((o) => o.id === id1)!.conflitti.length === 0);

    // Stati e consegna.
    await cambiaStatoOrdine(hotel.id, id1, "pronto", "Anna");
    const e6 = await errore(() => cambiaStatoOrdine(hotel.id, id1, "in_preparazione", "Anna"));
    verifica("Non si torna indietro di stato", !!e6, e6 ?? "");
    if (altroHotel) {
      const e7 = await errore(() => cambiaStatoOrdine(altroHotel.id, id1, "consegnato", "Anna"));
      verifica("Un altro hotel non tocca l'ordine", !!e7);
    }
    await cambiaStatoOrdine(hotel.id, id1, "consegnato", "Anna");
    const addebiti = await prisma.addebitoConto.findMany({ where: { prenotazioneId: p.id, buono: `RS-${id1}` } });
    verifica("Consegna: un addebito di 2 × 12,50 € sul conto, l'acqua compresa no", addebiti.length === 1 && addebiti[0].quantita === 2 && Number(addebiti[0].prezzoUnitario) === 12.5 && addebiti[0].repartoId !== null);
    const e8 = await errore(() => cambiaStatoOrdine(hotel.id, id1, "consegnato", "Anna"));
    verifica("Non si consegna due volte", !!e8, e8 ?? "");
    const e9 = await errore(() => cambiaStatoOrdine(hotel.id, id1, "annullato", "Anna", "ripensamento"));
    verifica("Un ordine consegnato non si annulla", !!e9, e9 ?? "");
    const e10 = await errore(() => cambiaStatoOrdine(hotel.id, idTel, "annullato", "Anna", ""));
    verifica("Annullare richiede il motivo", !!e10, e10 ?? "");
    await cambiaStatoOrdine(hotel.id, idTel, "annullato", "Anna", "l'ospite ha cambiato idea");
    pg = await paginaOspite(codice);
    verifica("L'ospite vede i suoi ordini con lo stato", pg?.attivo === true && pg.ordini.some((o) => o.id === id1 && o.stato === "consegnato"));

    // Nuovo codice: il vecchio non vale più.
    const { codice: nuovo } = await codiceCartoncino(hotel.id, seg.id, true);
    verifica("Nuovo codice: il vecchio link non funziona più", (await paginaOspite(codice)) === null && (await paginaOspite(nuovo))?.attivo === true);

    // Dopo la partenza.
    await prisma.presenza.updateMany({ where: { segmentoId: seg.id }, data: { stato: "partito", partenzaIl: new Date() } });
    verifica("Dopo la partenza il link non è più attivo", (await paginaOspite(nuovo))?.attivo === false);
    const e11 = await errore(() => ordinaDaQr(nuovo, { righe: [{ voceId: voce(acqua.id), quantita: 1 }], perQuando: null, nota: "" }));
    verifica("Dopo la partenza non si ordina", !!e11, e11 ?? "");
  } finally {
    for (const id of prenotazioni) {
      await prisma.ordineRoomService.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.addebitoConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.menu.deleteMany({ where: { hotelId: hotel.id, nome: { startsWith: NOME } } });
    await prisma.piatto.deleteMany({ where: { hotelId: hotel.id, nome: { startsWith: NOME } } });
    await prisma.hotel.update({ where: { id: hotel.id }, data: { moduli: moduliPrima ?? [] } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati, moduli dell'hotel ripristinati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
