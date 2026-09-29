/** Codici fissi Alloggiati Web, usabili anche lato client (nessun accesso al database). */

/** Tipi di alloggiato: 5 codici fissi del tracciato (tabella ufficiale TIPO_ALLOGGIATO). */
export const TIPI_ALLOGGIATO: { codice: number; descrizione: string; documento: boolean }[] = [
  { codice: 16, descrizione: "Ospite singolo", documento: true },
  { codice: 17, descrizione: "Capofamiglia", documento: true },
  { codice: 18, descrizione: "Capogruppo", documento: true },
  { codice: 19, descrizione: "Familiare", documento: false },
  { codice: 20, descrizione: "Membro del gruppo", documento: false },
];

/** Codice Polizia dello stato ITALIA (tabella STATI). */
export const CODICE_ITALIA = "100000100";
