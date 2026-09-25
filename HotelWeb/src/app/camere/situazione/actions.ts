"use server";

import { creaPrenotazioneGenerica, type CreaPrenotazioneGenericaInput } from "@/lib/prenotazioni";
import { datiIniziali as _datiIniziali } from "@/app/prenotazioni/nuova/actions";

export async function datiIniziali() {
  return _datiIniziali();
}

export async function salvaPrenotazioneGenerica(input: CreaPrenotazioneGenericaInput) {
  const prenotazione = await creaPrenotazioneGenerica(input);
  return { id: prenotazione.id };
}
