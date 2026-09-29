"use server";

import { puo, richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import {
  aggiornaTestata,
  aggiungiOccupazione,
  aggiungiServizioSala,
  anteprimaOccupazione,
  contestoPrenotazioneSala,
  creaPrenotazioneSala,
  dettaglioPrenotazioneSala,
  elencoPrenotazioniSala,
  impostaPrezzoOccupazione,
  modificaOccupazione,
  planningSale,
  rimuoviOccupazione,
  rimuoviServizioSala,
  type OccupazioneInput,
  type TestataInput,
} from "@/lib/sale";

export async function datiPlanningSale(dal: string, giorni: number) {
  const u = await richiediPermesso(PERMESSI.SALE_VEDI);
  return { ...(await planningSale(u.hotelId, dal, Math.min(Math.max(giorni, 1), 31))), puoGestire: puo(u, PERMESSI.SALE_GESTISCI) };
}

export async function datiElencoSale() {
  const u = await richiediPermesso(PERMESSI.SALE_VEDI);
  return { elenco: await elencoPrenotazioniSala(u.hotelId), puoGestire: puo(u, PERMESSI.SALE_GESTISCI) };
}

export async function datiContesto() {
  const u = await richiediPermesso(PERMESSI.SALE_GESTISCI);
  return contestoPrenotazioneSala(u.hotelId);
}

export async function datiDettaglioSala(id: number) {
  const u = await richiediPermesso(PERMESSI.SALE_VEDI);
  return { dettaglio: await dettaglioPrenotazioneSala(u.hotelId, id), puoGestire: puo(u, PERMESSI.SALE_GESTISCI) };
}

export async function azioneAnteprima(o: OccupazioneInput, escludiOccupazioneId?: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.SALE_GESTISCI);
    return anteprimaOccupazione(u.hotelId, o, escludiOccupazioneId);
  });
}

/** Restituisce l'id: la navigazione la fa il client (niente redirect da action chiamate dal client). */
export async function azioneCreaPrenotazioneSala(t: TestataInput, occupazioni: OccupazioneInput[]) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.SALE_GESTISCI);
    return creaPrenotazioneSala(u.hotelId, t, occupazioni);
  });
}

async function suDettaglio(id: number, fn: (hotelId: number) => Promise<unknown>) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.SALE_GESTISCI);
    await fn(u.hotelId);
    return dettaglioPrenotazioneSala(u.hotelId, id);
  });
}

export async function azioneAggiornaTestata(id: number, t: TestataInput) {
  return suDettaglio(id, (h) => aggiornaTestata(h, id, t));
}
export async function azioneAggiungiOccupazione(id: number, o: OccupazioneInput) {
  return suDettaglio(id, (h) => aggiungiOccupazione(h, id, o));
}
export async function azioneModificaOccupazione(id: number, occupazioneId: number, o: OccupazioneInput) {
  return suDettaglio(id, (h) => modificaOccupazione(h, id, occupazioneId, o));
}
export async function azionePrezzoOccupazione(id: number, occupazioneId: number, prezzo: number) {
  return suDettaglio(id, (h) => impostaPrezzoOccupazione(h, id, occupazioneId, prezzo));
}
export async function azioneRimuoviOccupazione(id: number, occupazioneId: number) {
  return suDettaglio(id, (h) => rimuoviOccupazione(h, id, occupazioneId));
}
export async function azioneAggiungiServizio(
  id: number,
  d: { servizioCatalogoId: number | null; descrizione: string; prezzoUnitario: number; quantita: number; data: string; note: string },
) {
  return suDettaglio(id, (h) => aggiungiServizioSala(h, id, d));
}
export async function azioneRimuoviServizio(id: number, servizioId: number) {
  return suDettaglio(id, (h) => rimuoviServizioSala(h, id, servizioId));
}
