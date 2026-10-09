/**
 * Regole delle politiche di cancellazione, senza database (usabili anche nelle pagine).
 * Politiche di cancellazione dell'hotel e penale proposta all'annullamento. La politica si COPIA
 * nella prenotazione quando nasce (Prenotazione.politica): vale quella accettata dal cliente anche
 * se poi l'hotel la cambia. Senza politica la penale resta da decidere a mano, come prima.
 */

export type TipoPenale = "nessuna" | "notti" | "percentuale" | "importo";
export type Penale = { tipo: TipoPenale; valore: number };
export type Scaglione = Penale & { oreMin: number };
export type DatiPolitica = { nome: string; scaglioni: Scaglione[]; noShow: Penale };
export type PoliticaCopiata = DatiPolitica & { id: number };

const TIPI: TipoPenale[] = ["nessuna", "notti", "percentuale", "importo"];

/** Modelli pronti da aggiungere con un clic (l'hotel li modifica come vuole). */
export const MODELLI_POLITICA: DatiPolitica[] = [
  {
    nome: "Standard 48/24 ore",
    scaglioni: [
      { oreMin: 48, tipo: "nessuna", valore: 0 },
      { oreMin: 24, tipo: "notti", valore: 1 },
      { oreMin: 0, tipo: "percentuale", valore: 100 },
    ],
    noShow: { tipo: "percentuale", valore: 100 },
  },
  {
    nome: "Non rimborsabile",
    scaglioni: [{ oreMin: 0, tipo: "percentuale", valore: 100 }],
    noShow: { tipo: "percentuale", valore: 100 },
  },
];

export function descriviPenale(p: Penale) {
  if (p.tipo === "nessuna" || !p.valore) return "nessuna penale";
  if (p.tipo === "notti") return p.valore === 1 ? "la prima notte" : `le prime ${p.valore} notti`;
  if (p.tipo === "percentuale") return p.valore >= 100 ? "l'intero soggiorno" : `il ${p.valore}% del soggiorno`;
  return `${p.valore.toFixed(2).replace(".", ",")} €`;
}

/** Frasi per conferme e schermate: "fino a 48 ore prima dell'arrivo: nessuna penale; …". */
export function descriviPolitica(p: DatiPolitica) {
  const ordinati = [...p.scaglioni].sort((a, b) => b.oreMin - a.oreMin);
  const righe = ordinati.map((s, i) => {
    const quando =
      ordinati.length === 1 && s.oreMin === 0
        ? "In caso di annullamento in qualsiasi momento"
        : i === 0
          ? `Annullando almeno ${s.oreMin} ore prima dell'arrivo`
          : s.oreMin === 0
            ? `Annullando meno di ${ordinati[i - 1].oreMin} ore prima`
            : `Annullando tra ${ordinati[i - 1].oreMin} e ${s.oreMin} ore prima`;
    return `${quando}: ${descriviPenale(s)}.`;
  });
  righe.push(`Mancato arrivo senza avviso: ${descriviPenale(p.noShow)}.`);
  return righe;
}

export function validaPolitica(d: DatiPolitica): DatiPolitica {
  const nome = d.nome.trim();
  if (!nome) throw new Error("Dai un nome alla politica.");
  const penale = (p: Penale, dove: string): Penale => {
    if (!TIPI.includes(p.tipo)) throw new Error(`${dove}: tipo di penale non valido.`);
    const valore = Number(p.valore) || 0;
    if (valore < 0) throw new Error(`${dove}: la penale non può essere negativa.`);
    if (p.tipo === "percentuale" && valore > 100) throw new Error(`${dove}: la percentuale non può superare 100.`);
    if (p.tipo === "notti" && !Number.isInteger(valore)) throw new Error(`${dove}: le notti sono un numero intero.`);
    return { tipo: p.tipo, valore: p.tipo === "nessuna" ? 0 : valore };
  };
  if (!d.scaglioni.length) throw new Error("Serve almeno uno scaglione.");
  const scaglioni = d.scaglioni
    .map((s, i) => ({ oreMin: Math.max(0, Math.round(Number(s.oreMin) || 0)), ...penale(s, `Scaglione ${i + 1}`) }))
    .sort((a, b) => b.oreMin - a.oreMin);
  if (new Set(scaglioni.map((s) => s.oreMin)).size !== scaglioni.length) throw new Error("Due scaglioni hanno lo stesso numero di ore.");
  if (scaglioni[scaglioni.length - 1].oreMin !== 0) throw new Error("L'ultimo scaglione deve valere fino all'arrivo (0 ore).");
  return { nome, scaglioni, noShow: penale(d.noShow, "Mancato arrivo") };
}

// ---------------- Penale proposta ----------------

/** Istante "giorno g alle hh:mm" in Italia (ora legale compresa). */
export function istanteItalia(giorno: string, ora: string) {
  const [h, m] = (/^\d{2}:\d{2}$/.test(ora) ? ora : "14:00").split(":").map(Number);
  const utc = Date.UTC(Number(giorno.slice(0, 4)), Number(giorno.slice(5, 7)) - 1, Number(giorno.slice(8, 10)), h, m);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const parti = Object.fromEntries(fmt.formatToParts(new Date(utc)).map((x) => [x.type, x.value]));
  const comeRoma = Date.UTC(Number(parti.year), Number(parti.month) - 1, Number(parti.day), Number(parti.hour), Number(parti.minute));
  return new Date(utc - (comeRoma - utc));
}

const arrotonda = (n: number) => Math.round(n * 100) / 100;

/**
 * Penale proposta per l'annullamento: dalla politica copiata nella prenotazione, in base alle ore che
 * mancano all'arrivo (giorno di arrivo all'orario di check-in) o al mancato arrivo. Un errore di
 * inserimento non ha penale. La base è il soggiorno (camere e servizi, senza tassa di soggiorno).
 */
export function calcolaPenale(
  politica: PoliticaCopiata | null,
  motivo: string,
  d: { arrivo: Date; adesso: Date; nottiPerData: { data: string; importo: number }[]; soggiorno: number },
): { importo: number | null; spiegazione: string } {
  if (motivo === "errore") return { importo: 0, spiegazione: "Errore di inserimento: nessuna penale." };
  if (!politica) return { importo: null, spiegazione: "Nessuna politica di cancellazione: decidi tu la penale." };
  const ore = Math.floor((d.arrivo.getTime() - d.adesso.getTime()) / 3_600_000);
  let regola: Penale;
  let quando: string;
  if (motivo === "no_show") {
    regola = politica.noShow;
    quando = "mancato arrivo";
  } else {
    const ordinati = [...politica.scaglioni].sort((a, b) => b.oreMin - a.oreMin);
    regola = ordinati.find((s) => ore >= s.oreMin) ?? ordinati[ordinati.length - 1];
    quando = ore >= 0 ? `annullata ${ore} ore prima dell'arrivo` : "annullata dopo l'orario di arrivo";
  }
  let importo = 0;
  if (regola.tipo === "notti") {
    const giorni = [...new Set(d.nottiPerData.map((n) => n.data))].sort().slice(0, regola.valore);
    importo = d.nottiPerData.filter((n) => giorni.includes(n.data)).reduce((t, n) => t + n.importo, 0);
  } else if (regola.tipo === "percentuale") importo = (d.soggiorno * regola.valore) / 100;
  else if (regola.tipo === "importo") importo = Math.min(regola.valore, d.soggiorno);
  return { importo: arrotonda(importo), spiegazione: `Politica «${politica.nome}», ${quando}: ${descriviPenale(regola)}.` };
}
