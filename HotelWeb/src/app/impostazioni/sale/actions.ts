"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { configurazioneSale, eliminaFascia, eliminaPacchetto, elencoPacchetti, salvaAllestimento, salvaFascia, salvaPacchetto, salvaSala, type DatiSala, type PacchettoInput } from "@/lib/sale";

export async function datiConfigurazioneSale() {
  const u = await richiediPermesso(PERMESSI.SALE_CONFIGURA);
  return configurazioneSale(u.hotelId);
}

async function suSale(fn: (hotelId: number) => Promise<unknown>) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.SALE_CONFIGURA);
    await fn(u.hotelId);
    return configurazioneSale(u.hotelId);
  });
}

export async function azioneSalvaSala(id: number | null, d: DatiSala) {
  return suSale((h) => salvaSala(h, id, d));
}
export async function azioneSalvaAllestimento(salaId: number, id: number | null, d: { nome: string; capienza: number; costo: number; attivo: boolean }) {
  return suSale((h) => salvaAllestimento(h, salaId, id, d));
}
export async function azioneSalvaFascia(id: number | null, d: { nome: string; inizio: string; fine: string; mostraNelPlanning: boolean }) {
  return suSale((h) => salvaFascia(h, id, d));
}
export async function azioneEliminaFascia(id: number) {
  return suSale((h) => eliminaFascia(h, id));
}

/** Pacchetti per gli eventi e servizi del catalogo da metterci dentro. */
export async function datiPacchetti() {
  const u = await richiediPermesso(PERMESSI.SALE_CONFIGURA);
  const [pacchetti, servizi] = await Promise.all([
    elencoPacchetti(u.hotelId),
    prisma.servizioCatalogo.findMany({ where: { hotelId: u.hotelId, attivo: true }, orderBy: { nome: "asc" } }),
  ]);
  return { pacchetti, servizi: servizi.map((s) => ({ id: s.id, nome: s.nome, prezzo: Number(s.prezzo) })) };
}

export async function azioneSalvaPacchetto(id: number | null, d: PacchettoInput) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.SALE_CONFIGURA);
    return salvaPacchetto(u.hotelId, id, d);
  });
}

export async function azioneEliminaPacchetto(id: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.SALE_CONFIGURA);
    return eliminaPacchetto(u.hotelId, id);
  });
}
