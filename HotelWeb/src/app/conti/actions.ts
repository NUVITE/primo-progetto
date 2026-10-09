"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { eventiDaSaldare } from "@/lib/sale";
import { contiAperti, registraSollecito } from "@/lib/contiSospesi";

/** Conti da chiudere: è un elenco di cassa, serve il permesso di registrare pagamenti. */
export async function datiConti() {
  const u = await richiediPermesso(PERMESSI.PAGAMENTI_REGISTRA);
  return contiAperti(u.hotelId);
}

/** Eventi in sala già svolti con qualcosa da incassare (solo se il modulo Sale è attivo). */
export async function datiEventiDaSaldare() {
  const u = await richiediPermesso(PERMESSI.PAGAMENTI_REGISTRA);
  return u.moduli.includes("sale") ? eventiDaSaldare(u.hotelId) : [];
}

export async function azioneSollecito(id: number, giorno: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.PAGAMENTI_REGISTRA);
    await registraSollecito(u.hotelId, id, giorno);
    return contiAperti(u.hotelId);
  });
}
