"use server";

import { assegnaCamera as _assegnaCamera, creaPrenotazioneGenerica, type CreaPrenotazioneGenericaInput } from "@/lib/prenotazioni";
import { anteprimaGenerica as _anteprimaGenerica, datiIniziali as _datiIniziali } from "@/app/prenotazioni/nuova/actions";
import { richiediUtente } from "@/lib/auth";

export async function datiIniziali() {
  return _datiIniziali();
}

export async function anteprimaGenerica(input: {
  richieste: { tipoCameraId: number; quantita: number }[];
  listinoId: number;
  dataInizio: string;
  dataFine: string;
}) {
  return _anteprimaGenerica(input);
}

export async function salvaPrenotazioneGenerica(input: CreaPrenotazioneGenericaInput) {
  const { hotelId } = await richiediUtente();
  const prenotazione = await creaPrenotazioneGenerica(hotelId, input);
  return { id: prenotazione.id };
}

export async function assegnaCameraASegmento(segmentoId: number, cameraId: number) {
  const { hotelId } = await richiediUtente();
  const prenotazione = await _assegnaCamera(hotelId, segmentoId, cameraId);
  return { id: prenotazione.id };
}
