/**
 * Collaudo dello stato delle camere: regole (da rifare ogni giorno se occupata, discrepanze),
 * cambi di stato con e senza controllo della governante, non disturbare, rapporto della governante,
 * check-out che rende la camera "da pulire", isolamento fra hotel.
 * Primo hotel, una camera libera intorno a oggi; stato della camera e impostazioni tornano com'erano.
 *   npx tsx scripts/collaudo-stato-camere.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { discrepanza, statoDopoPulizia, statoEffettivo } from "../src/lib/pulizieRegole";
import { impostaControlloGovernante, impostaNonDisturbare, impostaStatoPulizia, quadroCamere, registraControllo, statoCamera } from "../src/lib/pulizie";
import { checkoutCamera } from "../src/lib/checkin";
import { creaPrenotazione } from "../src/lib/prenotazioni";

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

const NOME = "CollaudoStatoCamere";
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));

async function main() {
  // Regole pure.
  verifica("Occupata, pronta da ieri: da rifare", statoEffettivo("pronta", giorno(-1), giorno(0), "fermata") === "da_rifare");
  verifica("Occupata, rifatta oggi: pronta", statoEffettivo("pronta", giorno(0), giorno(0), "fermata") === "pronta");
  verifica("Libera, pronta da ieri: resta pronta", statoEffettivo("pronta", giorno(-1), giorno(0), "libera") === "pronta");
  verifica("Da pulire resta da pulire", statoEffettivo("da_pulire", giorno(-1), giorno(0), "fermata") === "da_pulire");
  verifica("Finita senza controllo: pronta; con controllo: da controllare", statoDopoPulizia(false) === "pronta" && statoDopoPulizia(true) === "da_controllare");
  verifica("Discrepanza: occupata per la reception ma trovata libera", !!discrepanza("fermata", "libera") && !discrepanza("fermata", "occupata"));
  verifica("Discrepanza: libera per la reception ma trovata occupata", !!discrepanza("libera", "occupata") && !discrepanza("partita", "libera"));

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
  const utente = await prisma.utente.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  // Una camera libera da ieri a dopodomani (niente soggiorni né fuori servizio).
  const dal = new Date(giorno(-1));
  const al = new Date(giorno(2));
  const camere = await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  let camera = null;
  for (const c of camere) {
    const occupata = await prisma.segmentoSoggiorno.count({ where: { cameraId: c.id, stato: { not: "ANNULLATO" }, prenotazione: { stato: { not: "ANNULLATA" } }, dataInizio: { lt: al }, dataFine: { gt: dal } } });
    const fs = await prisma.cameraIndisponibilita.count({ where: { cameraId: c.id, dal: { lte: al }, al: { gte: dal } } });
    if (!occupata && !fs) {
      camera = c;
      break;
    }
  }
  if (!camera) throw new Error("Nessuna camera libera intorno a oggi: il collaudo non si può fare adesso.");
  const prima = { statoPulizia: camera.statoPulizia, statoPuliziaIl: camera.statoPuliziaIl, statoPuliziaDa: camera.statoPuliziaDa, nonDisturbare: camera.nonDisturbare };
  const controlloPrima = hotel.controlloGovernante;
  const ids: number[] = [];
  const riga = async () => (await quadroCamere(hotel.id)).camere.find((c) => c.id === camera!.id)!;

  try {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento, listinoId: listino.id, dataInizio: giorno(-1), dataFine: giorno(2), composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(p.id);
    const seg = p.segmenti[0];
    await prisma.camera.update({ where: { id: camera.id }, data: { statoPulizia: "pronta", statoPuliziaIl: new Date(Date.now() - 86400000 * 2), statoPuliziaDa: "ieri" } });
    let r = await riga();
    verifica("Ospite non ancora arrivato: la camera è libera e pronta", r.occupazione === "libera" && r.stato === "pronta", r);

    await prisma.presenza.updateMany({ where: { segmentoId: seg.id }, data: { stato: "arrivato", arrivoIl: new Date() } });
    r = await riga();
    verifica("Ospite in casa, camera pronta da ieri: oggi è da rifare", r.occupazione === "fermata" && r.stato === "da_rifare", r);
    verifica("Lo stesso stato arriva al check-in", (await statoCamera(hotel.id, camera.id)) === "da_rifare");

    await impostaControlloGovernante(hotel.id, false);
    await impostaStatoPulizia(hotel.id, camera.id, "in_pulizia", "Maria");
    verifica("Inizia: in pulizia", (await riga()).stato === "in_pulizia");
    await impostaStatoPulizia(hotel.id, camera.id, "finita", "Maria");
    r = await riga();
    verifica("Finita senza controllo della governante: pronta, con chi l'ha fatta", r.stato === "pronta" && r.statoDa === "Maria");
    await impostaControlloGovernante(hotel.id, true);
    await impostaStatoPulizia(hotel.id, camera.id, "finita", "Maria");
    verifica("Con il controllo: da controllare", (await riga()).stato === "da_controllare");
    await impostaStatoPulizia(hotel.id, camera.id, "pronta", "Governante");
    verifica("La governante approva: pronta", (await riga()).stato === "pronta");
    const e1 = await errore(() => impostaStatoPulizia(hotel.id, camera!.id, "sporca" as never, "x"));
    verifica("Stato inventato: rifiutato", !!e1, e1 ?? "");

    await impostaNonDisturbare(hotel.id, camera.id, true);
    verifica("Non disturbare per oggi", (await riga()).nonDisturbare === true);
    await impostaNonDisturbare(hotel.id, camera.id, false);
    verifica("Non disturbare tolto", (await riga()).nonDisturbare === false);

    await registraControllo(hotel.id, camera.id, "libera", "letto non usato", "Governante");
    r = await riga();
    verifica("Rapporto: occupata per la reception, trovata libera → discrepanza", !!r.discrepanza && r.controllo?.nota === "letto non usato", r.discrepanza);
    await registraControllo(hotel.id, camera.id, "occupata", "", "Governante");
    verifica("Trovata occupata: nessuna discrepanza", !(await riga()).discrepanza);

    if (altroHotel) {
      const e2 = await errore(() => impostaStatoPulizia(altroHotel.id, camera!.id, "pronta", "x"));
      verifica("Un altro hotel non cambia lo stato della camera", !!e2, e2 ?? "");
    }

    // Check-out: la camera diventa da pulire.
    await checkoutCamera(hotel.id, utente.id, seg.id, giorno(0));
    r = await riga();
    verifica("Dopo il check-out: da pulire, ospiti partiti oggi", r.stato === "da_pulire" && r.occupazione === "partita", r);
  } finally {
    for (const id of ids) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.eventoTassa.deleteMany({ where: { posizione: { prenotazioneId: id } } }).catch(() => undefined);
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.controlloCamera.deleteMany({ where: { cameraId: camera.id, giorno: new Date(giorno(0)) } });
    await prisma.camera.update({ where: { id: camera.id }, data: prima });
    await prisma.hotel.update({ where: { id: hotel.id }, data: { controlloGovernante: controlloPrima } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati, camera e impostazioni ripristinate)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
