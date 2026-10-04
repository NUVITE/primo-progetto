"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { elencoReparti } from "@/lib/conto";
import {
  aggiungiPiattoAlMenu,
  dettaglioMenu,
  duplicaMenu,
  elencoMenu,
  elencoPiatti,
  eliminaMenu,
  eliminaPiatto,
  impostaVoce,
  salvaMenu,
  salvaPiatto,
  spostaVoce,
  togliVoce,
} from "@/lib/menu";
import type { PiattoInput, TestataMenu } from "@/lib/menuRegole";

const permesso = () => richiediPermesso(PERMESSI.MENU_GESTISCI);

// ---------------- Piatti ----------------

async function datiPiattiDi(hotelId: number) {
  const [piatti, reparti] = await Promise.all([elencoPiatti(hotelId), elencoReparti(hotelId, true)]);
  return { piatti, reparti: reparti.filter((r) => !r.esborso) };
}

export async function datiPiatti() {
  return datiPiattiDi((await permesso()).hotelId);
}

export async function azioneSalvaPiatto(id: number | null, d: PiattoInput) {
  return conEsito(async () => {
    const u = await permesso();
    await salvaPiatto(u.hotelId, id, d);
    return datiPiattiDi(u.hotelId);
  });
}

export async function azioneEliminaPiatto(id: number) {
  return conEsito(async () => {
    const u = await permesso();
    await eliminaPiatto(u.hotelId, id);
    return datiPiattiDi(u.hotelId);
  });
}

// ---------------- Menu ----------------

export async function datiElencoMenu() {
  return elencoMenu((await permesso()).hotelId);
}

/** Restituisce l'id: la navigazione la fa il client. */
export async function azioneCreaMenu(d: TestataMenu) {
  return conEsito(async () => salvaMenu((await permesso()).hotelId, null, d));
}

export async function azioneDuplicaMenu(id: number, nome: string, giorno: string | null) {
  return conEsito(async () => duplicaMenu((await permesso()).hotelId, id, nome, giorno));
}

export async function azioneEliminaMenu(id: number) {
  return conEsito(async () => {
    const u = await permesso();
    await eliminaMenu(u.hotelId, id);
    return elencoMenu(u.hotelId);
  });
}

async function datiMenuDi(hotelId: number, id: number) {
  const [menu, piatti] = await Promise.all([dettaglioMenu(hotelId, id), elencoPiatti(hotelId, true)]);
  return { menu, piatti: piatti.map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria })) };
}

export async function datiMenu(id: number) {
  return datiMenuDi((await permesso()).hotelId, id);
}

async function suMenu(id: number, fn: (hotelId: number) => Promise<unknown>) {
  return conEsito(async () => {
    const u = await permesso();
    await fn(u.hotelId);
    return datiMenuDi(u.hotelId, id);
  });
}

export async function azioneSalvaTestataMenu(id: number, d: TestataMenu) {
  return suMenu(id, (h) => salvaMenu(h, id, d));
}
export async function azioneAggiungiPiattoMenu(id: number, piattoId: number) {
  return suMenu(id, (h) => aggiungiPiattoAlMenu(h, id, piattoId));
}
export async function azioneTogliVoce(id: number, voceId: number) {
  return suMenu(id, (h) => togliVoce(h, id, voceId));
}
export async function azioneImpostaVoce(id: number, voceId: number, d: { disponibile: boolean; prezzo: number | null }) {
  return suMenu(id, (h) => impostaVoce(h, id, voceId, d));
}
export async function azioneSpostaVoce(id: number, voceId: number, direzione: -1 | 1) {
  return suMenu(id, (h) => spostaVoce(h, id, voceId, direzione));
}
