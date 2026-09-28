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
import {
  aggiungiServizioAPrenotazione,
  modificaServizio,
  rimuoviServizioDaPrenotazione,
  type AggiungiServizioInput,
  type ModificaServizioInput,
} from "@/lib/servizi";
import { richiediUtente } from "@/lib/auth";

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
      // Notti create senza trovare una tariffa (prenotazione bloccata comunque, da sistemare
      // aggiungendo il listino mancante) — vedi generaNottiETasse in src/lib/prenotazioni.ts.
      tariffaIncompleta: s.notti.some((n) => n.motivoPrezzo === "mancante"),
    })),
    serviziAggiunti: prenotazione.serviziAggiunti.map((s) => ({
      id: s.id,
      nome: s.servizioCatalogo?.nome ?? s.descrizione ?? "Servizio",
      daCatalogo: s.servizioCatalogoId !== null,
      descrizione: s.descrizione,
      prezzoUnitario: Number(s.prezzoUnitario),
      quantita: s.quantita,
      totale: Number(s.prezzoUnitario) * s.quantita,
      data: s.data ? s.data.toISOString().slice(0, 10) : null,
      note: s.note,
      // Vuoto = si applica a tutta la prenotazione.
      segmenti: s.segmenti.map((sg) => ({
        segmentoId: sg.segmentoId,
        etichetta: `${sg.segmento.ospite.nome} ${sg.segmento.ospite.cognome}${sg.segmento.camera ? " — " + sg.segmento.camera.codice : ""}`,
      })),
    })),
  };
}

export async function caricaPrenotazione(id: number) {
  const { hotelId } = await richiediUtente();
  return serializza(await trovaPrenotazione(hotelId, id));
}

export async function azioneAccorciaEstendi(segmentoId: number, nuovaDataFine: string) {
  const { hotelId } = await richiediUtente();
  const prenotazione = await cambiaDataFineSegmento(hotelId, segmentoId, nuovaDataFine);
  return serializza(prenotazione);
}

export async function azioneCambiaCamera(segmentoId: number, dataCambio: string, nuovaCameraId: number) {
  const { hotelId } = await richiediUtente();
  const prenotazione = await cambiaCameraSegmento(hotelId, segmentoId, dataCambio, nuovaCameraId);
  return serializza(prenotazione);
}

export async function azioneAggiungiSegmento(prenotazioneId: number, input: NuovoSegmentoInput) {
  const { hotelId } = await richiediUtente();
  const prenotazione = await aggiungiSegmentoAPrenotazione(hotelId, prenotazioneId, input);
  return serializza(prenotazione);
}

export async function azioneAssegnaCamera(segmentoId: number, cameraId: number) {
  const { hotelId } = await richiediUtente();
  const prenotazione = await assegnaCamera(hotelId, segmentoId, cameraId);
  return serializza(prenotazione);
}

export async function azioneAggiungiServizio(prenotazioneId: number, input: AggiungiServizioInput) {
  const { hotelId } = await richiediUtente();
  await aggiungiServizioAPrenotazione(hotelId, prenotazioneId, input);
  return serializza(await trovaPrenotazione(hotelId, prenotazioneId));
}

export async function azioneRimuoviServizio(prenotazioneId: number, servizioAggiuntoId: number) {
  const { hotelId } = await richiediUtente();
  await rimuoviServizioDaPrenotazione(hotelId, servizioAggiuntoId);
  return serializza(await trovaPrenotazione(hotelId, prenotazioneId));
}

export async function azioneModificaServizio(prenotazioneId: number, servizioAggiuntoId: number, input: ModificaServizioInput) {
  const { hotelId } = await richiediUtente();
  await modificaServizio(hotelId, servizioAggiuntoId, input);
  return serializza(await trovaPrenotazione(hotelId, prenotazioneId));
}
