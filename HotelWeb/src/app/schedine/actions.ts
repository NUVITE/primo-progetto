"use server";

import { puo, richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { aggiornaRicevute, controllaSchedine, fileSchedine, inviaSchedine, schedineDaInviare, segnaInviateDaFile, statoCredenziali, storicoAlloggiati } from "@/lib/alloggiati";

export async function datiSchedine() {
  const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
  // Le ricevute dei giorni passati si scaricano qui, senza bloccare la pagina se la Polizia non risponde.
  const ricevute = await aggiornaRicevute(u.hotelId).then(
    (n) => ({ scaricate: n, errore: null as string | null }),
    (e) => ({ scaricate: 0, errore: e instanceof Error ? e.message : String(e) }),
  );
  const [pendenti, storico, credenziali] = await Promise.all([schedineDaInviare(u.hotelId), storicoAlloggiati(u.hotelId), statoCredenziali(u.hotelId)]);
  return {
    pendenti: pendenti.map(({ riga: _riga, ...r }) => ({ ...r, pronta: !!_riga })),
    storico,
    credenzialiPresenti: !!credenziali.utente && credenziali.passwordImpostata && credenziali.wskeyImpostata,
    puoConfigurare: puo(u, PERMESSI.HOTEL_CONFIGURA),
    erroreRicevute: ricevute.errore && !ricevute.errore.startsWith("Credenziali") ? ricevute.errore : null,
  };
}

export async function azioneInvia() {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
    const esito = await inviaSchedine(u.hotelId, u.nome);
    return { esito, dati: await datiSchedine() };
  });
}

export async function azioneFile() {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
    return fileSchedine(u.hotelId);
  });
}

export async function azioneSegnaInviate(presenzaIds: number[]) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
    await segnaInviateDaFile(u.hotelId, presenzaIds, u.nome);
    return datiSchedine();
  });
}

export async function azioneControlla() {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
    return controllaSchedine(u.hotelId);
  });
}
