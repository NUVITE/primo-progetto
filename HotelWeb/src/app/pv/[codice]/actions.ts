"use server";

import { conEsito } from "@/lib/esito";
import { accettaPreventivo, paginaPreventivo, rifiutaPreventivo } from "@/lib/preventivi";

/** Azioni della pagina pubblica del preventivo: il codice segreto del link è l'unica chiave. */
async function ricarica(codice: string) {
  const p = await paginaPreventivo(codice);
  if (!p) throw new Error("Preventivo non trovato.");
  return p;
}

export async function azioneAccetta(codice: string, propostaId: number) {
  return conEsito(async () => {
    await accettaPreventivo(codice, propostaId);
    return ricarica(codice);
  });
}

export async function azioneRifiuta(codice: string, motivo: string) {
  return conEsito(async () => {
    await rifiutaPreventivo(codice, motivo);
    return ricarica(codice);
  });
}
