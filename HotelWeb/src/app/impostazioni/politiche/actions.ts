"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { elencoPolitiche, eliminaPolitica, impostaPredefinita, MODELLI_POLITICA, salvaPolitica, type DatiPolitica } from "@/lib/politiche";

/** Le politiche di cancellazione sono condizioni commerciali: le gestisce chi gestisce i listini. */
export async function datiPolitiche() {
  const u = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
  return { politiche: await elencoPolitiche(u.hotelId), modelli: MODELLI_POLITICA };
}

export async function azioneSalvaPolitica(id: number | null, d: DatiPolitica) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
    return salvaPolitica(u.hotelId, id, d);
  });
}

export async function azioneEliminaPolitica(id: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
    return eliminaPolitica(u.hotelId, id);
  });
}

export async function azionePredefinita(id: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
    return impostaPredefinita(u.hotelId, id);
  });
}
