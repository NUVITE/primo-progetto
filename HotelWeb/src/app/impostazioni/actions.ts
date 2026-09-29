"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import {
  caricaStruttura,
  completaNottiSenzaTariffa,
  creaListino,
  creaPeriodo,
  creaTrattamento,
  elencoListini,
  elencoTrattamenti,
  eliminaPeriodo,
  impostaTrattamentoAttivo,
  modificaPeriodo,
  rinominaListino,
  rinominaTrattamento,
  salvaStruttura,
  spostaTrattamento,
  type DatiPeriodo,
  type DatiStruttura,
} from "@/lib/impostazioniHotel";

// --- Struttura ---

export async function azioneSalvaStruttura(dati: DatiStruttura) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    await salvaStruttura(u.hotelId, dati);
    return caricaStruttura(u.hotelId);
  });
}

// --- Trattamenti ---

async function trattamenti(hotelId: number) {
  return (await elencoTrattamenti(hotelId)).map((t) => ({ id: t.id, nome: t.nome, attivo: t.attivo }));
}

export async function datiTrattamenti() {
  const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
  return trattamenti(u.hotelId);
}

async function suTrattamenti(fn: (hotelId: number) => Promise<unknown>) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    await fn(u.hotelId);
    return trattamenti(u.hotelId);
  });
}

export async function azioneCreaTrattamento(nome: string) {
  return suTrattamenti((h) => creaTrattamento(h, nome));
}
export async function azioneRinominaTrattamento(id: number, nome: string) {
  return suTrattamenti((h) => rinominaTrattamento(h, id, nome));
}
export async function azioneTrattamentoAttivo(id: number, attivo: boolean) {
  return suTrattamenti((h) => impostaTrattamentoAttivo(h, id, attivo));
}
export async function azioneSpostaTrattamento(id: number, direzione: -1 | 1) {
  return suTrattamenti((h) => spostaTrattamento(h, id, direzione));
}

// --- Listini e tariffe ---

export async function datiListini() {
  const u = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
  return elencoListini(u.hotelId);
}

async function suListini<T>(fn: (hotelId: number) => Promise<T>) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
    const risultato = await fn(u.hotelId);
    return { listini: await elencoListini(u.hotelId), risultato };
  });
}

export async function azioneCreaListino(codice: string, descrizione: string) {
  return suListini((h) => creaListino(h, codice, descrizione));
}
export async function azioneRinominaListino(id: number, descrizione: string) {
  return suListini((h) => rinominaListino(h, id, descrizione));
}
export async function azioneCreaPeriodo(listinoId: number, tipoCameraId: number, d: DatiPeriodo) {
  return suListini((h) => creaPeriodo(h, listinoId, tipoCameraId, d));
}
export async function azioneModificaPeriodo(id: number, d: DatiPeriodo) {
  return suListini((h) => modificaPeriodo(h, id, d));
}
export async function azioneEliminaPeriodo(id: number) {
  return suListini((h) => eliminaPeriodo(h, id));
}
export async function azioneCompletaNotti() {
  return suListini((h) => completaNottiSenzaTariffa(h));
}
