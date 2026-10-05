/**
 * Collaudo delle manutenzioni: segnalazione (camera o zona), presa in carico solo da chi gestisce le
 * manutenzioni, fuori servizio per guasto urgente (non con prenotazioni nella camera), risoluzione che
 * rimette la camera in vendita e da pulire, annullamento, storico per camera, isolamento fra hotel.
 * Primo hotel, due camere libere intorno a oggi, un manutentore di prova; tutto torna com'era.
 *   npx tsx scripts/collaudo-manutenzioni.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  annullaSegnalazione,
  assegnaSegnalazione,
  creaSegnalazione,
  elencoSegnalazioni,
  fuoriServizioPerGuasto,
  guastiApertiPerCamera,
  manutentori,
  risolviSegnalazione,
} from "../src/lib/manutenzioni";
import { quadroCamere } from "../src/lib/pulizie";
import { creaPrenotazione } from "../src/lib/prenotazioni";
import { fotografaStatoCamere } from "./statoCamereCollaudo";

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

const NOME = "CollaudoManutenzioni";
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
  const ripristinaCamere = await fotografaStatoCamere();
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const ruolo = await prisma.ruolo.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Manutenzione" } });
  const ruoloReception = await prisma.ruolo.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Reception" } });

  const dal = new Date(giorno(-1));
  const al = new Date(giorno(3));
  const libere = [];
  for (const c of await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } })) {
    const occupata = await prisma.segmentoSoggiorno.count({ where: { cameraId: c.id, stato: { not: "ANNULLATO" }, prenotazione: { stato: { not: "ANNULLATA" } }, dataInizio: { lt: al }, dataFine: { gt: dal } } });
    const fs = await prisma.cameraIndisponibilita.count({ where: { cameraId: c.id, dal: { lt: al }, al: { gt: dal } } });
    if (!occupata && !fs) libere.push(c);
    if (libere.length === 2) break;
  }
  if (libere.length < 2) throw new Error("Servono due camere libere intorno a oggi: il collaudo non si può fare adesso.");
  const [camA, camB] = libere;
  const manutentore = await prisma.utente.create({ data: { nome: `${NOME} Gino`, email: `collaudo-manutenzioni-${Date.now()}@example.invalid`, passwordHash: "-", accessi: { create: { hotelId: hotel.id, ruoloId: ruolo.id } } } });
  const receptionist = await prisma.utente.create({ data: { nome: `${NOME} Rita`, email: `collaudo-manutenzioni-r-${Date.now()}@example.invalid`, passwordHash: "-", accessi: { create: { hotelId: hotel.id, ruoloId: ruoloReception.id } } } });
  const prenotazioni: number[] = [];

  try {
    const e1 = await errore(() => creaSegnalazione(hotel.id, { cameraId: null, zona: "", descrizione: "rotto", priorita: "normale" }, "Anna"));
    verifica("Senza camera né zona: rifiutata", !!e1, e1 ?? "");
    const e2 = await errore(() => creaSegnalazione(hotel.id, { cameraId: camA.id, zona: "", descrizione: "x", priorita: "normale" }, "Anna"));
    verifica("Descrizione troppo breve: rifiutata", !!e2, e2 ?? "");
    if (altroHotel) {
      const e3 = await errore(() => creaSegnalazione(altroHotel.id, { cameraId: camA.id, zona: "", descrizione: "perde il rubinetto", priorita: "normale" }, "Anna"));
      verifica("Camera di un altro hotel: rifiutata", !!e3);
    }
    const zona = await creaSegnalazione(hotel.id, { cameraId: null, zona: `${NOME} ascensore`, descrizione: "porta lenta a chiudersi", priorita: "normale" }, "Anna");
    const urgente = await creaSegnalazione(hotel.id, { cameraId: camA.id, zona: "", descrizione: `${NOME}: doccia che allaga`, priorita: "urgente" }, "Maria");
    let aperte = (await elencoSegnalazioni(hotel.id, { vista: "aperte" })).filter((s) => [zona, urgente].includes(s.id));
    verifica("Elenco: l'urgente viene prima", aperte[0]?.id === urgente, aperte.map((s) => s.id));
    verifica("Guasti aperti contati sulla camera", (await guastiApertiPerCamera(hotel.id)).get(camA.id) === 1);

    verifica("Il manutentore di prova è tra i manutentori", (await manutentori(hotel.id)).some((m) => m.id === manutentore.id));
    const e4 = await errore(() => assegnaSegnalazione(hotel.id, urgente, receptionist.id));
    verifica("Non si assegna a chi non gestisce le manutenzioni", !!e4, e4 ?? "");
    await assegnaSegnalazione(hotel.id, urgente, manutentore.id);
    const mie = await elencoSegnalazioni(hotel.id, { vista: "mie", utenteId: manutentore.id });
    verifica("Assegnata: in lavorazione e nella lista del manutentore", mie.some((s) => s.id === urgente && s.stato === "in_lavorazione"));

    // Fuori servizio per il guasto urgente.
    await fuoriServizioPerGuasto(hotel.id, urgente, giorno(2));
    let q = await quadroCamere(hotel.id);
    verifica("Camera fuori servizio da oggi", !!q.camere.find((c) => c.id === camA.id)?.fuoriServizio);
    const e5 = await errore(() => fuoriServizioPerGuasto(hotel.id, urgente, giorno(2)));
    verifica("Due volte fuori servizio per lo stesso guasto: rifiutato", !!e5, e5 ?? "");

    // Camera B con una prenotazione: niente fuori servizio.
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [{ cameraId: camB.id, tipoCameraId: camB.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento, listinoId: listino.id, dataInizio: giorno(0), dataFine: giorno(1), composizione: { adulti: 1, etaBambini: [] } }],
    });
    prenotazioni.push(p.id);
    const guastoB = await creaSegnalazione(hotel.id, { cameraId: camB.id, zona: "", descrizione: `${NOME}: niente acqua calda`, priorita: "urgente" }, "Anna");
    const e6 = await errore(() => fuoriServizioPerGuasto(hotel.id, guastoB, giorno(2)));
    verifica("Camera con una prenotazione: fuori servizio rifiutato", !!e6, e6 ?? "");

    // Risoluzione.
    const e7 = await errore(() => risolviSegnalazione(hotel.id, urgente, " ", "Gino"));
    verifica("Risolta senza dire cosa si è fatto: rifiutata", !!e7, e7 ?? "");
    await risolviSegnalazione(hotel.id, urgente, "sostituita la guarnizione", "Gino");
    q = await quadroCamere(hotel.id);
    const cA = q.camere.find((c) => c.id === camA.id)!;
    verifica("Risolto: camera di nuovo disponibile e da pulire", !cA.fuoriServizio && cA.stato === "da_pulire", { fs: cA.fuoriServizio, stato: cA.stato });
    verifica("Il fuori servizio del guasto non c'è più", (await prisma.cameraIndisponibilita.count({ where: { cameraId: camA.id, al: { gt: new Date(giorno(0)) } } })) === 0);
    const e8 = await errore(() => risolviSegnalazione(hotel.id, urgente, "ancora", "Gino"));
    verifica("Già chiusa: non si chiude di nuovo", !!e8, e8 ?? "");
    const storico = await elencoSegnalazioni(hotel.id, { vista: "aperte", cameraId: camA.id });
    verifica("Storico della camera: c'è il guasto risolto con cosa è stato fatto", storico.some((s) => s.id === urgente && s.stato === "risolta" && s.esito === "sostituita la guarnizione"));

    const e9 = await errore(() => annullaSegnalazione(hotel.id, zona, "", "Gino"));
    verifica("Annullare richiede il motivo", !!e9, e9 ?? "");
    await annullaSegnalazione(hotel.id, zona, "segnalata due volte", "Gino");
    verifica("Annullata: tra le chiuse", (await elencoSegnalazioni(hotel.id, { vista: "chiuse" })).some((s) => s.id === zona && s.stato === "annullata"));
  } finally {
    const mie = await prisma.segnalazione.findMany({ where: { hotelId: hotel.id, OR: [{ descrizione: { startsWith: NOME } }, { zona: { startsWith: NOME } }] } });
    const fsIds = mie.map((s) => s.fuoriServizioId).filter((x): x is number => x !== null);
    await prisma.segnalazione.deleteMany({ where: { id: { in: mie.map((s) => s.id) } } });
    await prisma.cameraIndisponibilita.deleteMany({ where: { id: { in: fsIds } } });
    for (const id of prenotazioni) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.utente.deleteMany({ where: { id: { in: [manutentore.id, receptionist.id] } } });
    await ripristinaCamere();
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati, camere ripristinate)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
