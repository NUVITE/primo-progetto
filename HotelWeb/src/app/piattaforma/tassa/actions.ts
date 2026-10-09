"use server";

import { richiediSuperAdmin } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import {
  caricaVersione,
  eliminaVersione,
  nuovaVersione,
  salvaDatiVersione,
  salvaRegole,
  salvaTariffe,
  type DatiRegola,
  type DatiTariffa,
  type DatiVersione,
} from "@/lib/regolamentiTassa";

export async function azioneSalvaDati(id: number, dati: DatiVersione) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    await salvaDatiVersione(id, dati);
    return caricaVersione(id);
  });
}

export async function azioneSalvaTariffe(id: number, tariffe: DatiTariffa[]) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    await salvaTariffe(id, tariffe);
    return caricaVersione(id);
  });
}

export async function azioneSalvaRegole(id: number, regole: DatiRegola[]) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    await salvaRegole(id, regole);
    return caricaVersione(id);
  });
}

/** Restituisce l'id della nuova versione: la navigazione la fa il client (un redirect qui arriverebbe come errore). */
export async function azioneNuovaVersione(comuneId: number, validoDal: string, copiaDaId: number | null) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    return nuovaVersione(comuneId, validoDal, copiaDaId);
  });
}

export async function azioneEliminaVersione(id: number) {
  return conEsito(async () => {
    await richiediSuperAdmin();
    await eliminaVersione(id);
    return true;
  });
}
