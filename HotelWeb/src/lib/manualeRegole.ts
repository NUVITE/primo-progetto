/**
 * Manuale (operativo e tecnico): lettura dei capitoli in Markdown, regole pure usabili anche dalle pagine.
 *
 * Ogni capitolo è un file .md in docs/manuale/<operativo|tecnico>/ con un'intestazione:
 *   ---
 *   titolo: Planning e prenotazioni
 *   ordine: 30
 *   permessi: prenotazioni.vedi, sale.vedi   (basta uno; vuoto = tutti)
 *   moduli: pulizie                          (tutti accesi; vuoto = nessun modulo richiesto)
 *   fornitore: si                            (solo per il gestore della piattaforma)
 *   ---
 * Il testo usa un Markdown ridotto (niente librerie esterne): titoli #/##/###, paragrafi, elenchi
 * con - o 1., **grassetto**, *corsivo*, `codice`, [collegamenti](/pagina), blocchi di codice ```,
 * note con > e tabelle semplici | a | b |.
 */

export type Capitolo = {
  slug: string;
  titolo: string;
  ordine: number;
  permessi: string[];
  moduli: string[];
  fornitore: boolean;
  testo: string;
};

/** Intestazione e testo di un file .md; il nome del file (senza .md e senza numero iniziale) è lo slug. */
export function leggiCapitolo(nomeFile: string, contenuto: string): Capitolo {
  const pulito = contenuto.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(pulito);
  const campi = new Map<string, string>();
  for (const riga of (m?.[1] ?? "").split("\n")) {
    const i = riga.indexOf(":");
    if (i > 0) campi.set(riga.slice(0, i).trim(), riga.slice(i + 1).trim());
  }
  const lista = (k: string) => (campi.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const slug = nomeFile.replace(/\.md$/, "").replace(/^\d+-/, "");
  return {
    slug,
    titolo: campi.get("titolo") || slug,
    ordine: Number(campi.get("ordine")) || 999,
    permessi: lista("permessi"),
    moduli: lista("moduli"),
    fornitore: /^(si|sì|true)$/i.test(campi.get("fornitore") ?? ""),
    testo: m ? pulito.slice(m[0].length) : pulito,
  };
}

/** Il capitolo è per questo utente? (fornitore, almeno uno dei permessi, tutti i moduli accesi) */
export function capitoloVisibile(c: Pick<Capitolo, "permessi" | "moduli" | "fornitore">, u: { superAdmin: boolean; permessi: readonly string[]; moduli: readonly string[] }) {
  if (u.superAdmin) return true;
  if (c.fornitore) return false;
  if (c.permessi.length && !c.permessi.some((p) => u.permessi.includes(p))) return false;
  return c.moduli.every((m) => u.moduli.includes(m));
}

// ---- Markdown ridotto ----

export type Inline = { tipo: "testo" | "grassetto" | "corsivo" | "codice"; testo: string } | { tipo: "link"; testo: string; href: string };
export type Blocco =
  | { tipo: "titolo"; livello: 1 | 2 | 3; testo: Inline[]; ancora: string }
  | { tipo: "paragrafo"; testo: Inline[] }
  | { tipo: "elenco"; numerato: boolean; voci: Inline[][] }
  | { tipo: "codice"; testo: string }
  | { tipo: "nota"; testo: Inline[] }
  | { tipo: "tabella"; intestazioni: Inline[][]; righe: Inline[][][] }
  | { tipo: "video"; src: string; didascalia: string };

/** Ancora di un titolo: "Il conto e la cassa" -> "il-conto-e-la-cassa". */
export const ancora = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Testo in linea: **grassetto**, *corsivo*, `codice`, [testo](indirizzo). */
export function inline(s: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*([^*]+)\*/g;
  let ultimo = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > ultimo) out.push({ tipo: "testo", testo: s.slice(ultimo, m.index) });
    if (m[1] !== undefined) out.push({ tipo: "grassetto", testo: m[1] });
    else if (m[2] !== undefined) out.push({ tipo: "codice", testo: m[2] });
    else if (m[3] !== undefined) out.push({ tipo: "link", testo: m[3], href: m[4] });
    else out.push({ tipo: "corsivo", testo: m[5] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < s.length) out.push({ tipo: "testo", testo: s.slice(ultimo) });
  return out;
}

const celle = (riga: string) => riga.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));

/** Riga di un video dimostrativo: "@video nome Didascalia" (nome solo lettere minuscole, cifre e trattini). */
const RIGA_VIDEO = /^@video\s+([a-z0-9-]+)(?:\s+(.*))?$/;

export function markdown(testo: string): Blocco[] {
  const righe = testo.replace(/\r\n/g, "\n").split("\n");
  const blocchi: Blocco[] = [];
  let i = 0;
  while (i < righe.length) {
    const r = righe[i];
    if (!r.trim()) {
      i++;
      continue;
    }
    if (r.startsWith("```")) {
      const corpo: string[] = [];
      i++;
      while (i < righe.length && !righe[i].startsWith("```")) corpo.push(righe[i++]);
      i++;
      blocchi.push({ tipo: "codice", testo: corpo.join("\n") });
      continue;
    }
    const t = /^(#{1,3})\s+(.*)$/.exec(r);
    if (t) {
      blocchi.push({ tipo: "titolo", livello: t[1].length as 1 | 2 | 3, testo: inline(t[2].trim()), ancora: ancora(t[2]) });
      i++;
      continue;
    }
    // Video dimostrativo: "@video nome Didascalia" mostra public/video/nome.webm (solo nomi semplici).
    const vid = RIGA_VIDEO.exec(r.trim());
    if (vid) {
      blocchi.push({ tipo: "video", src: `/video/${vid[1]}.webm`, didascalia: (vid[2] ?? "").trim() });
      i++;
      continue;
    }
    if (r.startsWith(">")) {
      const parti: string[] = [];
      while (i < righe.length && righe[i].startsWith(">")) parti.push(righe[i++].replace(/^>\s?/, ""));
      blocchi.push({ tipo: "nota", testo: inline(parti.join(" ")) });
      continue;
    }
    if (r.trim().startsWith("|") && i + 1 < righe.length && /^\s*\|?\s*:?-{3,}/.test(righe[i + 1])) {
      const intestazioni = celle(r);
      i += 2;
      const corpo: Inline[][][] = [];
      while (i < righe.length && righe[i].trim().startsWith("|")) corpo.push(celle(righe[i++]));
      blocchi.push({ tipo: "tabella", intestazioni, righe: corpo });
      continue;
    }
    const voce = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
    if (voce.test(r)) {
      const numerato = /^\s*\d+\./.test(r);
      const voci: Inline[][] = [];
      let corrente = "";
      while (i < righe.length && (voce.test(righe[i]) || (righe[i].startsWith("  ") && righe[i].trim()))) {
        const v = voce.exec(righe[i]);
        if (v) {
          if (corrente) voci.push(inline(corrente));
          corrente = v[3];
        } else corrente += ` ${righe[i].trim()}`;
        i++;
      }
      if (corrente) voci.push(inline(corrente));
      blocchi.push({ tipo: "elenco", numerato, voci });
      continue;
    }
    const parti: string[] = [];
    while (i < righe.length && righe[i].trim() && !/^(#{1,3}\s|```|>|\s*([-*]|\d+\.)\s|\s*\|)/.test(righe[i]) && !RIGA_VIDEO.test(righe[i].trim())) parti.push(righe[i++].trim());
    blocchi.push({ tipo: "paragrafo", testo: inline(parti.join(" ")) });
  }
  return blocchi;
}

/** Testo semplice (per la ricerca): senza simboli del Markdown. */
export const testoSemplice = (md: string) =>
  md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^@video\s+\S+/gm, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*`>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
