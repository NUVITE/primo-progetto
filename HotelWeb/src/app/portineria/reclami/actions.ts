"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { abbuonoReclamo, analisiReclamo, elencoReclami, registraReclamo, risolviReclamo, type ReclamoInput } from "@/lib/reclami";
import { ospitiPerMessaggi } from "@/lib/messaggi";

const permesso = () => richiediPermesso(PERMESSI.RECLAMI);
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const unMeseFa = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() - 30 * 86400000));

async function carica(u: UtenteSessione, dal: string, al: string) {
  const [elenco, ospiti] = await Promise.all([elencoReclami(u.hotelId, dal, al), ospitiPerMessaggi(u.hotelId)]);
  return { ...elenco, ospiti, puoAbbuonare: puo(u, PERMESSI.PREZZI_MODIFICA) };
}

export async function datiReclami() {
  return carica(await permesso(), unMeseFa(), oggi());
}

export async function azioneCaricaReclami(dal: string, al: string) {
  return conEsito(async () => carica(await permesso(), dal, al));
}

export async function azioneRegistraReclamo(d: ReclamoInput, dal: string, al: string) {
  return conEsito(async () => {
    const u = await permesso();
    await registraReclamo(u.hotelId, d, u.nome);
    return carica(u, dal, al);
  });
}

export async function azioneRisolviReclamo(id: number, soluzione: string, gesto: string, dal: string, al: string) {
  return conEsito(async () => {
    const u = await permesso();
    await risolviReclamo(u.hotelId, id, soluzione, gesto, u.nome);
    return carica(u, dal, al);
  });
}

export async function azioneAnalisiReclamo(id: number, analisi: string, dal: string, al: string) {
  return conEsito(async () => {
    const u = await permesso();
    await analisiReclamo(u.hotelId, id, analisi);
    return carica(u, dal, al);
  });
}

/** L'abbuono sul conto è uno sconto: solo per chi può modificare i prezzi. */
export async function azioneAbbuonoReclamo(id: number, importo: number, dal: string, al: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.PREZZI_MODIFICA);
    await permesso();
    await abbuonoReclamo(u.hotelId, id, importo, u.nome);
    return carica(u, dal, al);
  });
}
