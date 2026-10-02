"use server";

import { conEsito } from "@/lib/esito";
import {
  creaServizioCatalogo,
  eliminaServizioCatalogo,
  elencoServiziCatalogo,
  impostaAttivoServizioCatalogo,
  impostaAliquotaServizio,
  modificaServizioCatalogo,
  type DatiServizioCatalogo,
} from "@/lib/servizi";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";

async function hotelAmministrato() {
  const utente = await richiediPermesso(PERMESSI.LISTINI_GESTISCI);
  return utente.hotelId;
}

export async function datiGestioneServizi() {
  const hotelId = await hotelAmministrato();
  const servizi = await elencoServiziCatalogo(hotelId);
  return {
    servizi: servizi.map((s) => ({
      id: s.id,
      nome: s.nome,
      prezzo: Number(s.prezzo),
      addebito: s.addebito as DatiServizioCatalogo["addebito"],
      effetto: s.effetto as DatiServizioCatalogo["effetto"],
      attivo: s.attivo,
      aliquotaIva: s.aliquotaIva === null ? null : Number(s.aliquotaIva),
    })),
  };
}

export async function azioneCreaServizio(input: DatiServizioCatalogo) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await creaServizioCatalogo(hotelId, input);
    return datiGestioneServizi();
  });
}

export async function azioneImpostaAttivoServizio(id: number, attivo: boolean) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await impostaAttivoServizioCatalogo(hotelId, id, attivo);
    return datiGestioneServizi();
  });
}

export async function azioneModificaServizioCatalogo(id: number, input: DatiServizioCatalogo) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await modificaServizioCatalogo(hotelId, id, input);
    return datiGestioneServizi();
  });
}

export async function azioneEliminaServizioCatalogo(id: number) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await eliminaServizioCatalogo(hotelId, id);
    return datiGestioneServizi();
  });
}

export async function azioneAliquotaServizio(id: number, aliquota: number | null) {
  return conEsito(async () => {
    const hotelId = await hotelAmministrato();
    await impostaAliquotaServizio(hotelId, id, aliquota);
    return datiGestioneServizi();
  });
}
