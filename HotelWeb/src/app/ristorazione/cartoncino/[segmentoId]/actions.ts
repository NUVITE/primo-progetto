"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { codiceCartoncino } from "@/lib/roomService";

/** Cartoncino perso o consegnato alla persona sbagliata: nuovo codice, il vecchio QR smette di funzionare. */
export async function azioneNuovoCodice(segmentoId: number) {
  return conEsito(async () => {
    const u = await richiediPermesso([PERMESSI.ROOM_SERVICE, PERMESSI.CAMERE_STATO_VEDI, PERMESSI.GUASTI_SEGNALA]);
    await codiceCartoncino(u.hotelId, segmentoId, true);
    return true;
  });
}
