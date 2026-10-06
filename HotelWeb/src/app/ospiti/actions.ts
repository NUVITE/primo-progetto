"use server";

import { puo, richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { doppioniDi, elencoOspiti, impostaConsensoMarketing, salvaOspite, schedaOspite, unisciOspiti, type DatiOspite } from "@/lib/ospiti";
import { reclamiOspite } from "@/lib/reclami";
import { FILTRI_OSPITI, type FiltroOspiti, type ModoConsenso } from "@/lib/ospitiRegole";

// Dati personali degli ospiti: solo chi gestisce le prenotazioni.
const permesso = () => richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);

export async function datiOspiti(q: string, filtro: FiltroOspiti) {
  const u = await permesso();
  return elencoOspiti(u.hotelId, q, filtro in FILTRI_OSPITI ? filtro : "tutti");
}

export async function azioneCercaOspiti(q: string, filtro: FiltroOspiti) {
  return conEsito(() => datiOspiti(q, filtro));
}

export async function datiScheda(id: number) {
  const u = await permesso();
  const [scheda, doppioni] = await Promise.all([schedaOspite(u.hotelId, id), doppioniDi(u.hotelId, id)]);
  // Reclami dell'ospite (portineria): solo per chi li gestisce.
  const reclami = puo(u, PERMESSI.RECLAMI) ? await reclamiOspite(u.hotelId, id) : null;
  return { ...scheda, doppioni, reclami, puoUnire: puo(u, PERMESSI.OSPITI_UNISCI) };
}

export async function azioneSalvaOspite(id: number, d: DatiOspite) {
  return conEsito(async () => {
    const u = await permesso();
    await salvaOspite(u.hotelId, id, d);
    return datiScheda(id);
  });
}

export async function azioneConsensoMarketing(id: number, consenso: boolean, modo: ModoConsenso | null) {
  return conEsito(async () => {
    const u = await permesso();
    await impostaConsensoMarketing(u.hotelId, id, consenso, modo, u.nome);
    return datiScheda(id);
  });
}

/** Unisce "eliminato" nella scheda "tenuto" e restituisce la scheda che resta. */
export async function azioneUnisciOspiti(tenutoId: number, eliminatoId: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.OSPITI_UNISCI);
    const esito = await unisciOspiti(u.hotelId, tenutoId, eliminatoId, u.nome);
    return { ...esito, scheda: await datiScheda(tenutoId) };
  });
}
