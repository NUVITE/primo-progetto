"use server";

import { conEsito } from "@/lib/esito";
import { impostaOpzioniTipoCamera,
  cambiaTipoCamera,
  creaCamera,
  creaIndisponibilita,
  creaTipoCamera,
  datiGestioneCamere,
  eliminaIndisponibilita,
  impostaCameraAttiva,
} from "@/lib/camere";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";

async function hotelAmministrato() {
  const utente = await richiediPermesso(PERMESSI.CAMERE_GESTISCI);
  return utente.hotelId;
}

export async function datiGestione() {
  const hotelId = await hotelAmministrato();
  const { tipiCamera, camere, indisponibilita } = await datiGestioneCamere(hotelId);
  return {
    tipiCamera: tipiCamera.map((t) => ({ id: t.id, codice: t.codice, descrizione: t.descrizione, lettiAggiuntiMax: t.lettiAggiuntiMax, animaliAmmessi: t.animaliAmmessi })),
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

export async function azioneOpzioniTipoCamera(id: number, lettiAggiuntiMax: number, animaliAmmessi: boolean) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await impostaOpzioniTipoCamera(hotelId, id, lettiAggiuntiMax, animaliAmmessi);
    return datiGestione();
  });
}

export async function azioneCreaTipoCamera(codice: string, descrizione: string) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await creaTipoCamera(hotelId, codice, descrizione);
    return datiGestione();
  });
}

export async function azioneCreaCamera(input: { codice: string; tipoCameraId: number; piano: string; capienzaAdulti: number; capienzaBambini: number }) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await creaCamera(hotelId, { ...input, piano: input.piano || undefined });
    return datiGestione();
  });
}

export async function azioneCambiaTipoCamera(cameraId: number, nuovoTipoCameraId: number) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await cambiaTipoCamera(hotelId, cameraId, nuovoTipoCameraId);
    return datiGestione();
  });
}

export async function azioneImpostaCameraAttiva(cameraId: number, attivo: boolean) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await impostaCameraAttiva(hotelId, cameraId, attivo);
    return datiGestione();
  });
}

export async function azioneCreaIndisponibilita(input: { cameraId: number; dal: string; al: string; motivo: string }) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await creaIndisponibilita(hotelId, input);
    return datiGestione();
  });
}

export async function azioneEliminaIndisponibilita(id: number) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await eliminaIndisponibilita(hotelId, id);
    return datiGestione();
  });
}
