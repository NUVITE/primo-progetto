"use server";

import { puo, richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { azioneSullaCamera, mieCamere, segnaFrigobar, type AzioneCamera } from "@/lib/foglioPiani";

const permesso = () => richiediPermesso(PERMESSI.PULIZIE_MIE);

export async function datiMieCamere() {
  const u = await permesso();
  return mieCamere(u.hotelId, u.id);
}

export async function azioneMiaCamera(cameraId: number, azione: AzioneCamera, nota: string) {
  return conEsito(async () => {
    const u = await permesso();
    await azioneSullaCamera(u.hotelId, { id: u.id, nome: u.nome }, cameraId, azione, nota, puo(u, PERMESSI.PULIZIE_GESTISCI));
    return mieCamere(u.hotelId, u.id);
  });
}

export async function azioneFrigobar(cameraId: number, righe: { articoloId: number; quantita: number }[]) {
  return conEsito(async () => {
    const u = await permesso();
    await segnaFrigobar(u.hotelId, { id: u.id, nome: u.nome }, cameraId, righe, puo(u, PERMESSI.PULIZIE_GESTISCI));
    return mieCamere(u.hotelId, u.id);
  });
}

export async function azioneCaricaMieCamere() {
  return conEsito(async () => {
    const u = await permesso();
    return mieCamere(u.hotelId, u.id);
  });
}
