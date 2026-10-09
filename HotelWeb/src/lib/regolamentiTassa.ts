import { prisma } from "@/lib/prisma";
import { ricalcolaTassaPosizione } from "@/lib/tassaSoggiorno";

/**
 * Configurazione dei regolamenti della tassa di soggiorno (Piattaforma, solo superadmin: il
 * controllo è nelle action). Regole di integrità:
 * - una versione usata in un soggiorno chiuso è BLOCCATA: niente modifiche, se ne crea una nuova;
 * - le versioni di uno stesso comune non si sovrappongono;
 * - dopo ogni modifica si ricalcolano le posizioni ancora aperte degli hotel del comune.
 */

const TIPI_REGOLA = ["eta", "dichiarata", "riduzione", "tetto_annuo"] as const;
const MODI_TETTO = ["consecutive_struttura", "consecutive_anche_altrove"] as const;

export type DatiVersione = {
  validoDal: string;
  validoAl: string;
  attoRiferimento: string;
  fonteUrl: string;
  note: string;
  daConfermare: string;
  esclusiResidenti: boolean;
  stagionalitaDal: string;
  stagionalitaAl: string;
  azzeraAnnoSolare: boolean;
};

export type DatiTariffa = { id?: number; categoria: string; importo: number; tettoNotti: number | null; modoTetto: string; predefinita: boolean };

export type DatiRegola = {
  id?: number;
  codice: string;
  tipo: string;
  descrizione: string;
  articolo: string;
  documentoRichiesto: string;
  limite: string;
  etaSotto: number | null;
  etaDa: number | null;
  percentualeRiduzione: number | null;
  nottiTettoAnnuo: number | null;
};

const testo = (s: string) => (s.trim() ? s.trim() : null);
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Usata in almeno un soggiorno chiuso (lettura prudente: basta un ospite chiuso nella stessa prenotazione). */
async function versioneBloccata(regolamentoId: number) {
  const usata = await prisma.tassaNotte.findFirst({
    where: { regolamentoId, notte: { segmento: { prenotazione: { posizioniTassa: { some: { definitiva: true } } } } } },
    select: { id: true },
  });
  return usata !== null;
}

async function verificaModificabile(regolamentoId: number) {
  if (await versioneBloccata(regolamentoId)) {
    throw new Error("Questa versione è già stata usata in soggiorni chiusi: non si modifica. Crea una nuova versione da una data.");
  }
}

async function verificaNessunaSovrapposizione(comuneId: number, dal: Date, al: Date | null, escludiId?: number) {
  const altre = await prisma.regolamentoTassa.findMany({ where: { comuneId, id: escludiId ? { not: escludiId } : undefined } });
  const sovrapposta = altre.find((v) => (!al || v.validoDal <= al) && (!v.validoAl || v.validoAl >= dal));
  if (sovrapposta) {
    throw new Error(
      `Il periodo si sovrappone alla versione in vigore dal ${iso(sovrapposta.validoDal)}${sovrapposta.validoAl ? ` al ${iso(sovrapposta.validoAl)}` : ""}.`,
    );
  }
}

/** Ricalcola le posizioni aperte con notti negli hotel del comune (quelle chiuse restano come sono). */
async function ricalcolaComune(comuneId: number) {
  const presenze = await prisma.presenza.findMany({
    where: { segmento: { prenotazione: { hotel: { comuneId } } } },
    select: { ospiteId: true, segmento: { select: { prenotazioneId: true } } },
  });
  const coppie = [
    ...new Map(presenze.map((p) => [`${p.segmento.prenotazioneId}-${p.ospiteId}`, { prenotazioneId: p.segmento.prenotazioneId, ospiteId: p.ospiteId }])).values(),
  ];
  for (const c of coppie) {
    await prisma.$transaction((tx) => ricalcolaTassaPosizione(tx, c.prenotazioneId, c.ospiteId));
  }
}

export async function elencoRegolamenti() {
  const comuni = await prisma.comune.findMany({
    include: {
      hotel: { select: { nome: true } },
      regolamentiTassa: { include: { _count: { select: { tariffe: true, regole: true } } }, orderBy: { validoDal: "desc" } },
    },
    orderBy: { nome: "asc" },
  });
  const oggi = new Date();
  return comuni.map((c) => ({
    id: c.id,
    nome: c.nome,
    provincia: c.provincia,
    hotel: c.hotel.map((h) => h.nome),
    versioni: c.regolamentiTassa.map((v) => ({
      id: v.id,
      validoDal: iso(v.validoDal),
      validoAl: iso(v.validoAl),
      attoRiferimento: v.attoRiferimento,
      tariffe: v._count.tariffe,
      regole: v._count.regole,
      inVigore: v.validoDal <= oggi && (!v.validoAl || v.validoAl >= oggi),
      daConfermare: !!v.daConfermare,
    })),
  }));
}

export async function caricaVersione(id: number) {
  const v = await prisma.regolamentoTassa.findUniqueOrThrow({
    where: { id },
    include: { comune: true, tariffe: { orderBy: { categoria: "asc" } }, regole: { orderBy: [{ tipo: "asc" }, { descrizione: "asc" }] } },
  });
  return {
    id: v.id,
    comune: { id: v.comune.id, nome: v.comune.nome },
    bloccata: await versioneBloccata(v.id),
    dati: {
      validoDal: iso(v.validoDal),
      validoAl: iso(v.validoAl),
      attoRiferimento: v.attoRiferimento ?? "",
      fonteUrl: v.fonteUrl ?? "",
      note: v.note ?? "",
      daConfermare: v.daConfermare ?? "",
      esclusiResidenti: v.esclusiResidenti,
      stagionalitaDal: v.stagionalitaDal ?? "",
      stagionalitaAl: v.stagionalitaAl ?? "",
      azzeraAnnoSolare: v.azzeraAnnoSolare,
    } satisfies DatiVersione,
    tariffe: v.tariffe.map((t) => ({
      id: t.id,
      categoria: t.categoria,
      importo: Number(t.importo),
      tettoNotti: t.tettoNotti,
      modoTetto: t.modoTetto,
      predefinita: t.predefinita,
    })) satisfies DatiTariffa[],
    regole: v.regole.map((r) => ({
      id: r.id,
      codice: r.codice,
      tipo: r.tipo,
      descrizione: r.descrizione,
      articolo: r.articolo ?? "",
      documentoRichiesto: r.documentoRichiesto ?? "",
      limite: r.limite ?? "",
      etaSotto: r.etaSotto,
      etaDa: r.etaDa,
      percentualeRiduzione: r.percentualeRiduzione,
      nottiTettoAnnuo: r.nottiTettoAnnuo,
    })) satisfies DatiRegola[],
  };
}

function valoriVersione(d: DatiVersione) {
  if (!d.validoDal) throw new Error("Indica da quando vale la versione.");
  const validoDal = new Date(d.validoDal);
  const validoAl = d.validoAl ? new Date(d.validoAl) : null;
  if (validoAl && validoAl < validoDal) throw new Error("La fine validità non può precedere l'inizio.");
  const mmgg = /^\d{2}-\d{2}$/;
  const stagDal = testo(d.stagionalitaDal);
  const stagAl = testo(d.stagionalitaAl);
  if ((stagDal && !mmgg.test(stagDal)) || (stagAl && !mmgg.test(stagAl)) || (!stagDal !== !stagAl)) {
    throw new Error("Stagionalità: indica entrambe le date nel formato MM-GG (es. 05-01 e 10-31), oppure nessuna.");
  }
  return {
    validoDal,
    validoAl,
    attoRiferimento: testo(d.attoRiferimento),
    fonteUrl: testo(d.fonteUrl),
    note: testo(d.note),
    daConfermare: testo(d.daConfermare),
    esclusiResidenti: d.esclusiResidenti,
    stagionalitaDal: stagDal,
    stagionalitaAl: stagAl,
    azzeraAnnoSolare: d.azzeraAnnoSolare,
  };
}

export async function salvaDatiVersione(id: number, d: DatiVersione) {
  await verificaModificabile(id);
  const v = await prisma.regolamentoTassa.findUniqueOrThrow({ where: { id } });
  const valori = valoriVersione(d);
  await verificaNessunaSovrapposizione(v.comuneId, valori.validoDal, valori.validoAl, id);
  await prisma.regolamentoTassa.update({ where: { id }, data: valori });
  await ricalcolaComune(v.comuneId);
}

export async function salvaTariffe(id: number, tariffe: DatiTariffa[]) {
  await verificaModificabile(id);
  const v = await prisma.regolamentoTassa.findUniqueOrThrow({ where: { id } });
  const pulite = tariffe.map((t) => {
    const categoria = t.categoria.trim();
    if (!categoria) throw new Error("Ogni tariffa deve avere la sua categoria.");
    if (!(t.importo >= 0)) throw new Error(`Importo non valido per "${categoria}".`);
    if (t.tettoNotti !== null && !(Number.isInteger(t.tettoNotti) && t.tettoNotti > 0)) throw new Error(`Tetto notti non valido per "${categoria}".`);
    if (!(MODI_TETTO as readonly string[]).includes(t.modoTetto)) throw new Error(`Modo di conteggio non valido per "${categoria}".`);
    return { ...t, categoria };
  });
  if (new Set(pulite.map((t) => t.categoria)).size !== pulite.length) throw new Error("Due tariffe hanno la stessa categoria.");
  if (pulite.filter((t) => t.predefinita).length > 1) throw new Error("Una sola tariffa può essere la predefinita.");

  await prisma.$transaction(async (tx) => {
    const tenute = pulite.filter((t) => t.id).map((t) => t.id!);
    await tx.tariffaTassa.deleteMany({ where: { regolamentoId: id, id: { notIn: tenute } } });
    for (const t of pulite) {
      const dati = { categoria: t.categoria, importo: t.importo, tettoNotti: t.tettoNotti, modoTetto: t.modoTetto, predefinita: t.predefinita };
      if (t.id) await tx.tariffaTassa.update({ where: { id: t.id, regolamentoId: id }, data: dati });
      else await tx.tariffaTassa.create({ data: { ...dati, regolamentoId: id } });
    }
  });
  await ricalcolaComune(v.comuneId);
}

export async function salvaRegole(id: number, regole: DatiRegola[]) {
  await verificaModificabile(id);
  const v = await prisma.regolamentoTassa.findUniqueOrThrow({ where: { id } });
  const intero = (n: number | null) => (n === null || Number.isNaN(n) ? null : n);
  const pulite = regole.map((r) => {
    const codice = r.codice.trim().toUpperCase().replace(/\s+/g, "_");
    if (!codice || !r.descrizione.trim()) throw new Error("Ogni regola deve avere codice e descrizione.");
    if (!(TIPI_REGOLA as readonly string[]).includes(r.tipo)) throw new Error(`Tipo non valido per la regola ${codice}.`);
    if (r.tipo === "eta" && intero(r.etaSotto) === null && intero(r.etaDa) === null) throw new Error(`${codice}: indica l'età (sotto o da).`);
    if (r.tipo === "riduzione" && !(r.percentualeRiduzione && r.percentualeRiduzione > 0 && r.percentualeRiduzione <= 100))
      throw new Error(`${codice}: percentuale di riduzione tra 1 e 100.`);
    if (r.tipo === "tetto_annuo" && !(r.nottiTettoAnnuo && r.nottiTettoAnnuo > 0)) throw new Error(`${codice}: indica le notti del tetto annuo.`);
    return {
      id: r.id,
      codice,
      tipo: r.tipo,
      descrizione: r.descrizione.trim(),
      articolo: testo(r.articolo),
      documentoRichiesto: testo(r.documentoRichiesto),
      limite: testo(r.limite),
      etaSotto: r.tipo === "eta" ? intero(r.etaSotto) : null,
      etaDa: r.tipo === "eta" ? intero(r.etaDa) : null,
      percentualeRiduzione: r.tipo === "riduzione" ? r.percentualeRiduzione : null,
      nottiTettoAnnuo: r.tipo === "tetto_annuo" ? r.nottiTettoAnnuo : null,
    };
  });
  if (new Set(pulite.map((r) => r.codice)).size !== pulite.length) throw new Error("Due regole hanno lo stesso codice.");

  await prisma.$transaction(async (tx) => {
    const tenute = pulite.filter((r) => r.id).map((r) => r.id!);
    const daTogliere = await tx.regolaTassa.findMany({
      where: { regolamentoId: id, id: { notIn: tenute } },
      include: { _count: { select: { dichiarazioni: true } } },
    });
    const usata = daTogliere.find((r) => r._count.dichiarazioni > 0);
    if (usata) throw new Error(`La regola "${usata.descrizione}" è usata in dichiarazioni di ospiti: non si può eliminare.`);
    await tx.regolaTassa.deleteMany({ where: { id: { in: daTogliere.map((r) => r.id) } } });
    for (const { id: regolaId, ...dati } of pulite) {
      if (regolaId) await tx.regolaTassa.update({ where: { id: regolaId, regolamentoId: id }, data: dati });
      else await tx.regolaTassa.create({ data: { ...dati, regolamentoId: id } });
    }
  });
  await ricalcolaComune(v.comuneId);
}

/**
 * Nuova versione da una data, copiando tariffe e regole di una versione esistente (o vuota).
 * La versione aperta che copre quella data viene chiusa al giorno prima: è il caso "Roma passa
 * da 3,50 a 6 €": le notti prima restano con la tariffa di allora.
 */
export async function nuovaVersione(comuneId: number, validoDalIso: string, copiaDaId: number | null) {
  if (!validoDalIso) throw new Error("Indica da quando vale la nuova versione.");
  const validoDal = new Date(validoDalIso);
  const nuovaId = await prisma.$transaction(async (tx) => {
    const aperta = await tx.regolamentoTassa.findFirst({
      where: { comuneId, validoDal: { lt: validoDal }, OR: [{ validoAl: null }, { validoAl: { gte: validoDal } }] },
    });
    if (aperta) {
      const giornoPrima = new Date(validoDal.getTime() - 24 * 60 * 60 * 1000);
      await tx.regolamentoTassa.update({ where: { id: aperta.id }, data: { validoAl: giornoPrima } });
    }
    const successive = await tx.regolamentoTassa.findFirst({ where: { comuneId, validoDal: { gte: validoDal } } });
    if (successive) throw new Error(`Esiste già una versione che inizia il ${iso(successive.validoDal)} o dopo: modifica quella.`);

    const origine = copiaDaId
      ? await tx.regolamentoTassa.findFirstOrThrow({ where: { id: copiaDaId, comuneId }, include: { tariffe: true, regole: true } })
      : null;
    const nuova = await tx.regolamentoTassa.create({
      data: {
        comuneId,
        validoDal,
        attoRiferimento: null,
        fonteUrl: origine?.fonteUrl ?? null,
        note: origine?.note ?? null,
        daConfermare: origine?.daConfermare ?? null,
        esclusiResidenti: origine?.esclusiResidenti ?? true,
        stagionalitaDal: origine?.stagionalitaDal ?? null,
        stagionalitaAl: origine?.stagionalitaAl ?? null,
        azzeraAnnoSolare: origine?.azzeraAnnoSolare ?? true,
        tariffe: origine
          ? { create: origine.tariffe.map(({ categoria, importo, tettoNotti, modoTetto, predefinita }) => ({ categoria, importo, tettoNotti, modoTetto, predefinita })) }
          : undefined,
        regole: origine
          ? {
              create: origine.regole.map(({ id: _id, regolamentoId: _r, ...r }) => r),
            }
          : undefined,
      },
    });
    return nuova.id;
  });
  await ricalcolaComune(comuneId);
  return nuovaId;
}

/**
 * Elimina una versione non usata in soggiorni chiusi (errori di inserimento). Le tasse provvisorie
 * che la usavano sono solo un calcolo: si cancellano e si ricalcolano con le versioni rimaste.
 */
export async function eliminaVersione(id: number) {
  if (await versioneBloccata(id)) {
    throw new Error("Versione già usata in soggiorni chiusi: non si elimina (chiudila con una data di fine o crea una nuova versione).");
  }
  const v = await prisma.$transaction(async (tx) => {
    await tx.tassaNotte.deleteMany({ where: { regolamentoId: id } });
    const eliminata = await tx.regolamentoTassa.delete({ where: { id } });
    // Se la precedente era stata chiusa al giorno prima da nuovaVersione, torna com'era.
    const giornoPrima = new Date(eliminata.validoDal.getTime() - 24 * 60 * 60 * 1000);
    await tx.regolamentoTassa.updateMany({
      where: { comuneId: eliminata.comuneId, validoAl: giornoPrima },
      data: { validoAl: eliminata.validoAl },
    });
    return eliminata;
  });
  await ricalcolaComune(v.comuneId);
}
