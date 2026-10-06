/** Agenda del portiere: tipi di servizio, stati e controlli (dati e funzioni pure, usabili anche dalle pagine). */

export const TIPI_SERVIZIO = {
  taxi: "Taxi",
  transfer: "Transfer",
  ristorante: "Ristorante",
  biglietti: "Biglietti (spettacoli, eventi)",
  escursione: "Escursione o visita",
  altro: "Altro",
} as const;
export type TipoServizio = keyof typeof TIPI_SERVIZIO;

export const STATI_SERVIZIO = { da_confermare: "Da confermare", confermato: "Confermato", fatto: "Fatto", annullato: "Annullato" } as const;
export type StatoServizio = keyof typeof STATI_SERVIZIO;

/** Da quale stato si può passare a quale (un servizio fatto o annullato non si riapre). */
export const PASSAGGI: Record<StatoServizio, StatoServizio[]> = {
  da_confermare: ["confermato", "fatto", "annullato"],
  confermato: ["fatto", "annullato", "da_confermare"],
  fatto: [],
  annullato: [],
};

export type ServizioInput = {
  prenotazioneId: number | null;
  destinatario: string;
  tipo: TipoServizio;
  giorno: string;
  ora: string;
  persone: number | null;
  dettagli: string;
  fornitore: string;
  riferimento: string;
};

export function validaServizio(d: ServizioInput) {
  if (!(d.tipo in TIPI_SERVIZIO)) throw new Error("Scegli il tipo di servizio.");
  if (!d.prenotazioneId && !d.destinatario.trim()) throw new Error("Scegli l'ospite o scrivi per chi è.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.giorno) || !/^\d{2}:\d{2}$/.test(d.ora)) throw new Error("Indica giorno e ora.");
  if (d.persone !== null && !(Number.isInteger(d.persone) && d.persone > 0 && d.persone <= 99)) throw new Error("Numero di persone non valido.");
  if (d.tipo === "altro" && !d.dettagli.trim()) throw new Error("Scrivi di che servizio si tratta.");
  if (d.dettagli.length > 1000) throw new Error("Dettagli troppo lunghi (massimo 1000 caratteri).");
}

/** Esito di una sveglia: fatta, oppure l'ospite non risponde (resta da rifare, con la nota). */
export const ESITI_SVEGLIA = { fatta: "Fatta", non_risponde: "Non risponde" } as const;
export type EsitoSveglia = keyof typeof ESITI_SVEGLIA;
