/**
 * Arrivo autonomo (case vacanze, self check-in): regole pure, usabili anche dalle pagine.
 * Ogni unità ha le sue istruzioni (come arrivare, dove sono le chiavi) e un codice di accesso fisso;
 * un soggiorno può avere un codice suo che sostituisce quello dell'unità. Le istruzioni partono con
 * l'email "Istruzioni di arrivo", inviata a mano; un promemoria ricorda gli arrivi vicini senza email.
 */

/** Giorni prima dell'arrivo in cui il promemoria segnala le istruzioni non ancora inviate. */
export const GIORNI_PROMEMORIA = 3;

/** Modello di email delle istruzioni (chiave in MODELLI). */
export const MODELLO_ARRIVO = "arrivo";

const MAX_ISTRUZIONI = 5000;
const MAX_CODICE = 40;

/** Istruzioni dell'unità: testo libero; vuoto = nessuna. */
export function normalizzaIstruzioni(testo: string) {
  const t = testo.replace(/\r\n/g, "\n").trim();
  if (t.length > MAX_ISTRUZIONI) throw new Error(`Istruzioni troppo lunghe (al massimo ${MAX_ISTRUZIONI} caratteri).`);
  return t || null;
}

/** Codice di accesso: una riga sola, corta; vuoto = nessuno. */
export function normalizzaCodice(codice: string) {
  const c = codice.trim();
  if (/[\r\n]/.test(c)) throw new Error("Il codice di accesso va su una riga sola.");
  if (c.length > MAX_CODICE) throw new Error(`Codice di accesso troppo lungo (al massimo ${MAX_CODICE} caratteri).`);
  return c || null;
}

/** Codice valido per il soggiorno: il suo, altrimenti quello fisso dell'unità. */
export const codiceEffettivo = (soggiorno: string | null, unita: string | null) => soggiorno || unita || null;

export type UnitaArrivo = { nome: string; istruzioni: string | null; codice: string | null };

/**
 * Valori dei segnaposto {{istruzioni_arrivo}} e {{codice_accesso}}. Con una sola unità i testi vanno
 * così come sono; con più unità ciascuno porta il nome dell'unità. Vuoto = da completare a mano.
 */
export function testiArrivo(unita: UnitaArrivo[]) {
  const conIstruzioni = unita.filter((u) => u.istruzioni);
  const conCodice = unita.filter((u) => u.codice);
  const piu = unita.length > 1;
  return {
    istruzioni_arrivo: piu ? conIstruzioni.map((u) => `${u.nome}:\n${u.istruzioni}`).join("\n\n") : (conIstruzioni[0]?.istruzioni ?? ""),
    codice_accesso: piu ? conCodice.map((u) => `${u.nome}: ${u.codice}`).join(", ") : (conCodice[0]?.codice ?? ""),
  };
}

/** Un'unità ha qualcosa da comunicare per l'arrivo autonomo? */
export const haArrivoAutonomo = (u: { istruzioni: string | null; codice: string | null }) => !!(u.istruzioni || u.codice);
