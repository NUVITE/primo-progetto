"use server";

import { conEsito } from "@/lib/esito";
import { assegnaCamera as _assegnaCamera, creaPrenotazioneGenerica, type CreaPrenotazioneGenericaInput } from "@/lib/prenotazioni";
import { anteprimaGenerica as _anteprimaGenerica, datiIniziali as _datiIniziali } from "@/app/prenotazioni/nuova/actions";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";

export async function datiIniziali() {
  return _datiIniziali();
}

export async function anteprimaGenerica(input: Parameters<typeof _anteprimaGenerica>[0]) {
  return _anteprimaGenerica(input);
}

export async function salvaPrenotazioneGenerica(input: CreaPrenotazioneGenericaInput) {
  return conEsito(async () => {
    const { hotelId } = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await creaPrenotazioneGenerica(hotelId, input);
    return { id: prenotazione.id };
  });
}

export async function assegnaCameraASegmento(segmentoId: number, cameraId: number) {
  return conEsito(async () => {
    const { hotelId } = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await _assegnaCamera(hotelId, segmentoId, cameraId);
    return { id: prenotazione.id };
  });
}
