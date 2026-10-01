"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { salvaCredenziali, statoCredenziali, verificaCredenziali } from "@/lib/alloggiati";
import { configIstat, salvaConfigIstat } from "@/lib/movimentoIstat";

/** Credenziali dei servizi esterni: solo chi configura l'hotel. Le password non tornano mai al browser. */
export async function datiAdempimenti() {
  const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
  const [alloggiati, istat] = await Promise.all([statoCredenziali(u.hotelId), configIstat(u.hotelId)]);
  return { alloggiati, istat };
}

export async function azioneSalvaAlloggiati(d: { utente: string; password: string; wskey: string }) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    return salvaCredenziali(u.hotelId, d);
  });
}

export async function azioneProvaAlloggiati() {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    return verificaCredenziali(u.hotelId);
  });
}

export async function azioneSalvaIstat(d: { primoGiorno: string; codice: string; utente: string; password: string; indirizzo: string }) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    return salvaConfigIstat(u.hotelId, d);
  });
}
