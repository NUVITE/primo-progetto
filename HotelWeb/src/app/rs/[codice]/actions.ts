"use server";

import { conEsito } from "@/lib/esito";
import { ordinaDaQr, paginaOspite, type OrdineInput } from "@/lib/roomService";
import { guastoDaQr, richiestaDaQr, type RichiestaInput } from "@/lib/richieste";

/**
 * Azioni della pagina pubblica del room service: niente login, il codice segreto del soggiorno
 * nel link è l'unica chiave (vale solo mentre gli ospiti sono in casa).
 */
export async function azioneRicarica(codice: string) {
  return conEsito(async () => {
    const p = await paginaOspite(codice);
    if (!p) throw new Error("Link non valido.");
    return p;
  });
}

export async function azioneOrdina(codice: string, d: OrdineInput) {
  return conEsito(async () => {
    await ordinaDaQr(codice, d);
    const p = await paginaOspite(codice);
    if (!p) throw new Error("Link non valido.");
    return p;
  });
}

export async function azioneRichiesta(codice: string, d: RichiestaInput) {
  return conEsito(async () => {
    await richiestaDaQr(codice, d);
    const p = await paginaOspite(codice);
    if (!p) throw new Error("Link non valido.");
    return p;
  });
}

export async function azioneGuasto(codice: string, descrizione: string) {
  return conEsito(async () => {
    await guastoDaQr(codice, descrizione);
    const p = await paginaOspite(codice);
    if (!p) throw new Error("Link non valido.");
    return p;
  });
}
