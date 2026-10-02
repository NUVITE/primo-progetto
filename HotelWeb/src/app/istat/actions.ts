"use server";

import { puo, richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { fileSpot, giorniPendenti, inviaGiorniRoss1000, oggiItalia, segnaCaricatiSpot, situazioneIstat } from "@/lib/movimentoIstat";

const persone = (l: { nome: string; prenotazioneId: number }[]) => l.map((s) => ({ nome: s.nome, prenotazioneId: s.prenotazioneId }));

/** Pagina ISTAT: i giorni del mese scelto ("aaaa-mm") e quelli ancora da comunicare. */
export async function datiIstat(mese?: string) {
  const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
  // Di default il mese di ieri: l'ultimo giorno comunicabile (il 1° del mese il mese corrente è ancora vuoto).
  const ieri = new Date(Date.parse(`${oggiItalia()}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 7);
  const m = mese && /^\d{4}-\d{2}$/.test(mese) ? mese : ieri;
  const [y, mm] = m.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, mm, 0)).toISOString().slice(0, 10);
  const [situazione, { pendenti }] = await Promise.all([situazioneIstat(u.hotelId, `${m}-01`, ultimo), giorniPendenti(u.hotelId)]);
  const { cfg } = situazione;
  const oggi = oggiItalia();
  return {
    mese: m,
    sistema: cfg.sistema,
    primoGiorno: cfg.primoGiorno,
    credenzialiRoss: !!cfg.ross1000.codice && !!cfg.ross1000.utente && cfg.ross1000.passwordImpostata,
    puoConfigurare: puo(u, PERMESSI.HOTEL_CONFIGURA),
    pendenti: {
      giorni: pendenti.map((g) => g.giorno),
      scaduti: pendenti.filter((g) => g.scadenza < oggi).length,
      primaScadenza: pendenti.reduce<string | null>((x, g) => (!x || g.scadenza < x ? g.scadenza : x), null),
      // Una persona intestataria di più camere comparirebbe più volte: una riga per persona e giorno.
      incompleti: [
        ...new Map(pendenti.flatMap((g) => g.incompleti.map((i) => [`${g.giorno}|${i.prenotazioneId}|${i.nome}`, { ...i, giorno: g.giorno }]))).values(),
      ],
    },
    giorni: situazione.giorni.map((g) => ({
      giorno: g.giorno,
      aperto: g.aperto,
      camereDisponibili: g.camereDisponibili,
      lettiDisponibili: g.lettiDisponibili,
      camereOccupate: g.camereOccupate,
      presenti: g.presenti,
      arrivi: persone(g.arrivi),
      partenze: persone(g.partenze),
      incompleti: g.incompleti,
      avvisi: g.avvisi,
      stato: g.stato,
      scadenza: g.scadenza,
      inviatoIl: g.inviatoIl,
      inviatoDa: g.inviatoDa,
      scarti: g.scarti,
      erroreInvio: g.erroreInvio,
    })),
  };
}

export async function azioneInviaRoss1000(mese: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
    const esito = await inviaGiorniRoss1000(u.hotelId, u.nome);
    return { esito, dati: await datiIstat(mese) };
  });
}

export async function azioneFileSpot() {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
    return fileSpot(u.hotelId);
  });
}

export async function azioneSegnaCaricati(giorni: string[], mese: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
    await segnaCaricatiSpot(u.hotelId, giorni, u.nome);
    return datiIstat(mese);
  });
}

export async function azioneMese(mese: string) {
  return conEsito(() => datiIstat(mese));
}
