/**
 * Funzioni del nucleo che una struttura può spegnere ("essenziale a vista, il resto a richiesta"):
 * spente spariscono da menu e maschere, i dati restano e si riaccendono in ogni momento. Si salvano le
 * funzioni SPENTE: le strutture esistenti (lista vuota) hanno tutto acceso come prima.
 * Dati e funzioni pure, usabili anche dalle pagine.
 */

export const FUNZIONI = {
  gruppi: { nome: "Gruppi", descrizione: "Prenotazioni di gruppo con un nome comune (scuole, comitive, squadre)" },
  agenzie: { nome: "Agenzie e allotment", descrizione: "Camere riservate alle agenzie, voucher, estratto conto con le commissioni" },
  uso_diurno: { nome: "Uso diurno", descrizione: "Camera usata solo di giorno, senza pernottamento" },
  preventivi: { nome: "Richieste e preventivi", descrizione: "Richieste di disponibilità e preventivi online con accettazione" },
} as const;
export type Funzione = keyof typeof FUNZIONI;

/** Normalizza il valore salvato (Json): solo codici noti. */
export function funzioniSpente(salvate: unknown): Funzione[] {
  return Array.isArray(salvate) ? salvate.filter((f): f is Funzione => typeof f === "string" && f in FUNZIONI) : [];
}

export const funzioneAttiva = (spente: readonly string[], f: Funzione) => !spente.includes(f);

/** Prima lettera maiuscola ("camere" -> "Camere"), per i titoli e le voci di menu. */
export const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Testi con i segnaposto delle unità: {camera}, {camere}, {Camera}, {Camere} diventano "camera" o
 * "appartamento" secondo la tipologia della struttura; {Le mie} concorda ("Le mie camere", "I miei
 * appartamenti").
 */
export function conUnita(testo: string, unita: { singolare: string; plurale: string; femminile?: boolean }) {
  const femminile = unita.femminile ?? true;
  return testo
    .replaceAll("{Le mie}", femminile ? "Le mie" : "I miei")
    .replaceAll("{camera}", unita.singolare)
    .replaceAll("{camere}", unita.plurale)
    .replaceAll("{Camera}", maiuscola(unita.singolare))
    .replaceAll("{Camere}", maiuscola(unita.plurale));
}
