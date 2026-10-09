/**
 * Collaudo di piatti e menu: allergeni obbligatori, nomi doppi, reparto, piatto in un menu non
 * cancellabile, menu per servizio e per giorno, disponibilità, ordine, duplica, piatti da evitare
 * per gli ospiti allergici nel foglio del giorno, isolamento fra hotel.
 * Primo hotel, date nel 2032; piatti, menu e prenotazioni di prova si cancellano alla fine.
 *   npx tsx scripts/collaudo-menu.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { piattiDaEvitare, validaPiatto, type PiattoInput } from "../src/lib/menuRegole";
import {
  aggiungiPiattoAlMenu,
  dettaglioMenu,
  duplicaMenu,
  eliminaMenu,
  eliminaPiatto,
  impostaVoce,
  piattiDelServizio,
  salvaMenu,
  salvaPiatto,
  spostaVoce,
} from "../src/lib/menu";
import { foglioDelGiorno } from "../src/lib/foglioPasti";
import { salvaNotaAlimentare } from "../src/lib/noteAlimentari";
import { creaPrenotazione } from "../src/lib/prenotazioni";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
async function errore(fn: () => unknown) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

const NOME = "CollaudoMenu";
const piatto = (nome: string, d: Partial<PiattoInput> = {}): PiattoInput => ({
  nome: `${NOME} ${nome}`,
  descrizione: "",
  categoria: "primi",
  prezzo: 12,
  repartoId: null,
  allergeni: [],
  senzaAllergeni: false,
  regimi: [],
  attivo: true,
  ...d,
});

async function main() {
  // Regole pure.
  const e0 = await errore(() => validaPiatto(piatto("Senza niente")));
  verifica("Allergeni non indicati e non confermati: rifiutato", !!e0, e0 ?? "");
  const v = validaPiatto(piatto("Lasagne", { allergeni: ["latte", "glutine"], senzaAllergeni: true }));
  verifica("Con allergeni: «senza allergeni» si spegne e l'ordine è quello di legge", !v.senzaAllergeni && v.allergeni.join() === "glutine,latte");
  const ev = piattiDaEvitare(
    [{ codice: "glutine", tipo: "allergia" }, { codice: "latte", tipo: "intolleranza" }, { testo: "kiwi", tipo: "allergia" }],
    [{ nome: "Lasagne", allergeni: ["glutine", "latte"] }, { nome: "Panna cotta", allergeni: ["latte"] }, { nome: "Insalata", allergeni: [] }],
  );
  verifica("Da evitare: lasagne (allergia) e panna cotta (intolleranza), non l'insalata", ev.length === 2 && ev[0].allergia && !ev[1].allergia, ev);

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
  const esborso = await prisma.repartoAddebito.findFirst({ where: { hotelId: hotel.id, esborso: true } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const mezza = await prisma.trattamento.findFirst({ where: { hotelId: hotel.id, colazione: true, cena: true, pranzo: false } });
  const prenotazioni: number[] = [];

  try {
    await salvaPiatto(hotel.id, null, piatto("Lasagne", { allergeni: ["glutine", "uova", "latte", "sedano"] }));
    await salvaPiatto(hotel.id, null, piatto("Insalata", { categoria: "contorni", prezzo: 6, senzaAllergeni: true, regimi: ["vegano"] }));
    await salvaPiatto(hotel.id, null, piatto("Torta", { categoria: "dessert", prezzo: null, allergeni: ["glutine", "uova"] }));
    const e1 = await errore(() => salvaPiatto(hotel.id, null, piatto("Lasagne", { senzaAllergeni: true })));
    verifica("Nome doppio: rifiutato", !!e1, e1 ?? "");
    if (esborso) {
      const e2 = await errore(() => salvaPiatto(hotel.id, null, piatto("Taxi", { senzaAllergeni: true, repartoId: esborso.id })));
      verifica("Reparto degli esborsi: rifiutato", !!e2, e2 ?? "");
    }
    const [lasagne, insalata, torta] = await Promise.all(
      ["Lasagne", "Insalata", "Torta"].map((n) => prisma.piatto.findFirstOrThrow({ where: { hotelId: hotel.id, nome: `${NOME} ${n}` } })),
    );

    // Menu della cena valido solo il 12/05/2032.
    const cena = await salvaMenu(hotel.id, null, { nome: `${NOME} cena`, pasti: ["cena"], giorno: "2032-05-12", dalle: "19:30", alle: "21:30", roomService: false, attivo: true, note: "" });
    for (const p of [lasagne, insalata, torta]) await aggiungiPiattoAlMenu(hotel.id, cena, p.id);
    const e3 = await errore(() => aggiungiPiattoAlMenu(hotel.id, cena, lasagne.id));
    verifica("Lo stesso piatto due volte nel menu: rifiutato", !!e3, e3 ?? "");
    const e4 = await errore(() => salvaMenu(hotel.id, null, { nome: `${NOME} x`, pasti: [], giorno: null, dalle: "21:00", alle: "19:00", roomService: false, attivo: true, note: "" }));
    verifica("Orari al contrario: rifiutato", !!e4, e4 ?? "");

    let m = await dettaglioMenu(hotel.id, cena);
    const ultima = m.voci[m.voci.length - 1];
    await spostaVoce(hotel.id, cena, ultima.id, -1);
    m = await dettaglioMenu(hotel.id, cena);
    verifica("Ordine: la torta sale di un posto", m.voci[1].nome === `${NOME} Torta`, m.voci.map((x) => x.nome));

    const nomiServizio = async (g: string, p: "pranzo" | "cena") => (await piattiDelServizio(hotel.id, g, p)).map((x) => x.nome).filter((n) => n.startsWith(NOME));
    verifica("Cena del 12/05: tre piatti", (await nomiServizio("2032-05-12", "cena")).length === 3);
    verifica("Cena del 13/05: il menu del giorno non vale", (await nomiServizio("2032-05-13", "cena")).length === 0);
    verifica("Pranzo del 12/05: il menu è solo per la cena", (await nomiServizio("2032-05-12", "pranzo")).length === 0);
    const voceInsalata = m.voci.find((x) => x.piattoId === insalata.id)!;
    await impostaVoce(hotel.id, cena, voceInsalata.id, { disponibile: false, prezzo: 5 });
    verifica("Piatto finito: non si propone più", !(await nomiServizio("2032-05-12", "cena")).includes(`${NOME} Insalata`));
    m = await dettaglioMenu(hotel.id, cena);
    verifica("Prezzo diverso nel menu salvato", m.voci.find((x) => x.id === voceInsalata.id)?.prezzo === 5);

    const e5 = await errore(() => eliminaPiatto(hotel.id, lasagne.id));
    verifica("Piatto in un menu: non si cancella", !!e5, e5 ?? "");

    // Duplica per il giorno dopo.
    const copia = await duplicaMenu(hotel.id, cena, `${NOME} cena 13`, "2032-05-13");
    const mc = await dettaglioMenu(hotel.id, copia);
    verifica("Copia: stessi piatti, tutti di nuovo disponibili, nuovo giorno", mc.voci.length === 3 && mc.voci.every((x) => x.disponibile) && mc.giorno === "2032-05-13");

    // Foglio del giorno: ospite allergico al glutine in mezza pensione.
    if (mezza) {
      const p = await creaPrenotazione(hotel.id, {
        ospitePrenotante: { nome: "Ospite", cognome: NOME },
        segmenti: [{ tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento: mezza.nome, listinoId: listino.id, dataInizio: "2032-05-11", dataFine: "2032-05-14", composizione: { adulti: 1, etaBambini: [] } }],
      });
      prenotazioni.push(p.id);
      await salvaNotaAlimentare(hotel.id, p.segmenti[0].ospiteId, { voci: [{ codice: "glutine", tipo: "allergia" }], regimi: [], esigenze: "", consenso: "soggiorno", consensoModo: "a_voce", consensoDato: true }, "collaudo");
      const f = await foglioDelGiorno(hotel.id, "2032-05-12", true);
      const riga = f.servizi.cena.righe.find((r) => r.segmentoId === p.segmenti[0].id);
      const evitare = riga?.note[0]?.daEvitare.map((x) => x.piatto) ?? [];
      verifica("Foglio: da evitare lasagne e torta (glutine), non l'insalata", evitare.includes(`${NOME} Lasagne`) && evitare.includes(`${NOME} Torta`) && !evitare.includes(`${NOME} Insalata`), evitare);
      const fn = await foglioDelGiorno(hotel.id, "2032-05-12", false);
      verifica("Senza il permesso note: niente piatti da evitare", fn.servizi.cena.righe.find((r) => r.segmentoId === p.segmenti[0].id)?.note.length === 0);
    }

    if (altroHotel) {
      const e6 = await errore(() => dettaglioMenu(altroHotel.id, cena));
      verifica("Un altro hotel non vede il menu", !!e6);
      const e7 = await errore(() => aggiungiPiattoAlMenu(altroHotel.id, cena, torta.id));
      verifica("Un altro hotel non modifica il menu", !!e7);
    }

    await eliminaMenu(hotel.id, copia);
    await eliminaMenu(hotel.id, cena);
    await eliminaPiatto(hotel.id, lasagne.id);
    verifica("Tolto dai menu, il piatto si cancella", !(await prisma.piatto.findUnique({ where: { id: lasagne.id } })));
  } finally {
    for (const id of prenotazioni) {
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
