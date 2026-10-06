/**
 * Tipologie di struttura ricettiva (dati puri, usabili anche dalle pagine). In Puglia: alberghi e
 * residenze turistico-alberghiere; extralberghiere della l.r. 11/1999 (affittacamere, case e
 * appartamenti per vacanze, residence, case per ferie; modificata dalla l.r. 9/2025); B&B della
 * l.r. 27/2013; agriturismi con disciplina propria. Ostelli e campeggi non sono gestiti (si vende il
 * posto letto o la piazzola, non la camera).
 * La tipologia adatta il programma (nomi delle unità, profilo proposto): non certifica la
 * classificazione, che resta quella autorizzata dal comune.
 */

type Unita = { singolare: string; plurale: string };
const CAMERA: Unita = { singolare: "camera", plurale: "camere" };
const APPARTAMENTO: Unita = { singolare: "appartamento", plurale: "appartamenti" };

export const TIPOLOGIE = {
  albergo: { nome: "Albergo / hotel", gruppo: "alberghiera", unita: CAMERA },
  rta: { nome: "Residenza turistico-alberghiera", gruppo: "alberghiera", unita: APPARTAMENTO },
  bb: { nome: "B&B (bed and breakfast)", gruppo: "extralberghiera", unita: CAMERA },
  affittacamere: { nome: "Affittacamere", gruppo: "extralberghiera", unita: CAMERA },
  casa_vacanze: { nome: "Case e appartamenti per vacanze", gruppo: "extralberghiera", unita: APPARTAMENTO },
  residence: { nome: "Residence", gruppo: "extralberghiera", unita: APPARTAMENTO },
  casa_per_ferie: { nome: "Casa per ferie", gruppo: "extralberghiera", unita: CAMERA },
  agriturismo: { nome: "Agriturismo", gruppo: "agrituristica", unita: CAMERA },
} as const satisfies Record<string, { nome: string; gruppo: string; unita: Unita }>;

export type Tipologia = keyof typeof TIPOLOGIE;

export const GRUPPI_TIPOLOGIA = { alberghiera: "Strutture alberghiere", extralberghiera: "Strutture extralberghiere", agrituristica: "Agriturismo" } as const;

export function tipologiaValida(valore: string): Tipologia {
  if (!(valore in TIPOLOGIE)) throw new Error("Tipologia della struttura non prevista.");
  return valore as Tipologia;
}

/** Nome della tipologia (anche per valori vecchi o sconosciuti: si mostra il codice). */
export const nomeTipologia = (valore: string) => (valore in TIPOLOGIE ? TIPOLOGIE[valore as Tipologia].nome : valore);

/** Come si chiamano le unità che si affittano: "camera/camere" o "appartamento/appartamenti". */
export const unitaDi = (valore: string): Unita => (valore in TIPOLOGIE ? TIPOLOGIE[valore as Tipologia].unita : CAMERA);
