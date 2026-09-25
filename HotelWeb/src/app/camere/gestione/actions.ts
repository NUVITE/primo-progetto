"use server";

import {
  cambiaTipoCamera,
  creaCamera,
  creaIndisponibilita,
  creaTipoCamera,
  datiGestioneCamere,
  eliminaIndisponibilita,
  impostaCameraAttiva,
} from "@/lib/camere";

export async function datiGestione() {
  const { tipiCamera, camere, indisponibilita } = await datiGestioneCamere();
  return {
    tipiCamera: tipiCamera.map((t) => ({ id: t.id, codice: t.codice, descrizione: t.descrizione })),
    camere: camere.map((c) => ({
      id: c.id,
      codice: c.codice,
      tipoCameraId: c.tipoCameraId,
      tipoCameraNome: c.tipoCamera.descrizione,
      piano: c.piano,
      capienzaAdulti: c.capienzaAdulti,
      capienzaBambini: c.capienzaBambini,
      attivo: c.attivo,
    })),
    indisponibilita: indisponibilita.map((i) => ({
      id: i.id,
      cameraId: i.cameraId,
      cameraCodice: i.camera.codice,
      dal: i.dal.toISOString().slice(0, 10),
      al: i.al.toISOString().slice(0, 10),
      motivo: i.motivo,
    })),
  };
}

export async function azioneCreaTipoCamera(codice: string, descrizione: string) {
  await creaTipoCamera(codice, descrizione);
  return datiGestione();
}

export async function azioneCreaCamera(input: { codice: string; tipoCameraId: number; piano: string; capienzaAdulti: number; capienzaBambini: number }) {
  await creaCamera({ ...input, piano: input.piano || undefined });
  return datiGestione();
}

export async function azioneCambiaTipoCamera(cameraId: number, nuovoTipoCameraId: number) {
  await cambiaTipoCamera(cameraId, nuovoTipoCameraId);
  return datiGestione();
}

export async function azioneImpostaCameraAttiva(cameraId: number, attivo: boolean) {
  await impostaCameraAttiva(cameraId, attivo);
  return datiGestione();
}

export async function azioneCreaIndisponibilita(input: { cameraId: number; dal: string; al: string; motivo: string }) {
  await creaIndisponibilita(input);
  return datiGestione();
}

export async function azioneEliminaIndisponibilita(id: number) {
  await eliminaIndisponibilita(id);
  return datiGestione();
}
