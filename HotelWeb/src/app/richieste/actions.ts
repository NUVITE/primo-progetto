"use server";

import { richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { chiudiRichiesta, creaRichiesta, elencoRichieste, type RichiestaInput } from "@/lib/richieste";

const permesso = () => richiediPermesso(PERMESSI.CAMERE_STATO_VEDI);

async function carica(u: UtenteSessione, vista: "aperte" | "chiuse") {
  const [richieste, camere] = await Promise.all([
    elencoRichieste(u.hotelId, vista),
    prisma.camera.findMany({ where: { hotelId: u.hotelId, attivo: true }, select: { id: true, codice: true }, orderBy: { codice: "asc" } }),
  ]);
  return { vista, richieste, camere };
}

export async function datiRichieste() {
  return carica(await permesso(), "aperte");
}
export async function azioneCaricaRichieste(vista: "aperte" | "chiuse") {
  return conEsito(async () => carica(await permesso(), vista));
}
export async function azioneNuovaRichiesta(cameraId: number, d: RichiestaInput) {
  return conEsito(async () => {
    const u = await permesso();
    await creaRichiesta(u.hotelId, cameraId, d, u.nome);
    return carica(u, "aperte");
  });
}
export async function azioneChiudiRichiesta(id: number, esito: "fatta" | "annullata", nota: string) {
  return conEsito(async () => {
    const u = await permesso();
    await chiudiRichiesta(u.hotelId, id, esito, nota, u.nome);
    return carica(u, "aperte");
  });
}
