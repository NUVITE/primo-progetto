"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { indirizzoPubblico } from "@/lib/indirizzoPubblico";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { daRingraziare, ringraziaPartenza, risultatiQuestionari, segnaLetto } from "@/lib/questionari";

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const unAnnoFa = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() - 364 * 86400000));

async function carica(u: UtenteSessione, dal: string, al: string) {
  const puoInviare = puo(u, PERMESSI.EMAIL_INVIA);
  const puoConfigurare = puo(u, PERMESSI.HOTEL_CONFIGURA);
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: u.hotelId }, select: { ringraziamentoAuto: true, linkRecensioni: true, configurazioneEmail: { select: { id: true } } } });
  return {
    risultati: await risultatiQuestionari(u.hotelId, dal, al),
    daRingraziare: puoInviare ? await daRingraziare(u.hotelId) : null,
    impostazioni: { ringraziamentoAuto: hotel.ringraziamentoAuto, linkRecensioni: hotel.linkRecensioni ?? "", emailConfigurata: !!hotel.configurazioneEmail },
    puoInviare,
    puoConfigurare,
  };
}

export async function datiQuestionari() {
  return carica(await richiediPermesso(PERMESSI.QUESTIONARI_VEDI), unAnnoFa(), oggiItalia());
}

export async function azioneCaricaQuestionari(dal: string, al: string) {
  return conEsito(async () => carica(await richiediPermesso(PERMESSI.QUESTIONARI_VEDI), dal, al));
}

export async function azioneSegnaLetto(id: number, dal: string, al: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.QUESTIONARI_VEDI);
    await segnaLetto(u.hotelId, id, u.nome);
    return carica(u, dal, al);
  });
}

export async function azioneRingrazia(prenotazioneId: number, dal: string, al: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.EMAIL_INVIA);
    const r = await ringraziaPartenza(u.hotelId, prenotazioneId, await indirizzoPubblico(), u.nome);
    return { ...r, dati: await carica(u, dal, al) };
  });
}

export async function azioneImpostazioniQuestionari(ringraziamentoAuto: boolean, linkRecensioni: string, dal: string, al: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    const link = linkRecensioni.trim();
    if (link && !/^https:\/\/[^\s]+\.[^\s]+$/.test(link)) throw new Error("Il link delle recensioni deve essere un indirizzo https:// completo.");
    await prisma.hotel.update({ where: { id: u.hotelId }, data: { ringraziamentoAuto, linkRecensioni: link || null } });
    return carica(u, dal, al);
  });
}
