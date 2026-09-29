"use server";

import { richiediSuperAdmin } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import {
  aggiornaHotel,
  categorieTassaPerComune,
  creaComune,
  creaHotel,
  elencoComuni,
  impostaHotelAttivo,
  impostaModuliHotel,
  type DatiHotel,
} from "@/lib/hotel";
import type { Modulo } from "@/lib/moduli";

export async function datiModulo() {
  await richiediSuperAdmin();
  const [comuni, categorie] = await Promise.all([elencoComuni(), categorieTassaPerComune()]);
  return {
    comuni: comuni.map((c) => ({ id: c.id, nome: c.nome, provincia: c.provincia })),
    categorie,
  };
}

export async function azioneCreaComune(input: { nome: string; provincia: string; codiceIstat: string }) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    const c = await creaComune(input);
    return { id: c.id, nome: c.nome, provincia: c.provincia };
  });
}

/** Restituisce l'id del nuovo hotel: la navigazione la fa il client. */
export async function azioneCreaHotel(dati: DatiHotel, amministratore: { nome: string; email: string; password: string }) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    return (await creaHotel(dati, amministratore)).id;
  });
}

export async function azioneAggiornaHotel(hotelId: number, dati: DatiHotel) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    await aggiornaHotel(hotelId, dati);
    return true;
  });
}

export async function azioneImpostaModuli(hotelId: number, moduli: Modulo[]) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    await impostaModuliHotel(hotelId, moduli);
    return true;
  });
}

export async function azioneImpostaAttivo(hotelId: number, attivo: boolean) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    await impostaHotelAttivo(hotelId, attivo);
    return true;
  });
}
