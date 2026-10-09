/**
 * Portineria, custodia: deposito bagagli con cartellino numerato, valori nella cassaforte dell'hotel
 * con ricevuta numerata e movimenti, chiavi o key card consegnate e restituite per camera.
 */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MOVIMENTI_VALORI, saldoValori, validaBagagli, validaChiavi, type BagagliInput, type TipoMovimentoValori } from "@/lib/custodiaRegole";

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const giorniFa = (n: number) => new Date(Date.parse(`${oggiItalia()}T00:00:00Z`) - n * 86400000);
const camereDi = (segmenti: { stato: string; camera: { codice: string } | null; tipoCamera: { descrizione: string } }[]) =>
  [...new Set(segmenti.filter((s) => s.stato !== "ANNULLATO").map((s) => s.camera?.codice ?? `${s.tipoCamera.descrizione} da assegnare`))].join(", ");
const SEGMENTI = { select: { stato: true, camera: { select: { codice: true } }, tipoCamera: { select: { descrizione: true } } } } as const;

async function prenotazioneValida(db: Prisma.TransactionClient, hotelId: number, prenotazioneId: number) {
  const p = await db.prenotazione.findFirst({ where: { id: prenotazioneId, hotelId }, include: { ospitePrenotante: { select: { nome: true, cognome: true } }, segmenti: SEGMENTI } });
  if (!p) throw new Error("Prenotazione non trovata.");
  if (p.stato === "ANNULLATA") throw new Error("La prenotazione è annullata.");
  return p;
}

/**
 * Numero progressivo per hotel (cartellino o ricevuta) assegnato dentro la transazione; se due
 * operatori registrano insieme, l'unicità (hotelId, numero) fa riprovare con il numero dopo.
 */
async function conNumero<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let tentativo = 0; ; tentativo++) {
    try {
      return await prisma.$transaction(fn);
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002" || tentativo >= 3) throw e;
    }
  }
}

// ---------------- Bagagli ----------------

export async function depositaBagagli(hotelId: number, d: BagagliInput, utente: string) {
  validaBagagli(d);
  return conNumero(async (tx) => {
    let nome = d.nome.trim();
    if (d.prenotazioneId) {
      const p = await prenotazioneValida(tx, hotelId, d.prenotazioneId);
      nome ||= `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`;
    }
    const ultimo = await tx.depositoBagagli.aggregate({ where: { hotelId }, _max: { numero: true } });
    const b = await tx.depositoBagagli.create({
      data: {
        hotelId,
        numero: (ultimo._max.numero ?? 0) + 1,
        prenotazioneId: d.prenotazioneId,
        nome,
        colli: d.colli,
        descrizione: d.descrizione.trim() || null,
        posizione: d.posizione.trim() || null,
        depositatoDa: utente,
      },
    });
    return { id: b.id, numero: b.numero };
  });
}

/** Ritiro: l'ospite mostra la sua metà del cartellino e il numero deve coincidere. */
export async function ritiraBagagli(hotelId: number, id: number, numeroCartellino: number, nota: string, utente: string) {
  const b = await prisma.depositoBagagli.findFirst({ where: { id, hotelId } });
  if (!b) throw new Error("Deposito non trovato.");
  if (b.ritiratoIl) throw new Error("I bagagli sono già stati ritirati.");
  if (numeroCartellino !== b.numero) throw new Error("Il numero del cartellino non corrisponde: controlla prima di consegnare i bagagli.");
  const n = await prisma.depositoBagagli.updateMany({ where: { id, ritiratoIl: null }, data: { ritiratoIl: new Date(), ritiratoDa: utente, ritiroNota: nota.trim() || null } });
  if (n.count === 0) throw new Error("I bagagli sono già stati ritirati.");
}

export async function elencoBagagli(hotelId: number) {
  const r = await prisma.depositoBagagli.findMany({
    where: { hotelId, OR: [{ ritiratoIl: null }, { ritiratoIl: { gte: giorniFa(7) } }] },
    include: { prenotazione: { select: { segmenti: SEGMENTI } } },
    orderBy: { numero: "desc" },
  });
  const voce = (b: (typeof r)[number]) => ({
    id: b.id,
    numero: b.numero,
    prenotazioneId: b.prenotazioneId,
    nome: b.nome,
    camere: b.prenotazione ? camereDi(b.prenotazione.segmenti) : null,
    colli: b.colli,
    descrizione: b.descrizione,
    posizione: b.posizione,
    depositatoIl: b.depositatoIl.toISOString(),
    depositatoDa: b.depositatoDa,
    ritiratoIl: b.ritiratoIl?.toISOString() ?? null,
    ritiratoDa: b.ritiratoDa,
    ritiroNota: b.ritiroNota,
  });
  return { inDeposito: r.filter((b) => !b.ritiratoIl).map(voce), ritirati: r.filter((b) => b.ritiratoIl).map(voce) };
}

export async function cartellinoBagagli(hotelId: number, id: number) {
  const b = await prisma.depositoBagagli.findFirst({ where: { id, hotelId }, include: { hotel: { select: { nome: true } }, prenotazione: { select: { segmenti: SEGMENTI } } } });
  if (!b) throw new Error("Deposito non trovato.");
  return { hotel: b.hotel.nome, numero: b.numero, nome: b.nome, camere: b.prenotazione ? camereDi(b.prenotazione.segmenti) : null, colli: b.colli, descrizione: b.descrizione, depositatoIl: b.depositatoIl.toISOString(), depositatoDa: b.depositatoDa };
}

// ---------------- Valori ----------------

export type CustodiaInput = { prenotazioneId: number; descrizione: string; importo: number | null };

/** Nuova custodia: ricevuta numerata con il primo movimento (deposito). */
export async function apriCustodia(hotelId: number, d: CustodiaInput, utente: string) {
  if (!d.descrizione.trim()) throw new Error("Descrivi cosa viene lasciato in custodia (es. busta chiusa, gioielli, denaro contante).");
  if (d.importo !== null && !(d.importo > 0 && d.importo <= 1_000_000)) throw new Error("Importo non valido.");
  return conNumero(async (tx) => {
    const p = await prenotazioneValida(tx, hotelId, d.prenotazioneId);
    const ultimo = await tx.custodiaValori.aggregate({ where: { hotelId }, _max: { numero: true } });
    const c = await tx.custodiaValori.create({
      data: {
        hotelId,
        numero: (ultimo._max.numero ?? 0) + 1,
        prenotazioneId: p.id,
        nome: `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`,
        camera: camereDi(p.segmenti) || null,
        descrizione: d.descrizione.trim(),
        creataDa: utente,
        movimenti: { create: { tipo: "deposito", descrizione: d.descrizione.trim(), importo: d.importo, registratoDa: utente } },
      },
    });
    return { id: c.id, numero: c.numero };
  });
}

/** Movimento sul retro della ricevuta; il ritiro chiude la custodia (con il contante rimasto). */
export async function movimentoCustodia(hotelId: number, id: number, tipo: Exclude<TipoMovimentoValori, "deposito">, descrizione: string, importo: number | null, utente: string) {
  if (!(tipo in MOVIMENTI_VALORI) || (tipo as string) === "deposito") throw new Error("Movimento non previsto.");
  await prisma.$transaction(async (tx) => {
    const c = await tx.custodiaValori.findFirst({ where: { id, hotelId }, include: { movimenti: true } });
    if (!c) throw new Error("Custodia non trovata.");
    if (c.chiusaIl) throw new Error("La custodia è già chiusa (valori ritirati).");
    const saldo = saldoValori(c.movimenti.map((m) => ({ tipo: m.tipo, importo: m.importo === null ? null : Number(m.importo) })));
    if (importo !== null && !(importo > 0 && importo <= 1_000_000)) throw new Error("Importo non valido.");
    if (tipo === "prelievo" && importo === null && !descrizione.trim()) throw new Error("Indica l'importo o cosa viene prelevato.");
    if (tipo === "prelievo" && importo !== null && importo > saldo) throw new Error(`In custodia ci sono solo ${saldo.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} in contanti.`);
    if (tipo === "versamento" && importo === null && !descrizione.trim()) throw new Error("Indica l'importo o cosa viene aggiunto.");
    await tx.movimentoValori.create({
      data: { custodiaId: id, tipo, descrizione: descrizione.trim() || null, importo: tipo === "ritiro" ? (saldo > 0 ? saldo : null) : importo, registratoDa: utente },
    });
    if (tipo === "ritiro") {
      const n = await tx.custodiaValori.updateMany({ where: { id, chiusaIl: null }, data: { chiusaIl: new Date(), chiusaDa: utente } });
      if (n.count === 0) throw new Error("La custodia è già chiusa.");
    }
  });
}

function serializzaCustodia(c: Prisma.CustodiaValoriGetPayload<{ include: { movimenti: true } }>) {
  const movimenti = c.movimenti
    .sort((a, b) => a.data.getTime() - b.data.getTime() || a.id - b.id)
    .map((m) => ({ id: m.id, tipo: m.tipo as TipoMovimentoValori, descrizione: m.descrizione, importo: m.importo === null ? null : Number(m.importo), data: m.data.toISOString(), registratoDa: m.registratoDa }));
  return {
    id: c.id,
    numero: c.numero,
    prenotazioneId: c.prenotazioneId,
    nome: c.nome,
    camera: c.camera,
    descrizione: c.descrizione,
    creataIl: c.creataIl.toISOString(),
    creataDa: c.creataDa,
    chiusaIl: c.chiusaIl?.toISOString() ?? null,
    chiusaDa: c.chiusaDa,
    saldo: saldoValori(movimenti),
    movimenti,
  };
}

export async function elencoValori(hotelId: number) {
  const r = await prisma.custodiaValori.findMany({
    where: { hotelId, OR: [{ chiusaIl: null }, { chiusaIl: { gte: giorniFa(30) } }] },
    include: { movimenti: true },
    orderBy: { numero: "desc" },
  });
  return { aperte: r.filter((c) => !c.chiusaIl).map(serializzaCustodia), chiuse: r.filter((c) => c.chiusaIl).map(serializzaCustodia) };
}

export async function ricevutaValori(hotelId: number, id: number) {
  const c = await prisma.custodiaValori.findFirst({ where: { id, hotelId }, include: { movimenti: true, hotel: { select: { nome: true } } } });
  if (!c) throw new Error("Custodia non trovata.");
  return { hotel: c.hotel.nome, ...serializzaCustodia(c) };
}

// ---------------- Chiavi ----------------

export async function impostaChiavi(hotelId: number, segmentoId: number, consegnate: number, restituite: number) {
  validaChiavi(consegnate, restituite);
  const n = await prisma.segmentoSoggiorno.updateMany({ where: { id: segmentoId, prenotazione: { hotelId } }, data: { chiaviConsegnate: consegnate, chiaviRestituite: restituite } });
  if (n.count === 0) throw new Error("Camera della prenotazione non trovata.");
}

/** Camere con chiavi ancora fuori (consegnate e non restituite), in casa o partite negli ultimi 30 giorni. */
export async function chiaviFuori(hotelId: number) {
  const r = await prisma.segmentoSoggiorno.findMany({
    where: { prenotazione: { hotelId }, chiaviConsegnate: { gt: 0 }, dataFine: { gte: giorniFa(30) } },
    include: { camera: { select: { codice: true } }, tipoCamera: { select: { descrizione: true } }, ospite: { select: { nome: true, cognome: true } }, presenze: { select: { stato: true } } },
    orderBy: { dataFine: "asc" },
  });
  return r
    .filter((s) => s.chiaviConsegnate > s.chiaviRestituite)
    .map((s) => ({
      segmentoId: s.id,
      prenotazioneId: s.prenotazioneId,
      camera: s.camera?.codice ?? s.tipoCamera.descrizione,
      ospite: `${s.ospite.nome} ${s.ospite.cognome}`,
      consegnate: s.chiaviConsegnate,
      restituite: s.chiaviRestituite,
      partenza: s.dataFine.toISOString().slice(0, 10),
      partiti: s.presenze.length > 0 && s.presenze.every((p) => p.stato === "partito"),
    }));
}

/** Per il check-out: valori ancora in custodia e chiavi non restituite della prenotazione. */
export async function custodiaDellaPrenotazione(hotelId: number, prenotazioneId: number) {
  const [valori, segmenti] = await Promise.all([
    prisma.custodiaValori.count({ where: { hotelId, prenotazioneId, chiusaIl: null } }),
    prisma.segmentoSoggiorno.findMany({ where: { prenotazioneId, prenotazione: { hotelId } }, select: { chiaviConsegnate: true, chiaviRestituite: true } }),
  ]);
  return { valoriAperti: valori, chiaviMancanti: segmenti.reduce((t, s) => t + Math.max(0, s.chiaviConsegnate - s.chiaviRestituite), 0) };
}

