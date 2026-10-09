"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { cambiaStatoOrdine, elencoOrdini, ordinaAlTelefono, type OrdineInput, type StatoOrdine } from "@/lib/roomService";

// Le note alimentari (e quindi i conflitti con l'ordine) solo a chi ha anche quel permesso.
const carica = (u: UtenteSessione) => elencoOrdini(u.hotelId, puo(u, PERMESSI.NOTE_ALIMENTARI));

export async function datiOrdini() {
  return carica(await richiediPermesso(PERMESSI.ROOM_SERVICE));
}

export async function azioneCaricaOrdini() {
  return conEsito(async () => carica(await richiediPermesso(PERMESSI.ROOM_SERVICE)));
}

export async function azioneStatoOrdine(id: number, stato: StatoOrdine, motivo: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ROOM_SERVICE);
    await cambiaStatoOrdine(u.hotelId, id, stato, u.nome, motivo);
    return carica(u);
  });
}

export async function azioneOrdineTelefono(segmentoId: number, d: OrdineInput) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ROOM_SERVICE);
    await ordinaAlTelefono(u.hotelId, segmentoId, d, u.nome);
    return carica(u);
  });
}
