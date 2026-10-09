import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { guastiApertiPerCamera } from "@/lib/manutenzioni";
import { discrepanza, statoDopoPulizia, statoEffettivo, STATI_PULIZIA, type Occupazione, type StatoPulizia } from "@/lib/pulizieRegole";

/**
 * Stato di pulizia delle camere (regole pure in pulizieRegole.ts). Al check-out la camera diventa
 * "da pulire"; le camere occupate tornano "da rifare" ogni giorno (calcolato). Il rapporto della
 * governante dice com'è stata trovata la camera: se non coincide con la reception è una discrepanza.
 */

type Db = PrismaClient | Prisma.TransactionClient;
const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const giornoItalia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Occupazione di oggi per ogni camera dell'hotel (da soggiorni e presenze). */
async function occupazioniDiOggi(db: Db, hotelId: number, oggi: string) {
  const g = new Date(oggi);
  const segmenti = await db.segmentoSoggiorno.findMany({
    where: { cameraId: { not: null }, stato: { not: "ANNULLATO" }, prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, dataInizio: { lte: g }, dataFine: { gte: g } },
    include: { presenze: true, ospite: true },
  });
  const mappa = new Map<number, { occupazione: Occupazione; ospite: string; arrivoOggi: boolean; prenotazioneId: number }>();
  const peso: Record<Occupazione, number> = { libera: 0, partita: 1, in_arrivo: 2, in_partenza: 3, fermata: 4 };
  for (const s of segmenti) {
    const inCasa = s.presenze.some((p) => p.stato === "arrivato");
    const tuttiPartiti = s.presenze.length > 0 && s.presenze.every((p) => p.stato === "partito");
    const arrivo = iso(s.dataInizio);
    const partenza = iso(s.dataFine);
    let o: Occupazione = "libera";
    if (s.usoDiurno) o = inCasa ? "in_partenza" : tuttiPartiti ? "partita" : arrivo === oggi ? "in_arrivo" : "libera";
    else if (partenza === oggi) o = inCasa ? "in_partenza" : tuttiPartiti ? "partita" : "libera";
    else if (inCasa) o = "fermata";
    else if (!tuttiPartiti && arrivo === oggi) o = "in_arrivo";
    else if (tuttiPartiti) o = "partita";
    const prima = mappa.get(s.cameraId!);
    // Camera con una partenza e un arrivo lo stesso giorno: conta la situazione più "occupata".
    const arrivoOggi = (prima?.arrivoOggi ?? false) || (arrivo === oggi && !s.usoDiurno);
    if (!prima || peso[o] > peso[prima.occupazione]) {
      mappa.set(s.cameraId!, { occupazione: o, ospite: `${s.ospite.cognome} ${s.ospite.nome}`.trim(), arrivoOggi, prenotazioneId: s.prenotazioneId });
    } else {
      prima.arrivoOggi = arrivoOggi;
    }
  }
  return mappa;
}

/** Quadro di tutte le camere attive per la pagina Stato camere e per il planning. */
export async function quadroCamere(hotelId: number) {
  const oggi = oggiItalia();
  const g = new Date(oggi);
  const [hotel, camere, occupazioni, fuoriServizio, controlli, guasti] = await Promise.all([
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { controlloGovernante: true } }),
    prisma.camera.findMany({ where: { hotelId, attivo: true }, include: { tipoCamera: true }, orderBy: [{ piano: "asc" }, { codice: "asc" }] }),
    occupazioniDiOggi(prisma, hotelId, oggi),
    // Fuori servizio come nel planning: dal giorno "dal" compreso al giorno "al" escluso.
    prisma.cameraIndisponibilita.findMany({ where: { camera: { hotelId }, dal: { lte: g }, al: { gt: g } } }),
    prisma.controlloCamera.findMany({ where: { camera: { hotelId }, giorno: g } }),
    guastiApertiPerCamera(hotelId),
  ]);
  const righe = camere
    .map((c) => {
      const occ = occupazioni.get(c.id) ?? { occupazione: "libera" as Occupazione, ospite: "", arrivoOggi: false, prenotazioneId: null };
      const ctrl = controlli.find((x) => x.cameraId === c.id);
      const fs = fuoriServizio.find((x) => x.cameraId === c.id);
      return {
        id: c.id,
        codice: c.codice,
        piano: c.piano,
        tipo: c.tipoCamera.descrizione,
        stato: statoEffettivo(c.statoPulizia, c.statoPuliziaIl ? giornoItalia(c.statoPuliziaIl) : null, oggi, occ.occupazione),
        statoIl: c.statoPuliziaIl?.toISOString() ?? null,
        statoDa: c.statoPuliziaDa,
        nonDisturbare: c.nonDisturbare ? iso(c.nonDisturbare) === oggi : false,
        occupazione: occ.occupazione,
        arrivoOggi: occ.arrivoOggi,
        ospite: occ.ospite,
        prenotazioneId: occ.prenotazioneId,
        fuoriServizio: fs ? fs.motivo : null,
        guastiAperti: guasti.get(c.id) ?? 0,
        controllo: ctrl ? { trovata: ctrl.trovata as "occupata" | "libera", nota: ctrl.nota ?? "", da: ctrl.da } : null,
        discrepanza: ctrl ? discrepanza(occ.occupazione, ctrl.trovata as "occupata" | "libera") : null,
      };
    })
    .sort((a, b) => (a.piano ?? "").localeCompare(b.piano ?? "", "it", { numeric: true }) || a.codice.localeCompare(b.codice, "it", { numeric: true }));
  return { oggi, controlloGovernante: hotel.controlloGovernante, camere: righe };
}

/** Stato effettivo di una camera adesso (per l'avviso al check-in e all'assegnazione). */
export async function statoCamera(hotelId: number, cameraId: number) {
  const oggi = oggiItalia();
  const c = await prisma.camera.findFirst({ where: { id: cameraId, hotelId } });
  if (!c) return null;
  const occ = (await occupazioniDiOggi(prisma, hotelId, oggi)).get(cameraId)?.occupazione ?? "libera";
  return statoEffettivo(c.statoPulizia, c.statoPuliziaIl ? giornoItalia(c.statoPuliziaIl) : null, oggi, occ);
}

async function cameraDelHotel(hotelId: number, cameraId: number) {
  const c = await prisma.camera.findFirst({ where: { id: cameraId, hotelId } });
  if (!c) throw new Error("Camera non trovata.");
  return c;
}

/** Cambio di stato a mano; "finita" = pulizia finita (pronta, o da controllare se la governante controlla). */
export async function impostaStatoPulizia(hotelId: number, cameraId: number, stato: StatoPulizia | "finita", utente: string) {
  await cameraDelHotel(hotelId, cameraId);
  let nuovo: StatoPulizia;
  if (stato === "finita") {
    const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { controlloGovernante: true } });
    nuovo = statoDopoPulizia(h.controlloGovernante);
  } else if (stato in STATI_PULIZIA) {
    nuovo = stato;
  } else {
    throw new Error("Stato non valido.");
  }
  await prisma.camera.update({ where: { id: cameraId }, data: { statoPulizia: nuovo, statoPuliziaIl: new Date(), statoPuliziaDa: utente } });
  return nuovo;
}

/** «Non disturbare» per oggi (attiva=false lo toglie). */
export async function impostaNonDisturbare(hotelId: number, cameraId: number, attiva: boolean) {
  await cameraDelHotel(hotelId, cameraId);
  await prisma.camera.update({ where: { id: cameraId }, data: { nonDisturbare: attiva ? new Date(oggiItalia()) : null } });
}

/** Rapporto della governante per oggi: com'è stata trovata la camera (null = toglie la voce). */
export async function registraControllo(hotelId: number, cameraId: number, trovata: "occupata" | "libera" | null, nota: string, utente: string) {
  await cameraDelHotel(hotelId, cameraId);
  const giorno = new Date(oggiItalia());
  if (trovata === null) {
    await prisma.controlloCamera.deleteMany({ where: { cameraId, giorno } });
    return;
  }
  if (trovata !== "occupata" && trovata !== "libera") throw new Error("Indica se la camera è occupata o libera.");
  const dati = { trovata, nota: nota.trim() || null, da: utente };
  await prisma.controlloCamera.upsert({ where: { cameraId_giorno: { cameraId, giorno } }, update: dati, create: { cameraId, giorno, ...dati } });
}

export async function impostaControlloGovernante(hotelId: number, attivo: boolean) {
  await prisma.hotel.update({ where: { id: hotelId }, data: { controlloGovernante: attivo } });
}

/**
 * Dopo un check-out: se nella camera non resta nessuno in casa diventa "da pulire".
 * Si chiama dentro la transazione del check-out (anche di una sola persona).
 */
export async function segnaDaPulireSeLibera(db: Db, segmentoId: number, utente = "check-out") {
  const s = await db.segmentoSoggiorno.findUnique({ where: { id: segmentoId }, include: { presenze: true } });
  if (!s?.cameraId || s.presenze.some((p) => p.stato !== "partito")) return;
  await db.camera.update({ where: { id: s.cameraId }, data: { statoPulizia: "da_pulire", statoPuliziaIl: new Date(), statoPuliziaDa: utente } });
}
