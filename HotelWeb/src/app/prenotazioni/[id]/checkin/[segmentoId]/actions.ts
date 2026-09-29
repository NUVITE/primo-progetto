"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import {
  aggiungiOccupante,
  checkoutCamera,
  checkoutOccupante,
  confermaArrivo,
  datiCheckin,
  rimuoviOccupante,
  salvaOccupante,
  sostituisciOccupante,
  type AnagraficaInput,
  type DatiPresenzaInput,
  type OspiteRif,
} from "@/lib/checkin";
import { cercaLuoghi } from "@/lib/tabellePolizia";

const mostraDocumenti = (u: UtenteSessione) => puo(u, PERMESSI.PRENOTAZIONI_GESTISCI);

export async function caricaCheckin(segmentoId: number) {
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  return datiCheckin(utente.hotelId, segmentoId, mostraDocumenti(utente));
}

export async function azioneCercaLuoghi(testo: string, tipo: "comune" | "stato", validoAl: string | null) {
  await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
  return cercaLuoghi(testo, tipo, validoAl ? new Date(validoAl) : undefined);
}

/** Tutte le azioni restituiscono il quadro aggiornato della camera (più un eventuale avviso). */
async function esegui(segmentoId: number, fn: (u: UtenteSessione) => Promise<string | null | void>) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const avviso = (await fn(utente)) ?? null;
    return { dati: await datiCheckin(utente.hotelId, segmentoId, true), avviso };
  });
}

export async function azioneSalvaOccupante(segmentoId: number, presenzaId: number, anagrafica: AnagraficaInput, presenza: DatiPresenzaInput) {
  return esegui(segmentoId, (u) => salvaOccupante(u.hotelId, presenzaId, anagrafica, presenza, true));
}

export async function azioneAggiungiOccupante(segmentoId: number, ospite: OspiteRif) {
  return esegui(segmentoId, (u) => aggiungiOccupante(u.hotelId, segmentoId, ospite));
}

export async function azioneSostituisciOccupante(segmentoId: number, presenzaId: number, ospite: OspiteRif) {
  return esegui(segmentoId, (u) => sostituisciOccupante(u.hotelId, presenzaId, ospite));
}

export async function azioneRimuoviOccupante(segmentoId: number, presenzaId: number) {
  return esegui(segmentoId, (u) => rimuoviOccupante(u.hotelId, presenzaId));
}

export async function azioneConfermaArrivo(segmentoId: number) {
  return esegui(segmentoId, (u) => confermaArrivo(u.hotelId, segmentoId));
}

export async function azioneCheckoutCamera(segmentoId: number, dataPartenza: string) {
  return esegui(segmentoId, (u) => checkoutCamera(u.hotelId, u.id, segmentoId, dataPartenza));
}

export async function azioneCheckoutOccupante(segmentoId: number, presenzaId: number, dataPartenza: string) {
  return esegui(segmentoId, (u) => checkoutOccupante(u.hotelId, u.id, presenzaId, dataPartenza));
}
