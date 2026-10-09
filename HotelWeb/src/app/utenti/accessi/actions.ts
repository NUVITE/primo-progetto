"use server";

import { conEsito } from "@/lib/esito";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { registroAccessi, type FiltroRegistro } from "@/lib/accessi";

/** Registro degli accessi degli utenti di questa struttura (chi gestisce gli utenti). */
export async function azioneRegistroStruttura(f: FiltroRegistro) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.UTENTI_GESTISCI);
    return registroAccessi(u.hotelId, f);
  });
}
