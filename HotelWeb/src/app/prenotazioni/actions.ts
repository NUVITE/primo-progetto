"use server";

import { cercaPrenotazioni } from "@/lib/prenotazioni";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { righeElenco } from "./righe";

export async function azioneCercaPrenotazioni(query: string) {
  const { hotelId } = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  return righeElenco(await cercaPrenotazioni(hotelId, query));
}
