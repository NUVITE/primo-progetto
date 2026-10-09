"use server";

import { richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { configurazioneEmail, modelloEmail, provaConfigurazione, ripristinaModelloEmail, salvaConfigurazioneEmail, salvaModelloEmail, type ConfigurazioneInput } from "@/lib/email";
import type { ChiaveModello, Lingua } from "@/lib/emailRegole";

const permesso = () => richiediPermesso(PERMESSI.HOTEL_CONFIGURA);

async function carica(u: UtenteSessione) {
  const [config, hotel] = await Promise.all([configurazioneEmail(u.hotelId), prisma.hotel.findUniqueOrThrow({ where: { id: u.hotelId }, select: { iban: true, email: true } })]);
  return { config, iban: hotel.iban ?? "", emailHotel: hotel.email ?? "", simulazione: process.env.EMAIL_SIMULA === "1" };
}

export async function datiEmail() {
  return carica(await permesso());
}

export async function azioneSalvaConfigurazione(d: ConfigurazioneInput) {
  return conEsito(async () => {
    const u = await permesso();
    await salvaConfigurazioneEmail(u.hotelId, d, u.nome);
    return carica(u);
  });
}

/** Email di prova: la scrive chi configura, all'indirizzo che sceglie. */
export async function azioneProvaEmail(destinatario: string) {
  return conEsito(async () => {
    const u = await permesso();
    const esito = await provaConfigurazione(u.hotelId, destinatario, u.nome);
    return { dati: await carica(u), esito };
  });
}

export async function azioneSalvaIban(iban: string) {
  return conEsito(async () => {
    const u = await permesso();
    const pulito = iban.replace(/\s+/g, "").toUpperCase();
    if (pulito && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(pulito)) throw new Error("IBAN non valido.");
    await prisma.hotel.update({ where: { id: u.hotelId }, data: { iban: pulito || null } });
    return carica(u);
  });
}

export async function azioneCaricaModello(chiave: ChiaveModello, lingua: Lingua) {
  return conEsito(async () => modelloEmail((await permesso()).hotelId, chiave, lingua));
}

export async function azioneSalvaModello(chiave: ChiaveModello, lingua: Lingua, d: { oggetto: string; corpo: string }) {
  return conEsito(async () => {
    const u = await permesso();
    await salvaModelloEmail(u.hotelId, chiave, lingua, d, u.nome);
    return modelloEmail(u.hotelId, chiave, lingua);
  });
}

export async function azioneRipristinaModello(chiave: ChiaveModello, lingua: Lingua) {
  return conEsito(async () => {
    const u = await permesso();
    await ripristinaModelloEmail(u.hotelId, chiave, lingua);
    return modelloEmail(u.hotelId, chiave, lingua);
  });
}
