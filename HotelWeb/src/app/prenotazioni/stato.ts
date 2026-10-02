/** Etichetta e colore dello stato di una prenotazione (elenco, dettaglio, planning). */
export const STATO_PRENOTAZIONE: Record<string, { testo: string; tono: "ambra" | "verde" | "neutro" }> = {
  OPZIONE: { testo: "Opzione", tono: "ambra" },
  CONFERMATA: { testo: "Confermata", tono: "verde" },
  ANNULLATA: { testo: "Annullata", tono: "neutro" },
};

export const statoPrenotazione = (s: string) => STATO_PRENOTAZIONE[s] ?? { testo: s, tono: "neutro" as const };
