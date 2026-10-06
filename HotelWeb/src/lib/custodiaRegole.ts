/** Portineria, custodia: bagagli, valori in cassaforte, chiavi (dati e funzioni pure, usabili anche dalle pagine). */

export const MOVIMENTI_VALORI = {
  deposito: "Deposito",
  prelievo: "Prelievo",
  versamento: "Versamento",
  ritiro: "Ritiro di tutto",
} as const;
export type TipoMovimentoValori = keyof typeof MOVIMENTI_VALORI;

export const MAX_COLLI = 50;
export const MAX_CHIAVI = 20;

/** Contante ancora in custodia: depositi e versamenti in più, prelievi e ritiro in meno. */
export function saldoValori(movimenti: { tipo: string; importo: number | null }[]) {
  const s = movimenti.reduce((t, m) => t + (m.importo ?? 0) * (m.tipo === "deposito" || m.tipo === "versamento" ? 1 : -1), 0);
  return Math.round(s * 100) / 100;
}

export type BagagliInput = { prenotazioneId: number | null; nome: string; colli: number; descrizione: string; posizione: string };

export function validaBagagli(d: BagagliInput) {
  if (!d.prenotazioneId && !d.nome.trim()) throw new Error("Scegli l'ospite o scrivi il nome.");
  if (!(Number.isInteger(d.colli) && d.colli >= 1 && d.colli <= MAX_COLLI)) throw new Error(`Il numero di colli va da 1 a ${MAX_COLLI}.`);
}

/** Chiavi consegnate e restituite: interi da 0 a MAX_CHIAVI, mai più restituite che consegnate. */
export function validaChiavi(consegnate: number, restituite: number) {
  for (const n of [consegnate, restituite]) if (!(Number.isInteger(n) && n >= 0 && n <= MAX_CHIAVI)) throw new Error(`Le chiavi vanno da 0 a ${MAX_CHIAVI}.`);
  if (restituite > consegnate) throw new Error("Non si possono restituire più chiavi di quelle consegnate.");
}
