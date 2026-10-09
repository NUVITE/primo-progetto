import { prisma } from "@/lib/prisma";
import { creaIndisponibilita } from "@/lib/camere";
import { PERMESSI } from "@/lib/permessi";
import { utentiConPermesso } from "@/lib/utentiConPermesso";
import { PRIORITA, SEGNALAZIONI_APERTE, type Priorita, type StatoSegnalazione } from "@/lib/manutenzioniRegole";

/**
 * Manutenzioni: segnalazioni dei guasti (camera o zona comune), presa in carico, risoluzione.
 * Un guasto urgente in camera può metterla fuori servizio (lo decide la reception): quando il guasto
 * si risolve il fuori servizio finisce oggi e la camera passa "da pulire".
 */

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

export const manutentori = (hotelId: number) => utentiConPermesso(hotelId, PERMESSI.MANUTENZIONI_GESTISCI);

export type SegnalazioneInput = { cameraId: number | null; zona: string; descrizione: string; priorita: Priorita };

export async function creaSegnalazione(hotelId: number, d: SegnalazioneInput, autore: string, origine: "personale" | "ospite" = "personale") {
  const descrizione = d.descrizione.trim();
  if (descrizione.length < 3) throw new Error("Descrivi il guasto.");
  if (descrizione.length > 1000) throw new Error("Descrizione troppo lunga (massimo 1000 caratteri).");
  if (!(d.priorita in PRIORITA)) throw new Error("Priorità non valida.");
  const zona = d.zona.trim();
  if (d.cameraId === null && !zona) throw new Error("Indica la camera o la zona del guasto.");
  if (d.cameraId !== null) await prisma.camera.findFirstOrThrow({ where: { id: d.cameraId, hotelId } });
  const s = await prisma.segnalazione.create({
    data: { hotelId, cameraId: d.cameraId, zona: d.cameraId === null ? zona : null, descrizione, priorita: d.priorita, origine, segnalataDa: autore },
  });
  return s.id;
}

export type FiltroSegnalazioni = { vista: "aperte" | "mie" | "chiuse"; utenteId?: number; cameraId?: number | null };

export async function elencoSegnalazioni(hotelId: number, f: FiltroSegnalazioni) {
  const where = {
    hotelId,
    ...(f.cameraId ? { cameraId: f.cameraId } : {}),
    ...(f.cameraId ? {} : f.vista === "chiuse" ? { stato: { notIn: SEGNALAZIONI_APERTE } } : { stato: { in: SEGNALAZIONI_APERTE } }),
    ...(f.vista === "mie" && !f.cameraId ? { assegnataAId: f.utenteId ?? -1 } : {}),
  };
  const r = await prisma.segnalazione.findMany({
    where,
    include: { camera: true, assegnataA: true, fuoriServizio: true },
    orderBy: f.vista === "chiuse" || f.cameraId ? [{ creataIl: "desc" }] : [{ priorita: "desc" }, { creataIl: "asc" }],
    take: 300,
  });
  const oggi = new Date(oggiItalia());
  return r.map((s) => ({
    id: s.id,
    camera: s.camera ? { id: s.camera.id, codice: s.camera.codice } : null,
    zona: s.zona,
    descrizione: s.descrizione,
    priorita: s.priorita as Priorita,
    stato: s.stato as StatoSegnalazione,
    origine: s.origine,
    segnalataDa: s.segnalataDa,
    creataIl: s.creataIl.toISOString(),
    assegnataA: s.assegnataA ? { id: s.assegnataA.id, nome: s.assegnataA.nome } : null,
    chiusaIl: s.chiusaIl?.toISOString() ?? null,
    chiusaDa: s.chiusaDa,
    esito: s.esito ?? "",
    // Fuori servizio collegato, se è ancora in corso o futuro.
    fuoriServizio: s.fuoriServizio && s.fuoriServizio.al > oggi ? { dal: s.fuoriServizio.dal.toISOString().slice(0, 10), al: s.fuoriServizio.al.toISOString().slice(0, 10) } : null,
  }));
}

async function segnalazioneDelHotel(hotelId: number, id: number) {
  const s = await prisma.segnalazione.findFirst({ where: { id, hotelId } });
  if (!s) throw new Error("Segnalazione non trovata.");
  return s;
}

function apertaOErrore(stato: string) {
  if (!SEGNALAZIONI_APERTE.includes(stato as StatoSegnalazione)) throw new Error("La segnalazione è già chiusa.");
}

/** Prende in carico (o assegna a un manutentore): passa "in lavorazione". utenteId null = toglie l'assegnazione. */
export async function assegnaSegnalazione(hotelId: number, id: number, utenteId: number | null) {
  const s = await segnalazioneDelHotel(hotelId, id);
  apertaOErrore(s.stato);
  if (utenteId !== null && !(await manutentori(hotelId)).some((m) => m.id === utenteId)) throw new Error("Questa persona non gestisce le manutenzioni.");
  await prisma.segnalazione.update({
    where: { id },
    data: utenteId === null ? { assegnataAId: null, stato: "aperta", presaIl: null } : { assegnataAId: utenteId, stato: "in_lavorazione", presaIl: s.presaIl ?? new Date() },
  });
}

/** Fine del fuori servizio legato al guasto: da oggi la camera torna disponibile. */
async function chiudiFuoriServizio(fuoriServizioId: number | null) {
  if (!fuoriServizioId) return false;
  const fs = await prisma.cameraIndisponibilita.findUnique({ where: { id: fuoriServizioId } });
  const oggi = new Date(oggiItalia());
  if (!fs || fs.al <= oggi) return false;
  if (fs.dal >= oggi) await prisma.cameraIndisponibilita.delete({ where: { id: fs.id } });
  else await prisma.cameraIndisponibilita.update({ where: { id: fs.id }, data: { al: oggi } });
  return true;
}

/** Guasto risolto: cosa è stato fatto. Se la camera era fuori servizio torna disponibile e da pulire. */
export async function risolviSegnalazione(hotelId: number, id: number, esito: string, utente: string) {
  const s = await segnalazioneDelHotel(hotelId, id);
  apertaOErrore(s.stato);
  if (!esito.trim()) throw new Error("Scrivi cosa è stato fatto.");
  const eraFuori = await chiudiFuoriServizio(s.fuoriServizioId);
  await prisma.segnalazione.update({ where: { id }, data: { stato: "risolta", esito: esito.trim(), chiusaIl: new Date(), chiusaDa: utente } });
  if (eraFuori && s.cameraId) {
    await prisma.camera.update({ where: { id: s.cameraId }, data: { statoPulizia: "da_pulire", statoPuliziaIl: new Date(), statoPuliziaDa: "fine manutenzione" } });
  }
}

/** Segnalazione sbagliata o doppia: si annulla con il motivo (e finisce l'eventuale fuori servizio). */
export async function annullaSegnalazione(hotelId: number, id: number, motivo: string, utente: string) {
  const s = await segnalazioneDelHotel(hotelId, id);
  apertaOErrore(s.stato);
  if (!motivo.trim()) throw new Error("Scrivi il motivo.");
  await chiudiFuoriServizio(s.fuoriServizioId);
  await prisma.segnalazione.update({ where: { id }, data: { stato: "annullata", esito: motivo.trim(), chiusaIl: new Date(), chiusaDa: utente } });
}

/**
 * La reception mette fuori servizio la camera del guasto da oggi fino al giorno indicato (escluso).
 * Non si può se ci sono prenotazioni nella camera in quel periodo: prima vanno spostate.
 */
export async function fuoriServizioPerGuasto(hotelId: number, id: number, fino: string) {
  const s = await segnalazioneDelHotel(hotelId, id);
  apertaOErrore(s.stato);
  if (!s.cameraId) throw new Error("Il guasto non è in una camera.");
  if (s.fuoriServizioId) {
    const attuale = await prisma.cameraIndisponibilita.findUnique({ where: { id: s.fuoriServizioId } });
    if (attuale && attuale.al > new Date(oggiItalia())) throw new Error("La camera è già fuori servizio per questo guasto.");
  }
  const fs = await creaIndisponibilita(hotelId, { cameraId: s.cameraId, dal: oggiItalia(), al: fino, motivo: `Guasto: ${s.descrizione.slice(0, 80)}` });
  await prisma.segnalazione.update({ where: { id }, data: { fuoriServizioId: fs.id } });
}

/** Guasti aperti per camera (per la pagina Stato camere). */
export async function guastiApertiPerCamera(hotelId: number) {
  const r = await prisma.segnalazione.groupBy({ by: ["cameraId"], where: { hotelId, cameraId: { not: null }, stato: { in: SEGNALAZIONI_APERTE } }, _count: true });
  return new Map(r.map((x) => [x.cameraId as number, x._count]));
}
