"use server";

import { conEsito } from "@/lib/esito";
import { richiediRuolo } from "@/lib/auth";
import { creaUtente, datiGestioneUtenti, impostaAccessoHotel, impostaAttivoUtente, impostaRuoloUtente } from "@/lib/utenti";
import type { RuoloUtente } from "@/generated/prisma/enums";

async function hotelIdsAmministrati() {
  const utente = await richiediRuolo(["ADMIN"]);
  return utente.hotels.map((h) => h.id);
}

export async function datiUtenti() {
  const hotelIdsAmmin = await hotelIdsAmministrati();
  const { utenti, hotelsGestibili } = await datiGestioneUtenti(hotelIdsAmmin);
  return {
    hotelsGestibili,
    utenti: utenti.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      ruolo: u.ruolo,
      attivo: u.attivo,
      hotelIds: u.hotels.map((h) => h.id),
    })),
  };
}

export async function azioneCreaUtente(input: { nome: string; email: string; password: string; ruolo: RuoloUtente; hotelIds: number[] }) {
  return conEsito(async () => {
    const hotelIdsAmmin = await hotelIdsAmministrati();
    await creaUtente(hotelIdsAmmin, input);
    return datiUtenti();
  });
}

export async function azioneImpostaRuolo(utenteId: number, ruolo: RuoloUtente) {
  return conEsito(async () => {
    const hotelIdsAmmin = await hotelIdsAmministrati();
    await impostaRuoloUtente(hotelIdsAmmin, utenteId, ruolo);
    return datiUtenti();
  });
}

export async function azioneImpostaAttivo(utenteId: number, attivo: boolean) {
  return conEsito(async () => {
    const hotelIdsAmmin = await hotelIdsAmministrati();
    await impostaAttivoUtente(hotelIdsAmmin, utenteId, attivo);
    return datiUtenti();
  });
}

export async function azioneImpostaAccessoHotel(utenteId: number, hotelId: number, concesso: boolean) {
  return conEsito(async () => {
    const hotelIdsAmmin = await hotelIdsAmministrati();
    await impostaAccessoHotel(hotelIdsAmmin, utenteId, hotelId, concesso);
    return datiUtenti();
  });
}
