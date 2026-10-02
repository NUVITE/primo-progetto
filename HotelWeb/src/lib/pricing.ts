import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Motore unico di calcolo prezzo per notte. Va richiamato da ogni punto che
 * deve conoscere un prezzo (creazione segmento, estensione, report) — mai
 * ricalcolato con una copia locale della logica (era il problema del
 * sistema legacy: calcola_listino duplicata in 3 punti diversi).
 *
 * Regole (approvate 2026-09-30):
 * - listino "camera": prezzo del periodo per la camera + supplemento trattamento per persona;
 * - listino "persona": per ogni persona prezzo del periodo + supplemento trattamento, più il
 *   supplemento singola se in camera c'è una sola persona;
 * - prezzo del periodo: quello del weekend (se indicato) nelle notti weekend del listino;
 * - supplemento del trattamento: quello della stagione che comprende la notte (del tipo di camera o di
 *   tutti i tipi), altrimenti il generale;
 * - riduzioni per fascia d'età sulla quota della persona (prima regola che corrisponde); nei listini a
 *   camera una fascia può essere invece un SUPPLEMENTO (es. bambino nel letto aggiunto +20 €);
 * - gratuità dei gruppi: 1 ogni N paganti per notte sull'intera prenotazione, azzera le quote
 *   più alte (ricalcolaGratuita).
 */

export type Composizione = { adulti: number; etaBambini: number[] };
export type RigaDettaglio = { voce: string; importo: number };
export type DettaglioNotte = { righe: RigaDettaglio[]; lordo: number; quote: number[]; gratuita: number };

const ETA_ADULTO = 18;
const arrotonda = (n: number) => Math.round(n * 100) / 100;
const euro = (n: number) => `${n.toFixed(2)} €`;

/** Notti weekend predefinite: venerdì e sabato (giorni della settimana JS, 0 = domenica). */
export const WEEKEND_PREDEFINITO = [5, 6];
export function giorniWeekendDi(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6) : WEEKEND_PREDEFINITO;
}

export async function trovaPrezzoNotte(
  db: Db,
  listinoId: number,
  tipoCameraId: number,
  data: Date,
  giorniWeekend: number[] = WEEKEND_PREDEFINITO,
): Promise<{ prezzo: number; weekend: boolean } | null> {
  const periodo = await db.periodoTariffario.findFirst({
    where: {
      listinoId,
      tipoCameraId,
      dal: { lte: data },
      al: { gte: data },
    },
  });

  if (!periodo) return null;
  const weekend = periodo.prezzoWeekend !== null && giorniWeekend.includes(data.getUTCDay());
  return { prezzo: Number(weekend ? periodo.prezzoWeekend : periodo.prezzoNotte), weekend };
}

/** Tutte le date da [inizio, fine) — la data di fine è il giorno di check-out, non una notte. */
export function nottiTraDate(dataInizio: Date, dataFine: Date): Date[] {
  const notti: Date[] = [];
  const cursore = new Date(dataInizio);
  while (cursore < dataFine) {
    notti.push(new Date(cursore));
    cursore.setDate(cursore.getDate() + 1);
  }
  return notti;
}

/** Normalizza la composizione salvata su DB (etaBambini è Json). */
export function composizioneDi(s: { adulti: number; etaBambini: unknown }): Composizione {
  const eta = Array.isArray(s.etaBambini) ? s.etaBambini.filter((x): x is number => typeof x === "number" && x >= 0 && x < ETA_ADULTO) : [];
  return { adulti: Math.max(0, s.adulti), etaBambini: eta };
}

export function descriviComposizione(c: Composizione) {
  const a = `${c.adulti} ${c.adulti === 1 ? "adulto" : "adulti"}`;
  if (!c.etaBambini.length) return a;
  return `${a} + ${c.etaBambini.length} ${c.etaBambini.length === 1 ? "bambino" : "bambini"} (${c.etaBambini.join(", ")} anni)`;
}

/** Età compiuta a una data (per le riduzioni vale l'età all'arrivo). */
export function etaAl(nascita: Date, data: Date) {
  let eta = data.getUTCFullYear() - nascita.getUTCFullYear();
  const m = data.getUTCMonth() - nascita.getUTCMonth();
  if (m < 0 || (m === 0 && data.getUTCDate() < nascita.getUTCDate())) eta -= 1;
  return eta;
}

/**
 * Composizione reale di una camera dalle persone registrate (check-in): chi non ha la data di
 * nascita conta come adulto. Si confronta con quella prenotata per proporre il ricalcolo.
 */
export function composizioneReale(arrivo: Date, persone: { dataNascita: Date | null; dal: Date | null }[]) {
  const c: Composizione = { adulti: 0, etaBambini: [] };
  let senzaData = 0;
  for (const p of persone) {
    if (!p.dataNascita) {
      senzaData += 1;
      c.adulti += 1;
      continue;
    }
    const eta = etaAl(p.dataNascita, p.dal ?? arrivo);
    if (eta >= ETA_ADULTO) c.adulti += 1;
    else c.etaBambini.push(eta);
  }
  c.etaBambini.sort((a, b) => b - a);
  return { composizione: c, senzaData };
}

export function stessaComposizione(a: Composizione, b: Composizione) {
  const x = [...a.etaBambini].sort((m, n) => m - n).join(",");
  const y = [...b.etaBambini].sort((m, n) => m - n).join(",");
  return a.adulti === b.adulti && x === y;
}

export function verificaComposizione(c: Composizione) {
  if (!Number.isInteger(c.adulti) || c.adulti < 0) throw new Error("Numero di adulti non valido.");
  if (c.adulti + c.etaBambini.length < 1) throw new Error("In camera deve esserci almeno una persona.");
  for (const e of c.etaBambini) if (!Number.isInteger(e) || e < 0 || e >= ETA_ADULTO) throw new Error("Età dei bambini tra 0 e 17 anni.");
}

export async function regoleListino(db: Db, listinoId: number) {
  return db.listino.findUniqueOrThrow({
    where: { id: listinoId },
    include: {
      supplementiTrattamento: { include: { trattamento: true } },
      supplementiStagionali: { include: { trattamento: true }, orderBy: { dal: "asc" } },
      riduzioni: { orderBy: [{ etaDa: "asc" }, { id: "asc" }] },
    },
  });
}
export type RegoleListino = Awaited<ReturnType<typeof regoleListino>>;

/**
 * Prezzo di una notte per una camera con una composizione. mancante = nessun periodo copre la
 * notte: prezzo 0 e la notte resta segnata "mancante" (non blocca la prenotazione).
 */
export async function calcolaNotte(
  db: Db,
  regole: RegoleListino,
  tipoCameraId: number,
  data: Date,
  composizione: Composizione,
  trattamento: string
): Promise<{ mancante: true } | ({ mancante: false } & DettaglioNotte)> {
  const periodo = await trovaPrezzoNotte(db, regole.id, tipoCameraId, data, giorniWeekendDi(regole.giorniWeekend));
  if (!periodo) return { mancante: true };

  // Supplemento del trattamento: quello della stagione che comprende la notte (prima quello del tipo
  // di camera, poi quello valido per tutti i tipi), altrimenti il generale.
  const diStagione = regole.supplementiStagionali.filter((s) => s.trattamento.nome === trattamento && s.dal <= data && s.al >= data);
  const stagionale = diStagione.find((s) => s.tipoCameraId === tipoCameraId) ?? diStagione.find((s) => s.tipoCameraId === null);
  const supplemento = Number(stagionale?.importo ?? regole.supplementiTrattamento.find((s) => s.trattamento.nome === trattamento)?.importo ?? 0);
  const aPersona = regole.modalita === "persona";
  const righe: RigaDettaglio[] = [];
  if (!aPersona) righe.push({ voce: periodo.weekend ? "Camera (weekend)" : "Camera", importo: periodo.prezzo });

  // Persone in ordine: prima gli adulti, poi i bambini dal più grande (i più piccoli occupano i letti aggiunti).
  const persone = [
    ...Array.from({ length: composizione.adulti }, () => ETA_ADULTO),
    ...[...composizione.etaBambini].sort((a, b) => b - a),
  ];
  const quote: number[] = [];
  persone.forEach((eta, posizione) => {
    const base = (aPersona ? periodo.prezzo : 0) + supplemento;
    const chi = eta >= ETA_ADULTO ? "Adulto" : `Bambino ${eta} anni`;
    const regola = regole.riduzioni.find(
      (r) => eta >= r.etaDa && (r.etaA === null || eta <= r.etaA) && (!r.dalTerzoLetto || posizione >= 2),
    );
    let quota = base;
    let nota = "";
    if (regola) {
      const v = Number(regola.valore);
      if (regola.tipo === "supplemento") {
        // Solo nei listini a camera: la persona (es. bambino nel letto aggiunto) paga una quota in più.
        quota = base + v;
        nota = ` +${euro(v)}`;
      } else if (regola.tipo === "gratis") {
        quota = 0;
        nota = " gratis";
      } else if (regola.tipo === "percentuale") {
        quota = base * (1 - v / 100);
        nota = ` −${v}%`;
      } else {
        quota = Math.max(0, base - v);
        nota = ` −${euro(v)}`;
      }
      if (regola.dalTerzoLetto) nota += " (3° letto)";
    }
    quota = arrotonda(quota);
    quote.push(quota);
    if (base > 0 || quota > 0) {
      const cosa = aPersona
        ? supplemento
          ? `${euro(periodo.prezzo)}${periodo.weekend ? " (weekend)" : ""} + ${trattamento} ${euro(supplemento)}${stagionale ? " (stagione)" : ""}`
          : `${euro(periodo.prezzo)}${periodo.weekend ? " (weekend)" : ""}`
        : supplemento
          ? `${trattamento} ${euro(supplemento)}${stagionale ? " (stagione)" : ""}`
          : "letto aggiunto";
      righe.push({ voce: `${chi}: ${cosa}${nota}`, importo: quota });
    }
  });

  if (aPersona && persone.length === 1 && regole.supplementoSingola !== null && Number(regole.supplementoSingola) > 0) {
    const v = Number(regole.supplementoSingola);
    const importo = arrotonda(regole.supplementoSingolaPercentuale ? quote[0] * (v / 100) : v);
    righe.push({ voce: `Supplemento singola${regole.supplementoSingolaPercentuale ? ` ${v}%` : ""}`, importo });
  }

  const lordo = arrotonda(righe.reduce((t, r) => t + r.importo, 0));
  return { mancante: false, righe, lordo, quote, gratuita: 0 };
}

/**
 * Gratuità dei gruppi: per ogni notte, sui segmenti non annullati della prenotazione con un
 * listino che la prevede, 1 persona gratuita ogni N paganti (floor(paganti / (N+1))): si azzerano
 * le quote più alte. Riscrive prezzo = lordo - gratuita; le notti senza dettaglio non si toccano.
 */
export async function ricalcolaGratuita(db: Db, prenotazioneId: number) {
  const notti = await db.notteSoggiorno.findMany({
    where: { segmento: { prenotazioneId, stato: { not: "ANNULLATO" }, listino: { gratuitaOgni: { gt: 0 } } } },
    include: { segmento: { include: { listino: true } } },
  });
  const perChiave = new Map<string, typeof notti>();
  for (const n of notti) {
    const k = `${n.segmento.listinoId}|${n.data.toISOString()}`;
    perChiave.set(k, [...(perChiave.get(k) ?? []), n]);
  }
  for (const gruppo of perChiave.values()) {
    const ogni = gruppo[0].segmento.listino.gratuitaOgni!;
    const quote = gruppo.flatMap((n) => ((n.dettaglio as DettaglioNotte | null)?.quote ?? []).map((q) => ({ notteId: n.id, q })));
    const paganti = quote.filter((x) => x.q > 0).length;
    const gratuiti = Math.floor(paganti / (ogni + 1));
    const scelte = quote.filter((x) => x.q > 0).sort((a, b) => b.q - a.q).slice(0, gratuiti);
    for (const n of gruppo) {
      const d = n.dettaglio as DettaglioNotte | null;
      if (!d) continue;
      const gratuita = arrotonda(scelte.filter((x) => x.notteId === n.id).reduce((t, x) => t + x.q, 0));
      if (gratuita === d.gratuita && Number(n.prezzo) === arrotonda(d.lordo - gratuita)) continue;
      await db.notteSoggiorno.update({
        where: { id: n.id },
        data: { prezzo: arrotonda(d.lordo - gratuita), dettaglio: { ...d, gratuita } },
      });
    }
  }
}
