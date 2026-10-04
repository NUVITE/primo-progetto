"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { foglioDelGiorno, impostaTavolo, impostaVariazionePasto } from "@/lib/foglioPasti";
import type { Pasto } from "@/lib/pastiRegole";

const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

// Le note alimentari (dati sanitari) arrivano solo a chi ha anche quel permesso.
const carica = (u: UtenteSessione, giorno: string) => foglioDelGiorno(u.hotelId, giorno, puo(u, PERMESSI.NOTE_ALIMENTARI));

export async function datiFoglio(giorno?: string) {
  const u = await richiediPermesso(PERMESSI.FOGLIO_PASTI);
  return carica(u, giorno && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : oggi());
}

export async function azioneCaricaFoglio(giorno: string) {
  return conEsito(async () => carica(await richiediPermesso(PERMESSI.FOGLIO_PASTI), giorno));
}

export async function azioneVariazionePasto(giorno: string, segmentoId: number, pasto: Pasto, delta: number, nota: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.FOGLIO_PASTI);
    await impostaVariazionePasto(u.hotelId, segmentoId, giorno, pasto, delta, nota, u.nome);
    return carica(u, giorno);
  });
}

export async function azioneTavolo(giorno: string, segmentoId: number, tavolo: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.FOGLIO_PASTI);
    await impostaTavolo(u.hotelId, segmentoId, tavolo);
    return carica(u, giorno);
  });
}
