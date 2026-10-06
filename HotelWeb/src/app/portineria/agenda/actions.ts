"use server";

import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { addebitaEsborso, agendaDelGiorno, camerePerSveglia, cambiaStatoServizio, creaServizio, creaSveglia, esitoSveglia } from "@/lib/agenda";
import { ospitiPerMessaggi } from "@/lib/messaggi";
import type { EsitoSveglia, ServizioInput, StatoServizio } from "@/lib/agendaRegole";

const permesso = () => richiediPermesso(PERMESSI.PORTINERIA);
const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

async function carica(u: UtenteSessione, giorno: string) {
  const [agenda, camere, ospiti] = await Promise.all([agendaDelGiorno(u.hotelId, giorno), camerePerSveglia(u.hotelId), ospitiPerMessaggi(u.hotelId)]);
  // Per i servizi basta una riga per prenotazione (chi ha prenotato o la prima persona).
  const prenotazioni = [...new Map(ospiti.map((o) => [o.prenotazioneId, o])).values()];
  return { ...agenda, camere, prenotazioni, puoAddebitare: puo(u, PERMESSI.ADDEBITI_REGISTRA) };
}

export async function datiAgenda(giorno?: string) {
  return carica(await permesso(), giorno && /^\d{4}-\d{2}-\d{2}$/.test(giorno) ? giorno : oggiItalia());
}

export async function azioneCaricaAgenda(giorno: string) {
  return conEsito(async () => carica(await permesso(), giorno));
}

export async function azioneCreaSveglia(giornoAgenda: string, cameraId: number, giorno: string, ora: string, dettaglio: string) {
  return conEsito(async () => {
    const u = await permesso();
    await creaSveglia(u.hotelId, cameraId, giorno, ora, dettaglio, u.nome);
    return carica(u, giornoAgenda);
  });
}

export async function azioneEsitoSveglia(giornoAgenda: string, id: number, esito: EsitoSveglia) {
  return conEsito(async () => {
    const u = await permesso();
    await esitoSveglia(u.hotelId, id, esito, u.nome);
    return carica(u, giornoAgenda);
  });
}

export async function azioneCreaServizio(giornoAgenda: string, d: ServizioInput) {
  return conEsito(async () => {
    const u = await permesso();
    await creaServizio(u.hotelId, d, u.nome);
    return carica(u, giornoAgenda);
  });
}

export async function azioneStatoServizio(giornoAgenda: string, id: number, stato: StatoServizio, riferimento: string, nota: string) {
  return conEsito(async () => {
    const u = await permesso();
    await cambiaStatoServizio(u.hotelId, id, stato, riferimento, nota, u.nome);
    return carica(u, giornoAgenda);
  });
}

export async function azioneEsborso(giornoAgenda: string, id: number, importo: number, descrizione: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADDEBITI_REGISTRA);
    await permesso();
    await addebitaEsborso(u.hotelId, id, importo, descrizione, u.nome);
    return carica(u, giornoAgenda);
  });
}
