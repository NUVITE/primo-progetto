/**
 * Regole dello stato di pulizia delle camere: dati e funzioni pure, usabili anche dalle pagine.
 */

export const STATI_PULIZIA = {
  da_pulire: { testo: "Da pulire", aiuto: "Dopo una partenza: pulizia completa", colore: "bg-red-500", tono: "rosso" },
  da_rifare: { testo: "Da rifare", aiuto: "Camera occupata (fermata): riassetto del giorno", colore: "bg-amber-500", tono: "ambra" },
  in_pulizia: { testo: "In pulizia", aiuto: "La cameriera ci sta lavorando", colore: "bg-sky-500", tono: "blu" },
  da_controllare: { testo: "Da controllare", aiuto: "Pulita, aspetta il controllo della governante", colore: "bg-violet-500", tono: "viola" },
  pronta: { testo: "Pronta", aiuto: "Pulita e controllata", colore: "bg-emerald-500", tono: "verde" },
} as const;
export type StatoPulizia = keyof typeof STATI_PULIZIA;
export const ELENCO_STATI_PULIZIA = Object.keys(STATI_PULIZIA) as StatoPulizia[];

/**
 * Occupazione della camera oggi, come risulta alla reception:
 *  - libera: nessun soggiorno;  - in_arrivo: arriva oggi e non è ancora arrivato;
 *  - fermata: ospiti in casa che restano;  - in_partenza: ospiti in casa che partono oggi;
 *  - partita: gli ospiti sono partiti oggi (camera libera, da pulire).
 */
export const OCCUPAZIONI = {
  libera: "Libera",
  in_arrivo: "In arrivo",
  fermata: "Occupata",
  in_partenza: "In partenza",
  partita: "Partiti oggi",
} as const;
export type Occupazione = keyof typeof OCCUPAZIONI;

/** Per la reception la camera è occupata adesso (ospiti in casa). */
export const occupataPerReception = (o: Occupazione) => o === "fermata" || o === "in_partenza";

/**
 * Stato da mostrare: una camera occupata che resta (fermata) e risulta "pronta" da un giorno
 * precedente torna "da rifare" (il riassetto è di ogni giorno), senza nessun processo notturno.
 */
export function statoEffettivo(salvato: string, salvatoIl: string | null, oggi: string, occupazione: Occupazione): StatoPulizia {
  const s = (salvato in STATI_PULIZIA ? salvato : "pronta") as StatoPulizia;
  if (occupazione === "fermata" && s === "pronta" && (!salvatoIl || salvatoIl < oggi)) return "da_rifare";
  return s;
}

/** Stato dopo «Finita»: con il controllo della governante passa da "da controllare". */
export const statoDopoPulizia = (controlloGovernante: boolean): StatoPulizia => (controlloGovernante ? "da_controllare" : "pronta");

/** Discrepanza fra rapporto della governante e reception (null = coincidono). */
export function discrepanza(occupazione: Occupazione, trovata: "occupata" | "libera") {
  const perReception = occupataPerReception(occupazione);
  if (perReception && trovata === "libera") return "Risulta occupata ma la camera è libera: l'ospite è forse partito senza check-out?";
  if (!perReception && trovata === "occupata") return "Risulta libera ma la camera è occupata: c'è qualcuno non registrato o un check-out fatto per sbaglio?";
  return null;
}
