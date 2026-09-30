import { prisma } from "@/lib/prisma";
import { calcolaNotte, composizioneDi, regoleListino, ricalcolaGratuita } from "@/lib/pricing";

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
    } satisfies DatiStruttura,
  };
}

export async function salvaStruttura(hotelId: number, d: DatiStruttura) {
  const partitaIva = txt(d.partitaIva)?.replace(/\s/g, "") ?? null;
  if (partitaIva && !/^\d{11}$/.test(partitaIva)) throw new Error("La partita IVA deve avere 11 cifre.");
  const cap = txt(d.cap);
  if (cap && !/^\d{5}$/.test(cap)) throw new Error("Il CAP ha 5 cifre.");
  const ora = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const [nome, v] of [["check-in", d.orarioCheckIn], ["check-out", d.orarioCheckOut]] as const) {
    if (v.trim() && !ora.test(v.trim())) throw new Error(`Orario di ${nome} nel formato HH:MM.`);
  }
  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
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

export const TRATTAMENTI_PREDEFINITI = ["B&B", "Mezza pensione", "Pensione completa"];

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

export async function spostaTrattamento(hotelId: number, id: number, direzione: -1 | 1) {
  const lista = await elencoTrattamenti(hotelId);
  const i = lista.findIndex((t) => t.id === id);
  const j = i + direzione;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await prisma.$transaction(lista.map((t, k) => prisma.trattamento.update({ where: { id: t.id }, data: { ordine: k + 1 } })));
}

// ---------- Listini e tariffe ----------

export type DatiPeriodo = { dal: string; al: string; prezzoNotte: number };

export async function elencoListini(hotelId: number) {
  const [listini, tipi] = await Promise.all([
    prisma.listino.findMany({
      where: { hotelId },
      include: { periodi: { orderBy: [{ tipoCameraId: "asc" }, { dal: "asc" }] } },
      orderBy: { id: "asc" },
    }),
    prisma.tipoCamera.findMany({ where: { hotelId }, orderBy: { descrizione: "asc" } }),
  ]);
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
  return {
    tipi: tipi.map((t) => ({ id: t.id, descrizione: t.descrizione })),
    listini: listini.map((l) => ({
      id: l.id,
      codice: l.codice,
      descrizione: l.descrizione,
      tipo: l.tipo,
      perTipo: tipi.map((t) => {
        const periodi = l.periodi.filter((p) => p.tipoCameraId === t.id);
        return {
          tipoCameraId: t.id,
          periodi: periodi.map((p) => ({ id: p.id, dal: iso(p.dal), al: iso(p.al), prezzoNotte: Number(p.prezzoNotte) })),
          buchi: buchi(periodi),
        };
      }),
    })),
  };
}

export async function creaListino(hotelId: number, codice: string, descrizione: string) {
  const c = codice.trim().toUpperCase();
  if (!c || !descrizione.trim()) throw new Error("Indica codice e descrizione del listino.");
  await prisma.listino.create({ data: { hotelId, codice: c, descrizione: descrizione.trim(), tipo: "personalizzato" } });
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
  await prisma.periodoTariffario.create({ data: { listinoId, tipoCameraId, dal, al, prezzoNotte: d.prezzoNotte } });
}

export async function modificaPeriodo(hotelId: number, id: number, d: DatiPeriodo) {
  const p = await prisma.periodoTariffario.findFirstOrThrow({ where: { id, listino: { hotelId } } });
  const { dal, al } = await verificaPeriodo(hotelId, p.listinoId, p.tipoCameraId, d, id);
  await prisma.periodoTariffario.update({ where: { id }, data: { dal, al, prezzoNotte: d.prezzoNotte } });
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
