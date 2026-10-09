/** Agenzie: allotment, release e voucher (dati e funzioni pure, usabili anche dalle pagine). */

const giorni = (da: string, a: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / 86400000);

/**
 * Camere dell'allotment ancora bloccate per una notte: quelle non usate dall'agenzia, finché non si
 * arriva al release (N giorni prima della notte le camere non usate tornano in vendita).
 */
export function bloccateNotte(camere: number, usate: number, notte: string, oggi: string, releaseGiorni: number) {
  if (giorni(oggi, notte) < releaseGiorni) return 0;
  return Math.max(0, camere - usate);
}

/** Giorno del release di una notte (da quel giorno le camere non usate tornano in vendita). */
export const giornoRelease = (notte: string, releaseGiorni: number) => new Date(Date.parse(`${notte}T00:00:00Z`) - releaseGiorni * 86400000).toISOString().slice(0, 10);

/** Cosa copre il voucher dell'agenzia e come si divide il conto (regola del conto diviso). */
export const VOUCHER_COPRE = {
  soggiorno: { testo: "Camere e trattamento (extra e tassa a carico dell'ospite)", regola: "predefinita" },
  tutto: { testo: "Tutto (anche gli extra)", regola: "tutto_cliente" },
} as const;
export type VoucherCopre = keyof typeof VOUCHER_COPRE;

/** Commissione dell'agenzia su un importo, in percentuale (arrotondata al centesimo). */
export const commissione = (importo: number, percentuale: number | null) => (percentuale ? Math.round(importo * percentuale) / 100 : 0);
