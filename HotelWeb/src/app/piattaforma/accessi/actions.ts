"use server";

import { conEsito } from "@/lib/esito";
import { richiediSuperAdmin } from "@/lib/auth";
import { registroAccessi, type FiltroRegistro } from "@/lib/accessi";

/** Registro completo (tutte le strutture e i tentativi su email inesistenti): solo il gestore della piattaforma. */
export async function azioneRegistroPiattaforma(f: FiltroRegistro) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    return registroAccessi(null, f);
  });
}
