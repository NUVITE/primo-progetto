"use server";

import { conEsito } from "@/lib/esito";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import {
  aggiungiUtente,
  cambiaRuoloUtente,
  datiGestioneUtenti,
  impostaAttivoUtente,
  impostaSuperAdmin,
  rimuoviDaHotel,
} from "@/lib/utenti";

export async function datiUtenti() {
  const chi = await richiediPermesso(PERMESSI.UTENTI_GESTISCI);
  const { accessi, ruoli, superAdmin } = await datiGestioneUtenti(chi);
  return {
    hotelNome: chi.hotelNome,
    ioId: chi.id,
    sonoSuperAdmin: chi.superAdmin,
    ruoli: ruoli.map((r) => ({ id: r.id, nome: r.nome })),
    utenti: accessi.map((a) => ({
      id: a.utente.id,
      nome: a.utente.nome,
      email: a.utente.email,
      attivo: a.utente.attivo,
      ruoloId: a.ruoloId,
    })),
    superAdmin: superAdmin.map((u) => ({ id: u.id, nome: u.nome, email: u.email, attivo: u.attivo })),
  };
}

export async function azioneAggiungiUtente(input: { nome: string; email: string; password: string; ruoloId: number }) {
  return conEsito(async () => {
    await aggiungiUtente(await richiediPermesso(PERMESSI.UTENTI_GESTISCI), input);
    return datiUtenti();
  });
}

export async function azioneCambiaRuolo(utenteId: number, ruoloId: number) {
  return conEsito(async () => {
    await cambiaRuoloUtente(await richiediPermesso(PERMESSI.UTENTI_GESTISCI), utenteId, ruoloId);
    return datiUtenti();
  });
}

export async function azioneRimuoviDaHotel(utenteId: number) {
  return conEsito(async () => {
    await rimuoviDaHotel(await richiediPermesso(PERMESSI.UTENTI_GESTISCI), utenteId);
    return datiUtenti();
  });
}

export async function azioneImpostaAttivo(utenteId: number, attivo: boolean) {
  return conEsito(async () => {
    await impostaAttivoUtente(await richiediPermesso(PERMESSI.UTENTI_GESTISCI), utenteId, attivo);
    return datiUtenti();
  });
}

export async function azioneImpostaSuperAdmin(utenteId: number, superAdmin: boolean) {
  return conEsito(async () => {
    await impostaSuperAdmin(await richiediPermesso(PERMESSI.UTENTI_GESTISCI), utenteId, superAdmin);
    return datiUtenti();
  });
}
