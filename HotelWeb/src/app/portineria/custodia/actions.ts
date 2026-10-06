"use server";

import { richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { apriCustodia, chiaviFuori, depositaBagagli, elencoBagagli, elencoValori, impostaChiavi, movimentoCustodia, ritiraBagagli, type CustodiaInput } from "@/lib/custodia";
import { ospitiPerMessaggi } from "@/lib/messaggi";
import type { BagagliInput, TipoMovimentoValori } from "@/lib/custodiaRegole";

const permesso = () => richiediPermesso(PERMESSI.PORTINERIA);

async function carica(u: UtenteSessione) {
  const [bagagli, valori, chiavi, ospiti] = await Promise.all([elencoBagagli(u.hotelId), elencoValori(u.hotelId), chiaviFuori(u.hotelId), ospitiPerMessaggi(u.hotelId)]);
  // Una riga per prenotazione per scegliere l'ospite.
  const prenotazioni = [...new Map(ospiti.map((o) => [o.prenotazioneId, o])).values()];
  return { bagagli, valori, chiavi, prenotazioni };
}

export async function datiCustodia() {
  return carica(await permesso());
}

export async function azioneDepositaBagagli(d: BagagliInput) {
  return conEsito(async () => {
    const u = await permesso();
    const r = await depositaBagagli(u.hotelId, d, u.nome);
    return { ...r, dati: await carica(u) };
  });
}

export async function azioneRitiraBagagli(id: number, numero: number, nota: string) {
  return conEsito(async () => {
    const u = await permesso();
    await ritiraBagagli(u.hotelId, id, numero, nota, u.nome);
    return { dati: await carica(u) };
  });
}

export async function azioneApriCustodia(d: CustodiaInput) {
  return conEsito(async () => {
    const u = await permesso();
    const r = await apriCustodia(u.hotelId, d, u.nome);
    return { ...r, dati: await carica(u) };
  });
}

export async function azioneMovimentoValori(id: number, tipo: Exclude<TipoMovimentoValori, "deposito">, descrizione: string, importo: number | null) {
  return conEsito(async () => {
    const u = await permesso();
    await movimentoCustodia(u.hotelId, id, tipo, descrizione, importo, u.nome);
    return { dati: await carica(u) };
  });
}

export async function azioneChiavi(segmentoId: number, consegnate: number, restituite: number) {
  return conEsito(async () => {
    const u = await permesso();
    await impostaChiavi(u.hotelId, segmentoId, consegnate, restituite);
    return { dati: await carica(u) };
  });
}
