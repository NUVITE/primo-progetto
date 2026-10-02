"use server";

import { richiediPermesso } from "@/lib/auth";
import { eliminaCliente, elencoClienti, salvaCliente, type DatiCliente } from "@/lib/clienti";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";

// Anagrafica condivisa da ricevimento e sale: basta uno dei due permessi di gestione.
const permesso = () => richiediPermesso([PERMESSI.PRENOTAZIONI_GESTISCI, PERMESSI.SALE_GESTISCI]);

export async function datiClienti() {
  const u = await permesso();
  return elencoClienti(u.hotelId);
}

export async function azioneSalvaCliente(id: number | null, d: DatiCliente) {
  return conEsito(async () => {
    const u = await permesso();
    const nuovoId = await salvaCliente(u.hotelId, id, d);
    return { id: nuovoId, clienti: await elencoClienti(u.hotelId) };
  });
}

export async function azioneEliminaCliente(id: number) {
  return conEsito(async () => {
    const u = await permesso();
    await eliminaCliente(u.hotelId, id);
    return elencoClienti(u.hotelId);
  });
}
