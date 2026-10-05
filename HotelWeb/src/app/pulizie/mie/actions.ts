"use server";

import { puo, richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { azioneSullaCamera, mieCamere, segnaFrigobar, type AzioneCamera } from "@/lib/foglioPiani";
import { creaSegnalazione } from "@/lib/manutenzioni";

const permesso = () => richiediPermesso(PERMESSI.PULIZIE_MIE);

const carica = async (u: Awaited<ReturnType<typeof permesso>>) => ({ ...(await mieCamere(u.hotelId, u.id)), puoSegnalare: puo(u, PERMESSI.GUASTI_SEGNALA) });

export async function datiMieCamere() {
  return carica(await permesso());
}

/** Guasto trovato pulendo la camera: diventa una segnalazione per la manutenzione. */
export async function azioneGuastoCamera(cameraId: number, descrizione: string, urgente: boolean) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.GUASTI_SEGNALA);
    await creaSegnalazione(u.hotelId, { cameraId, zona: "", descrizione, priorita: urgente ? "urgente" : "normale" }, u.nome);
    return carica(await permesso());
  });
}

export async function azioneMiaCamera(cameraId: number, azione: AzioneCamera, nota: string) {
  return conEsito(async () => {
    const u = await permesso();
    await azioneSullaCamera(u.hotelId, { id: u.id, nome: u.nome }, cameraId, azione, nota, puo(u, PERMESSI.PULIZIE_GESTISCI));
    return carica(u);
  });
}

export async function azioneFrigobar(cameraId: number, righe: { articoloId: number; quantita: number }[]) {
  return conEsito(async () => {
    const u = await permesso();
    await segnaFrigobar(u.hotelId, { id: u.id, nome: u.nome }, cameraId, righe, puo(u, PERMESSI.PULIZIE_GESTISCI));
    return carica(u);
  });
}

export async function azioneCaricaMieCamere() {
  return conEsito(async () => {
    const u = await permesso();
    return carica(u);
  });
}
