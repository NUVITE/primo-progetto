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
  applicaPacchetto,
  collegaPrenotazionePersona,
  elencoPacchetti,
  rimuoviPersonaEvento,
  salvaPersonaEvento,
  type OccupazioneInput,
  type PersonaEventoInput,
  type Ripetizione,
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
  const [contesto, pacchetti] = await Promise.all([contestoPrenotazioneSala(u.hotelId), elencoPacchetti(u.hotelId, true)]);
  return { ...contesto, pacchetti: pacchetti.map((p) => ({ id: p.id, nome: p.nome, aPersona: p.aPersona, aEvento: p.aEvento })) };
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
export async function azioneCreaPrenotazioneSala(t: TestataInput, occupazioni: OccupazioneInput[], ripetizione: Ripetizione = null) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.SALE_GESTISCI);
    return creaPrenotazioneSala(u.hotelId, t, occupazioni, ripetizione);
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
export async function azioneAggiungiOccupazione(id: number, o: OccupazioneInput, ripetizione: Ripetizione = null) {
  return suDettaglio(id, (h) => aggiungiOccupazione(h, id, o, ripetizione));
}
export async function azioneApplicaPacchetto(id: number, d: { pacchettoId: number; giorno: string | null; partecipanti: number | null }) {
  return suDettaglio(id, (h) => applicaPacchetto(h, id, d));
}
export async function azioneSalvaPersona(id: number, personaId: number | null, d: PersonaEventoInput) {
  return suDettaglio(id, (h) => salvaPersonaEvento(h, id, personaId, d));
}
export async function azioneRimuoviPersona(id: number, personaId: number) {
  return suDettaglio(id, (h) => rimuoviPersonaEvento(h, id, personaId));
}
/** Collegare una camera o un uso diurno alla persona: tocca le prenotazioni, serve anche quel permesso. */
export async function azioneCollegaPrenotazionePersona(id: number, personaId: number, prenotazioneId: number | null) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.SALE_GESTISCI);
    await collegaPrenotazionePersona(u.hotelId, personaId, prenotazioneId);
    return dettaglioPrenotazioneSala(u.hotelId, id);
  });
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
