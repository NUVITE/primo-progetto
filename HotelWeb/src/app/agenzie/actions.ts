"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { elencoAgenzie, elencoAllotment, eliminaAllotment, estrattoContoAgenzia, salvaAllotment, type AllotmentInput } from "@/lib/agenzie";

/** Allotment: chi gestisce listini e contratti; estratto conto: chi registra pagamenti e vede gli importi. */
const permesso = () => richiediPermesso([PERMESSI.LISTINI_GESTISCI, PERMESSI.PAGAMENTI_REGISTRA]);

async function carica(u: UtenteSessione) {
  const [agenzie, allotment, tipi] = await Promise.all([
    elencoAgenzie(u.hotelId),
    elencoAllotment(u.hotelId),
    prisma.tipoCamera.findMany({ where: { hotelId: u.hotelId }, select: { id: true, descrizione: true }, orderBy: { descrizione: "asc" } }),
  ]);
  return {
    agenzie,
    allotment,
    tipi,
    puoAllotment: puo(u, PERMESSI.LISTINI_GESTISCI),
    puoEstratto: puo(u, PERMESSI.PAGAMENTI_REGISTRA) && puo(u, PERMESSI.IMPORTI_VEDI),
  };
}

export async function datiAgenzie() {
  return carica(await permesso());
}

export async function azioneSalvaAllotment(id: number | null, d: AllotmentInput) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
    await salvaAllotment(u.hotelId, id, d, u.nome);
    return carica(u);
  });
}

export async function azioneEliminaAllotment(id: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
    await eliminaAllotment(u.hotelId, id);
    return carica(u);
  });
}

export async function azioneEstratto(clienteId: number, dal: string, al: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.PAGAMENTI_REGISTRA);
    if (!puo(u, PERMESSI.IMPORTI_VEDI)) throw new Error("Serve il permesso «Vedere importi».");
    return estrattoContoAgenzia(u.hotelId, clienteId, dal, al);
  });
}
