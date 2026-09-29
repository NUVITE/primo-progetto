import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Tabelle ufficiali Polizia di Stato (Alloggiati Web): comuni, stati e tipi di documento, dai link
 * pubblici del portale (nessuna credenziale). Formato verificato il 2026-09-29: CSV con virgola,
 * intestazione, CRLF, nessun delimitatore di testo; DataFineVal "gg/mm/aaaa hh:mm:ss" o vuoto.
 * I codici cessati non si cancellano mai (servono per nascite e storico): si aggiorna o si aggiunge.
 */
const BASE = "https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/ashx/Download.ashx";
const FONTI = {
  comuni: `${BASE}?ID=0&N=COMUNI`,
  stati: `${BASE}?ID=1&N=STATI`,
  documenti: `${BASE}?ID=2&N=DOCUMENTI`,
};

/** Tipi di alloggiato: 5 codici fissi del tracciato (tabella ufficiale TIPO_ALLOGGIATO). */
export const TIPI_ALLOGGIATO: { codice: number; descrizione: string; documento: boolean }[] = [
  { codice: 16, descrizione: "Ospite singolo", documento: true },
  { codice: 17, descrizione: "Capofamiglia", documento: true },
  { codice: 18, descrizione: "Capogruppo", documento: true },
  { codice: 19, descrizione: "Familiare", documento: false },
  { codice: 20, descrizione: "Membro del gruppo", documento: false },
];

export const CODICE_ITALIA = "100000100";

async function scarica(url: string) {
  const risposta = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!risposta.ok) throw new Error(`Portale Alloggiati: risposta ${risposta.status} scaricando ${url}.`);
  const righe = (await risposta.text()).split(/\r?\n/).filter((r) => r.trim());
  if (righe.length < 2) throw new Error(`Portale Alloggiati: file vuoto da ${url}.`);
  return righe.slice(1).map((r) => r.split(","));
}

function dataFine(testo: string | undefined) {
  const m = testo?.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))) : null;
}

/** Codice, descrizione, provincia, data fine: la descrizione è tutto ciò che sta tra primo e penultimo campo. */
function luogo(campi: string[], tipo: "comune" | "stato") {
  const codice = campi[0].trim();
  const provincia = campi[campi.length - 2]?.trim() || null;
  const descrizione = campi.slice(1, -2).join(",").trim();
  if (!/^\d{9}$/.test(codice) || !descrizione) return null;
  return { codice, descrizione, provincia, tipo, dataFineVal: dataFine(campi[campi.length - 1]) };
}

async function inserisciLuoghi(righe: NonNullable<ReturnType<typeof luogo>>[]) {
  for (let i = 0; i < righe.length; i += 500) {
    const blocco = righe.slice(i, i + 500);
    await prisma.$executeRaw`
      INSERT INTO LuogoPolizia (codice, descrizione, provincia, tipo, dataFineVal, aggiornatoIl)
      VALUES ${Prisma.join(blocco.map((r) => Prisma.sql`(${r.codice}, ${r.descrizione}, ${r.provincia}, ${r.tipo}, ${r.dataFineVal}, NOW(3))`))}
      ON DUPLICATE KEY UPDATE descrizione = VALUES(descrizione), provincia = VALUES(provincia), tipo = VALUES(tipo),
        dataFineVal = VALUES(dataFineVal), aggiornatoIl = NOW(3)`;
  }
}

export async function aggiornaTabellePolizia() {
  const [comuni, stati, documenti] = await Promise.all([scarica(FONTI.comuni), scarica(FONTI.stati), scarica(FONTI.documenti)]);
  const luoghiComuni = comuni.map((c) => luogo(c, "comune")).filter((x) => x !== null);
  const luoghiStati = stati.map((c) => luogo(c, "stato")).filter((x) => x !== null);
  const docs = documenti
    .map((c) => ({ codice: c[0].trim(), descrizione: c.slice(1).join(",").trim() }))
    .filter((d) => d.codice && d.descrizione);
  // Controllo di plausibilità: se il portale cambia formato meglio fermarsi che importare dati rotti.
  if (luoghiComuni.length < 5000 || luoghiStati.length < 100 || docs.length < 10) {
    throw new Error(
      `Tabelle Polizia con un numero di righe inatteso (comuni ${luoghiComuni.length}, stati ${luoghiStati.length}, documenti ${docs.length}): importazione annullata.`,
    );
  }

  await inserisciLuoghi([...luoghiComuni, ...luoghiStati]);
  await prisma.$executeRaw`
    INSERT INTO DocumentoPolizia (codice, descrizione, aggiornatoIl)
    VALUES ${Prisma.join(docs.map((d) => Prisma.sql`(${d.codice}, ${d.descrizione}, NOW(3))`))}
    ON DUPLICATE KEY UPDATE descrizione = VALUES(descrizione), aggiornatoIl = NOW(3)`;
  return { comuni: luoghiComuni.length, stati: luoghiStati.length, documenti: docs.length };
}

export async function statoTabellePolizia() {
  const [comuni, comuniValidi, stati, documenti, ultimo] = await Promise.all([
    prisma.luogoPolizia.count({ where: { tipo: "comune" } }),
    prisma.luogoPolizia.count({ where: { tipo: "comune", dataFineVal: null } }),
    prisma.luogoPolizia.count({ where: { tipo: "stato" } }),
    prisma.documentoPolizia.count(),
    prisma.luogoPolizia.aggregate({ _max: { aggiornatoIl: true } }),
  ]);
  return { comuni, comuniValidi, stati, documenti, aggiornateIl: ultimo._max.aggiornatoIl?.toISOString() ?? null };
}

/**
 * Ricerca per il check-in. Comuni: validi alla data indicata (per la nascita anche un comune poi
 * soppresso); senza data, solo quelli validi oggi. Stati: sempre tutti i validi.
 */
export async function cercaLuoghi(testo: string, tipo: "comune" | "stato", validoAl?: Date) {
  const q = testo.trim();
  if (q.length < 2) return [];
  const data = validoAl ?? new Date();
  const risultati = await prisma.luogoPolizia.findMany({
    where: {
      tipo,
      descrizione: { startsWith: q.toUpperCase() },
      OR: [{ dataFineVal: null }, { dataFineVal: { gt: data } }],
    },
    orderBy: [{ descrizione: "asc" }],
    take: 15,
  });
  return risultati.map((l) => ({ codice: l.codice, descrizione: l.descrizione, provincia: l.tipo === "comune" ? l.provincia : null }));
}

export async function elencoDocumenti() {
  return prisma.documentoPolizia.findMany({ orderBy: { descrizione: "asc" } });
}

/** Descrizioni leggibili per un insieme di codici luogo (per mostrare i dati salvati). */
export async function descriviLuoghi(codici: (string | null | undefined)[]) {
  const unici = [...new Set(codici.filter((c): c is string => !!c))];
  if (!unici.length) return {} as Record<string, string>;
  const luoghi = await prisma.luogoPolizia.findMany({ where: { codice: { in: unici } } });
  return Object.fromEntries(luoghi.map((l) => [l.codice, l.tipo === "comune" ? `${l.descrizione} (${l.provincia})` : l.descrizione]));
}
