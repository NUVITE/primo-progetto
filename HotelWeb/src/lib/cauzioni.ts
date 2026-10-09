/**
 * Cauzione (deposito cauzionale): proposta dai tipi delle camere, incasso, restituzione con eventuale
 * trattenuta. Non è un incasso: sta fuori dal conto e dal giornale; nella cassa del giorno ha la sua
 * voce e conta nei contanti del cassetto. La trattenuta per danni diventa, in un'unica operazione, un
 * addebito "Risarcimento danni" (fuori campo IVA) sul conto e un pagamento di pari importo preso dalla
 * cauzione: il conto torna in pari e in cassa il denaro passa dalla voce cauzioni agli incassi.
 */
import { prisma } from "@/lib/prisma";
import { oggiItaliano, verificaCassaAperta } from "@/lib/cassaAperta";
import { DESCRIZIONE_TRATTENUTA, METODI_CAUZIONE, NOME_REPARTO_DANNI, calcolaRestituzione, cauzioneProposta, type MetodoCauzione } from "@/lib/cauzioniRegole";

const giorno = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function datiCauzione(hotelId: number, prenotazioneId: number) {
  const p = await prisma.prenotazione.findFirstOrThrow({
    where: { id: prenotazioneId, hotelId },
    select: { cauzione: true, segmenti: { where: { stato: { not: "ANNULLATO" } }, select: { tipoCamera: { select: { cauzione: true } } } } },
  });
  const c = p.cauzione;
  return {
    proposta: cauzioneProposta(p.segmenti.map((s) => ({ cauzione: n(s.tipoCamera.cauzione) }))),
    cauzione: c
      ? {
          importo: Number(c.importo),
          metodo: c.metodo,
          incassataIl: giorno(c.incassataIl)!,
          incassataDa: c.incassataDa,
          restituitaIl: giorno(c.restituitaIl),
          restituitaDa: c.restituitaDa,
          metodoRestituzione: c.metodoRestituzione,
          importoRestituito: n(c.importoRestituito),
          trattenuta: n(c.trattenuta),
          motivoTrattenuta: c.motivoTrattenuta,
        }
      : null,
  };
}

export async function incassaCauzione(hotelId: number, prenotazioneId: number, importo: number, metodo: string, utente: string) {
  if (!(metodo in METODI_CAUZIONE)) throw new Error("Metodo non previsto.");
  if (!(importo > 0 && importo <= 100000)) throw new Error("Indica l'importo della cauzione.");
  const oggi = oggiItaliano();
  await prisma.$transaction(async (tx) => {
    const p = await tx.prenotazione.findFirst({ where: { id: prenotazioneId, hotelId }, select: { stato: true, cauzione: { select: { id: true } } } });
    if (!p) throw new Error("Prenotazione non trovata.");
    if (p.stato === "ANNULLATA") throw new Error("La prenotazione è annullata.");
    if (p.cauzione) throw new Error("La cauzione di questa prenotazione è già registrata.");
    await verificaCassaAperta(tx, hotelId, oggi);
    await tx.cauzione.create({ data: { hotelId, prenotazioneId, importo, metodo, incassataIl: new Date(oggi), incassataDa: utente } });
  });
}

/** Restituzione (tutta o con trattenuta motivata, che va sul conto come risarcimento danni). */
export async function restituisciCauzione(hotelId: number, prenotazioneId: number, trattenuta: number, motivo: string, metodo: MetodoCauzione, utente: string) {
  if (!(metodo in METODI_CAUZIONE)) throw new Error("Metodo non previsto.");
  const oggi = oggiItaliano();
  await prisma.$transaction(async (tx) => {
    const c = await tx.cauzione.findFirst({ where: { prenotazioneId, hotelId } });
    if (!c) throw new Error("Nessuna cauzione incassata per questa prenotazione.");
    if (c.restituitaIl) throw new Error("La cauzione è già stata restituita.");
    const r = calcolaRestituzione(Number(c.importo), trattenuta, motivo);
    await verificaCassaAperta(tx, hotelId, oggi);
    let addebitoId: number | null = null;
    let pagamentoId: number | null = null;
    if (r.trattenuta > 0) {
      // Reparto dei danni senza IVA (fuori campo): si crea la prima volta che serve.
      const reparto =
        (await tx.repartoAddebito.findFirst({ where: { hotelId, nome: NOME_REPARTO_DANNI } })) ??
        (await tx.repartoAddebito.create({ data: { hotelId, nome: NOME_REPARTO_DANNI, aliquotaIva: null, esborso: false, ordine: 99 } }));
      const a = await tx.addebitoConto.create({
        data: {
          prenotazioneId,
          repartoId: reparto.id,
          tipo: "extra",
          data: new Date(`${oggi}T00:00:00.000Z`),
          descrizione: DESCRIZIONE_TRATTENUTA,
          quantita: 1,
          prezzoUnitario: r.trattenuta,
          aliquotaIva: null,
          nota: motivo.trim(),
          registratoDa: utente,
        },
      });
      const pg = await tx.pagamento.create({
        data: { hotelId, prenotazioneId, data: new Date(oggi), importo: r.trattenuta, metodo: c.metodo, tipo: "saldo", nota: "Trattenuta dalla cauzione", registratoDa: utente, intestatario: "ospite" },
      });
      addebitoId = a.id;
      pagamentoId = pg.id;
    }
    await tx.cauzione.update({
      where: { id: c.id },
      data: {
        restituitaIl: new Date(oggi),
        restituitaDa: utente,
        metodoRestituzione: r.restituito > 0 ? metodo : null,
        importoRestituito: r.restituito,
        trattenuta: r.trattenuta || null,
        motivoTrattenuta: r.trattenuta > 0 ? motivo.trim() : null,
        addebitoId,
        pagamentoId,
      },
    });
  });
}

export type MovimentoCauzione = { chiave: string; prenotazioneId: number; descrizione: string; tipo: "incasso" | "restituzione" | "trattenuta"; metodo: string; importo: number; operatore: string };

/**
 * Movimenti delle cauzioni di un giorno per la cassa: incassi (+), restituzioni (−) e trattenute (−,
 * passano agli incassi come pagamento del risarcimento).
 */
export async function cauzioniDelGiorno(hotelId: number, g: string) {
  const data = new Date(g);
  const r = await prisma.cauzione.findMany({
    where: { hotelId, OR: [{ incassataIl: data }, { restituitaIl: data }] },
    include: { prenotazione: { select: { ospitePrenotante: { select: { nome: true, cognome: true } } } } },
    orderBy: { id: "asc" },
  });
  const movimenti: MovimentoCauzione[] = [];
  for (const c of r) {
    const descrizione = `Prenotazione n. ${c.prenotazioneId} · ${c.prenotazione.ospitePrenotante.cognome} ${c.prenotazione.ospitePrenotante.nome}`;
    if (giorno(c.incassataIl) === g) movimenti.push({ chiave: `ci-${c.id}`, prenotazioneId: c.prenotazioneId, descrizione, tipo: "incasso", metodo: c.metodo, importo: Number(c.importo), operatore: c.incassataDa });
    if (giorno(c.restituitaIl) === g) {
      if (Number(c.importoRestituito ?? 0) > 0)
        movimenti.push({ chiave: `cr-${c.id}`, prenotazioneId: c.prenotazioneId, descrizione, tipo: "restituzione", metodo: c.metodoRestituzione ?? c.metodo, importo: -Number(c.importoRestituito), operatore: c.restituitaDa ?? "" });
      if (Number(c.trattenuta ?? 0) > 0)
        movimenti.push({ chiave: `ct-${c.id}`, prenotazioneId: c.prenotazioneId, descrizione, tipo: "trattenuta", metodo: c.metodo, importo: -Number(c.trattenuta), operatore: c.restituitaDa ?? "" });
    }
  }
  const contanti = Math.round(movimenti.filter((m) => m.metodo === "contanti").reduce((t, m) => t + m.importo, 0) * 100) / 100;
  return { movimenti, contanti };
}

/** Per il check-out: cauzione incassata e non ancora restituita. */
export async function cauzioneDaRestituire(hotelId: number, prenotazioneId: number) {
  const c = await prisma.cauzione.findFirst({ where: { hotelId, prenotazioneId, restituitaIl: null }, select: { importo: true } });
  return c ? Number(c.importo) : null;
}
