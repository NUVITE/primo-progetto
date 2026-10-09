"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { indirizzoPubblico } from "@/lib/indirizzoPubblico";
import type { Lingua } from "@/lib/emailRegole";
import type { MotivoRinuncia } from "@/lib/preventiviRegole";
import {
  anteprimaEmailPreventivo,
  calcolaProposta,
  chiudiRichiestaDisp,
  creaPreventivo,
  creaRichiestaDisp,
  dettaglioRichiestaDisp,
  elencoRichiesteDisp,
  inviaPreventivo,
  modificaRichiestaDisp,
  segnaPreventivoInviato,
  segnaRispostaVista,
  statisticheRichieste,
  type PreventivoInput,
  type RichiestaDispInput,
} from "@/lib/preventivi";

/** Richieste e preventivi: chi gestisce le prenotazioni e vede gli importi (i preventivi hanno prezzi). */
async function permesso() {
  const u = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
  if (!puo(u, PERMESSI.IMPORTI_VEDI)) throw new Error("Per i preventivi serve anche il permesso «Vedere importi».");
  return u;
}

async function caricaElenco(u: UtenteSessione, vista: "aperte" | "chiuse") {
  const [richieste, statistiche] = await Promise.all([elencoRichiesteDisp(u.hotelId, vista), statisticheRichieste(u.hotelId, 90)]);
  return { vista, richieste, statistiche };
}

export async function datiPreventivi() {
  return caricaElenco(await permesso(), "aperte");
}
export async function azioneCaricaPreventivi(vista: "aperte" | "chiuse") {
  return conEsito(async () => caricaElenco(await permesso(), vista));
}
/** Restituisce l'id: la navigazione la fa il client. */
export async function azioneNuovaRichiestaDisp(d: RichiestaDispInput) {
  return conEsito(async () => {
    const u = await permesso();
    return creaRichiestaDisp(u.hotelId, d, u.nome);
  });
}

async function caricaDettaglio(u: UtenteSessione, id: number) {
  const [richiesta, tipi, listini, trattamenti, email] = await Promise.all([
    dettaglioRichiestaDisp(u.hotelId, id),
    prisma.tipoCamera.findMany({ where: { hotelId: u.hotelId }, select: { id: true, descrizione: true }, orderBy: { descrizione: "asc" } }),
    prisma.listino.findMany({ where: { hotelId: u.hotelId }, select: { id: true, descrizione: true, tipo: true }, orderBy: { descrizione: "asc" } }),
    prisma.trattamento.findMany({ where: { hotelId: u.hotelId, attivo: true }, select: { nome: true }, orderBy: { ordine: "asc" } }),
    prisma.configurazioneEmail.findUnique({ where: { hotelId: u.hotelId }, select: { id: true } }),
  ]);
  return { richiesta, tipi, listini, trattamenti: trattamenti.map((t) => t.nome), emailConfigurata: !!email, base: await indirizzoPubblico() };
}

export async function datiRichiestaDisp(id: number) {
  const u = await permesso();
  // Aprendo la richiesta la risposta online dell'ospite risulta vista.
  await segnaRispostaVista(u.hotelId, id);
  return caricaDettaglio(u, id);
}

async function su(id: number, fn: (u: UtenteSessione) => Promise<unknown>) {
  return conEsito(async () => {
    const u = await permesso();
    await fn(u);
    return caricaDettaglio(u, id);
  });
}

export async function azioneModificaRichiestaDisp(id: number, d: RichiestaDispInput) {
  return su(id, (u) => modificaRichiestaDisp(u.hotelId, id, d));
}
export async function azioneCalcolaProposta(id: number, p: { tipoCameraId: number; listinoId: number; trattamento: string }) {
  return conEsito(async () => calcolaProposta((await permesso()).hotelId, id, p));
}
export async function azioneCreaPreventivo(id: number, d: PreventivoInput) {
  return su(id, (u) => creaPreventivo(u.hotelId, id, d, u.nome));
}
export async function azioneSegnaInviato(id: number, preventivoId: number) {
  return su(id, (u) => segnaPreventivoInviato(u.hotelId, preventivoId));
}
export async function azioneChiudiRichiestaDisp(id: number, motivo: MotivoRinuncia) {
  return su(id, (u) => chiudiRichiestaDisp(u.hotelId, id, motivo));
}
export async function azioneAnteprimaPreventivo(preventivoId: number, lingua: Lingua) {
  return conEsito(async () => anteprimaEmailPreventivo((await permesso()).hotelId, preventivoId, lingua, await indirizzoPubblico()));
}
export async function azioneInviaPreventivo(id: number, preventivoId: number, d: { destinatario: string; oggetto: string; corpo: string; lingua: Lingua }) {
  return conEsito(async () => {
    const u = await permesso();
    if (!puo(u, PERMESSI.EMAIL_INVIA)) throw new Error("Per inviare email serve il permesso «Inviare email agli ospiti».");
    const esito = await inviaPreventivo(u.hotelId, preventivoId, d, u.nome);
    return { esito, dati: await caricaDettaglio(u, id) };
  });
}
