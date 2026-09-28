"use server";

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
  const hotelId = await hotelAmministrato();
  await creaServizioCatalogo(hotelId, input);
  return datiGestioneServizi();
}

export async function azioneImpostaAttivoServizio(id: number, attivo: boolean) {
  const hotelId = await hotelAmministrato();
  await impostaAttivoServizioCatalogo(hotelId, id, attivo);
  return datiGestioneServizi();
}

// In produzione Next.js nasconde il messaggio degli errori lanciati da una server action:
// l'errore di dominio (es. servizio gia' usato) va restituito come dato per arrivare all'utente.
type Esito = { dati: Awaited<ReturnType<typeof datiGestioneServizi>> } | { errore: string };

async function conEsito(fn: () => Promise<unknown>): Promise<Esito> {
  try {
    await fn();
  } catch (e) {
    return { errore: e instanceof Error ? e.message : "Errore imprevisto." };
  }
  return { dati: await datiGestioneServizi() };
}

export async function azioneModificaServizioCatalogo(id: number, input: { nome: string; prezzo: number }) {
  const hotelId = await hotelAmministrato();
  return conEsito(() => modificaServizioCatalogo(hotelId, id, input));
}

export async function azioneEliminaServizioCatalogo(id: number) {
  const hotelId = await hotelAmministrato();
  return conEsito(() => eliminaServizioCatalogo(hotelId, id));
}
