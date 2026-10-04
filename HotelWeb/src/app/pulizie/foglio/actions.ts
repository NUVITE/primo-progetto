"use server";

import { richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { assegnaCamera, azioneSullaCamera, foglioPiani, proponiAssegnazioni, type AzioneCamera } from "@/lib/foglioPiani";

const permesso = () => richiediPermesso(PERMESSI.PULIZIE_GESTISCI);

export async function datiFoglioPiani() {
  return foglioPiani((await permesso()).hotelId);
}

async function su(fn: (u: UtenteSessione) => Promise<unknown>) {
  return conEsito(async () => {
    const u = await permesso();
    await fn(u);
    return foglioPiani(u.hotelId);
  });
}

export async function azioneCaricaFoglioPiani() {
  return su(async () => undefined);
}
export async function azioneAssegna(cameraId: number, utenteId: number | null) {
  return su((u) => assegnaCamera(u.hotelId, cameraId, utenteId));
}
export async function azioneProponi(utenteIds: number[]) {
  return su((u) => proponiAssegnazioni(u.hotelId, utenteIds));
}
/** La governante può segnare l'esito di qualsiasi camera assegnata (es. al posto di chi è al piano). */
export async function azioneEsitoGovernante(cameraId: number, azione: AzioneCamera, nota: string) {
  return su((u) => azioneSullaCamera(u.hotelId, { id: u.id, nome: u.nome }, cameraId, azione, nota, true));
}
