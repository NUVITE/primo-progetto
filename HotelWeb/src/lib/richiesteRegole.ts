/** Tipi di richiesta degli ospiti (dati puri, usabili anche dalle pagine). */
export const TIPI_RICHIESTA = {
  asciugamani: "Asciugamani in più",
  cuscino: "Cuscino in più",
  coperta: "Coperta in più",
  culla: "Culla o lettino",
  prodotti: "Prodotti da bagno",
  sveglia: "Sveglia",
  altro: "Altro",
} as const;
export type TipoRichiesta = keyof typeof TIPI_RICHIESTA;
export const STATI_RICHIESTA = { aperta: "In attesa", fatta: "Fatta", annullata: "Annullata" } as const;
export const STATI_OGGETTO = { in_deposito: "In deposito", restituito: "Restituito", smaltito: "Smaltito" } as const;
