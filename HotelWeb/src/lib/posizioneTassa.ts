import { prisma } from "@/lib/prisma";
import { ETICHETTA_ESITO, ricalcolaTassaPosizione, verificaPosizioneAperta, type EsitoTassa } from "@/lib/tassaSoggiorno";

/**
 * Operazioni della reception sulla tassa di soggiorno di un ospite in una prenotazione
 * (dati dichiarati, esenzioni, check-out, riapertura). Il calcolo resta nel motore unico
 * (tassaSoggiorno.ts); qui solo verifiche di appartenenza all'hotel e registrazione.
 */

async function prenotazioneDelHotel(hotelId: number, prenotazioneId: number) {
  return prisma.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId }, include: { hotel: true } });
}

async function ospiteNellaPrenotazione(prenotazioneId: number, ospiteId: number) {
  const c = await prisma.presenza.count({ where: { ospiteId, segmento: { prenotazioneId } } });
  if (!c) throw new Error("Questo ospite non fa parte della prenotazione.");
}

/** Quadro tassa della prenotazione, un blocco per ospite. */
export async function datiTassaPrenotazione(hotelId: number, prenotazioneId: number) {
  const prenotazione = await prenotazioneDelHotel(hotelId, prenotazioneId);
  const presenze = await prisma.presenza.findMany({
    where: { segmento: { prenotazioneId } },
    include: {
      ospite: true,
      segmento: { select: { dataInizio: true } },
      tasse: { include: { notte: true, regola: true } },
    },
    orderBy: { id: "asc" },
  });
  const posizioni = await prisma.posizioneTassa.findMany({
    where: { prenotazioneId },
    include: {
      dichiarazioni: { include: { regola: true }, orderBy: { consegnataIl: "asc" } },
      eventi: { include: { utente: { select: { nome: true } } }, orderBy: { createdAt: "desc" } },
    },
  });

  // Regole della versione in vigore all'arrivo: quelle che la reception può dichiarare.
  const arrivo = presenze.reduce<Date | null>((m, p) => {
    const d = p.dal ?? p.segmento.dataInizio;
    return !m || d < m ? d : m;
  }, null);
  const versione = arrivo
    ? await prisma.regolamentoTassa.findFirst({
        where: { comuneId: prenotazione.hotel.comuneId, validoDal: { lte: arrivo }, OR: [{ validoAl: null }, { validoAl: { gte: arrivo } }] },
        include: { regole: { orderBy: { descrizione: "asc" } }, comune: true },
      })
    : null;

  const ospiti = [...new Map(presenze.map((p) => [p.ospiteId, p.ospite])).values()];
  return {
    regolamento: versione
      ? {
          comune: versione.comune.nome,
          atto: versione.attoRiferimento,
          daConfermare: versione.daConfermare,
          regoleDichiarabili: versione.regole
            .filter((r) => r.tipo !== "eta")
            .map((r) => ({ id: r.id, codice: r.codice, tipo: r.tipo, descrizione: r.descrizione, articolo: r.articolo, documentoRichiesto: r.documentoRichiesto, limite: r.limite })),
        }
      : null,
    ospiti: ospiti.map((o) => {
      const pos = posizioni.find((p) => p.ospiteId === o.id);
      // Righe di tassa della persona (una per notte trascorsa, anche su più camere).
      const notti = presenze
        .filter((p) => p.ospiteId === o.id)
        .flatMap((p) => p.tasse)
        .sort((a, b) => a.notte.data.getTime() - b.notte.data.getTime());
      return {
        ospiteId: o.id,
        nome: `${o.nome} ${o.cognome}`,
        dataNascita: o.dataNascita?.toISOString().slice(0, 10) ?? null,
        posizioneId: pos?.id ?? null,
        definitiva: pos?.definitiva ?? false,
        residente: pos?.residente ?? false,
        nottiPrecedentiAltrove: pos?.nottiPrecedentiAltrove ?? 0,
        nottiAnnoDichiarate: pos?.nottiAnnoDichiarate ?? 0,
        rifiutoPagamento: pos?.rifiutoPagamento ?? false,
        notaRifiuto: pos?.notaRifiuto ?? "",
        notti: notti.map((t) => ({
          data: t.notte.data.toISOString().slice(0, 10),
          esito: t.esito as EsitoTassa,
          etichetta: ETICHETTA_ESITO[t.esito as EsitoTassa],
          importo: Number(t.importo),
          motivo: t.regola?.descrizione ?? null,
        })),
        dichiarazioni: (pos?.dichiarazioni ?? []).map((d) => ({
          id: d.id,
          regola: d.regola.descrizione,
          codice: d.regola.codice,
          dal: d.dal?.toISOString().slice(0, 10) ?? null,
          al: d.al?.toISOString().slice(0, 10) ?? null,
          tipoDocumento: d.tipoDocumento,
          estremiDocumento: d.estremiDocumento,
          consegnataIl: d.consegnataIl.toISOString().slice(0, 10),
          note: d.note,
        })),
        eventi: (pos?.eventi ?? []).map((e) => ({
          tipo: e.tipo,
          utente: e.utente.nome,
          quando: e.createdAt.toISOString(),
          nota: e.nota,
        })),
      };
    }),
  };
}

export type DatiPosizioneInput = {
  residente: boolean;
  nottiPrecedentiAltrove: number;
  nottiAnnoDichiarate: number;
  rifiutoPagamento: boolean;
  notaRifiuto: string;
};

export async function impostaDatiPosizione(hotelId: number, prenotazioneId: number, ospiteId: number, input: DatiPosizioneInput) {
  await prenotazioneDelHotel(hotelId, prenotazioneId);
  await ospiteNellaPrenotazione(prenotazioneId, ospiteId);
  const intero = (n: number) => (Number.isInteger(n) && n >= 0 && n <= 366 ? n : 0);
  await prisma.$transaction(async (tx) => {
    await verificaPosizioneAperta(tx, prenotazioneId, ospiteId);
    await tx.posizioneTassa.upsert({
      where: { prenotazioneId_ospiteId: { prenotazioneId, ospiteId } },
      update: {},
      create: { prenotazioneId, ospiteId },
    });
    await tx.posizioneTassa.update({
      where: { prenotazioneId_ospiteId: { prenotazioneId, ospiteId } },
      data: {
        residente: input.residente,
        nottiPrecedentiAltrove: intero(input.nottiPrecedentiAltrove),
        nottiAnnoDichiarate: intero(input.nottiAnnoDichiarate),
        rifiutoPagamento: input.rifiutoPagamento,
        notaRifiuto: input.rifiutoPagamento ? input.notaRifiuto.trim() || null : null,
      },
    });
    await ricalcolaTassaPosizione(tx, prenotazioneId, ospiteId);
  });
}

export type DichiarazioneInput = {
  regolaId: number;
  dal: string;
  al: string;
  tipoDocumento: string;
  estremiDocumento: string;
  consegnataIl: string;
  note: string;
};

export async function aggiungiDichiarazione(hotelId: number, prenotazioneId: number, ospiteId: number, input: DichiarazioneInput) {
  const prenotazione = await prenotazioneDelHotel(hotelId, prenotazioneId);
  await ospiteNellaPrenotazione(prenotazioneId, ospiteId);
  // La regola deve appartenere a un regolamento del comune dell'hotel (niente id "presi" da altri comuni).
  const regola = await prisma.regolaTassa.findFirst({ where: { id: input.regolaId, regolamento: { comuneId: prenotazione.hotel.comuneId } } });
  if (!regola || regola.tipo === "eta") throw new Error("Esenzione non valida per il comune di questo hotel.");
  if (input.dal && input.al && input.al <= input.dal) throw new Error("Il periodo coperto deve finire dopo l'inizio.");
  if (!input.consegnataIl) throw new Error("Indica la data di consegna della dichiarazione.");

  await prisma.$transaction(async (tx) => {
    await verificaPosizioneAperta(tx, prenotazioneId, ospiteId);
    const pos = await tx.posizioneTassa.upsert({
      where: { prenotazioneId_ospiteId: { prenotazioneId, ospiteId } },
      update: {},
      create: { prenotazioneId, ospiteId },
    });
    await tx.dichiarazioneTassa.create({
      data: {
        posizioneId: pos.id,
        regolaId: regola.id,
        dal: input.dal ? new Date(input.dal) : null,
        al: input.al ? new Date(input.al) : null,
        tipoDocumento: input.tipoDocumento.trim() || null,
        estremiDocumento: input.estremiDocumento.trim() || null,
        consegnataIl: new Date(input.consegnataIl),
        note: input.note.trim() || null,
      },
    });
    await ricalcolaTassaPosizione(tx, prenotazioneId, ospiteId);
  });
}

export async function rimuoviDichiarazione(hotelId: number, prenotazioneId: number, dichiarazioneId: number) {
  await prenotazioneDelHotel(hotelId, prenotazioneId);
  const dich = await prisma.dichiarazioneTassa.findFirstOrThrow({
    where: { id: dichiarazioneId, posizione: { prenotazioneId } },
    include: { posizione: true },
  });
  await prisma.$transaction(async (tx) => {
    await verificaPosizioneAperta(tx, prenotazioneId, dich.posizione.ospiteId);
    await tx.dichiarazioneTassa.delete({ where: { id: dichiarazioneId } });
    await ricalcolaTassaPosizione(tx, prenotazioneId, dich.posizione.ospiteId);
  });
}

/** Check-out della tassa: ultimo ricalcolo e poi la posizione diventa definitiva (non si ricalcola più). */
export async function chiudiPosizione(hotelId: number, utenteId: number, prenotazioneId: number, ospiteId: number) {
  await prenotazioneDelHotel(hotelId, prenotazioneId);
  await ospiteNellaPrenotazione(prenotazioneId, ospiteId);
  await prisma.$transaction(async (tx) => {
    await verificaPosizioneAperta(tx, prenotazioneId, ospiteId);
    await ricalcolaTassaPosizione(tx, prenotazioneId, ospiteId);
    const pos = await tx.posizioneTassa.update({
      where: { prenotazioneId_ospiteId: { prenotazioneId, ospiteId } },
      data: { definitiva: true },
    });
    await tx.eventoTassa.create({ data: { posizioneId: pos.id, tipo: "chiusura", utenteId } });
  });
}

/** Riapertura per rettifica: il permesso lo verifica l'azione; la nota (motivo) è obbligatoria. */
export async function riapriPosizione(hotelId: number, utenteId: number, prenotazioneId: number, ospiteId: number, nota: string) {
  await prenotazioneDelHotel(hotelId, prenotazioneId);
  if (!nota.trim()) throw new Error("Indica il motivo della riapertura: resta registrato.");
  await prisma.$transaction(async (tx) => {
    const pos = await tx.posizioneTassa.findUniqueOrThrow({ where: { prenotazioneId_ospiteId: { prenotazioneId, ospiteId } } });
    if (!pos.definitiva) throw new Error("Il soggiorno non è chiuso.");
    await tx.posizioneTassa.update({ where: { id: pos.id }, data: { definitiva: false } });
    await tx.eventoTassa.create({ data: { posizioneId: pos.id, tipo: "riapertura", utenteId, nota: nota.trim() } });
    await ricalcolaTassaPosizione(tx, prenotazioneId, ospiteId);
  });
}
