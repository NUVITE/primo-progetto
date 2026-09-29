"use server";

import { conEsito } from "@/lib/esito";
import { prisma } from "@/lib/prisma";
import { calcolaTotaliPrenotazione, creaPrenotazione, type CreaPrenotazioneInput } from "@/lib/prenotazioni";
import { nottiTraDate, trovaPrezzoNotte } from "@/lib/pricing";
import { stimaTassaPersona } from "@/lib/tassaSoggiorno";
import { puo, richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { elencoServiziCatalogo } from "@/lib/servizi";

export async function datiIniziali() {
  const { hotelId } = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const [camere, tipiCamera, listini, serviziCatalogo] = await Promise.all([
    prisma.camera.findMany({ where: { hotelId, attivo: true }, include: { tipoCamera: true }, orderBy: { codice: "asc" } }),
    prisma.tipoCamera.findMany({ where: { hotelId } }),
    prisma.listino.findMany({ where: { hotelId } }),
    elencoServiziCatalogo(hotelId),
  ]);

  return {
    camere: camere.map((c) => ({
      id: c.id,
      codice: c.codice,
      tipoCameraId: c.tipoCameraId,
      tipoCameraNome: c.tipoCamera.descrizione,
      capienza: c.capienzaAdulti + c.capienzaBambini,
    })),
    tipiCamera: tipiCamera.map((t) => ({ id: t.id, descrizione: t.descrizione })),
    listini: listini.map((l) => ({ id: l.id, descrizione: l.descrizione, tipo: l.tipo })),
    serviziCatalogo: serviziCatalogo.filter((s) => s.attivo).map((s) => ({ id: s.id, nome: s.nome, prezzo: Number(s.prezzo) })),
  };
}

/**
 * Stima prezzo e tassa per un segmento PRIMA di salvare, per dare un riepilogo
 * a video mentre l'operatore compila. La stima della tassa ignora le esenzioni
 * (non sappiamo ancora chi è l'ospite in ogni riga): il calcolo definitivo,
 * esenzioni comprese, avviene sempre e solo in creaPrenotazione al salvataggio.
 */
export async function anteprimaSegmento(input: {
  cameraId: number;
  listinoId: number;
  dataInizio: string;
  dataFine: string;
}) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    // Stima prezzi: senza "Vedere importi" non si calcola nemmeno (il riquadro non compare).
    if (!puo(utente, PERMESSI.IMPORTI_VEDI)) return null;
    const { hotelId } = utente;

    const camera = await prisma.camera.findFirstOrThrow({
      where: { id: input.cameraId, hotelId },
      include: { hotel: { include: { comune: true } } },
    });

    const dataInizio = new Date(input.dataInizio);
    const dataFine = new Date(input.dataFine);
    if (dataFine <= dataInizio) return null;

    const notti = nottiTraDate(dataInizio, dataFine);
    let subtotale = 0;
    for (const notte of notti) {
      const p = await trovaPrezzoNotte(prisma, input.listinoId, camera.tipoCameraId, notte);
      if (p) subtotale += p.prezzo;
    }

    // Stima per una persona senza esenzioni: il calcolo vero avviene sugli ospiti effettivi.
    const stima = await stimaTassaPersona(prisma, camera.hotel, notti);

    return {
      notti: notti.length,
      subtotale,
      tassaStimata: stima.importo,
      regolamento: stima.riferimento
        ? { comune: camera.hotel.comune.nome, aliquota: stima.riferimento.aliquota, tettoNotti: stima.riferimento.tettoNotti }
        : null,
    };
  });
}

/**
 * Anteprima prezzo/tassa per una prenotazione "veloce" (piu' camere per tipo, stessa
 * ospite/periodo, camere non ancora assegnate) — stessa logica di stima di anteprimaSegmento,
 * sommata su tutte le camere richieste. Come li', la tassa e' una stima (nessuna esenzione).
 */
export async function anteprimaGenerica(input: {
  richieste: { tipoCameraId: number; quantita: number }[];
  listinoId: number;
  dataInizio: string;
  dataFine: string;
}) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    // Stima prezzi: senza "Vedere importi" non si calcola nemmeno (il riquadro non compare).
    if (!puo(utente, PERMESSI.IMPORTI_VEDI)) return null;
    const { hotelId } = utente;

    const hotel = await prisma.hotel.findFirstOrThrow({
      where: { id: hotelId },
      include: { comune: true },
    });

    const dataInizio = new Date(input.dataInizio);
    const dataFine = new Date(input.dataFine);
    if (dataFine <= dataInizio) return null;

    const notti = nottiTraDate(dataInizio, dataFine);
    const stima = await stimaTassaPersona(prisma, hotel, notti);
    const nottiTassabili = stima.nottiTassabili;

    const tipiRichiesti = await prisma.tipoCamera.findMany({
      where: { id: { in: input.richieste.filter((r) => r.quantita > 0).map((r) => r.tipoCameraId) } },
    });

    let subtotale = 0;
    let tassaStimata = 0;
    const tipiSenzaTariffa = new Set<string>();
    const dettaglio: { tipoCameraId: number; descrizione: string; quantita: number; notti: number; prezzoNotte: number; subtotale: number }[] = [];
    for (const richiesta of input.richieste) {
      if (richiesta.quantita <= 0) continue;
      const descrizioneTipo = tipiRichiesti.find((t) => t.id === richiesta.tipoCameraId)?.descrizione ?? "?";
      let subtotaleCamera = 0;
      for (const notte of notti) {
        const p = await trovaPrezzoNotte(prisma, input.listinoId, richiesta.tipoCameraId, notte);
        if (p) subtotaleCamera += p.prezzo;
        else tipiSenzaTariffa.add(descrizioneTipo);
      }
      subtotale += subtotaleCamera * richiesta.quantita;
      tassaStimata += stima.importo * richiesta.quantita;
      dettaglio.push({
        tipoCameraId: richiesta.tipoCameraId,
        descrizione: descrizioneTipo,
        quantita: richiesta.quantita,
        notti: notti.length,
        prezzoNotte: notti.length > 0 ? subtotaleCamera / notti.length : 0,
        subtotale: subtotaleCamera * richiesta.quantita,
      });
    }

    return {
      notti: notti.length,
      subtotale,
      tassaStimata,
      totale: subtotale + tassaStimata,
      dettaglio,
      nottiTassabili,
      tipiSenzaTariffa: Array.from(tipiSenzaTariffa),
      regolamento: stima.riferimento
        ? { comune: hotel.comune.nome, aliquota: stima.riferimento.aliquota, tettoNotti: stima.riferimento.tettoNotti }
        : null,
    };
  });
}

export async function salvaPrenotazione(input: CreaPrenotazioneInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const { hotelId } = utente;
    const prenotazione = await creaPrenotazione(hotelId, input);
    const totali = calcolaTotaliPrenotazione(prenotazione);
    const importiVisibili = puo(utente, PERMESSI.IMPORTI_VEDI);
    return {
      id: prenotazione.id,
      ospitePrenotante: `${prenotazione.ospitePrenotante.nome} ${prenotazione.ospitePrenotante.cognome}`,
      importiVisibili,
      ...(importiVisibili ? totali : { subtotale: 0, tassa: 0, servizi: 0, totale: 0 }),
    };
  });
}
