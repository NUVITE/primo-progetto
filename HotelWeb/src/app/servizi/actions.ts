"use server";

import { conEsito } from "@/lib/esito";
import {
  creaServizioCatalogo,
  eliminaServizioCatalogo,
  elencoServiziCatalogo,
  impostaAttivoServizioCatalogo,
  modificaServizioCatalogo,
} from "@/lib/servizi";
import { richiediRuolo } from "@/lib/auth";

async function hotelAmministrato() {
  const utente = await richiediRuolo(["ADMIN"]);
  return utente.hotelId;
}

export async function datiGestioneServizi() {
  const hotelId = await hotelAmministrato();
  const servizi = await elencoServiziCatalogo(hotelId);
  return {
    servizi: servizi.map((s) => ({ id: s.id, nome: s.nome, prezzo: Number(s.prezzo), attivo: s.attivo })),
  };
}

export async function azioneCreaServizio(input: { nome: string; prezzo: number }) {
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

export async function azioneModificaServizioCatalogo(id: number, input: { nome: string; prezzo: number }) {
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
