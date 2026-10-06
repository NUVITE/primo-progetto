"use server";

import { funzioniSpente } from "@/lib/funzioniRegole";
import { unitaDi } from "@/lib/tipologie";
import { avvisoAllotment } from "@/lib/agenzie";
import { conEsito } from "@/lib/esito";
import { prisma } from "@/lib/prisma";
import { calcolaTotaliPrenotazione, creaPrenotazione, type CreaPrenotazioneInput, CANALI, MEZZI, GARANZIE } from "@/lib/prenotazioni";
import { calcolaNotte, nottiTraDate, regoleListino, verificaComposizione, type Composizione } from "@/lib/pricing";
import { stimaTassaPersona } from "@/lib/tassaSoggiorno";
import { puo, richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { elencoServiziCatalogo } from "@/lib/servizi";
import { elencoTrattamenti } from "@/lib/impostazioniHotel";

export async function datiIniziali() {
  const { hotelId } = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  const [camere, tipiCamera, listini, serviziCatalogo, trattamenti, intermediari] = await Promise.all([
    prisma.camera.findMany({ where: { hotelId, attivo: true }, include: { tipoCamera: true }, orderBy: { codice: "asc" } }),
    prisma.tipoCamera.findMany({ where: { hotelId } }),
    prisma.listino.findMany({ where: { hotelId } }),
    elencoServiziCatalogo(hotelId),
    elencoTrattamenti(hotelId, true),
    prisma.cliente.findMany({ where: { hotelId, attivo: true, tipo: { not: "privato" } }, select: { id: true, denominazione: true, tipo: true }, orderBy: { denominazione: "asc" } }),
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
    serviziCatalogo: serviziCatalogo
      .filter((s) => s.attivo)
      .map((s) => ({ id: s.id, nome: s.nome, prezzo: Number(s.prezzo), addebito: s.addebito, effetto: s.effetto })),
    // Trattamenti attivi configurati dall'hotel (Impostazioni > Trattamenti), nell'ordine scelto.
    trattamenti: trattamenti.map((t) => t.nome),
    // Scadenza proposta per le nuove opzioni (Impostazioni > Struttura).
    giorniOpzione: hotel.giorniOpzione,
    // Provenienza e garanzia (vedi lib/prenotazioni): scelte per il modulo.
    canali: Object.entries(CANALI).map(([valore, nome]) => ({ valore, nome })),
    mezzi: Object.entries(MEZZI).map(([valore, nome]) => ({ valore, nome })),
    garanzie: Object.entries(GARANZIE).map(([valore, nome]) => ({ valore, nome })),
    intermediari,
    orarioLimiteArrivo: hotel.orarioLimiteArrivo,
    // Struttura: funzioni spente e nome delle unità (camera o appartamento) secondo la tipologia.
    funzioniSpente: funzioniSpente(hotel.funzioniSpente) as string[],
    unita: unitaDi(hotel.tipologia),
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
  trattamento?: string;
  composizione?: Composizione;
}) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    // Stima prezzi: senza "Vedere importi" non si calcola nemmeno (il riquadro non compare).
    if (!puo(utente, PERMESSI.IMPORTI_VEDI)) return null;
    const { hotelId } = utente;

    const camera = await prisma.camera.findFirstOrThrow({
      where: { id: input.cameraId, hotelId },
      include: { hotel: { include: { comune: true } }, tipoCamera: { select: { puliziaFinale: true } } },
    });

    const dataInizio = new Date(input.dataInizio);
    const dataFine = new Date(input.dataFine);
    if (dataFine <= dataInizio) return null;

    const composizione = input.composizione ?? { adulti: 1, etaBambini: [] };
    verificaComposizione(composizione);
    const listino = await prisma.listino.findFirstOrThrow({ where: { id: input.listinoId, hotelId } });
    const regole = await regoleListino(prisma, listino.id);
    const notti = nottiTraDate(dataInizio, dataFine);
    let subtotale = 0;
    let nottiSenzaTariffa = 0;
    let primaNotte: { righe: { voce: string; importo: number }[] } | null = null;
    for (const notte of notti) {
      const c = await calcolaNotte(prisma, regole, camera.tipoCameraId, notte, composizione, input.trattamento ?? "");
      if (c.mancante) nottiSenzaTariffa += 1;
      else {
        subtotale += c.lordo;
        primaNotte ??= { righe: c.righe };
      }
    }

    // Stima per persona senza esenzioni (il calcolo vero avviene sugli ospiti effettivi), per tutte le persone.
    const stima = await stimaTassaPersona(prisma, camera.hotel, notti);
    const persone = composizione.adulti + composizione.etaBambini.length;
    const avvisi: string[] = [];
    if (persone > camera.capienzaAdulti + camera.capienzaBambini) {
      const cap = camera.capienzaAdulti + camera.capienzaBambini;
      avvisi.push(`La camera ${camera.codice} ospita ${cap} ${cap === 1 ? "persona" : "persone"}: servono letti aggiunti (supplementi).`);
    }
    if (listino.minPersone && persone < listino.minPersone) avvisi.push(`Il listino ${listino.descrizione} vale da ${listino.minPersone} persone.`);

    return {
      notti: notti.length,
      subtotale,
      nottiSenzaTariffa,
      dettaglioPrimaNotte: primaNotte?.righe ?? [],
      avvisi,
      tassaStimata: stima.importo * persone,
      // Pulizia finale del tipo di camera: si aggiunge da sola alla prenotazione, una volta.
      puliziaFinale: camera.tipoCamera.puliziaFinale === null ? 0 : Number(camera.tipoCamera.puliziaFinale),
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
  richieste: { tipoCameraId: number; quantita: number; composizione?: Composizione }[];
  listinoId: number;
  trattamento?: string;
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

    const listino = await prisma.listino.findFirstOrThrow({ where: { id: input.listinoId, hotelId } });
    const regole = await regoleListino(prisma, listino.id);
    let subtotale = 0;
    let tassaStimata = 0;
    let personeTotali = 0;
    const tipiSenzaTariffa = new Set<string>();
    const dettaglio: { tipoCameraId: number; descrizione: string; quantita: number; notti: number; prezzoNotte: number; subtotale: number }[] = [];
    for (const richiesta of input.richieste) {
      if (richiesta.quantita <= 0) continue;
      const descrizioneTipo = tipiRichiesti.find((t) => t.id === richiesta.tipoCameraId)?.descrizione ?? "?";
      const composizione = richiesta.composizione ?? { adulti: 1, etaBambini: [] };
      verificaComposizione(composizione);
      const persone = composizione.adulti + composizione.etaBambini.length;
      personeTotali += persone * richiesta.quantita;
      let subtotaleCamera = 0;
      for (const notte of notti) {
        const c = await calcolaNotte(prisma, regole, richiesta.tipoCameraId, notte, composizione, input.trattamento ?? "");
        if (c.mancante) tipiSenzaTariffa.add(descrizioneTipo);
        else subtotaleCamera += c.lordo;
      }
      subtotale += subtotaleCamera * richiesta.quantita;
      tassaStimata += stima.importo * persone * richiesta.quantita;
      dettaglio.push({
        tipoCameraId: richiesta.tipoCameraId,
        descrizione: descrizioneTipo,
        quantita: richiesta.quantita,
        notti: notti.length,
        prezzoNotte: notti.length > 0 ? subtotaleCamera / notti.length : 0,
        subtotale: subtotaleCamera * richiesta.quantita,
      });
    }

    // Gratuità dei gruppi: stima sul totale persone (il calcolo vero per notte avviene al salvataggio).
    const avvisi: string[] = [];
    if (listino.minPersone && personeTotali < listino.minPersone) avvisi.push(`Il listino ${listino.descrizione} vale da ${listino.minPersone} persone (ora ${personeTotali}).`);
    // Camere riservate alle agenzie (allotment): si possono prenotare, ma con un avviso.
    for (const richiesta of input.richieste.filter((r) => r.quantita > 0)) {
      const a = await avvisoAllotment(hotelId, richiesta.tipoCameraId, dataInizio, dataFine, richiesta.quantita, null);
      if (a) avvisi.push(`${tipiRichiesti.find((t) => t.id === richiesta.tipoCameraId)?.descrizione ?? ""}: ${a}`);
    }
    const gratuiti = listino.gratuitaOgni ? Math.floor(personeTotali / (listino.gratuitaOgni + 1)) : 0;
    if (gratuiti) avvisi.push(`${gratuiti} ${gratuiti === 1 ? "persona gratuita" : "persone gratuite"} (1 ogni ${listino.gratuitaOgni} paganti): lo sconto si applica al salvataggio.`);

    return {
      notti: notti.length,
      subtotale,
      tassaStimata,
      totale: subtotale + tassaStimata,
      avvisi,
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
