import { prisma } from "@/lib/prisma";
import { nottiTraDate } from "@/lib/pricing";
import { calcolaTotaliPrenotazione, trovaPrenotazione } from "@/lib/prenotazioni";
import { dividiConto } from "@/lib/contoDiviso";
import { bloccateNotte, commissione, giornoRelease, VOUCHER_COPRE, type VoucherCopre } from "@/lib/agenzieRegole";

/**
 * Agenzie e tour operator: allotment (camere riservate con release), voucher sulla prenotazione,
 * estratto conto con le commissioni. Le prenotazioni con l'agenzia come intermediario usano il suo
 * allotment; le camere bloccate e non usate si tolgono dalla disponibilità per gli altri.
 */

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const iso = (d: Date) => d.toISOString().slice(0, 10);
const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
const arrotonda = (n: number) => Math.round(n * 100) / 100;

const AGENZIA = { in: ["agenzia", "portale"] };

// ---------------- Allotment ----------------

export type AllotmentInput = { clienteId: number; tipoCameraId: number; dal: string; al: string; camere: number; releaseGiorni: number; note: string };

async function valida(hotelId: number, d: AllotmentInput) {
  const cliente = await prisma.cliente.findFirst({ where: { id: d.clienteId, hotelId, tipo: AGENZIA } });
  if (!cliente) throw new Error("L'allotment si fa solo con un'agenzia o un portale.");
  await prisma.tipoCamera.findFirstOrThrow({ where: { id: d.tipoCameraId, hotelId } });
  if (!GIORNO.test(d.dal) || !GIORNO.test(d.al) || d.al <= d.dal) throw new Error("Indica il periodo: la fine deve essere dopo l'inizio.");
  if (!Number.isInteger(d.camere) || d.camere < 1) throw new Error("Indica quante camere.");
  const totali = await prisma.camera.count({ where: { hotelId, tipoCameraId: d.tipoCameraId, attivo: true } });
  if (d.camere > totali) throw new Error(`Di questo tipo ci sono solo ${totali} camere.`);
  if (!Number.isInteger(d.releaseGiorni) || d.releaseGiorni < 0 || d.releaseGiorni > 90) throw new Error("Release: da 0 a 90 giorni.");
  return { clienteId: d.clienteId, tipoCameraId: d.tipoCameraId, dal: new Date(d.dal), al: new Date(d.al), camere: d.camere, releaseGiorni: d.releaseGiorni, note: d.note.trim() || null };
}

export async function salvaAllotment(hotelId: number, id: number | null, d: AllotmentInput, utente: string) {
  const dati = await valida(hotelId, d);
  if (id) {
    await prisma.allotment.findFirstOrThrow({ where: { id, hotelId } });
    await prisma.allotment.update({ where: { id }, data: dati });
    return id;
  }
  return (await prisma.allotment.create({ data: { hotelId, ...dati, creatoDa: utente } })).id;
}

export async function eliminaAllotment(hotelId: number, id: number) {
  await prisma.allotment.findFirstOrThrow({ where: { id, hotelId } });
  await prisma.allotment.delete({ where: { id } });
}

/** Camere usate dall'agenzia, per tipo e notte (prenotazioni non annullate con lei come intermediario). */
async function usateDaAgenzia(hotelId: number, clienteId: number, tipoCameraId: number, dal: Date, al: Date) {
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: { tipoCameraId, usoDiurno: false, stato: { not: "ANNULLATO" }, prenotazione: { hotelId, intermediarioId: clienteId, stato: { not: "ANNULLATA" } }, dataInizio: { lt: al }, dataFine: { gt: dal } },
    select: { dataInizio: true, dataFine: true },
  });
  return (notte: Date) => segmenti.filter((s) => s.dataInizio <= notte && s.dataFine > notte).length;
}

/**
 * Camere bloccate dagli allotment per tipo e notte (non usate e non ancora rilasciate). Con
 * perClienteId si esclude l'allotment di quell'agenzia (per lei le camere restano disponibili).
 */
export async function bloccatePerNotte(hotelId: number, tipoCameraId: number, notti: Date[], perClienteId: number | null = null) {
  if (!notti.length) return [];
  const dal = notti[0];
  const al = new Date(notti[notti.length - 1].getTime() + 86400000);
  const allotment = await prisma.allotment.findMany({ where: { hotelId, tipoCameraId, dal: { lt: al }, al: { gt: dal }, ...(perClienteId ? { clienteId: { not: perClienteId } } : {}) } });
  const oggi = oggiItalia();
  const risultato = notti.map(() => 0);
  for (const a of allotment) {
    const usate = await usateDaAgenzia(hotelId, a.clienteId, tipoCameraId, a.dal, a.al);
    notti.forEach((n, i) => {
      if (a.dal <= n && a.al > n) risultato[i] += bloccateNotte(a.camere, usate(n), iso(n), oggi, a.releaseGiorni);
    });
  }
  return risultato;
}

/** Elenco degli allotment con l'uso e le camere ancora bloccate oggi per la prossima notte utile. */
export async function elencoAllotment(hotelId: number, clienteId?: number) {
  const r = await prisma.allotment.findMany({ where: { hotelId, ...(clienteId ? { clienteId } : {}) }, include: { cliente: true, tipoCamera: true }, orderBy: [{ dal: "asc" }] });
  const oggi = oggiItalia();
  const lista = [];
  for (const a of r) {
    const usate = await usateDaAgenzia(hotelId, a.clienteId, a.tipoCameraId, a.dal, a.al);
    const notti = nottiTraDate(a.dal, a.al);
    const usoMax = Math.max(0, ...notti.map(usate));
    const futuro = notti.filter((n) => iso(n) >= oggi);
    const bloccateOra = futuro.map((n) => bloccateNotte(a.camere, usate(n), iso(n), oggi, a.releaseGiorni));
    lista.push({
      id: a.id,
      clienteId: a.clienteId,
      agenzia: a.cliente.denominazione,
      tipoCameraId: a.tipoCameraId,
      tipo: a.tipoCamera.descrizione,
      dal: iso(a.dal),
      al: iso(a.al),
      camere: a.camere,
      releaseGiorni: a.releaseGiorni,
      note: a.note ?? "",
      usateMassimo: usoMax,
      // Notti future con camere ancora bloccate e la prossima data di release.
      ancoraBloccate: bloccateOra.reduce((t, x) => t + x, 0),
      prossimoRelease: futuro.length ? giornoRelease(iso(futuro[0]), a.releaseGiorni) : null,
      concluso: iso(a.al) <= oggi,
    });
  }
  return lista;
}

/** Per la nuova prenotazione: avviso se le camere libere sono solo quelle in allotment di un'agenzia. */
export async function avvisoAllotment(hotelId: number, tipoCameraId: number, dal: Date, al: Date, quante: number, intermediarioId: number | null) {
  const notti = nottiTraDate(dal, al);
  const bloccate = await bloccatePerNotte(hotelId, tipoCameraId, notti, intermediarioId);
  if (!bloccate.some((b) => b > 0)) return null;
  const [camere, segmenti, fs] = await Promise.all([
    prisma.camera.count({ where: { hotelId, tipoCameraId, attivo: true } }),
    prisma.segmentoSoggiorno.findMany({
      where: { tipoCameraId, usoDiurno: false, stato: { not: "ANNULLATO" }, prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, dataInizio: { lt: al }, dataFine: { gt: dal } },
      select: { dataInizio: true, dataFine: true },
    }),
    prisma.cameraIndisponibilita.findMany({ where: { camera: { hotelId, tipoCameraId, attivo: true }, dal: { lt: al }, al: { gt: dal } }, select: { dal: true, al: true } }),
  ]);
  const libereFuoriAllotment = Math.min(
    ...notti.map((n, i) => camere - segmenti.filter((s) => s.dataInizio <= n && s.dataFine > n).length - fs.filter((f) => f.dal <= n && f.al > n).length - bloccate[i]),
  );
  if (libereFuoriAllotment >= quante) return null;
  return `Per queste date le camere libere di questo tipo sono riservate in allotment a un'agenzia (${Math.max(...bloccate)} bloccate). Puoi prenotarle lo stesso, ma togli disponibilità all'agenzia.`;
}

// ---------------- Voucher ----------------

/** Voucher sulla prenotazione: l'agenzia (intermediario) paga quello che copre il voucher. */
export async function impostaVoucher(hotelId: number, prenotazioneId: number, numero: string, copre: VoucherCopre | null) {
  const p = await prisma.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId }, include: { intermediario: true } });
  const n = numero.trim();
  if (!n) {
    // Voucher tolto: il conto torna come prima (nessun cliente pagante dal voucher).
    await prisma.prenotazione.update({ where: { id: p.id }, data: { voucher: null, voucherCopre: null, ...(p.voucher ? { clientePaganteId: null, regolaConto: "predefinita" } : {}) } });
    return;
  }
  if (!p.intermediario || !["agenzia", "portale"].includes(p.intermediario.tipo)) throw new Error("Il voucher è dell'agenzia: indica prima l'agenzia nella provenienza della prenotazione.");
  if (!copre || !(copre in VOUCHER_COPRE)) throw new Error("Indica cosa copre il voucher.");
  if (n.length > 50) throw new Error("Numero di voucher troppo lungo.");
  await prisma.prenotazione.update({
    where: { id: p.id },
    data: { voucher: n, voucherCopre: copre, clientePaganteId: p.intermediario.id, regolaConto: VOUCHER_COPRE[copre].regola },
  });
}

// ---------------- Estratto conto ----------------

/**
 * Estratto conto di un'agenzia per le partenze del periodo: soggiorno (base della commissione:
 * camere e servizi prenotati), commissione, netto, quanto è a carico dell'agenzia secondo il conto
 * diviso, quanto ha già pagato e il saldo.
 */
export async function estrattoContoAgenzia(hotelId: number, clienteId: number, dal: string, al: string) {
  if (!GIORNO.test(dal) || !GIORNO.test(al) || al < dal) throw new Error("Periodo non valido.");
  const [agenzia, hotel] = await Promise.all([
    prisma.cliente.findFirst({ where: { id: clienteId, hotelId, tipo: AGENZIA } }),
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { aliquotaAlloggio: true } }),
  ]);
  if (!agenzia) throw new Error("Agenzia non trovata.");
  const percentuale = agenzia.commissione === null ? null : Number(agenzia.commissione);
  const candidate = await prisma.prenotazione.findMany({
    where: { hotelId, intermediarioId: clienteId, OR: [{ stato: { not: "ANNULLATA" } }, { penale: { not: null } }], segmenti: { some: { dataFine: { gte: new Date(dal), lte: new Date(al) } } } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  type Riga = {
    prenotazioneId: number;
    ospite: string;
    arrivo: string;
    partenza: string;
    annullata: boolean;
    voucher: string;
    soggiorno: number;
    commissione: number;
    netto: number;
    aCaricoAgenzia: number;
    pagatoAgenzia: number;
    saldoAgenzia: number;
  };
  const righe: Riga[] = [];
  for (const { id } of candidate) {
    const p = await trovaPrenotazione(hotelId, id);
    const attivi = p.segmenti.filter((s) => s.stato !== "ANNULLATO");
    const segs = attivi.length ? attivi : p.segmenti;
    const tot = calcolaTotaliPrenotazione(p);
    const soggiorno = p.stato === "ANNULLATA" ? Number(p.penale ?? 0) : arrotonda(tot.subtotale + tot.servizi);
    const diviso = dividiConto(p, Number(hotel.aliquotaAlloggio));
    const quota = diviso.intestatari.find((x) => x.chiave === `cliente:${clienteId}`);
    const com = commissione(soggiorno, percentuale);
    righe.push({
      prenotazioneId: p.id,
      ospite: `${p.ospitePrenotante.cognome} ${p.ospitePrenotante.nome}`.trim(),
      arrivo: iso(segs.map((s) => s.dataInizio).sort((a, b) => a.getTime() - b.getTime())[0]),
      partenza: iso(segs.map((s) => s.dataFine).sort((a, b) => b.getTime() - a.getTime())[0]),
      annullata: p.stato === "ANNULLATA",
      voucher: p.voucher ?? "",
      soggiorno,
      commissione: com,
      netto: arrotonda(soggiorno - com),
      aCaricoAgenzia: quota?.totale ?? 0,
      pagatoAgenzia: quota?.pagato ?? 0,
      saldoAgenzia: quota?.daPagare ?? 0,
    });
  }
  const somma = (k: "soggiorno" | "commissione" | "netto" | "aCaricoAgenzia" | "pagatoAgenzia" | "saldoAgenzia") => arrotonda(righe.reduce((t, r) => t + r[k], 0));
  return {
    agenzia: { id: agenzia.id, denominazione: agenzia.denominazione, commissione: percentuale, tipo: agenzia.tipo },
    dal,
    al,
    righe,
    totali: { soggiorno: somma("soggiorno"), commissione: somma("commissione"), netto: somma("netto"), aCaricoAgenzia: somma("aCaricoAgenzia"), pagatoAgenzia: somma("pagatoAgenzia"), saldoAgenzia: somma("saldoAgenzia") },
  };
}

export async function elencoAgenzie(hotelId: number) {
  const r = await prisma.cliente.findMany({ where: { hotelId, tipo: AGENZIA, attivo: true }, orderBy: { denominazione: "asc" }, select: { id: true, denominazione: true, tipo: true, commissione: true } });
  return r.map((c) => ({ id: c.id, denominazione: c.denominazione, tipo: c.tipo, commissione: c.commissione === null ? null : Number(c.commissione) }));
}
