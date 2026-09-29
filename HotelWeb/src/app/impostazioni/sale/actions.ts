"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { configurazioneSale, eliminaFascia, salvaAllestimento, salvaFascia, salvaSala, type DatiSala } from "@/lib/sale";

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
