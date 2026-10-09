"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { impostaBiancheria } from "@/lib/foglioPiani";
import { prisma } from "@/lib/prisma";
import { impostaControlloGovernante, impostaNonDisturbare, impostaStatoPulizia, quadroCamere, registraControllo } from "@/lib/pulizie";
import type { StatoPulizia } from "@/lib/pulizieRegole";

const carica = async (u: UtenteSessione) => ({
  ...(await quadroCamere(u.hotelId)),
  biancheria: await prisma.hotel.findUniqueOrThrow({ where: { id: u.hotelId }, select: { cambioLenzuolaOgni: true, cambioAsciugamaniOgni: true, couverture: true } }),
  puoGestire: puo(u, PERMESSI.PULIZIE_GESTISCI),
  puoConfigurare: puo(u, PERMESSI.HOTEL_CONFIGURA),
});

export async function datiStatoCamere() {
  return carica(await richiediPermesso(PERMESSI.CAMERE_STATO_VEDI));
}

export async function azioneCaricaStatoCamere() {
  return conEsito(async () => carica(await richiediPermesso(PERMESSI.CAMERE_STATO_VEDI)));
}

async function suGestione(fn: (u: UtenteSessione) => Promise<unknown>) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.PULIZIE_GESTISCI);
    await fn(u);
    return carica(u);
  });
}

export async function azioneStatoPulizia(cameraId: number, stato: StatoPulizia | "finita") {
  return suGestione((u) => impostaStatoPulizia(u.hotelId, cameraId, stato, u.nome));
}
export async function azioneNonDisturbare(cameraId: number, attiva: boolean) {
  return suGestione((u) => impostaNonDisturbare(u.hotelId, cameraId, attiva));
}
export async function azioneControllo(cameraId: number, trovata: "occupata" | "libera" | null, nota: string) {
  return suGestione((u) => registraControllo(u.hotelId, cameraId, trovata, nota, u.nome));
}
export async function azioneControlloGovernante(attivo: boolean) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    await impostaControlloGovernante(u.hotelId, attivo);
    return carica(u);
  });
}

export async function azioneBiancheria(d: { cambioLenzuolaOgni: number; cambioAsciugamaniOgni: number | null; couverture: boolean }) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    await impostaBiancheria(u.hotelId, d);
    return carica(u);
  });
}
