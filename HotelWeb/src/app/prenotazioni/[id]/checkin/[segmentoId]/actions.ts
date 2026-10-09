"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import {
  aggiungiOccupante,
  checkoutCamera,
  checkoutOccupante,
  confermaArrivo,
  datiCheckin,
  rimuoviOccupante,
  salvaOccupante,
  sostituisciOccupante,
  type AnagraficaInput,
  type DatiPresenzaInput,
  type OspiteRif,
} from "@/lib/checkin";
import { cercaLuoghi } from "@/lib/tabellePolizia";
import { aggiornaComposizione, trovaPrenotazione } from "@/lib/prenotazioni";
import { sospendiConto, statoConto } from "@/lib/contiSospesi";
import { prisma } from "@/lib/prisma";
import { indirizzoPubblico } from "@/lib/indirizzoPubblico";
import { ringraziamentoAutomatico } from "@/lib/questionari";
import { impostaChiavi } from "@/lib/custodia";
import type { NotaInput } from "@/lib/allergeni";
import { cancellaNotaAlimentare, noteDegliOspiti, salvaNotaAlimentare } from "@/lib/noteAlimentari";

const mostraDocumenti = (u: UtenteSessione) => puo(u, PERMESSI.PRENOTAZIONI_GESTISCI);

export async function caricaCheckin(segmentoId: number) {
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  return datiCheckin(utente.hotelId, segmentoId, mostraDocumenti(utente));
}

export async function azioneCercaLuoghi(testo: string, tipo: "comune" | "stato", validoAl: string | null) {
  await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
  return cercaLuoghi(testo, tipo, validoAl ? new Date(validoAl) : undefined);
}

/** Tutte le azioni restituiscono il quadro aggiornato della camera (più un eventuale avviso). */
async function esegui(segmentoId: number, fn: (u: UtenteSessione) => Promise<string | null | void>) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const avviso = (await fn(utente)) ?? null;
    return { dati: await datiCheckin(utente.hotelId, segmentoId, true), avviso };
  });
}

export async function azioneSalvaOccupante(segmentoId: number, presenzaId: number, anagrafica: AnagraficaInput, presenza: DatiPresenzaInput) {
  return esegui(segmentoId, (u) => salvaOccupante(u.hotelId, presenzaId, anagrafica, presenza, true));
}

export async function azioneAggiungiOccupante(segmentoId: number, ospite: OspiteRif) {
  return esegui(segmentoId, (u) => aggiungiOccupante(u.hotelId, segmentoId, ospite));
}

export async function azioneSostituisciOccupante(segmentoId: number, presenzaId: number, ospite: OspiteRif) {
  return esegui(segmentoId, (u) => sostituisciOccupante(u.hotelId, presenzaId, ospite));
}

export async function azioneRimuoviOccupante(segmentoId: number, presenzaId: number) {
  return esegui(segmentoId, (u) => rimuoviOccupante(u.hotelId, presenzaId));
}

/**
 * Porta la composizione prenotata a quella delle persone registrate e ricalcola il prezzo delle
 * notti della camera. La composizione si ricava sul server (mai dal client).
 */
export async function azioneRicalcolaDaPresenti(segmentoId: number) {
  return esegui(segmentoId, async (u) => {
    const dati = await datiCheckin(u.hotelId, segmentoId, false);
    await aggiornaComposizione(u.hotelId, segmentoId, dati.segmento.composizione.valoreReale, true);
  });
}

export async function azioneConfermaArrivo(segmentoId: number) {
  return esegui(segmentoId, (u) => confermaArrivo(u.hotelId, segmentoId));
}

/**
 * Check-out: se con questa partenza tutti sono partiti e resta qualcosa da pagare, la risposta lo
 * dice (contoAperto) e la pagina chiede subito se incassare o lasciare il conto in sospeso.
 */
async function conControlloConto(segmentoId: number, fn: (u: UtenteSessione) => Promise<void>) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await fn(utente);
    const seg = await prisma.segmentoSoggiorno.findFirstOrThrow({ where: { id: segmentoId, prenotazione: { hotelId: utente.hotelId } } });
    // Partiti tutti: ringraziamento con il questionario, se l'hotel lo manda da solo (mai un errore del check-out).
    const avviso = await ringraziamentoAutomatico(utente.hotelId, seg.prenotazioneId, await indirizzoPubblico(), utente.nome).catch((e) => `Ringraziamento automatico non inviato: ${e instanceof Error ? e.message : e}`);
    const conto = statoConto(await trovaPrenotazione(utente.hotelId, seg.prenotazioneId));
    const contoAperto =
      conto.aperto && !conto.sospeso
        ? { prenotazioneId: seg.prenotazioneId, daPagare: puo(utente, PERMESSI.IMPORTI_VEDI) ? conto.daPagare : null }
        : null;
    return { dati: await datiCheckin(utente.hotelId, segmentoId, true), avviso: avviso as string | null, contoAperto };
  });
}

export async function azioneCheckoutCamera(segmentoId: number, dataPartenza: string) {
  return conControlloConto(segmentoId, (u) => checkoutCamera(u.hotelId, u.id, segmentoId, dataPartenza));
}

export async function azioneCheckoutOccupante(segmentoId: number, presenzaId: number, dataPartenza: string) {
  return conControlloConto(segmentoId, (u) => checkoutOccupante(u.hotelId, u.id, presenzaId, dataPartenza));
}

/** Chiavi o key card della camera consegnate e restituite (portineria). */
export async function azioneChiaviCamera(segmentoId: number, consegnate: number, restituite: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso([PERMESSI.PORTINERIA, PERMESSI.PRENOTAZIONI_GESTISCI]);
    await impostaChiavi(utente.hotelId, segmentoId, consegnate, restituite);
    return { consegnate, restituite };
  });
}

/** Clienti (aziende, agenzie) a cui addebitare un conto lasciato in sospeso. */
export async function azioneClientiSospeso() {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PAGAMENTI_REGISTRA);
    return prisma.cliente.findMany({ where: { hotelId: utente.hotelId, attivo: true }, select: { id: true, denominazione: true }, orderBy: { denominazione: "asc" } });
  });
}

export async function azioneSospendiDaCheckout(segmentoId: number, d: { clienteId: number | null; nota: string }) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PAGAMENTI_REGISTRA);
    const seg = await prisma.segmentoSoggiorno.findFirstOrThrow({ where: { id: segmentoId, prenotazione: { hotelId: utente.hotelId } } });
    await sospendiConto(utente.hotelId, seg.prenotazioneId, d, utente.nome);
    return { dati: await datiCheckin(utente.hotelId, segmentoId, true), avviso: "Conto lasciato in sospeso." as string | null, contoAperto: null };
  });
}

// ---------------- Note alimentari (modulo Ristorazione) ----------------

/** Persone della camera (intestatario e registrati): solo a loro si possono scrivere le note da qui. */
async function personeCamera(hotelId: number, segmentoId: number) {
  const seg = await prisma.segmentoSoggiorno.findFirstOrThrow({ where: { id: segmentoId, prenotazione: { hotelId } }, include: { presenze: true } });
  return [...new Set([seg.ospiteId, ...seg.presenze.map((p) => p.ospiteId)])];
}

async function suNote(segmentoId: number, ospiteId: number, fn: (hotelId: number, nome: string) => Promise<void>) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.NOTE_ALIMENTARI);
    const persone = await personeCamera(u.hotelId, segmentoId);
    if (!persone.includes(ospiteId)) throw new Error("L'ospite non è in questa camera.");
    await fn(u.hotelId, u.nome);
    return noteDegliOspiti(u.hotelId, persone);
  });
}

export async function azioneSalvaNota(segmentoId: number, ospiteId: number, d: NotaInput) {
  return suNote(segmentoId, ospiteId, (h, nome) => salvaNotaAlimentare(h, ospiteId, d, nome));
}

export async function azioneCancellaNota(segmentoId: number, ospiteId: number) {
  return suNote(segmentoId, ospiteId, (h) => cancellaNotaAlimentare(h, ospiteId));
}
