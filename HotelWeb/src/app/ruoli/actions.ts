"use server";

import { conEsito } from "@/lib/esito";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI, type Permesso } from "@/lib/permessi";
import { creaRuolo, elencoRuoli, eliminaRuolo, impostaPermessiRuolo, rinominaRuolo } from "@/lib/ruoli";

export async function datiRuoli() {
  const chi = await richiediPermesso(PERMESSI.RUOLI_GESTISCI);
  return {
    hotelNome: chi.hotelNome,
    sonoSuperAdmin: chi.superAdmin,
    permessiMiei: chi.permessi,
    moduli: chi.moduli,
    ruoli: await elencoRuoli(chi),
  };
}

export async function azioneCreaRuolo(nome: string, permessi: Permesso[]) {
  return conEsito(async () => {
    await creaRuolo(await richiediPermesso(PERMESSI.RUOLI_GESTISCI), nome, permessi);
    return datiRuoli();
  });
}

export async function azioneRinominaRuolo(ruoloId: number, nome: string) {
  return conEsito(async () => {
    await rinominaRuolo(await richiediPermesso(PERMESSI.RUOLI_GESTISCI), ruoloId, nome);
    return datiRuoli();
  });
}

export async function azioneImpostaPermessi(ruoloId: number, permessi: Permesso[]) {
  return conEsito(async () => {
    await impostaPermessiRuolo(await richiediPermesso(PERMESSI.RUOLI_GESTISCI), ruoloId, permessi);
    return datiRuoli();
  });
}

export async function azioneEliminaRuolo(ruoloId: number) {
  return conEsito(async () => {
    await eliminaRuolo(await richiediPermesso(PERMESSI.RUOLI_GESTISCI), ruoloId);
    return datiRuoli();
  });
}
