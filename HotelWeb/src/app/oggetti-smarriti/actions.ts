"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { elencoOggetti, impostaConservazione, registraOggetto, restituisciOggetto, smaltisciOggetto, type OggettoInput } from "@/lib/richieste";

const permesso = () => richiediPermesso(PERMESSI.OGGETTI_SMARRITI);

async function carica(u: UtenteSessione, vista: "deposito" | "chiusi") {
  const [elenco, camere] = await Promise.all([
    elencoOggetti(u.hotelId, vista),
    prisma.camera.findMany({ where: { hotelId: u.hotelId, attivo: true }, select: { id: true, codice: true }, orderBy: { codice: "asc" } }),
  ]);
  return { vista, ...elenco, camere, puoConfigurare: puo(u, PERMESSI.HOTEL_CONFIGURA) };
}

export async function datiOggetti() {
  return carica(await permesso(), "deposito");
}
export async function azioneCaricaOggetti(vista: "deposito" | "chiusi") {
  return conEsito(async () => carica(await permesso(), vista));
}
export async function azioneRegistraOggetto(d: OggettoInput) {
  return conEsito(async () => {
    const u = await permesso();
    await registraOggetto(u.hotelId, d, u.nome);
    return carica(u, "deposito");
  });
}
export async function azioneRestituisci(id: number, a: string, nota: string) {
  return conEsito(async () => {
    const u = await permesso();
    await restituisciOggetto(u.hotelId, id, a, nota, u.nome);
    return carica(u, "deposito");
  });
}
export async function azioneSmaltisci(id: number, nota: string) {
  return conEsito(async () => {
    const u = await permesso();
    await smaltisciOggetto(u.hotelId, id, nota, u.nome);
    return carica(u, "deposito");
  });
}
export async function azioneConservazione(mesi: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    await impostaConservazione(u.hotelId, mesi);
    return carica(u, "deposito");
  });
}
