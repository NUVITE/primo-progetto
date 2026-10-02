"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { aggiungiChiusura, eliminaChiusura } from "@/lib/chiusure";
import {
  caricaStruttura,
  completaNottiSenzaTariffa,
  creaListino,
  creaPeriodo,
  creaTrattamento,
  eliminaRiduzione,
  elencoListini,
  elencoTrattamenti,
  eliminaPeriodo,
  eliminaSupplementoStagionale,
  salvaSupplementoStagionale,
  impostaTrattamentoAttivo,
  modificaPeriodo,
  rinominaListino,
  rinominaTrattamento,
  salvaRegoleListino,
  salvaRiduzione,
  salvaStruttura,
  salvaSupplementiTrattamento,
  spostaTrattamento,
  type DatiPeriodo,
  type RegoleListinoInput,
  type RiduzioneInput,
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

// --- Periodi di chiusura (ISTAT) ---

export async function azioneAggiungiChiusura(d: { dal: string; al: string; nota: string }) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    return aggiungiChiusura(u.hotelId, d);
  });
}

export async function azioneEliminaChiusura(id: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    return eliminaChiusura(u.hotelId, id);
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

export async function azioneCreaListino(codice: string, descrizione: string, gruppo = false) {
  return suListini((h) => creaListino(h, codice, descrizione, gruppo));
}
export async function azioneSalvaRegoleListino(id: number, r: RegoleListinoInput) {
  return suListini((h) => salvaRegoleListino(h, id, r));
}
export async function azioneSalvaSupplementiTrattamento(listinoId: number, importi: Record<number, number | null>) {
  return suListini((h) => salvaSupplementiTrattamento(h, listinoId, importi));
}
export async function azioneSalvaSupplementoStagionale(
  listinoId: number,
  id: number | null,
  d: { trattamentoId: number; tipoCameraId: number | null; dal: string; al: string; importo: number },
) {
  return suListini((hotelId) => salvaSupplementoStagionale(hotelId, listinoId, id, d));
}

export async function azioneEliminaSupplementoStagionale(listinoId: number, id: number) {
  return suListini((hotelId) => eliminaSupplementoStagionale(hotelId, listinoId, id));
}

export async function azioneSalvaRiduzione(listinoId: number, id: number | null, r: RiduzioneInput) {
  return suListini((h) => salvaRiduzione(h, listinoId, id, r));
}
export async function azioneEliminaRiduzione(listinoId: number, id: number) {
  return suListini((h) => eliminaRiduzione(h, listinoId, id));
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
