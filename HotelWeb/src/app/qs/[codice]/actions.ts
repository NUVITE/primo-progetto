"use server";

import { conEsito } from "@/lib/esito";
import { compilaQuestionario, paginaQuestionario } from "@/lib/questionari";
import type { RispostaQuestionario } from "@/lib/questionariRegole";

/** Azione della pagina pubblica del questionario: il codice segreto del link è l'unica chiave. */
export async function azioneCompila(codice: string, risposta: RispostaQuestionario) {
  return conEsito(async () => {
    await compilaQuestionario(codice, risposta);
    const p = await paginaQuestionario(codice);
    if (!p) throw new Error("Questionario non trovato.");
    return p;
  });
}
