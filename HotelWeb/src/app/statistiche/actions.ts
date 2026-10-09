"use server";

import { conEsito } from "@/lib/esito";
import { puo, richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { oggiItaliano } from "@/lib/cassaAperta";
import { statistiche } from "@/lib/statistiche";

/** Statistiche del periodo per chi ha il permesso; gli importi solo con «Vedere importi». */
export async function datiStatistiche(dal: string, al: string) {
  const u = await richiediPermesso(PERMESSI.STATISTICHE_VEDI);
  return statistiche(u.hotelId, dal, al, puo(u, PERMESSI.IMPORTI_VEDI), oggiItaliano());
}

export async function azioneStatistiche(dal: string, al: string) {
  return conEsito(() => datiStatistiche(dal, al));
}
