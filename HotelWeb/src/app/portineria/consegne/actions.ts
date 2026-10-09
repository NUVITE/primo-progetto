"use server";

import { richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { chiudiConsegna, creaConsegna, elencoConsegne, segnaConsegnaLetta } from "@/lib/consegne";

const permesso = () => richiediPermesso(PERMESSI.PORTINERIA);
const carica = (u: UtenteSessione) => elencoConsegne(u.hotelId, u.id);

export async function datiConsegne() {
  return carica(await permesso());
}

export async function azioneCreaConsegna(testo: string, importante: boolean) {
  return conEsito(async () => {
    const u = await permesso();
    await creaConsegna(u.hotelId, testo, importante, u);
    return carica(u);
  });
}

export async function azioneConsegnaLetta(id: number) {
  return conEsito(async () => {
    const u = await permesso();
    await segnaConsegnaLetta(u.hotelId, id, u);
    return carica(u);
  });
}

export async function azioneChiudiConsegna(id: number) {
  return conEsito(async () => {
    const u = await permesso();
    await chiudiConsegna(u.hotelId, id, u);
    return carica(u);
  });
}
