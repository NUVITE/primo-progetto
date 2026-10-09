/**
 * Statistiche: indicatori e calcoli puri, usabili anche dalle pagine.
 * - Occupazione: notti vendute / camere disponibili (camere attive meno fuori servizio, notte per notte).
 * - Prezzo medio a notte (ADR): ricavo delle notti / notti vendute.
 * - Ricavo per camera disponibile (RevPAR): ricavo delle notti / camere disponibili.
 * Gli importi sono quelli del conto, IVA inclusa; il prezzo della notte comprende il trattamento.
 */

const arrotonda = (n: number, cifre = 2) => Math.round(n * 10 ** cifre) / 10 ** cifre;

export function indicatori(vendute: number, disponibili: number, ricavo: number | null) {
  return {
    occupazione: disponibili ? arrotonda((vendute / disponibili) * 100, 1) : 0,
    prezzoMedio: ricavo !== null && vendute ? arrotonda(ricavo / vendute) : null,
    ricavoPerDisponibile: ricavo !== null && disponibili ? arrotonda(ricavo / disponibili) : null,
  };
}

/** Giorni da dal ad al compresi (aaaa-mm-gg). */
export function giorni(dal: string, al: string) {
  const out: string[] = [];
  const d = new Date(`${dal}T00:00:00Z`);
  const fine = new Date(`${al}T00:00:00Z`);
  while (d <= fine) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Stesso giorno dell'anno prima (il 29 febbraio diventa il 28). */
export function annoPrima(g: string) {
  const [a, m, d] = g.split("-").map(Number);
  const giorno = m === 2 && d === 29 ? 28 : d;
  return `${a - 1}-${String(m).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
}

/** Variazione percentuale rispetto a prima (null se prima era zero o manca). */
export const variazione = (ora: number | null, prima: number | null) => (ora === null || prima === null || prima === 0 ? null : arrotonda(((ora - prima) / prima) * 100, 1));

export const MAX_GIORNI = 400;

export function controllaPeriodo(dal: string, al: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dal) || !/^\d{4}-\d{2}-\d{2}$/.test(al) || dal > al) throw new Error("Periodo non valido.");
  if (giorni(dal, al).length > MAX_GIORNI) throw new Error(`Periodo troppo lungo: al massimo ${MAX_GIORNI} giorni.`);
}

/**
 * File CSV per Excel in italiano: separatore punto e virgola, virgola decimale, BOM iniziale perché
 * Excel riconosca le lettere accentate.
 */
export function csv(righe: (string | number | null)[][]) {
  const cella = (v: string | number | null) => {
    if (v === null) return "";
    const s = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + righe.map((r) => r.map(cella).join(";")).join("\r\n");
}

const MINUSCOLE = new Set(["di", "del", "della", "dei", "delle", "e", "ed"]);

/** Nomi degli stati dalle tabelle della Polizia (in maiuscolo): "STATI UNITI D'AMERICA" -> "Stati Uniti d'America". */
export function nomeLeggibile(nome: string) {
  return nome
    .toLowerCase()
    .split(" ")
    .map((p, i) => {
      if (i > 0 && MINUSCOLE.has(p)) return p;
      const a = p.indexOf("'");
      if (a > 0 && a < p.length - 1) return `${i > 0 ? p.slice(0, a + 1) : p.charAt(0).toUpperCase() + p.slice(1, a + 1)}${p.charAt(a + 1).toUpperCase()}${p.slice(a + 2)}`;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}
