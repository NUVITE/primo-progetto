"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { giornaleDelGiorno } from "@/lib/giornale";

// Importi di tutti gli ospiti: chi chiude la cassa o registra i pagamenti (anche il portiere di notte).
const permesso = () => richiediPermesso([PERMESSI.CASSA_CHIUDI, PERMESSI.PAGAMENTI_REGISTRA]);
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

export async function datiGiornale(giorno?: string) {
  const u = await permesso();
  return giornaleDelGiorno(u.hotelId, giorno && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : oggi());
}

export async function azioneGiornale(giorno: string) {
  return conEsito(async () => giornaleDelGiorno((await permesso()).hotelId, giorno));
}
