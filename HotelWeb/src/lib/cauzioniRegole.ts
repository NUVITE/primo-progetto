/** Cauzione (deposito cauzionale): regole pure, usabili anche dalle pagine. */

/** Metodi con cui si incassa o si restituisce una cauzione (della carta non si salva nessun dato). */
// Stessi codici dei metodi di pagamento: la cassa li somma insieme per metodo.
export const METODI_CAUZIONE = { contanti: "Contanti", carta: "Carta di credito", bancomat: "Bancomat", bonifico: "Bonifico", assegno: "Assegno", altro: "Altro" } as const;
export type MetodoCauzione = keyof typeof METODI_CAUZIONE;

export const DESCRIZIONE_TRATTENUTA = "Risarcimento danni";
export const NOME_REPARTO_DANNI = "Risarcimento danni (cauzione)";

const arrotonda = (n: number) => Math.round(n * 100) / 100;

/** Cauzione proposta: somma di quella dei tipi delle camere della prenotazione. */
export const cauzioneProposta = (camere: { cauzione: number | null }[]) => arrotonda(camere.reduce((t, c) => t + (c.cauzione ?? 0), 0));

/** Restituzione: si restituisce l'importo meno la trattenuta (motivata), che non può superarlo. */
export function calcolaRestituzione(importo: number, trattenuta: number, motivo: string) {
  if (!(trattenuta >= 0)) throw new Error("La trattenuta non può essere negativa.");
  if (trattenuta > importo + 0.001) throw new Error("La trattenuta non può superare la cauzione.");
  if (trattenuta > 0 && !motivo.trim()) throw new Error("Scrivi il motivo della trattenuta (es. danno, oggetto mancante).");
  return { restituito: arrotonda(importo - trattenuta), trattenuta: arrotonda(trattenuta) };
}
