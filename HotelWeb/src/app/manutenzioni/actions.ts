"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import {
  annullaSegnalazione,
  assegnaSegnalazione,
  creaSegnalazione,
  elencoSegnalazioni,
  fuoriServizioPerGuasto,
  manutentori,
  risolviSegnalazione,
  type FiltroSegnalazioni,
  type SegnalazioneInput,
} from "@/lib/manutenzioni";

async function carica(u: UtenteSessione, f: FiltroSegnalazioni) {
  const gestore = puo(u, PERMESSI.MANUTENZIONI_GESTISCI);
  const [segnalazioni, camere, persone] = await Promise.all([
    elencoSegnalazioni(u.hotelId, { ...f, utenteId: u.id }),
    prisma.camera.findMany({ where: { hotelId: u.hotelId, attivo: true }, select: { id: true, codice: true }, orderBy: { codice: "asc" } }),
    gestore ? manutentori(u.hotelId) : Promise.resolve([]),
  ]);
  return {
    filtro: f,
    segnalazioni,
    camere,
    manutentori: persone,
    io: u.id,
    gestore,
    // Mettere fuori servizio toglie disponibilità: lo decide chi gestisce prenotazioni o camere.
    puoFuoriServizio: puo(u, PERMESSI.PRENOTAZIONI_GESTISCI) || puo(u, PERMESSI.CAMERE_GESTISCI),
  };
}

const vistaIniziale = (): FiltroSegnalazioni => ({ vista: "aperte" });

export async function datiManutenzioni(cameraId?: number) {
  const u = await richiediPermesso(PERMESSI.GUASTI_SEGNALA);
  return carica(u, cameraId ? { vista: "aperte", cameraId } : vistaIniziale());
}

export async function azioneCaricaManutenzioni(f: FiltroSegnalazioni) {
  return conEsito(async () => carica(await richiediPermesso(PERMESSI.GUASTI_SEGNALA), f));
}

export async function azioneNuovaSegnalazione(d: SegnalazioneInput, f: FiltroSegnalazioni) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.GUASTI_SEGNALA);
    await creaSegnalazione(u.hotelId, d, u.nome);
    return carica(u, f);
  });
}

async function daGestore(f: FiltroSegnalazioni, fn: (u: UtenteSessione) => Promise<unknown>) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.MANUTENZIONI_GESTISCI);
    await fn(u);
    return carica(u, f);
  });
}

export async function azioneAssegnaSegnalazione(id: number, utenteId: number | null, f: FiltroSegnalazioni) {
  return daGestore(f, (u) => assegnaSegnalazione(u.hotelId, id, utenteId));
}
export async function azioneRisolvi(id: number, esito: string, f: FiltroSegnalazioni) {
  return daGestore(f, (u) => risolviSegnalazione(u.hotelId, id, esito, u.nome));
}
export async function azioneAnnullaSegnalazione(id: number, motivo: string, f: FiltroSegnalazioni) {
  return daGestore(f, (u) => annullaSegnalazione(u.hotelId, id, motivo, u.nome));
}

export async function azioneFuoriServizio(id: number, fino: string, f: FiltroSegnalazioni) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.GUASTI_SEGNALA);
    if (!(puo(u, PERMESSI.PRENOTAZIONI_GESTISCI) || puo(u, PERMESSI.CAMERE_GESTISCI))) throw new Error("Mettere una camera fuori servizio spetta alla reception.");
    await fuoriServizioPerGuasto(u.hotelId, id, fino);
    return carica(u, f);
  });
}
