"use server";

import { conEsito } from "@/lib/esito";
import {
  aggiornaComposizione,
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
import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import {
  aggiungiDichiarazione,
  chiudiPosizione,
  datiTassaPrenotazione,
  impostaDatiPosizione,
  riapriPosizione,
  rimuoviDichiarazione,
  type DatiPosizioneInput,
  type DichiarazioneInput,
} from "@/lib/posizioneTassa";
import { PERMESSI } from "@/lib/permessi";
import { composizioneDi, composizioneReale, descriviComposizione, stessaComposizione, type Composizione, type DettaglioNotte } from "@/lib/pricing";

import { datiIniziali as _datiIniziali } from "@/app/prenotazioni/nuova/actions";

export async function datiIniziali() {
  return _datiIniziali();
}

/**
 * Senza il permesso "Vedere importi" gli importi non lasciano il server: arrivano a zero e
 * importiVisibili=false dice all'interfaccia di nasconderli (nasconderli solo a video non basta).
 */
async function serializza(prenotazione: Awaited<ReturnType<typeof trovaPrenotazione>>, utente: UtenteSessione) {
  const importiVisibili = puo(utente, PERMESSI.IMPORTI_VEDI);
  const imp = (n: number) => (importiVisibili ? n : 0);
  const totali = calcolaTotaliPrenotazione(prenotazione);
  const tassa = await datiTassaPrenotazione(utente.hotelId, prenotazione.id);
  return {
    importiVisibili,
    tassa: {
      ...tassa,
      ospiti: tassa.ospiti.map((o) => ({ ...o, notti: o.notti.map((n) => ({ ...n, importo: imp(n.importo) })) })),
    },
    id: prenotazione.id,
    stato: prenotazione.stato,
    ospitePrenotante: `${prenotazione.ospitePrenotante.nome} ${prenotazione.ospitePrenotante.cognome}`,
    gruppoNome: prenotazione.gruppo?.nome ?? null,
    accontoRichiesto: importiVisibili && prenotazione.accontoRichiesto ? Number(prenotazione.accontoRichiesto) : null,
    totali: { subtotale: imp(totali.subtotale), tassa: imp(totali.tassa), servizi: imp(totali.servizi), totale: imp(totali.totale) },
    segmenti: prenotazione.segmenti.map((s) => {
      const composizione = composizioneDi(s);
      // Il confronto parte dal check-in: prima c'è solo l'intestatario, non la camera completa.
      const registrate = s.presenze.filter((p) => p.stato !== "attesa");
      const reale = composizioneReale(s.dataInizio, s.presenze.map((p) => ({ dataNascita: p.ospite.dataNascita, dal: p.dal })));
      return {
      id: s.id,
      composizione,
      composizioneTesto: descriviComposizione(composizione),
      // Persone registrate diverse da quelle prenotate: si propone il ricalcolo (mai automatico).
      composizioneReale:
        registrate.length > 0 && !stessaComposizione(reale.composizione, composizione)
          ? { ...reale, testo: descriviComposizione(reale.composizione) }
          : null,
      // Dettaglio del calcolo per notte (solo con "Vedere importi").
      dettaglioNotti: importiVisibili
        ? s.notti
            .map((n) => {
              const d = n.dettaglio as DettaglioNotte | null;
              return { data: n.data.toISOString().slice(0, 10), prezzo: Number(n.prezzo), righe: d?.righe ?? [], gratuita: d?.gratuita ?? 0, mancante: n.motivoPrezzo === "mancante" };
            })
            .sort((a, b) => a.data.localeCompare(b.data))
        : [],
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
      subtotale: imp(s.notti.reduce((t, n) => t + Number(n.prezzo), 0)),
      tassa: imp(s.notti.reduce((t, n) => t + n.tasse.reduce((x, r) => x + Number(r.importo), 0), 0)),
      // Persone nella camera (la tassa è per persona, il prezzo per camera).
      occupanti: s.presenze.map((p) => ({
        presenzaId: p.id,
        ospiteId: p.ospiteId,
        nome: `${p.ospite.nome} ${p.ospite.cognome}`,
        tipoAlloggiato: p.tipoAlloggiato,
        stato: p.stato,
        dal: p.dal?.toISOString().slice(0, 10) ?? null,
        al: p.al?.toISOString().slice(0, 10) ?? null,
      })),
      // Notti create senza trovare una tariffa (prenotazione bloccata comunque, da sistemare
      // aggiungendo il listino mancante) — vedi generaNottiETasse in src/lib/prenotazioni.ts.
      tariffaIncompleta: s.notti.some((n) => n.motivoPrezzo === "mancante"),
    };
    }),
    serviziAggiunti: prenotazione.serviziAggiunti.map((s) => ({
      id: s.id,
      nome: s.servizioCatalogo?.nome ?? s.descrizione ?? "Servizio",
      daCatalogo: s.servizioCatalogoId !== null,
      descrizione: s.descrizione,
      prezzoUnitario: imp(Number(s.prezzoUnitario)),
      quantita: s.quantita,
      totale: imp(Number(s.prezzoUnitario) * s.quantita),
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
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  return await serializza(await trovaPrenotazione(utente.hotelId, id), utente);
}

/** Cambia le persone di una camera; con ricalcola=true riscrive anche i prezzi delle sue notti. */
export async function azioneComposizione(segmentoId: number, composizione: Composizione, ricalcola: boolean) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    return serializza(await aggiornaComposizione(utente.hotelId, segmentoId, composizione, ricalcola), utente);
  });
}

export async function azioneAccorciaEstendi(segmentoId: number, nuovaDataFine: string) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await cambiaDataFineSegmento(utente.hotelId, segmentoId, nuovaDataFine);
    return await serializza(prenotazione, utente);
  });
}

export async function azioneCambiaCamera(segmentoId: number, dataCambio: string, nuovaCameraId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await cambiaCameraSegmento(utente.hotelId, segmentoId, dataCambio, nuovaCameraId);
    return await serializza(prenotazione, utente);
  });
}

export async function azioneAggiungiSegmento(prenotazioneId: number, input: NuovoSegmentoInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await aggiungiSegmentoAPrenotazione(utente.hotelId, prenotazioneId, input);
    return await serializza(prenotazione, utente);
  });
}

export async function azioneAssegnaCamera(segmentoId: number, cameraId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await assegnaCamera(utente.hotelId, segmentoId, cameraId);
    return await serializza(prenotazione, utente);
  });
}

export async function azioneAggiungiServizio(prenotazioneId: number, input: AggiungiServizioInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await aggiungiServizioAPrenotazione(utente.hotelId, prenotazioneId, input);
    return await serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneRimuoviServizio(prenotazioneId: number, servizioAggiuntoId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await rimuoviServizioDaPrenotazione(utente.hotelId, servizioAggiuntoId);
    return await serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneModificaServizio(prenotazioneId: number, servizioAggiuntoId: number, input: ModificaServizioInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await modificaServizio(utente.hotelId, servizioAggiuntoId, input);
    return await serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

// --- Tassa di soggiorno (per ospite) ---

export async function azioneDatiPosizioneTassa(prenotazioneId: number, ospiteId: number, input: DatiPosizioneInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await impostaDatiPosizione(utente.hotelId, prenotazioneId, ospiteId, input);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneAggiungiDichiarazione(prenotazioneId: number, ospiteId: number, input: DichiarazioneInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await aggiungiDichiarazione(utente.hotelId, prenotazioneId, ospiteId, input);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneRimuoviDichiarazione(prenotazioneId: number, dichiarazioneId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await rimuoviDichiarazione(utente.hotelId, prenotazioneId, dichiarazioneId);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneChiudiSoggiorno(prenotazioneId: number, ospiteId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await chiudiPosizione(utente.hotelId, utente.id, prenotazioneId, ospiteId);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneRiapriSoggiorno(prenotazioneId: number, ospiteId: number, nota: string) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.SOGGIORNI_RIAPRI);
    await riapriPosizione(utente.hotelId, utente.id, prenotazioneId, ospiteId, nota);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}
