/**
 * Allergeni, regimi alimentari e regole delle note alimentari: solo dati e funzioni pure, usabili
 * anche dalle pagine (nessun accesso al database).
 * I 14 allergeni sono quelli dell'Allegato II del Reg. UE 1169/2011 (stesso elenco per menu e piatti).
 */

export const ALLERGENI = [
  { codice: "glutine", nome: "Glutine", descrizione: "Cereali contenenti glutine (grano, segale, orzo, avena, farro, kamut)" },
  { codice: "crostacei", nome: "Crostacei", descrizione: "Crostacei e prodotti a base di crostacei" },
  { codice: "uova", nome: "Uova", descrizione: "Uova e prodotti a base di uova" },
  { codice: "pesce", nome: "Pesce", descrizione: "Pesce e prodotti a base di pesce" },
  { codice: "arachidi", nome: "Arachidi", descrizione: "Arachidi e prodotti a base di arachidi" },
  { codice: "soia", nome: "Soia", descrizione: "Soia e prodotti a base di soia" },
  { codice: "latte", nome: "Latte", descrizione: "Latte e prodotti a base di latte (incluso il lattosio)" },
  { codice: "frutta_guscio", nome: "Frutta a guscio", descrizione: "Mandorle, nocciole, noci, anacardi, pecan, noci del Brasile, pistacchi, noci macadamia" },
  { codice: "sedano", nome: "Sedano", descrizione: "Sedano e prodotti a base di sedano" },
  { codice: "senape", nome: "Senape", descrizione: "Senape e prodotti a base di senape" },
  { codice: "sesamo", nome: "Sesamo", descrizione: "Semi di sesamo e prodotti a base di sesamo" },
  { codice: "solfiti", nome: "Solfiti", descrizione: "Anidride solforosa e solfiti oltre 10 mg/kg o 10 mg/litro" },
  { codice: "lupini", nome: "Lupini", descrizione: "Lupini e prodotti a base di lupini" },
  { codice: "molluschi", nome: "Molluschi", descrizione: "Molluschi e prodotti a base di molluschi" },
] as const;
export type CodiceAllergene = (typeof ALLERGENI)[number]["codice"];

export const REGIMI = {
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  senza_maiale: "Senza maiale",
  halal: "Halal",
  kosher: "Kosher",
} as const;
export type Regime = keyof typeof REGIMI;

// Allergia: anche tracce possono essere pericolose. Intolleranza: va evitato, senza rischio immediato.
export const TIPI_VOCE = { allergia: "Allergia", intolleranza: "Intolleranza" } as const;
export type TipoVoce = keyof typeof TIPI_VOCE;

export const CONSENSI = {
  soggiorno: "Solo per questo soggiorno (cancellate 7 giorni dopo la partenza)",
  sempre: "Anche per i prossimi soggiorni",
} as const;
export const MODI_CONSENSO = { a_voce: "A voce, alla reception", modulo: "Modulo firmato", email: "Per email o messaggio" } as const;
export const GIORNI_CONSERVAZIONE = 7;

/** Una voce: uno dei 14 allergeni (codice) oppure un alimento scritto a mano (testo). */
export type VoceNota = { codice?: CodiceAllergene; testo?: string; tipo: TipoVoce };

export type NotaInput = {
  voci: VoceNota[];
  regimi: Regime[];
  esigenze: string;
  consenso: keyof typeof CONSENSI;
  consensoModo: keyof typeof MODI_CONSENSO;
  consensoDato: boolean;
};

const codici = new Set<string>(ALLERGENI.map((a) => a.codice));

/** Controlla e ripulisce i dati prima di salvarli. */
export function validaNota(d: NotaInput): Omit<NotaInput, "consensoDato"> {
  if (!d.consensoDato) throw new Error("Senza il consenso esplicito dell'ospite le note alimentari non si possono registrare.");
  if (!(d.consenso in CONSENSI)) throw new Error("Indica per quanto tempo vale il consenso.");
  if (!(d.consensoModo in MODI_CONSENSO)) throw new Error("Indica come è stato dato il consenso.");
  const viste = new Set<string>();
  const voci: VoceNota[] = [];
  for (const v of d.voci) {
    if (!(v.tipo in TIPI_VOCE)) throw new Error("Tipo non valido (allergia o intolleranza).");
    const testo = v.testo?.trim();
    if (v.codice) {
      if (!codici.has(v.codice)) throw new Error("Allergene non valido.");
      if (viste.has(v.codice)) continue;
      viste.add(v.codice);
      voci.push({ codice: v.codice, tipo: v.tipo });
    } else if (testo) {
      if (testo.length > 80) throw new Error("Scrivi l'alimento in poche parole (massimo 80 caratteri).");
      voci.push({ testo, tipo: v.tipo });
    }
  }
  const regimi = [...new Set(d.regimi)].filter((r) => r in REGIMI);
  const esigenze = d.esigenze.trim();
  if (esigenze.length > 500) throw new Error("Le altre esigenze sono troppo lunghe (massimo 500 caratteri).");
  if (!voci.length && !regimi.length && !esigenze) throw new Error("Non c'è niente da registrare.");
  return { voci, regimi, esigenze, consenso: d.consenso, consensoModo: d.consensoModo };
}

export const nomeVoce = (v: VoceNota) => (v.codice ? (ALLERGENI.find((a) => a.codice === v.codice)?.nome ?? v.codice) : (v.testo ?? ""));

/** Riassunto in una riga, allergie per prime (es. "ALLERGIA: arachidi, crostacei · intolleranza: latte · vegetariano"). */
export function sintesiNota(n: { voci: VoceNota[]; regimi: string[]; esigenze: string | null }) {
  const allergie = n.voci.filter((v) => v.tipo === "allergia").map(nomeVoce);
  const intolleranze = n.voci.filter((v) => v.tipo === "intolleranza").map(nomeVoce);
  const parti = [
    allergie.length ? `ALLERGIA: ${allergie.join(", ").toLowerCase()}` : "",
    intolleranze.length ? `intolleranza: ${intolleranze.join(", ").toLowerCase()}` : "",
    n.regimi.map((r) => (REGIMI[r as Regime] ?? r).toLowerCase()).join(", "),
    n.esigenze ?? "",
  ];
  return { testo: parti.filter(Boolean).join(" · "), allergie: allergie.length > 0 };
}
