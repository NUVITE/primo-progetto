/**
 * Regole di piatti e menu: dati e funzioni pure, usabili anche dalle pagine (niente database).
 */
import { ALLERGENI, REGIMI, nomeVoce, type CodiceAllergene, type Regime, type VoceNota } from "@/lib/allergeni";
import { PASTI, type Pasto } from "@/lib/pastiRegole";

export const CATEGORIE_PIATTO = {
  colazione: "Colazione",
  antipasti: "Antipasti",
  primi: "Primi",
  secondi: "Secondi",
  contorni: "Contorni",
  pizze: "Pizze",
  dessert: "Dolci e frutta",
  bevande: "Bevande",
  vini: "Vini",
  altro: "Altro",
} as const;
export type Categoria = keyof typeof CATEGORIE_PIATTO;
export const ORDINE_CATEGORIE = Object.keys(CATEGORIE_PIATTO) as Categoria[];

/** Numero dell'allergene nell'Allegato II del Reg. UE 1169/2011 (1–14), usato nella legenda dei menu. */
export const numeroAllergene = (c: string) => ALLERGENI.findIndex((a) => a.codice === c) + 1;

export type PiattoInput = {
  nome: string;
  descrizione: string;
  categoria: Categoria;
  prezzo: number | null;
  repartoId: number | null;
  allergeni: CodiceAllergene[];
  senzaAllergeni: boolean;
  regimi: Regime[];
  attivo: boolean;
};

const CODICI = new Set<string>(ALLERGENI.map((a) => a.codice));

export function validaPiatto(d: PiattoInput) {
  const nome = d.nome.trim();
  if (!nome) throw new Error("Indica il nome del piatto.");
  if (nome.length > 120) throw new Error("Nome troppo lungo (massimo 120 caratteri).");
  if (!(d.categoria in CATEGORIE_PIATTO)) throw new Error("Scegli la categoria.");
  if (d.prezzo !== null && !(d.prezzo >= 0)) throw new Error("Prezzo non valido.");
  const allergeni = ALLERGENI.map((a) => a.codice).filter((c) => d.allergeni.includes(c));
  if (d.allergeni.some((c) => !CODICI.has(c))) throw new Error("Allergene non valido.");
  // Gli allergeni sono un obbligo di legge: o si indicano, o si conferma che non ce ne sono.
  if (!allergeni.length && !d.senzaAllergeni) throw new Error("Indica gli allergeni del piatto oppure conferma che non contiene nessuno dei 14 allergeni.");
  const regimi = [...new Set(d.regimi)].filter((r) => r in REGIMI);
  return {
    nome,
    descrizione: d.descrizione.trim() || null,
    categoria: d.categoria,
    prezzo: d.prezzo,
    repartoId: d.repartoId,
    allergeni,
    senzaAllergeni: allergeni.length === 0,
    regimi,
    attivo: d.attivo,
  };
}

export type TestataMenu = { nome: string; pasti: Pasto[]; giorno: string | null; dalle: string; alle: string; roomService: boolean; attivo: boolean; note: string };

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validaTestataMenu(d: TestataMenu) {
  const nome = d.nome.trim();
  if (!nome) throw new Error("Indica il nome del menu.");
  const pasti = [...new Set(d.pasti)].filter((p) => p in PASTI);
  if (d.giorno && !/^\d{4}-\d{2}-\d{2}$/.test(d.giorno)) throw new Error("Giorno non valido.");
  for (const o of [d.dalle, d.alle]) if (o && !ORA.test(o)) throw new Error("Orari nel formato ore:minuti (es. 19:30).");
  if (d.dalle && d.alle && d.dalle >= d.alle) throw new Error("L'orario di fine deve venire dopo quello di inizio.");
  return { nome, pasti, giorno: d.giorno || null, dalle: d.dalle || null, alle: d.alle || null, roomService: d.roomService, attivo: d.attivo, note: d.note.trim() || null };
}

/**
 * Piatti da evitare per una persona: quelli che contengono un allergene che ha dichiarato (allergia
 * o intolleranza). Gli alimenti scritti a mano non si possono confrontare in automatico.
 */
export function piattiDaEvitare(voci: VoceNota[], piatti: { nome: string; allergeni: string[] }[]) {
  const suoi = new Map(voci.filter((v) => v.codice).map((v) => [v.codice as string, v.tipo]));
  return piatti
    .map((p) => {
      const motivi = p.allergeni.filter((a) => suoi.has(a));
      if (!motivi.length) return null;
      return {
        piatto: p.nome,
        allergia: motivi.some((a) => suoi.get(a) === "allergia"),
        motivi: motivi.map((a) => nomeVoce({ codice: a as CodiceAllergene, tipo: "allergia" }).toLowerCase()),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

/** Riassunto di un menu: servizi, room service, giorno, orari. */
export const descriviMenu = (m: { pasti: Pasto[]; giorno: string | null; dalle: string; alle: string; roomService: boolean }) =>
  [
    m.pasti.map((p) => PASTI[p].toLowerCase()).join(", "),
    m.roomService ? "room service" : "",
    m.giorno ? `solo il ${m.giorno.split("-").reverse().join("/")}` : "sempre",
    m.dalle && m.alle ? `${m.dalle}–${m.alle}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
