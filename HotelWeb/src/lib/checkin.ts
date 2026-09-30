import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { LISTE_ISTAT, sistemaIstatValido, type SistemaIstat } from "@/lib/istat";
import { CODICE_ITALIA, TIPI_ALLOGGIATO, descriviLuoghi } from "@/lib/tabellePolizia";
import { posizioneTassa, ricalcolaTassaPosizione, verificaPosizioneAperta } from "@/lib/tassaSoggiorno";
import { cambiaDataFineSegmento } from "@/lib/prenotazioni";
import { lettiAggiuntiSegmento } from "@/lib/servizi";
import { composizioneDi, composizioneReale, descriviComposizione, stessaComposizione } from "@/lib/pricing";

/**
 * Check-in e check-out (fase 2, approvata il 2026-09-29): occupanti di una camera con i dati per la
 * schedina PS (Alloggiati Web) e per l'ISTAT del sistema dell'hotel. Regole di completezza dal
 * tracciato Alloggiati (vedi ALLOGGIATI_ROSS1000_SPECIFICHE.md §4.6): il check-in non si blocca se
 * mancano dati, ma la mancanza resta segnalata.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export type AnagraficaInput = {
  nome: string;
  cognome: string;
  sesso: string;
  dataNascita: string;
  statoNascitaCodice: string;
  comuneNascitaCodice: string;
  cittadinanzaCodice: string;
  residenzaStatoCodice: string;
  residenzaComuneCodice: string;
  documentoTipoCodice: string;
  documentoNumero: string;
  documentoRilascioCodice: string;
};

export type DatiPresenzaInput = {
  tipoAlloggiato: number | null;
  capoOspiteId: number | null;
  dal: string;
  al: string;
  occupaPostoLetto: boolean;
  motivoViaggio: string;
  mezzoArrivo: string;
  mezzoMovimento: string;
};

export type OspiteRif = { id: number } | { nome: string; cognome: string };

const txt = (s: string) => (s.trim() ? s.trim() : null);
const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/** Mostra il numero di documento solo alle ultime due cifre (decisione 2026-09-29). */
export function mascheraDocumento(numero: string | null) {
  if (!numero) return "";
  return numero.length <= 4 ? "••••" : `${numero.slice(0, 2)}${"•".repeat(numero.length - 4)}${numero.slice(-2)}`;
}

type OspiteDati = {
  nome: string;
  cognome: string;
  sesso: string | null;
  dataNascita: Date | null;
  statoNascitaCodice: string | null;
  comuneNascitaCodice: string | null;
  cittadinanzaCodice: string | null;
  residenzaStatoCodice: string | null;
  residenzaComuneCodice: string | null;
  documentoTipoCodice: string | null;
  documentoNumero: string | null;
  documentoRilascioCodice: string | null;
};

/** Cosa manca per la schedina PS e (se l'hotel lo usa) per l'ISTAT. */
export function datiMancanti(
  o: OspiteDati,
  p: { tipoAlloggiato: number | null; capoOspiteId: number | null; motivoViaggio: string | null; mezzoArrivo: string | null },
  sistema: SistemaIstat | null,
) {
  const m: string[] = [];
  if (!o.cognome.trim()) m.push("cognome");
  if (!o.nome.trim()) m.push("nome");
  if (!o.sesso) m.push("sesso");
  if (!o.dataNascita) m.push("data di nascita");
  if (!o.statoNascitaCodice) m.push("stato di nascita");
  else if (o.statoNascitaCodice === CODICE_ITALIA && !o.comuneNascitaCodice) m.push("comune di nascita");
  if (!o.cittadinanzaCodice) m.push("cittadinanza");
  if (!p.tipoAlloggiato) m.push("tipo di alloggiato");
  else {
    if ((p.tipoAlloggiato === 19 || p.tipoAlloggiato === 20) && !p.capoOspiteId) m.push("capofamiglia/capogruppo di riferimento");
    const conDocumento = TIPI_ALLOGGIATO.find((t) => t.codice === p.tipoAlloggiato)?.documento;
    if (conDocumento && (!o.documentoTipoCodice || !o.documentoNumero || !o.documentoRilascioCodice)) m.push("documento (tipo, numero, luogo di rilascio)");
  }
  // Residenza: non la chiede Alloggiati, la chiede l'ISTAT.
  if (sistema) {
    if (!o.residenzaStatoCodice) m.push("stato di residenza");
    else if (o.residenzaStatoCodice === CODICE_ITALIA && !o.residenzaComuneCodice) m.push("comune di residenza");
    if (LISTE_ISTAT[sistema].obbligatori && !p.motivoViaggio) m.push("motivo del viaggio");
    if (LISTE_ISTAT[sistema].obbligatori && !p.mezzoArrivo) m.push("mezzo di trasporto");
  }
  return m;
}

async function presenzaDelHotel(db: Db, hotelId: number, presenzaId: number) {
  return db.presenza.findFirstOrThrow({
    where: { id: presenzaId, segmento: { prenotazione: { hotelId } } },
    include: { segmento: { include: { prenotazione: { include: { hotel: { include: { comune: true } } } } } } },
  });
}

async function segmentoDelHotel(db: Db, hotelId: number, segmentoId: number) {
  return db.segmentoSoggiorno.findFirstOrThrow({
    where: { id: segmentoId, prenotazione: { hotelId } },
    include: { camera: true, tipoCamera: true, prenotazione: { include: { gruppo: true, ospitePrenotante: true, hotel: true } } },
  });
}

export async function datiCheckin(hotelId: number, segmentoId: number, mostraDocumenti: boolean) {
  const segmento = await segmentoDelHotel(prisma, hotelId, segmentoId);
  const sistema = sistemaIstatValido(segmento.prenotazione.hotel.sistemaIstat);
  const [presenze, documenti, persone, posizioni] = await Promise.all([
    prisma.presenza.findMany({ where: { segmentoId }, include: { ospite: true }, orderBy: { id: "asc" } }),
    prisma.documentoPolizia.findMany({ orderBy: { descrizione: "asc" } }),
    // Possibili capi: tutte le persone della prenotazione (anche in altre camere).
    prisma.presenza.findMany({ where: { segmento: { prenotazioneId: segmento.prenotazioneId } }, include: { ospite: true } }),
    prisma.posizioneTassa.findMany({ where: { prenotazioneId: segmento.prenotazioneId } }),
  ]);
  const descrizioni = await descriviLuoghi(
    presenze.flatMap((p) => [
      p.ospite.statoNascitaCodice,
      p.ospite.comuneNascitaCodice,
      p.ospite.cittadinanzaCodice,
      p.ospite.residenzaStatoCodice,
      p.ospite.residenzaComuneCodice,
      p.ospite.documentoRilascioCodice,
    ]),
  );
  const tabelleCaricate = documenti.length > 0;
  const lettiAggiunti = await lettiAggiuntiSegmento(segmento.id);
  const prenotata = composizioneDi(segmento);
  // Persone registrate in camera (con età dalla data di nascita) contro quelle prenotate: se
  // diverse si propone di ricalcolare il prezzo (mai in automatico).
  const presenti = await prisma.presenza.findMany({ where: { segmentoId: segmento.id }, include: { ospite: true } });
  const reale = composizioneReale(segmento.dataInizio, presenti.map((p) => ({ dataNascita: p.ospite.dataNascita, dal: p.dal })));

  return {
    segmento: {
      id: segmento.id,
      prenotazioneId: segmento.prenotazioneId,
      camera: segmento.camera?.codice ?? null,
      tipoCamera: segmento.tipoCamera.descrizione,
      capienza: segmento.camera ? segmento.camera.capienzaAdulti + segmento.camera.capienzaBambini + lettiAggiunti : null,
      lettiAggiunti,
      composizione: {
        prenotata: descriviComposizione(prenotata),
        reale: descriviComposizione(reale.composizione),
        senzaData: reale.senzaData,
        diversa: !stessaComposizione(prenotata, reale.composizione),
        valoreReale: reale.composizione,
      },
      dal: iso(segmento.dataInizio),
      al: iso(segmento.dataFine),
      intestatarioId: segmento.ospiteId,
      gruppo: segmento.prenotazione.gruppo?.nome ?? null,
      prenotanteId: segmento.prenotazione.ospitePrenotanteId,
    },
    sistemaIstat: sistema,
    liste: sistema ? LISTE_ISTAT[sistema] : null,
    tabelleCaricate,
    documenti: documenti.map((d) => ({ codice: d.codice, descrizione: d.descrizione })),
    tipiAlloggiato: TIPI_ALLOGGIATO,
    personePrenotazione: [...new Map(persone.map((p) => [p.ospiteId, `${p.ospite.nome} ${p.ospite.cognome}`])).entries()].map(([id, nome]) => ({ id, nome })),
    occupanti: presenze.map((p) => {
      const o = p.ospite;
      return {
        presenzaId: p.id,
        ospiteId: o.id,
        intestatario: o.id === segmento.ospiteId,
        stato: p.stato,
        chiusa: posizioni.find((x) => x.ospiteId === o.id)?.definitiva ?? false,
        mancanti: datiMancanti(o, p, sistema),
        presenza: {
          tipoAlloggiato: p.tipoAlloggiato,
          capoOspiteId: p.capoOspiteId,
          dal: iso(p.dal),
          al: iso(p.al),
          occupaPostoLetto: p.occupaPostoLetto,
          motivoViaggio: p.motivoViaggio ?? "",
          mezzoArrivo: p.mezzoArrivo ?? "",
          mezzoMovimento: p.mezzoMovimento ?? "",
        } satisfies DatiPresenzaInput,
        anagrafica: {
          nome: o.nome,
          cognome: o.cognome,
          sesso: o.sesso ?? "",
          dataNascita: iso(o.dataNascita),
          statoNascitaCodice: o.statoNascitaCodice ?? "",
          comuneNascitaCodice: o.comuneNascitaCodice ?? "",
          cittadinanzaCodice: o.cittadinanzaCodice ?? "",
          residenzaStatoCodice: o.residenzaStatoCodice ?? "",
          residenzaComuneCodice: o.residenzaComuneCodice ?? "",
          documentoTipoCodice: o.documentoTipoCodice ?? "",
          documentoNumero: mostraDocumenti ? (o.documentoNumero ?? "") : mascheraDocumento(o.documentoNumero),
          documentoRilascioCodice: o.documentoRilascioCodice ?? "",
        } satisfies AnagraficaInput,
        descrizioni: Object.fromEntries(
          [o.statoNascitaCodice, o.comuneNascitaCodice, o.cittadinanzaCodice, o.residenzaStatoCodice, o.residenzaComuneCodice, o.documentoRilascioCodice]
            .filter((c): c is string => !!c)
            .map((c) => [c, descrizioni[c] ?? c]),
        ),
      };
    }),
  };
}

/** I codici devono esistere nelle tabelle ufficiali; il comune di nascita deve essere valido a quella data. */
async function verificaCodici(a: AnagraficaInput) {
  const luogo = async (codice: string, cosa: string, tipo: "comune" | "stato" | null, validoAl?: Date) => {
    if (!codice) return;
    const l = await prisma.luogoPolizia.findUnique({ where: { codice } });
    if (!l || (tipo && l.tipo !== tipo)) throw new Error(`${cosa}: codice non presente nelle tabelle Polizia.`);
    if (validoAl && l.dataFineVal && l.dataFineVal <= validoAl) throw new Error(`${cosa}: ${l.descrizione} (${l.provincia}) non era più valido a quella data.`);
  };
  const nascita = a.dataNascita ? new Date(a.dataNascita) : undefined;
  await luogo(a.statoNascitaCodice, "Stato di nascita", "stato");
  await luogo(a.comuneNascitaCodice, "Comune di nascita", "comune", nascita);
  await luogo(a.cittadinanzaCodice, "Cittadinanza", "stato");
  await luogo(a.residenzaStatoCodice, "Stato di residenza", "stato");
  await luogo(a.residenzaComuneCodice, "Comune di residenza", "comune", new Date());
  await luogo(a.documentoRilascioCodice, "Luogo di rilascio del documento", null, new Date());
  if (a.documentoTipoCodice && !(await prisma.documentoPolizia.findUnique({ where: { codice: a.documentoTipoCodice } }))) {
    throw new Error("Tipo di documento non presente nelle tabelle Polizia.");
  }
  if (a.sesso && a.sesso !== "M" && a.sesso !== "F") throw new Error("Sesso: M o F.");
}

async function risolviOspite(db: Db, hotelId: number, rif: OspiteRif) {
  if ("id" in rif) return (await db.ospite.findFirstOrThrow({ where: { id: rif.id, hotelId } })).id;
  if (!rif.nome.trim() || !rif.cognome.trim()) throw new Error("Indica nome e cognome del nuovo ospite.");
  return (await db.ospite.create({ data: { hotelId, nome: rif.nome.trim(), cognome: rif.cognome.trim() } })).id;
}

/**
 * Salva anagrafica e dati di soggiorno di un occupante. mostraDocumenti=false: il numero del documento
 * arriva mascherato dalla pagina e NON va sovrascritto (resta quello salvato).
 */
export async function salvaOccupante(hotelId: number, presenzaId: number, a: AnagraficaInput, d: DatiPresenzaInput, mostraDocumenti: boolean) {
  const presenza = await presenzaDelHotel(prisma, hotelId, presenzaId);
  const { prenotazioneId } = presenza.segmento;
  const hotel = presenza.segmento.prenotazione.hotel;
  const sistema = sistemaIstatValido(hotel.sistemaIstat);
  if (!a.nome.trim() || !a.cognome.trim()) throw new Error("Nome e cognome sono obbligatori.");
  if (d.tipoAlloggiato !== null && !TIPI_ALLOGGIATO.some((t) => t.codice === d.tipoAlloggiato)) throw new Error("Tipo di alloggiato non valido.");
  await verificaCodici(a);
  const voceValida = (lista: { valore: string }[] | null | undefined, v: string) => !v || !!lista?.some((x) => x.valore === v);
  const liste = sistema ? LISTE_ISTAT[sistema] : null;
  if (!voceValida(liste?.motivo, d.motivoViaggio) || !voceValida(liste?.mezzoArrivo, d.mezzoArrivo) || !voceValida(liste?.mezzoMovimento, d.mezzoMovimento)) {
    throw new Error("Motivo o mezzo non validi per il sistema ISTAT dell'hotel.");
  }
  const seg = presenza.segmento;
  const dal = d.dal ? new Date(d.dal) : null;
  const al = d.al ? new Date(d.al) : null;
  if ((dal && (dal < seg.dataInizio || dal >= seg.dataFine)) || (al && (al <= seg.dataInizio || al > seg.dataFine)) || (dal && al && al <= dal)) {
    throw new Error("Il periodo della persona deve stare dentro quello della camera.");
  }

  // Residenza nel comune dell'hotel = residente per la tassa (le ultime 6 cifre del codice Polizia sono l'ISTAT).
  const residente = !!a.residenzaComuneCodice && a.residenzaComuneCodice.slice(-6) === hotel.comune.codiceIstat;

  await prisma.$transaction(async (tx) => {
    await verificaPosizioneAperta(tx, prenotazioneId, presenza.ospiteId);
    await tx.ospite.update({
      where: { id: presenza.ospiteId },
      data: {
        nome: a.nome.trim(),
        cognome: a.cognome.trim(),
        sesso: txt(a.sesso),
        dataNascita: a.dataNascita ? new Date(a.dataNascita) : null,
        statoNascitaCodice: txt(a.statoNascitaCodice),
        comuneNascitaCodice: a.statoNascitaCodice === CODICE_ITALIA ? txt(a.comuneNascitaCodice) : null,
        cittadinanzaCodice: txt(a.cittadinanzaCodice),
        residenzaStatoCodice: txt(a.residenzaStatoCodice),
        residenzaComuneCodice: a.residenzaStatoCodice === CODICE_ITALIA ? txt(a.residenzaComuneCodice) : null,
        documentoTipoCodice: txt(a.documentoTipoCodice),
        ...(mostraDocumenti ? { documentoNumero: txt(a.documentoNumero)?.toUpperCase() ?? null } : {}),
        documentoRilascioCodice: txt(a.documentoRilascioCodice),
      },
    });
    await tx.presenza.update({
      where: { id: presenzaId },
      data: {
        tipoAlloggiato: d.tipoAlloggiato,
        capoOspiteId: d.tipoAlloggiato === 19 || d.tipoAlloggiato === 20 ? d.capoOspiteId : null,
        dal: dal && dal > seg.dataInizio ? dal : null,
        al: al && al < seg.dataFine ? al : null,
        occupaPostoLetto: d.occupaPostoLetto,
        motivoViaggio: txt(d.motivoViaggio),
        mezzoArrivo: txt(d.mezzoArrivo),
        mezzoMovimento: txt(d.mezzoMovimento),
      },
    });
    await posizioneTassa(tx, prenotazioneId, presenza.ospiteId);
    await tx.posizioneTassa.update({ where: { prenotazioneId_ospiteId: { prenotazioneId, ospiteId: presenza.ospiteId } }, data: { residente } });
    await ricalcolaTassaPosizione(tx, prenotazioneId, presenza.ospiteId);
  });
}

/** Aggiunge una persona alla camera. Restituisce un avviso se si supera la capienza (non blocca). */
export async function aggiungiOccupante(hotelId: number, segmentoId: number, rif: OspiteRif) {
  const segmento = await segmentoDelHotel(prisma, hotelId, segmentoId);
  return prisma.$transaction(async (tx) => {
    const ospiteId = await risolviOspite(tx, hotelId, rif);
    if (await tx.presenza.findUnique({ where: { segmentoId_ospiteId: { segmentoId, ospiteId } } })) {
      throw new Error("Questa persona è già nella camera.");
    }
    await verificaPosizioneAperta(tx, segmento.prenotazioneId, ospiteId);
    await tx.presenza.create({ data: { segmentoId, ospiteId } });
    await ricalcolaTassaPosizione(tx, segmento.prenotazioneId, ospiteId);
    const occupanti = await tx.presenza.count({ where: { segmentoId } });
    // Capienza della camera più gli eventuali letti aggiunti (supplementi) su questa prenotazione.
    const capienza = segmento.camera ? segmento.camera.capienzaAdulti + segmento.camera.capienzaBambini + (await lettiAggiuntiSegmento(segmentoId)) : null;
    return capienza !== null && occupanti > capienza
      ? `La camera ospita ${capienza} persone: ora ce ne sono ${occupanti}. Per un letto in più aggiungi il supplemento "letto aggiunto".`
      : null;
  });
}

/**
 * Sostituisce una persona (tipico delle prenotazioni veloci, intestate a chi prenota finché al
 * check-in non si sa chi dorme nella camera). Se era l'intestatario della camera, lo diventa la nuova.
 */
export async function sostituisciOccupante(hotelId: number, presenzaId: number, rif: OspiteRif) {
  const presenza = await presenzaDelHotel(prisma, hotelId, presenzaId);
  const { prenotazioneId } = presenza.segmento;
  await prisma.$transaction(async (tx) => {
    await verificaPosizioneAperta(tx, prenotazioneId, presenza.ospiteId);
    const nuovoId = await risolviOspite(tx, hotelId, rif);
    if (nuovoId === presenza.ospiteId) return;
    if (await tx.presenza.findUnique({ where: { segmentoId_ospiteId: { segmentoId: presenza.segmentoId, ospiteId: nuovoId } } })) {
      throw new Error("Questa persona è già nella camera.");
    }
    await verificaPosizioneAperta(tx, prenotazioneId, nuovoId);
    await tx.presenza.update({ where: { id: presenzaId }, data: { ospiteId: nuovoId } });
    if (presenza.segmento.ospiteId === presenza.ospiteId) {
      await tx.segmentoSoggiorno.update({ where: { id: presenza.segmentoId }, data: { ospiteId: nuovoId } });
    }
    await ricalcolaTassaPosizione(tx, prenotazioneId, presenza.ospiteId);
    await ricalcolaTassaPosizione(tx, prenotazioneId, nuovoId);
  });
}

export async function rimuoviOccupante(hotelId: number, presenzaId: number) {
  const presenza = await presenzaDelHotel(prisma, hotelId, presenzaId);
  const { prenotazioneId } = presenza.segmento;
  await prisma.$transaction(async (tx) => {
    await verificaPosizioneAperta(tx, prenotazioneId, presenza.ospiteId);
    const altri = await tx.presenza.findMany({ where: { segmentoId: presenza.segmentoId, id: { not: presenzaId } }, orderBy: { id: "asc" } });
    if (!altri.length) throw new Error("È l'unica persona nella camera: per toglierla modifica o annulla la prenotazione.");
    if (presenza.segmento.ospiteId === presenza.ospiteId) {
      await tx.segmentoSoggiorno.update({ where: { id: presenza.segmentoId }, data: { ospiteId: altri[0].ospiteId } });
    }
    await tx.presenza.delete({ where: { id: presenzaId } });
    await ricalcolaTassaPosizione(tx, prenotazioneId, presenza.ospiteId);
  });
}

/** Arrivo confermato per tutte le persone della camera ancora in attesa: da qui partono le 24 ore della schedina. */
export async function confermaArrivo(hotelId: number, segmentoId: number) {
  await segmentoDelHotel(prisma, hotelId, segmentoId);
  await prisma.presenza.updateMany({ where: { segmentoId, stato: "attesa" }, data: { stato: "arrivato", arrivoIl: new Date() } });
}

/** Chiude la tassa di un ospite se tutte le sue presenze nella prenotazione sono partite. */
async function chiudiSeTuttiPartiti(tx: Prisma.TransactionClient, prenotazioneId: number, ospiteId: number, utenteId: number) {
  const ancora = await tx.presenza.count({ where: { ospiteId, segmento: { prenotazioneId }, stato: { not: "partito" } } });
  if (ancora) return;
  await ricalcolaTassaPosizione(tx, prenotazioneId, ospiteId);
  const pos = await posizioneTassa(tx, prenotazioneId, ospiteId);
  if (pos.definitiva) return;
  await tx.posizioneTassa.update({ where: { id: pos.id }, data: { definitiva: true } });
  await tx.eventoTassa.create({ data: { posizioneId: pos.id, tipo: "chiusura", utenteId, nota: "Check-out" } });
}

/**
 * Check-out dell'intera camera alla data indicata (partenza anticipata: la camera si accorcia e si
 * libera). Tutte le persone risultano partite e la loro tassa diventa definitiva.
 */
export async function checkoutCamera(hotelId: number, utenteId: number, segmentoId: number, dataPartenzaIso: string) {
  const segmento = await segmentoDelHotel(prisma, hotelId, segmentoId);
  const dataPartenza = new Date(dataPartenzaIso);
  if (!(dataPartenza > segmento.dataInizio && dataPartenza <= segmento.dataFine)) {
    throw new Error("La data di partenza deve essere dopo l'arrivo e non oltre la partenza prevista.");
  }
  if (dataPartenza < segmento.dataFine) await cambiaDataFineSegmento(hotelId, segmentoId, dataPartenzaIso);
  await prisma.$transaction(async (tx) => {
    const presenze = await tx.presenza.findMany({ where: { segmentoId } });
    await tx.presenza.updateMany({ where: { segmentoId, stato: { not: "partito" } }, data: { stato: "partito", partenzaIl: new Date() } });
    for (const ospiteId of new Set(presenze.map((p) => p.ospiteId))) await chiudiSeTuttiPartiti(tx, segmento.prenotazioneId, ospiteId, utenteId);
  });
}

/** Check-out di una sola persona (le altre restano): se parte prima, il suo periodo si accorcia. */
export async function checkoutOccupante(hotelId: number, utenteId: number, presenzaId: number, dataPartenzaIso: string) {
  const presenza = await presenzaDelHotel(prisma, hotelId, presenzaId);
  const seg = presenza.segmento;
  const inizio = presenza.dal ?? seg.dataInizio;
  const fine = presenza.al ?? seg.dataFine;
  const dataPartenza = new Date(dataPartenzaIso);
  if (!(dataPartenza > inizio && dataPartenza <= fine)) throw new Error("La data di partenza deve cadere nel periodo della persona.");
  await prisma.$transaction(async (tx) => {
    await verificaPosizioneAperta(tx, seg.prenotazioneId, presenza.ospiteId);
    await tx.presenza.update({
      where: { id: presenzaId },
      data: { stato: "partito", partenzaIl: new Date(), al: dataPartenza < seg.dataFine ? dataPartenza : null },
    });
    await ricalcolaTassaPosizione(tx, seg.prenotazioneId, presenza.ospiteId);
    await chiudiSeTuttiPartiti(tx, seg.prenotazioneId, presenza.ospiteId, utenteId);
  });
}
