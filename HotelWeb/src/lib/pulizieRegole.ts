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

// ---------------- Foglio di lavoro dei piani ----------------

/** Lavoro sulla camera: partenza = pulizia completa; fermata = riassetto (l'ospite resta). */
export const LAVORI = { partenza: "Partenza: pulizia completa", fermata: "Fermata: riassetto" } as const;
export type Lavoro = keyof typeof LAVORI;
/** Carico di lavoro per dividere le camere: una partenza vale il doppio di un riassetto. */
export const PESO_LAVORO: Record<Lavoro, number> = { partenza: 1, fermata: 0.5 };

/**
 * Biancheria di una camera fermata alla notte n del soggiorno (1 = primo mattino dopo l'arrivo):
 * si cambia ogni N notti; asciugamani ogni N notti oppure solo su richiesta (null).
 * In partenza si cambia sempre tutto.
 */
export function biancheria(lavoro: Lavoro, notte: number, lenzuolaOgni: number, asciugamaniOgni: number | null) {
  if (lavoro === "partenza") return { lenzuola: true, asciugamani: "cambio" as const };
  const tocca = (ogni: number) => ogni > 0 && notte > 0 && notte % ogni === 0;
  return {
    lenzuola: tocca(lenzuolaOgni),
    asciugamani: asciugamaniOgni === null ? ("su_richiesta" as const) : tocca(asciugamaniOgni) ? ("cambio" as const) : ("no" as const),
  };
}

/**
 * Proposta di divisione: camere in ordine di piano e numero (prima quelle con un arrivo oggi dentro
 * ogni piano), riempiendo una cameriera alla volta fino alla sua parte del carico. Così ognuna ha
 * camere vicine e il lavoro è pari.
 */
export function proponiDivisione<T extends { cameraId: number; piano: string | null; codice: string; lavoro: Lavoro; arrivoOggi: boolean }>(camere: T[], cameriere: number[]) {
  const risultato = new Map<number, number>();
  if (!cameriere.length) return risultato;
  const ordinate = [...camere].sort(
    (a, b) => (a.piano ?? "").localeCompare(b.piano ?? "", "it", { numeric: true }) || Number(b.arrivoOggi) - Number(a.arrivoOggi) || a.codice.localeCompare(b.codice, "it", { numeric: true }),
  );
  const totale = ordinate.reduce((t, c) => t + PESO_LAVORO[c.lavoro], 0);
  const quota = totale / cameriere.length;
  let i = 0;
  let carico = 0;
  for (const c of ordinate) {
    if (carico >= quota - 1e-9 && i < cameriere.length - 1) {
      i += 1;
      carico = 0;
    }
    risultato.set(c.cameraId, cameriere[i]);
    carico += PESO_LAVORO[c.lavoro];
  }
  return risultato;
}

/** Biancheria in parole per il foglio (es. "cambio lenzuola, asciugamani su richiesta"). */
export function testoBiancheria(c: { lavoro: Lavoro; lenzuola: boolean; asciugamani: "cambio" | "su_richiesta" | "no" }) {
  if (c.lavoro === "partenza") return "cambio completo";
  return [
    c.lenzuola ? "cambio lenzuola" : "lenzuola no",
    c.asciugamani === "cambio" ? "cambio asciugamani" : c.asciugamani === "su_richiesta" ? "asciugamani su richiesta" : "asciugamani no",
  ].join(", ");
}

/** Arrivo di oggi in parole (es. "Arrivo oggi verso le 15:00 · 2 ad., 1 bamb."). */
export function testoArrivo(c: { arrivoOggi: boolean; oraArrivo: string | null; personeInArrivo: { adulti: number; bambini: number; piccoli: number } | null }) {
  if (!c.arrivoOggi) return "";
  const p = c.personeInArrivo;
  const persone = p ? [`${p.adulti} ad.`, p.bambini ? `${p.bambini} bamb.` : "", p.piccoli ? `${p.piccoli} sotto i 3 anni` : ""].filter(Boolean).join(", ") : "";
  return `Arrivo oggi${c.oraArrivo ? ` verso le ${c.oraArrivo}` : ""}${persone ? ` · ${persone}` : ""}`;
}
