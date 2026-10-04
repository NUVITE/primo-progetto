import { prisma } from "@/lib/prisma";
import { calcolaNotte, composizioneDi, regoleListino, ricalcolaGratuita, giorniWeekendDi } from "@/lib/pricing";

/**
 * Impostazioni che l'hotel gestisce da sé (permesso "Configurare l'hotel" / "Gestire listini"):
 * dati della struttura, trattamenti, listini e tariffe. Nome, comune, categoria e sistema ISTAT
 * restano al gestore della piattaforma: toccano la tassa di soggiorno e gli adempimenti.
 */

const txt = (s: string) => (s.trim() ? s.trim() : null);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const GIORNO = 24 * 60 * 60 * 1000;

// ---------- Dati della struttura ----------

export type DatiStruttura = {
  ragioneSociale: string;
  partitaIva: string;
  codiceFiscale: string;
  indirizzo: string;
  cap: string;
  telefono: string;
  email: string;
  pec: string;
  orarioCheckIn: string;
  orarioCheckOut: string;
  giorniOpzione: string;
  orarioLimiteArrivo: string;
};

export async function caricaStruttura(hotelId: number) {
  const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, include: { comune: true } });
  const t = (s: string | null) => s ?? "";
  return {
    sola: { nome: h.nome, comune: `${h.comune.nome} (${h.comune.provincia})`, categoria: h.categoria, sistemaIstat: h.sistemaIstat },
    dati: {
      ragioneSociale: t(h.ragioneSociale),
      partitaIva: t(h.partitaIva),
      codiceFiscale: t(h.codiceFiscale),
      indirizzo: t(h.indirizzo),
      cap: t(h.cap),
      telefono: t(h.telefono),
      email: t(h.email),
      pec: t(h.pec),
      orarioCheckIn: t(h.orarioCheckIn),
      orarioCheckOut: t(h.orarioCheckOut),
      giorniOpzione: String(h.giorniOpzione),
      orarioLimiteArrivo: h.orarioLimiteArrivo,
    } satisfies DatiStruttura,
  };
}

export async function salvaStruttura(hotelId: number, d: DatiStruttura) {
  const partitaIva = txt(d.partitaIva)?.replace(/\s/g, "") ?? null;
  if (partitaIva && !/^\d{11}$/.test(partitaIva)) throw new Error("La partita IVA deve avere 11 cifre.");
  const cap = txt(d.cap);
  if (cap && !/^\d{5}$/.test(cap)) throw new Error("Il CAP ha 5 cifre.");
  const ora = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const [nome, v] of [["check-in", d.orarioCheckIn], ["check-out", d.orarioCheckOut], ["limite di arrivo", d.orarioLimiteArrivo]] as const) {
    if (v.trim() && !ora.test(v.trim())) throw new Error(`Orario di ${nome} nel formato HH:MM.`);
  }
  const giorniOpzione = Number(d.giorniOpzione || 0);
  if (!(Number.isInteger(giorniOpzione) && giorniOpzione >= 0 && giorniOpzione <= 60)) throw new Error("Giorni di opzione: da 0 a 60 (0 = nessuna scadenza proposta).");
  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      giorniOpzione,
      orarioLimiteArrivo: d.orarioLimiteArrivo.trim() || "18:00",
      ragioneSociale: txt(d.ragioneSociale),
      partitaIva,
      codiceFiscale: txt(d.codiceFiscale)?.toUpperCase() ?? null,
      indirizzo: txt(d.indirizzo),
      cap,
      telefono: txt(d.telefono),
      email: txt(d.email)?.toLowerCase() ?? null,
      pec: txt(d.pec)?.toLowerCase() ?? null,
      orarioCheckIn: txt(d.orarioCheckIn),
      orarioCheckOut: txt(d.orarioCheckOut),
    },
  });
}

// ---------- Trattamenti ----------

export const TRATTAMENTI_PREDEFINITI = [
  { nome: "B&B", colazione: true, pranzo: false, cena: false },
  { nome: "Mezza pensione", colazione: true, pranzo: false, cena: true },
  { nome: "Pensione completa", colazione: true, pranzo: true, cena: true },
];

export async function elencoTrattamenti(hotelId: number, soloAttivi = false) {
  return prisma.trattamento.findMany({
    where: { hotelId, ...(soloAttivi ? { attivo: true } : {}) },
    orderBy: [{ ordine: "asc" }, { nome: "asc" }],
  });
}

export async function creaTrattamento(hotelId: number, nome: string) {
  const n = nome.trim();
  if (!n) throw new Error("Indica il nome del trattamento.");
  const ultimo = await prisma.trattamento.aggregate({ where: { hotelId }, _max: { ordine: true } });
  await prisma.trattamento.create({ data: { hotelId, nome: n, ordine: (ultimo._max.ordine ?? 0) + 1 } });
}

/** Rinominare non cambia le prenotazioni già fatte (conservano il nome scelto allora). */
export async function rinominaTrattamento(hotelId: number, id: number, nome: string) {
  const n = nome.trim();
  if (!n) throw new Error("Indica il nome del trattamento.");
  await prisma.trattamento.update({ where: { id, hotelId }, data: { nome: n } });
}

export async function impostaTrattamentoAttivo(hotelId: number, id: number, attivo: boolean) {
  if (!attivo && (await prisma.trattamento.count({ where: { hotelId, attivo: true, id: { not: id } } })) === 0) {
    throw new Error("Deve restare almeno un trattamento attivo.");
  }
  await prisma.trattamento.update({ where: { id, hotelId }, data: { attivo } });
}

/** Pasti compresi nel trattamento: servono al foglio del giorno della ristorazione. */
export async function impostaPastiTrattamento(hotelId: number, id: number, pasti: { colazione: boolean; pranzo: boolean; cena: boolean }) {
  await prisma.trattamento.update({ where: { id, hotelId }, data: { colazione: !!pasti.colazione, pranzo: !!pasti.pranzo, cena: !!pasti.cena } });
}

export async function spostaTrattamento(hotelId: number, id: number, direzione: -1 | 1) {
  const lista = await elencoTrattamenti(hotelId);
  const i = lista.findIndex((t) => t.id === id);
  const j = i + direzione;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await prisma.$transaction(lista.map((t, k) => prisma.trattamento.update({ where: { id: t.id }, data: { ordine: k + 1 } })));
}

// ---------- Listini e tariffe ----------

// prezzoWeekend: prezzo delle notti weekend del listino (null = come le altre notti).
export type DatiPeriodo = { dal: string; al: string; prezzoNotte: number; prezzoWeekend?: number | null };

export async function elencoListini(hotelId: number) {
  const [listini, tipi] = await Promise.all([
    prisma.listino.findMany({
      where: { hotelId },
      include: {
        periodi: { orderBy: [{ tipoCameraId: "asc" }, { dal: "asc" }] },
        supplementiTrattamento: true,
        supplementiStagionali: { orderBy: [{ trattamentoId: "asc" }, { dal: "asc" }] },
        riduzioni: { orderBy: [{ etaDa: "asc" }, { id: "asc" }] },
      },
      orderBy: { id: "asc" },
    }),
    prisma.tipoCamera.findMany({ where: { hotelId }, orderBy: { descrizione: "asc" } }),
  ]);
  const trattamenti = await elencoTrattamenti(hotelId);
  // Buchi di copertura nei prossimi 12 mesi, per listino e tipo: notti per cui mancherebbe il prezzo.
  const oggi = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const fine = new Date(oggi.getTime() + 365 * GIORNO);
  const buchi = (periodi: { dal: Date; al: Date }[]) => {
    const risultato: { dal: string; al: string }[] = [];
    let cursore = oggi;
    for (const p of [...periodi].sort((a, b) => a.dal.getTime() - b.dal.getTime())) {
      if (p.al < cursore) continue;
      if (p.dal > cursore) risultato.push({ dal: iso(cursore), al: iso(new Date(Math.min(p.dal.getTime() - GIORNO, fine.getTime()))) });
      cursore = new Date(p.al.getTime() + GIORNO);
      if (cursore > fine) break;
    }
    if (cursore <= fine) risultato.push({ dal: iso(cursore), al: iso(fine) });
    return risultato.filter((b) => b.dal <= b.al && b.dal <= iso(fine));
  };
  const politiche = await prisma.politicaCancellazione.findMany({ where: { hotelId, attiva: true }, orderBy: { nome: "asc" } });
  return {
    politiche: politiche.map((p) => ({ id: p.id, nome: p.nome, predefinita: p.predefinita })),
    tipi: tipi.map((t) => ({ id: t.id, descrizione: t.descrizione })),
    trattamenti: trattamenti.map((t) => ({ id: t.id, nome: t.nome, attivo: t.attivo })),
    listini: listini.map((l) => ({
      id: l.id,
      codice: l.codice,
      descrizione: l.descrizione,
      tipo: l.tipo,
      regole: {
        modalita: l.modalita === "persona" ? "persona" : "camera",
        supplementoSingola: l.supplementoSingola === null ? null : Number(l.supplementoSingola),
        supplementoSingolaPercentuale: l.supplementoSingolaPercentuale,
        gruppo: l.tipo === "gruppo",
        categoria: l.categoria ?? "",
        minPersone: l.minPersone,
        gratuitaOgni: l.gratuitaOgni,
        politicaId: l.politicaId,
        giorniWeekend: giorniWeekendDi(l.giorniWeekend),
      } satisfies RegoleListinoInput,
      supplementiStagionali: l.supplementiStagionali.map((x) => ({
        id: x.id,
        trattamentoId: x.trattamentoId,
        tipoCameraId: x.tipoCameraId,
        dal: iso(x.dal),
        al: iso(x.al),
        importo: Number(x.importo),
      })),
      supplementiTrattamento: Object.fromEntries(l.supplementiTrattamento.map((x) => [x.trattamentoId, Number(x.importo)])) as Record<number, number>,
      riduzioni: l.riduzioni.map((r) => ({
        id: r.id,
        etaDa: r.etaDa,
        etaA: r.etaA,
        tipo: r.tipo as RiduzioneInput["tipo"],
        valore: Number(r.valore),
        dalTerzoLetto: r.dalTerzoLetto,
      })),
      perTipo: tipi.map((t) => {
        const periodi = l.periodi.filter((p) => p.tipoCameraId === t.id);
        return {
          tipoCameraId: t.id,
          periodi: periodi.map((p) => ({
            id: p.id,
            dal: iso(p.dal),
            al: iso(p.al),
            prezzoNotte: Number(p.prezzoNotte),
            prezzoWeekend: p.prezzoWeekend === null ? null : Number(p.prezzoWeekend),
          })),
          buchi: buchi(periodi),
        };
      }),
    })),
  };
}

export async function creaListino(hotelId: number, codice: string, descrizione: string, gruppo = false) {
  const c = codice.trim().toUpperCase();
  if (!c || !descrizione.trim()) throw new Error("Indica codice e descrizione del listino.");
  await prisma.listino.create({
    data: { hotelId, codice: c, descrizione: descrizione.trim(), tipo: gruppo ? "gruppo" : "personalizzato", modalita: gruppo ? "persona" : "camera" },
  });
}

// ---------- Regole del listino (approvate 2026-09-30) ----------

export type RegoleListinoInput = {
  modalita: "camera" | "persona";
  supplementoSingola: number | null;
  supplementoSingolaPercentuale: boolean;
  gruppo: boolean;
  categoria: string;
  minPersone: number | null;
  gratuitaOgni: number | null;
  // Politica di cancellazione del listino (null = la predefinita dell'hotel).
  politicaId: number | null;
  // Notti che usano il prezzo weekend dei periodi (0 = domenica … 6 = sabato).
  giorniWeekend: number[];
};
// "supplemento" (solo listini a camera): la persona paga una quota in più, es. bambino nel letto aggiunto.
export type RiduzioneInput = { etaDa: number; etaA: number | null; tipo: "percentuale" | "importo" | "gratis" | "supplemento"; valore: number; dalTerzoLetto: boolean };

/** Le regole valgono per le nuove prenotazioni (e per "Ricalcola"): i prezzi già fissati non cambiano. */
export async function salvaRegoleListino(hotelId: number, id: number, r: RegoleListinoInput) {
  const l = await prisma.listino.findFirstOrThrow({ where: { id, hotelId } });
  if (r.supplementoSingola !== null && !(r.supplementoSingola >= 0)) throw new Error("Supplemento singola non valido.");
  if (r.supplementoSingolaPercentuale && r.supplementoSingola !== null && r.supplementoSingola > 100) throw new Error("Supplemento singola oltre il 100%.");
  for (const [nome, v] of [["Minimo persone", r.minPersone], ["Gratuità", r.gratuitaOgni]] as const) {
    if (v !== null && !(Number.isInteger(v) && v > 0)) throw new Error(`${nome}: indica un numero intero maggiore di zero.`);
  }
  if (l.tipo === "base" && r.gruppo) throw new Error("Il listino base non può diventare un listino di gruppo: creane uno apposta.");
  if (r.politicaId) await prisma.politicaCancellazione.findFirstOrThrow({ where: { id: r.politicaId, hotelId, attiva: true } });
  const giorniWeekend = [...new Set((r.giorniWeekend ?? []).filter((g) => Number.isInteger(g) && g >= 0 && g <= 6))].sort();
  await prisma.listino.update({
    where: { id },
    data: {
      modalita: r.modalita === "persona" ? "persona" : "camera",
      supplementoSingola: r.modalita === "persona" ? r.supplementoSingola : null,
      supplementoSingolaPercentuale: r.modalita === "persona" && r.supplementoSingolaPercentuale,
      tipo: l.tipo === "base" ? "base" : r.gruppo ? "gruppo" : "personalizzato",
      categoria: r.gruppo ? txt(r.categoria) : null,
      minPersone: r.gruppo ? r.minPersone : null,
      gratuitaOgni: r.gruppo ? r.gratuitaOgni : null,
      politicaId: r.politicaId ?? null,
      giorniWeekend,
    },
  });
}

/** Supplemento di un trattamento per una stagione: sostituisce il generale nelle notti del periodo. */
export async function salvaSupplementoStagionale(
  hotelId: number,
  listinoId: number,
  id: number | null,
  d: { trattamentoId: number; tipoCameraId?: number | null; dal: string; al: string; importo: number },
) {
  await prisma.listino.findFirstOrThrow({ where: { id: listinoId, hotelId } });
  await prisma.trattamento.findFirstOrThrow({ where: { id: d.trattamentoId, hotelId } });
  const tipoCameraId = d.tipoCameraId || null;
  if (tipoCameraId) await prisma.tipoCamera.findFirstOrThrow({ where: { id: tipoCameraId, hotelId } });
  if (!d.dal || !d.al) throw new Error("Indica inizio e fine della stagione.");
  const dal = new Date(d.dal);
  const al = new Date(d.al);
  if (al < dal) throw new Error("La fine della stagione non può precedere l'inizio.");
  if (!(d.importo >= 0)) throw new Error("Supplemento non valido.");
  const sovrapposto = await prisma.supplementoStagionale.findFirst({
    where: { listinoId, trattamentoId: d.trattamentoId, tipoCameraId, id: id ? { not: id } : undefined, dal: { lte: al }, al: { gte: dal } },
  });
  if (sovrapposto) throw new Error(`Per questo trattamento${tipoCameraId ? " e tipo di camera" : " (tutti i tipi)"} c'è già una stagione che si sovrappone.`);
  const dati = { trattamentoId: d.trattamentoId, tipoCameraId, dal, al, importo: d.importo };
  if (id) await prisma.supplementoStagionale.update({ where: { id, listinoId }, data: dati });
  else await prisma.supplementoStagionale.create({ data: { ...dati, listinoId } });
}

export async function eliminaSupplementoStagionale(hotelId: number, listinoId: number, id: number) {
  await prisma.listino.findFirstOrThrow({ where: { id: listinoId, hotelId } });
  await prisma.supplementoStagionale.delete({ where: { id, listinoId } });
}

/** importi: trattamentoId -> supplemento per persona per notte (null o 0 = incluso nel prezzo). */
export async function salvaSupplementiTrattamento(hotelId: number, listinoId: number, importi: Record<number, number | null>) {
  await prisma.listino.findFirstOrThrow({ where: { id: listinoId, hotelId } });
  const trattamenti = await prisma.trattamento.findMany({ where: { hotelId } });
  await prisma.$transaction(async (tx) => {
    for (const t of trattamenti) {
      const v = importi[t.id];
      if (v === null || v === undefined || v === 0) {
        await tx.supplementoTrattamento.deleteMany({ where: { listinoId, trattamentoId: t.id } });
      } else {
        if (!(v > 0)) throw new Error(`Supplemento non valido per ${t.nome}.`);
        await tx.supplementoTrattamento.upsert({
          where: { listinoId_trattamentoId: { listinoId, trattamentoId: t.id } },
          update: { importo: v },
          create: { listinoId, trattamentoId: t.id, importo: v },
        });
      }
    }
  });
}

function verificaRiduzione(r: RiduzioneInput) {
  if (!(Number.isInteger(r.etaDa) && r.etaDa >= 0 && r.etaDa <= 18)) throw new Error("Età iniziale tra 0 e 18 (18 = adulti).");
  if (r.etaA !== null && !(Number.isInteger(r.etaA) && r.etaA >= r.etaDa)) throw new Error("L'età finale non può precedere quella iniziale.");
  if (!["percentuale", "importo", "gratis", "supplemento"].includes(r.tipo)) throw new Error("Tipo di riduzione non valido.");
  if (r.tipo !== "gratis" && !(r.valore > 0)) throw new Error("Indica il valore della riduzione.");
  if (r.tipo === "percentuale" && r.valore > 100) throw new Error("Riduzione oltre il 100%: usa \"gratis\".");
}

export async function salvaRiduzione(hotelId: number, listinoId: number, id: number | null, r: RiduzioneInput) {
  const l = await prisma.listino.findFirstOrThrow({ where: { id: listinoId, hotelId } });
  verificaRiduzione(r);
  if (r.tipo === "supplemento" && l.modalita === "persona") throw new Error("Il supplemento per età vale nei listini a camera: in quelli a persona ognuno paga già la sua quota.");
  const dati = { etaDa: r.etaDa, etaA: r.etaA, tipo: r.tipo, valore: r.tipo === "gratis" ? 0 : r.valore, dalTerzoLetto: r.dalTerzoLetto };
  if (id) await prisma.riduzioneListino.update({ where: { id, listinoId }, data: dati });
  else await prisma.riduzioneListino.create({ data: { ...dati, listinoId } });
}

export async function eliminaRiduzione(hotelId: number, listinoId: number, id: number) {
  await prisma.listino.findFirstOrThrow({ where: { id: listinoId, hotelId } });
  await prisma.riduzioneListino.delete({ where: { id, listinoId } });
}

export async function rinominaListino(hotelId: number, id: number, descrizione: string) {
  if (!descrizione.trim()) throw new Error("Indica la descrizione del listino.");
  await prisma.listino.update({ where: { id, hotelId }, data: { descrizione: descrizione.trim() } });
}

async function verificaPeriodo(hotelId: number, listinoId: number, tipoCameraId: number, d: DatiPeriodo, escludiId?: number) {
  await prisma.listino.findFirstOrThrow({ where: { id: listinoId, hotelId } });
  await prisma.tipoCamera.findFirstOrThrow({ where: { id: tipoCameraId, hotelId } });
  if (!d.dal || !d.al) throw new Error("Indica inizio e fine del periodo.");
  const dal = new Date(d.dal);
  const al = new Date(d.al);
  if (al < dal) throw new Error("La fine del periodo non può precedere l'inizio.");
  if (!(d.prezzoNotte >= 0)) throw new Error("Prezzo non valido.");
  if (d.prezzoWeekend !== null && d.prezzoWeekend !== undefined && !(d.prezzoWeekend >= 0)) throw new Error("Prezzo weekend non valido.");
  const sovrapposto = await prisma.periodoTariffario.findFirst({
    where: { listinoId, tipoCameraId, id: escludiId ? { not: escludiId } : undefined, dal: { lte: al }, al: { gte: dal } },
  });
  if (sovrapposto) {
    const it = (d: Date) => iso(d).split("-").reverse().join("/");
    throw new Error(`Si sovrappone al periodo dal ${it(sovrapposto.dal)} al ${it(sovrapposto.al)} (${Number(sovrapposto.prezzoNotte).toFixed(2)} €).`);
  }
  return { dal, al };
}

/** Il nuovo prezzo vale per le prenotazioni future: quelle già fatte conservano il prezzo concordato. */
export async function creaPeriodo(hotelId: number, listinoId: number, tipoCameraId: number, d: DatiPeriodo) {
  const { dal, al } = await verificaPeriodo(hotelId, listinoId, tipoCameraId, d);
  await prisma.periodoTariffario.create({ data: { listinoId, tipoCameraId, dal, al, prezzoNotte: d.prezzoNotte, prezzoWeekend: d.prezzoWeekend ?? null } });
}

export async function modificaPeriodo(hotelId: number, id: number, d: DatiPeriodo) {
  const p = await prisma.periodoTariffario.findFirstOrThrow({ where: { id, listino: { hotelId } } });
  const { dal, al } = await verificaPeriodo(hotelId, p.listinoId, p.tipoCameraId, d, id);
  await prisma.periodoTariffario.update({ where: { id }, data: { dal, al, prezzoNotte: d.prezzoNotte, prezzoWeekend: d.prezzoWeekend ?? null } });
}

export async function eliminaPeriodo(hotelId: number, id: number) {
  await prisma.periodoTariffario.findFirstOrThrow({ where: { id, listino: { hotelId } } });
  await prisma.periodoTariffario.delete({ where: { id } });
}

/**
 * Completa le notti rimaste senza prezzo (prenotazioni fatte quando la tariffa mancava): usa il
 * listino della camera. Le notti con un prezzo già fissato non si toccano.
 */
export async function completaNottiSenzaTariffa(hotelId: number) {
  const notti = await prisma.notteSoggiorno.findMany({
    where: { motivoPrezzo: "mancante", segmento: { prenotazione: { hotelId } } },
    include: { segmento: true },
  });
  let completate = 0;
  const prenotazioni = new Set<number>();
  for (const n of notti) {
    const regole = await regoleListino(prisma, n.segmento.listinoId);
    const c = await calcolaNotte(prisma, regole, n.segmento.tipoCameraId, n.data, composizioneDi(n.segmento), n.segmento.trattamento);
    if (c.mancante) continue;
    await prisma.notteSoggiorno.update({
      where: { id: n.id },
      data: { prezzo: c.lordo, motivoPrezzo: regole.tipo, dettaglio: { righe: c.righe, lordo: c.lordo, quote: c.quote, gratuita: 0 } },
    });
    prenotazioni.add(n.segmento.prenotazioneId);
    completate += 1;
  }
  for (const id of prenotazioni) await ricalcolaGratuita(prisma, id);
  return { completate, ancoraMancanti: notti.length - completate };
}
