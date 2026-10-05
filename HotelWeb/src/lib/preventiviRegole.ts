/** Richieste di disponibilità e preventivi: dati puri, usabili anche dalle pagine. */

// Come è arrivata la richiesta (gli stessi "mezzi" della provenienza delle prenotazioni).
export const CANALI_RICHIESTA = { telefono: "Telefono", email: "Email", web: "Sito web", persona: "Di persona", altro: "Altro" } as const;
export type CanaleRichiesta = keyof typeof CANALI_RICHIESTA;

export const STATI_RICHIESTA_DISP = {
  nuova: "Da preparare",
  preventivo: "Preventivo inviato",
  accettata: "Accettata",
  rifiutata: "Rifiutata",
  scaduta: "Scaduta",
} as const;
export type StatoRichiestaDisp = keyof typeof STATI_RICHIESTA_DISP;

export const STATI_PREVENTIVO = {
  bozza: "Da inviare",
  inviato: "Inviato",
  visto: "Visto dall'ospite",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
  scaduto: "Scaduto",
} as const;
export type StatoPreventivo = keyof typeof STATI_PREVENTIVO;

/** Perché la richiesta non è diventata una prenotazione (per le statistiche). */
export const MOTIVI_RINUNCIA = {
  prezzo: "Prezzo troppo alto",
  date: "Date non disponibili",
  altro_hotel: "Ha scelto un'altra struttura",
  nessuna_risposta: "Nessuna risposta",
  rinvio: "Ha rinviato il viaggio",
  altro: "Altro",
} as const;
export type MotivoRinuncia = keyof typeof MOTIVI_RINUNCIA;

export const MAX_PROPOSTE = 3;

/** Disponibilità di un tipo per un periodo: il minimo delle camere libere notte per notte. */
export function camereLibere(camere: number, occupatePerNotte: number[]) {
  return occupatePerNotte.length ? Math.max(0, camere - Math.max(...occupatePerNotte)) : camere;
}

/** Tasso di conversione in percentuale (0 se non ci sono richieste). */
export const conversione = (accettate: number, totale: number) => (totale ? Math.round((accettate / totale) * 1000) / 10 : 0);
