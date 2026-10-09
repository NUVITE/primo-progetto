/**
 * Regole dei pasti compresi nel soggiorno (funzioni pure, usabili anche dalle pagine).
 * Per N notti il trattamento dà N colazioni, N pranzi e N cene:
 *  - cena: dal giorno di arrivo alla sera prima della partenza;
 *  - colazione: dalla mattina dopo l'arrivo a quella della partenza;
 *  - pranzo: dal giorno dopo l'arrivo a quello della partenza ("la pensione completa inizia con la
 *    cena del giorno di arrivo e termina con il pranzo del giorno di partenza").
 * In mezza pensione si può avere il pranzo al posto della cena (pastoPrincipale = "pranzo").
 */

export const PASTI = { colazione: "Colazione", pranzo: "Pranzo", cena: "Cena" } as const;
export type Pasto = keyof typeof PASTI;
export const ELENCO_PASTI = Object.keys(PASTI) as Pasto[];

export type PastiTrattamento = { colazione: boolean; pranzo: boolean; cena: boolean };

/** Mezza pensione: colazione più uno solo fra pranzo e cena (allora si può scambiare). */
export const pastoScambiabile = (t: PastiTrattamento) => t.pranzo !== t.cena;

/** Pasti effettivi del soggiorno: quelli del trattamento, con l'eventuale scambio pranzo/cena. */
export function pastiEffettivi(t: PastiTrattamento, pastoPrincipale: string | null): PastiTrattamento {
  if (!pastoScambiabile(t) || (pastoPrincipale !== "pranzo" && pastoPrincipale !== "cena")) return t;
  return { colazione: t.colazione, pranzo: pastoPrincipale === "pranzo", cena: pastoPrincipale === "cena" };
}

/** Il pasto è compreso quel giorno? Date "aaaa-mm-gg" (confronto fra stringhe). */
export function pastoCompreso(pasto: Pasto, giorno: string, arrivo: string, partenza: string, t: PastiTrattamento) {
  if (!t[pasto] || giorno < arrivo || giorno > partenza || arrivo >= partenza) return false;
  if (pasto === "cena") return giorno < partenza;
  return giorno > arrivo;
}

/** Quanti pasti compresi in tutto il soggiorno (per la spiegazione e i controlli). */
export function contaPasti(arrivo: string, partenza: string, t: PastiTrattamento) {
  const conta = { colazione: 0, pranzo: 0, cena: 0 } as Record<Pasto, number>;
  for (let g = arrivo; g <= partenza; g = new Date(Date.parse(`${g}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)) {
    for (const p of ELENCO_PASTI) if (pastoCompreso(p, g, arrivo, partenza, t)) conta[p] += 1;
  }
  return conta;
}
