"use server";

import {
  aggiungiSegmentoAPrenotazione,
  assegnaCamera,
  calcolaTotaliPrenotazione,
  cambiaCameraSegmento,
  cambiaDataFineSegmento,
  trovaPrenotazione,
  type NuovoSegmentoInput,
} from "@/lib/prenotazioni";

import { datiIniziali as _datiIniziali } from "@/app/prenotazioni/nuova/actions";

export async function datiIniziali() {
  return _datiIniziali();
}

function serializza(prenotazione: Awaited<ReturnType<typeof trovaPrenotazione>>) {
  return {
    id: prenotazione.id,
    stato: prenotazione.stato,
    ospitePrenotante: `${prenotazione.ospitePrenotante.nome} ${prenotazione.ospitePrenotante.cognome}`,
    gruppoNome: prenotazione.gruppo?.nome ?? null,
    accontoRichiesto: prenotazione.accontoRichiesto ? Number(prenotazione.accontoRichiesto) : null,
    totali: calcolaTotaliPrenotazione(prenotazione),
    segmenti: prenotazione.segmenti.map((s) => ({
      id: s.id,
      cameraId: s.cameraId,
      cameraCodice: s.camera?.codice ?? null,
      tipoCameraId: s.tipoCameraId,
      tipoCameraNome: s.tipoCamera.descrizione,
      ospiteId: s.ospiteId,
      ospiteNome: `${s.ospite.nome} ${s.ospite.cognome}`,
      trattamento: s.trattamento,
      listinoId: s.listinoId,
      dataInizio: s.dataInizio.toISOString().slice(0, 10),
      dataFine: s.dataFine.toISOString().slice(0, 10),
      stato: s.stato,
      segmentoPrecedenteId: s.segmentoPrecedenteId,
      notti: s.notti.length,
      subtotale: s.notti.reduce((t, n) => t + Number(n.prezzo), 0),
      tassa: s.notti.reduce((t, n) => t + (n.tassa ? Number(n.tassa.importo) : 0), 0),
    })),
  };
}

export async function caricaPrenotazione(id: number) {
  return serializza(await trovaPrenotazione(id));
}

export async function azioneAccorciaEstendi(segmentoId: number, nuovaDataFine: string) {
  const prenotazione = await cambiaDataFineSegmento(segmentoId, nuovaDataFine);
  return serializza(prenotazione);
}

export async function azioneCambiaCamera(segmentoId: number, dataCambio: string, nuovaCameraId: number) {
  const prenotazione = await cambiaCameraSegmento(segmentoId, dataCambio, nuovaCameraId);
  return serializza(prenotazione);
}

export async function azioneAggiungiSegmento(prenotazioneId: number, input: NuovoSegmentoInput) {
  const prenotazione = await aggiungiSegmentoAPrenotazione(prenotazioneId, input);
  return serializza(prenotazione);
}

export async function azioneAssegnaCamera(segmentoId: number, cameraId: number) {
  const prenotazione = await assegnaCamera(segmentoId, cameraId);
  return serializza(prenotazione);
}
