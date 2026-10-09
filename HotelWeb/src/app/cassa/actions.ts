"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { cassaDelGiorno, chiudiGiornata, oggiCassa, riapriGiornata, ultimeChiusure, type DatiChiusura } from "@/lib/cassa";

async function dati(hotelId: number, giorno: string) {
  const [cassa, chiusure] = await Promise.all([cassaDelGiorno(hotelId, giorno), ultimeChiusure(hotelId)]);
  return { ...cassa, chiusure };
}

export async function datiCassa(giorno?: string) {
  const u = await richiediPermesso(PERMESSI.CASSA_CHIUDI);
  return dati(u.hotelId, giorno && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : oggiCassa());
}

export async function azioneCaricaGiorno(giorno: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.CASSA_CHIUDI);
    return dati(u.hotelId, giorno);
  });
}

export async function azioneChiudiGiornata(giorno: string, d: DatiChiusura) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.CASSA_CHIUDI);
    await chiudiGiornata(u.hotelId, giorno, d, u.nome);
    return dati(u.hotelId, giorno);
  });
}

export async function azioneRiapriGiornata(giorno: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.CASSA_CHIUDI);
    await riapriGiornata(u.hotelId, giorno);
    return dati(u.hotelId, giorno);
  });
}
