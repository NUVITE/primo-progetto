/** Stati e priorità delle segnalazioni di guasto (dati puri, usabili anche dalle pagine). */
export const STATI_SEGNALAZIONE = { aperta: "Aperta", in_lavorazione: "In lavorazione", risolta: "Risolta", annullata: "Annullata" } as const;
export type StatoSegnalazione = keyof typeof STATI_SEGNALAZIONE;
export const SEGNALAZIONI_APERTE: StatoSegnalazione[] = ["aperta", "in_lavorazione"];
export const PRIORITA = { normale: "Normale", urgente: "Urgente" } as const;
export type Priorita = keyof typeof PRIORITA;
