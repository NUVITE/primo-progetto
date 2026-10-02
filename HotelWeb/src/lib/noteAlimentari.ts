import { prisma } from "@/lib/prisma";
import { GIORNI_CONSERVAZIONE, sintesiNota, validaNota, type NotaInput, type VoceNota } from "@/lib/allergeni";

/**
 * Note alimentari degli ospiti (regole pure in allergeni.ts). Le note "solo per questo soggiorno"
 * si cancellano da sole 7 giorni dopo l'ultima partenza: la pulizia gira prima di ogni lettura,
 * così una nota scaduta non si vede mai anche se nessun processo pianificato è passato.
 */

const giorno = (d: Date) => d.toISOString().slice(0, 10);
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/** Cancella le note "solo per questo soggiorno" scadute dell'hotel; restituisce quante. */
export async function pulisciNoteScadute(hotelId: number) {
  const note = await prisma.notaAlimentare.findMany({ where: { hotelId, consenso: "soggiorno" }, select: { id: true, ospiteId: true, consensoIl: true } });
  if (!note.length) return 0;
  const limite = new Date(Date.parse(`${oggi()}T00:00:00Z`) - GIORNI_CONSERVAZIONE * 86400000);
  const daCancellare: number[] = [];
  for (const n of note) {
    // Ultima partenza dell'ospite: soggiorni di cui è intestatario o in cui è registrato.
    const ultimo = await prisma.segmentoSoggiorno.findFirst({
      where: { stato: { not: "ANNULLATO" }, prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, OR: [{ ospiteId: n.ospiteId }, { presenze: { some: { ospiteId: n.ospiteId } } }] },
      orderBy: { dataFine: "desc" },
      select: { dataFine: true },
    });
    const riferimento = ultimo ? ultimo.dataFine : new Date(`${giorno(n.consensoIl)}T00:00:00Z`);
    if (riferimento < limite) daCancellare.push(n.id);
  }
  if (daCancellare.length) await prisma.notaAlimentare.deleteMany({ where: { id: { in: daCancellare } } });
  return daCancellare.length;
}

export type NotaOspite = {
  ospiteId: number;
  voci: VoceNota[];
  regimi: string[];
  esigenze: string;
  consenso: string;
  consensoModo: string;
  consensoIl: string;
  consensoDa: string;
  aggiornataDa: string;
  sintesi: string;
  allergie: boolean;
};

/** Note degli ospiti indicati (dopo la pulizia delle scadute), per ospiteId. */
export async function noteDegliOspiti(hotelId: number, ospiteIds: number[]): Promise<Record<number, NotaOspite>> {
  await pulisciNoteScadute(hotelId);
  if (!ospiteIds.length) return {};
  const note = await prisma.notaAlimentare.findMany({ where: { hotelId, ospiteId: { in: ospiteIds } } });
  return Object.fromEntries(
    note.map((n) => {
      const voci = (n.voci as VoceNota[]) ?? [];
      const regimi = (n.regimi as string[]) ?? [];
      const s = sintesiNota({ voci, regimi, esigenze: n.esigenze });
      return [
        n.ospiteId,
        {
          ospiteId: n.ospiteId,
          voci,
          regimi,
          esigenze: n.esigenze ?? "",
          consenso: n.consenso,
          consensoModo: n.consensoModo,
          consensoIl: n.consensoIl.toISOString(),
          consensoDa: n.consensoDa,
          aggiornataDa: n.aggiornataDa,
          sintesi: s.testo,
          allergie: s.allergie,
        },
      ];
    }),
  );
}

/** Registra o aggiorna le note di un ospite (serve il consenso esplicito, ogni volta). */
export async function salvaNotaAlimentare(hotelId: number, ospiteId: number, d: NotaInput, utente: string) {
  const v = validaNota(d);
  await prisma.ospite.findFirstOrThrow({ where: { id: ospiteId, hotelId } });
  const dati = { voci: v.voci, regimi: v.regimi, esigenze: v.esigenze || null, consenso: v.consenso, consensoModo: v.consensoModo, aggiornataDa: utente };
  const esistente = await prisma.notaAlimentare.findUnique({ where: { ospiteId } });
  // Il consenso si registra quando nasce la nota o quando cambia (durata o modo).
  const consensoNuovo = !esistente || esistente.consenso !== v.consenso || esistente.consensoModo !== v.consensoModo;
  await prisma.notaAlimentare.upsert({
    where: { ospiteId },
    create: { hotelId, ospiteId, ...dati, consensoDa: utente },
    update: { ...dati, ...(consensoNuovo ? { consensoIl: new Date(), consensoDa: utente } : {}) },
  });
}

/** Revoca del consenso o note non più valide: si cancellano subito, senza copie. */
export async function cancellaNotaAlimentare(hotelId: number, ospiteId: number) {
  const n = await prisma.notaAlimentare.deleteMany({ where: { hotelId, ospiteId } });
  if (!n.count) throw new Error("Questo ospite non ha note alimentari.");
}

/** Ospiti di una prenotazione (intestatari delle camere e persone registrate) con le loro note. */
export async function noteDellaPrenotazione(hotelId: number, prenotazioneId: number) {
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: { prenotazioneId, prenotazione: { hotelId }, stato: { not: "ANNULLATO" } },
    include: { ospite: true, camera: true, presenze: { include: { ospite: true } } },
    orderBy: { id: "asc" },
  });
  const persone = new Map<number, { ospiteId: number; nome: string; camera: string | null }>();
  for (const s of segmenti) {
    for (const o of [s.ospite, ...s.presenze.map((p) => p.ospite)]) {
      if (!persone.has(o.id)) persone.set(o.id, { ospiteId: o.id, nome: `${o.nome} ${o.cognome}`.trim(), camera: s.camera?.codice ?? null });
    }
  }
  const note = await noteDegliOspiti(hotelId, [...persone.keys()]);
  return [...persone.values()].filter((p) => note[p.ospiteId]).map((p) => ({ ...p, sintesi: note[p.ospiteId].sintesi, allergie: note[p.ospiteId].allergie }));
}
