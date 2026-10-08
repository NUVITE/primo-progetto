/** Scheda ospite: regole pure (doppioni, consenso marketing, ospite abituale), usabili anche dalle pagine. */

/** Da quanti soggiorni passati un ospite è "abituale" (con uno solo è "già ospite da noi"). */
export const SOGGIORNI_ABITUALE = 2;

export const MODI_CONSENSO = {
  modulo: "Modulo firmato",
  email: "Per email",
  voce: "A voce (al banco o al telefono)",
  web: "Dal sito",
} as const;
export type ModoConsenso = keyof typeof MODI_CONSENSO;

export const FILTRI_OSPITI = {
  tutti: "Tutti",
  abituali: "Abituali",
  riguardo: "Di riguardo",
  marketing: "Con consenso marketing",
  doppioni: "Possibili doppioni",
} as const;
export type FiltroOspiti = keyof typeof FILTRI_OSPITI;

/** "Già ospite da noi" / "Ospite abituale" in base ai soggiorni passati. */
export function etichettaRitorno(soggiorni: number) {
  if (soggiorni >= SOGGIORNI_ABITUALE) return `Ospite abituale (${soggiorni} soggiorni)`;
  if (soggiorni === 1) return "Già ospite da noi (1 soggiorno)";
  return null;
}

/** Nome confrontabile: minuscolo, senza accenti, apostrofi, spazi e segni ("D'Angelo" = "dangelo"). */
export const normalizza = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const soloCifre = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").replace(/^(0039|39)(?=\d{9,})/, "");

export type OspitePerDoppioni = {
  id: number;
  nome: string;
  cognome: string;
  dataNascita: string | null;
  email: string | null;
  telefono: string | null;
  documentoNumero: string | null;
};
export type CoppiaDoppia = { a: number; b: number; motivi: string[] };

/**
 * Coppie di schede che sembrano la stessa persona. Lo stesso nome conta solo se le date di nascita
 * non sono diverse (padre e figlio omonimi restano distinti); anche nome e cognome scambiati.
 * Stessa email o stesso telefono contano solo con lo stesso cognome (in famiglia si condividono);
 * lo stesso documento basta da solo.
 */
export function trovaDoppioni(ospiti: OspitePerDoppioni[]): CoppiaDoppia[] {
  const coppie = new Map<string, CoppiaDoppia>();
  const aggiungi = (x: OspitePerDoppioni, y: OspitePerDoppioni, motivo: string) => {
    const [a, b] = x.id < y.id ? [x.id, y.id] : [y.id, x.id];
    const k = `${a}-${b}`;
    const c = coppie.get(k) ?? { a, b, motivi: [] };
    if (!c.motivi.includes(motivo)) c.motivi.push(motivo);
    coppie.set(k, c);
  };
  const perChiave = (chiave: (o: OspitePerDoppioni) => string, motivo: string, ok: (x: OspitePerDoppioni, y: OspitePerDoppioni) => boolean) => {
    const gruppi = new Map<string, OspitePerDoppioni[]>();
    for (const o of ospiti) {
      const k = chiave(o);
      if (!k) continue;
      gruppi.set(k, [...(gruppi.get(k) ?? []), o]);
    }
    for (const g of gruppi.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (ok(g[i], g[j])) aggiungi(g[i], g[j], motivo);
  };
  const nascitaCompatibile = (x: OspitePerDoppioni, y: OspitePerDoppioni) => !x.dataNascita || !y.dataNascita || x.dataNascita === y.dataNascita;
  const stessoCognome = (x: OspitePerDoppioni, y: OspitePerDoppioni) => normalizza(x.cognome) === normalizza(y.cognome);
  // Nome e cognome (in qualunque ordine): la chiave ordina le due parti.
  perChiave(
    (o) => (normalizza(o.nome) && normalizza(o.cognome) ? [normalizza(o.nome), normalizza(o.cognome)].sort().join("|") : ""),
    "stesso nome e cognome",
    nascitaCompatibile,
  );
  perChiave((o) => (o.email ?? "").trim().toLowerCase(), "stessa email", (x, y) => stessoCognome(x, y) && nascitaCompatibile(x, y));
  perChiave((o) => (soloCifre(o.telefono).length >= 6 ? soloCifre(o.telefono) : ""), "stesso telefono", (x, y) => stessoCognome(x, y) && nascitaCompatibile(x, y));
  perChiave((o) => normalizza(o.documentoNumero), "stesso documento", () => true);
  return [...coppie.values()].sort((x, y) => x.a - y.a || x.b - y.b);
}

/** Testo unito di due campi liberi (note, preferenze) senza ripetere lo stesso testo. */
export function unisciTesti(a: string | null, b: string | null) {
  const x = (a ?? "").trim();
  const y = (b ?? "").trim();
  if (!y || x.includes(y)) return x || null;
  if (!x || y.includes(x)) return y;
  return `${x}\n${y}`;
}
