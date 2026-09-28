import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { nottiTraDate, trovaPrezzoNotte } from "@/lib/pricing";
import { calcolaTassaNotte } from "@/lib/tassaSoggiorno";

type Db = PrismaClient | Prisma.TransactionClient;

export type OspiteRif = { id: number } | { nome: string; cognome: string; telefono?: string; email?: string };

export type NuovoSegmentoInput = {
  // Nota: una prenotazione "generica" (solo quantità per tipo, camera da assegnare
  // più avanti) ha cameraId assente ma tipoCameraId sempre valorizzato.
  cameraId?: number;
  tipoCameraId: number;
  ospite: OspiteRif;
  trattamento: string;
  listinoId: number;
  dataInizio: string; // ISO date (yyyy-mm-dd)
  dataFine: string;
};

export type CreaPrenotazioneInput = {
  ospitePrenotante: OspiteRif;
  gruppoNome?: string;
  accontoRichiesto?: number;
  segmenti: NuovoSegmentoInput[];
};

export type RichiestaGenerica = { tipoCameraId: number; quantita: number };

export type CreaPrenotazioneGenericaInput = {
  ospitePrenotante: OspiteRif;
  gruppoNome?: string;
  accontoRichiesto?: number;
  listinoId: number;
  trattamento: string;
  dataInizio: string;
  dataFine: string;
  richieste: RichiestaGenerica[];
  numeroPersone?: number;
  note?: string;
};

/**
 * Crea una prenotazione con i suoi segmenti in un'unica transazione: se un
 * ospite indicato è nuovo (senza id) viene creato al volo nell'anagrafica —
 * è il flusso "free" richiesto per il booking, mai una gestione clienti separata.
 *
 * hotelId viene sempre dalla sessione dell'utente loggato (mai dal client): è quello
 * che isola i dati di un hotel da quelli di un altro per gli account multi-struttura.
 */
export async function creaPrenotazione(hotelId: number, input: CreaPrenotazioneInput) {
  if (input.segmenti.length === 0) {
    throw new Error("Serve almeno una camera/segmento per creare la prenotazione.");
  }

  return prisma.$transaction(async (tx) => {
    const ospitePrenotanteId = await risolviOspite(tx, hotelId, input.ospitePrenotante);

    const gruppoId = input.gruppoNome
      ? (await tx.gruppo.create({ data: { hotelId, nome: input.gruppoNome } })).id
      : undefined;

    const prenotazione = await tx.prenotazione.create({
      data: {
        hotelId,
        gruppoId,
        ospitePrenotanteId,
        accontoRichiesto: input.accontoRichiesto,
      },
    });

    for (const segInput of input.segmenti) {
      await creaSegmento(tx, hotelId, prenotazione.id, segInput, 0);
    }

    return caricaPrenotazioneCompleta(tx, hotelId, prenotazione.id);
  });
}

/**
 * Prenotazione "veloce" dal planning: si blocca la disponibilità per N camere di
 * un certo tipo in un periodo, senza assegnare subito le camere fisiche —
 * l'assegnazione specifica avviene più avanti con assegnaCamera().
 */
export async function creaPrenotazioneGenerica(hotelId: number, input: CreaPrenotazioneGenericaInput) {
  if (input.richieste.length === 0 || input.richieste.every((r) => r.quantita <= 0)) {
    throw new Error("Indicare almeno una camera richiesta.");
  }

  return prisma.$transaction(async (tx) => {
    const ospitePrenotanteId = await risolviOspite(tx, hotelId, input.ospitePrenotante);

    const gruppoId = input.gruppoNome
      ? (await tx.gruppo.create({ data: { hotelId, nome: input.gruppoNome } })).id
      : undefined;

    const prenotazione = await tx.prenotazione.create({
      data: {
        hotelId,
        gruppoId,
        ospitePrenotanteId,
        accontoRichiesto: input.accontoRichiesto,
        numeroPersone: input.numeroPersone,
        note: input.note,
      },
    });

    for (const richiesta of input.richieste) {
      if (richiesta.quantita <= 0) continue;
      for (let i = 0; i < richiesta.quantita; i++) {
        await creaSegmento(tx, hotelId, prenotazione.id, {
          tipoCameraId: richiesta.tipoCameraId,
          ospite: { id: ospitePrenotanteId },
          trattamento: input.trattamento,
          listinoId: input.listinoId,
          dataInizio: input.dataInizio,
          dataFine: input.dataFine,
        }, 0);
      }
    }

    return caricaPrenotazioneCompleta(tx, hotelId, prenotazione.id);
  });
}

/** Assegna una camera fisica specifica a un segmento creato senza camera (prenotazione generica). */
export async function assegnaCamera(hotelId: number, segmentoId: number, cameraId: number) {
  return prisma.$transaction(async (tx) => {
    const segmento = await trovaSegmentoDelHotel(tx, hotelId, segmentoId);
    if (segmento.cameraId) {
      throw new Error("Questo segmento ha già una camera assegnata: usa Cambia camera per sostituirla.");
    }

    const camera = await trovaCameraDelHotel(tx, hotelId, cameraId);
    if (camera.tipoCameraId !== segmento.tipoCameraId) {
      throw new Error(`La camera ${camera.codice} non è del tipo richiesto per questo segmento.`);
    }
    if (!(await cameraDisponibile(tx, cameraId, segmento.dataInizio, segmento.dataFine, segmentoId))) {
      throw new Error(`La camera ${camera.codice} non è libera nel periodo richiesto.`);
    }

    await tx.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { cameraId } });
    return caricaPrenotazioneCompleta(tx, hotelId, segmento.prenotazioneId);
  });
}

export async function trovaPrenotazione(hotelId: number, id: number) {
  return caricaPrenotazioneCompleta(prisma, hotelId, id);
}

type PrenotazioneCompleta = Awaited<ReturnType<typeof caricaPrenotazioneCompleta>>;

/** Totali sempre ricalcolati dalle notti/tasse/servizi salvati — mai un numero scritto a mano. */
export function calcolaTotaliPrenotazione(prenotazione: PrenotazioneCompleta) {
  const subtotale = prenotazione.segmenti.reduce(
    (tot, seg) => tot + seg.notti.reduce((s, n) => s + Number(n.prezzo), 0),
    0
  );
  const tassa = prenotazione.segmenti.reduce(
    (tot, seg) => tot + seg.notti.reduce((s, n) => s + (n.tassa ? Number(n.tassa.importo) : 0), 0),
    0
  );
  const servizi = prenotazione.serviziAggiunti.reduce((tot, s) => tot + Number(s.prezzoUnitario) * s.quantita, 0);
  return { subtotale, tassa, servizi, totale: subtotale + tassa + servizi };
}

export async function elencoPrenotazioni(hotelId: number) {
  return prisma.prenotazione.findMany({
    where: { hotelId },
    include: {
      ospitePrenotante: true,
      gruppo: true,
      segmenti: { select: { dataInizio: true, dataFine: true, camera: { select: { codice: true } }, tipoCamera: { select: { descrizione: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Cerca prenotazioni per nome/cognome, sia dell'ospite prenotante sia di un qualsiasi
 * componente del gruppo — passate o future, non solo le piu' recenti (a differenza di
 * elencoPrenotazioni che mostra solo le ultime create): serve a ritrovare velocemente una
 * prenotazione per nome invece di scorrere il planning giorno per giorno.
 */
export async function cercaPrenotazioni(hotelId: number, query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return prisma.prenotazione.findMany({
    where: {
      hotelId,
      OR: [
        { ospitePrenotante: { OR: [{ nome: { contains: q } }, { cognome: { contains: q } }] } },
        { segmenti: { some: { ospite: { OR: [{ nome: { contains: q } }, { cognome: { contains: q } }] } } } },
      ],
    },
    include: {
      ospitePrenotante: true,
      gruppo: true,
      segmenti: { select: { dataInizio: true, dataFine: true, camera: { select: { codice: true } }, tipoCamera: { select: { descrizione: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

/** Sempre filtrato per hotelId: una prenotazione di un altro hotel deve dare "non trovata", non i suoi dati. */
async function caricaPrenotazioneCompleta(db: Db, hotelId: number, id: number) {
  return db.prenotazione.findFirstOrThrow({
    where: { id, hotelId },
    include: {
      ospitePrenotante: true,
      gruppo: true,
      segmenti: {
        orderBy: { dataInizio: "asc" },
        include: { camera: true, tipoCamera: true, ospite: true, notti: { include: { tassa: true } } },
      },
      serviziAggiunti: {
        orderBy: { createdAt: "asc" },
        include: { servizioCatalogo: true, segmenti: { include: { segmento: { include: { ospite: true, camera: true } } } } },
      },
    },
  });
}

async function trovaSegmentoDelHotel(db: Db, hotelId: number, segmentoId: number) {
  const segmento = await db.segmentoSoggiorno.findFirstOrThrow({
    where: { id: segmentoId, prenotazione: { hotelId } },
    include: { camera: true, tipoCamera: true, ospite: true },
  });
  return segmento;
}

async function trovaCameraDelHotel(db: Db, hotelId: number, cameraId: number) {
  return db.camera.findFirstOrThrow({ where: { id: cameraId, hotelId } });
}

async function risolviOspite(db: Db, hotelId: number, ref: OspiteRif) {
  if ("id" in ref) {
    // Verifica che l'ospite esistente appartenga davvero a questo hotel (mai fidarsi di un id dal client).
    const ospite = await db.ospite.findFirstOrThrow({ where: { id: ref.id, hotelId } });
    return ospite.id;
  }
  const nuovo = await db.ospite.create({
    data: { hotelId, nome: ref.nome, cognome: ref.cognome, telefono: ref.telefono, email: ref.email },
  });
  return nuovo.id;
}

/**
 * true se la camera è libera nell'intervallo [dal, al) — usato sia per nuove
 * prenotazioni sia per estensioni/cambi camera: un solo motore di disponibilità,
 * mai una query scritta ad hoc in ogni schermata (era un problema del legacy).
 */
async function cameraDisponibile(db: Db, cameraId: number, dal: Date, al: Date, escludiSegmentoId?: number) {
  const conflitto = await db.segmentoSoggiorno.findFirst({
    where: {
      cameraId,
      stato: { not: "ANNULLATO" },
      id: escludiSegmentoId ? { not: escludiSegmentoId } : undefined,
      dataInizio: { lt: al },
      dataFine: { gt: dal },
    },
  });
  return !conflitto;
}

/**
 * Quante camere di un certo tipo sono libere nell'intervallo [dal, al): totale
 * camere attive meno quelle in manutenzione, assegnate a un soggiorno, o già
 * bloccate da una prenotazione generica dello stesso tipo — stesso motore usato
 * sia per una prenotazione generica sia per assegnare una camera specifica dopo.
 *
 * tipoCameraId identifica già univocamente l'hotel (appartiene a un solo hotel),
 * quindi non serve un filtro hotelId separato qui — lo fa chi risolve tipoCameraId.
 */
export async function capacitaLiberaPerTipo(
  db: Db,
  tipoCameraId: number,
  dal: Date,
  al: Date,
  escludiSegmentoId?: number
): Promise<number> {
  const totale = await db.camera.count({ where: { tipoCameraId, attivo: true } });

  const inManutenzione = await db.cameraIndisponibilita.findMany({
    where: { camera: { tipoCameraId }, dal: { lt: al }, al: { gt: dal } },
    select: { cameraId: true },
    distinct: ["cameraId"],
  });

  const segmentiSovrapposti = await db.segmentoSoggiorno.count({
    where: {
      tipoCameraId,
      stato: { not: "ANNULLATO" },
      id: escludiSegmentoId ? { not: escludiSegmentoId } : undefined,
      dataInizio: { lt: al },
      dataFine: { gt: dal },
    },
  });

  return totale - inManutenzione.length - segmentiSovrapposti;
}

/**
 * Somma le notti tassabili già "consumate" nella catena di segmenti che precede
 * questo (segmento_precedente_id): un cambio camera a metà soggiorno non deve far
 * ripartire da zero il conteggio del tetto notti, perché per l'ospite è lo stesso
 * soggiorno continuato in un'altra camera.
 */
async function contaNottiTassabiliCatena(db: Db, segmentoId: number): Promise<number> {
  const segmento = await db.segmentoSoggiorno.findUniqueOrThrow({
    where: { id: segmentoId },
    include: { notti: { include: { tassa: true } } },
  });

  const propria = segmento.notti.filter((n) => n.tassa && !n.tassa.esente).length;

  if (!segmento.segmentoPrecedenteId) return propria;
  return propria + (await contaNottiTassabiliCatena(db, segmento.segmentoPrecedenteId));
}

async function creaSegmento(
  db: Db,
  hotelId: number,
  prenotazioneId: number,
  segInput: NuovoSegmentoInput,
  contatoreIniziale: number,
  segmentoPrecedenteId?: number
) {
  const ospiteId = await risolviOspite(db, hotelId, segInput.ospite);
  const ospite = await db.ospite.findUniqueOrThrow({ where: { id: ospiteId } });
  const tipoCamera = await db.tipoCamera.findFirstOrThrow({ where: { id: segInput.tipoCameraId, hotelId } });
  const listino = await db.listino.findFirstOrThrow({ where: { id: segInput.listinoId, hotelId } });
  const hotel = await db.hotel.findUniqueOrThrow({ where: { id: hotelId } });

  const dataInizio = new Date(segInput.dataInizio);
  const dataFine = new Date(segInput.dataFine);
  if (dataFine <= dataInizio) {
    throw new Error(`${tipoCamera.descrizione}: la data di partenza deve essere dopo l'arrivo.`);
  }

  let camera = null;
  if (segInput.cameraId) {
    camera = await trovaCameraDelHotel(db, hotelId, segInput.cameraId);
    if (camera.tipoCameraId !== segInput.tipoCameraId) {
      throw new Error(`La camera ${camera.codice} non è del tipo richiesto.`);
    }
    if (!(await cameraDisponibile(db, segInput.cameraId, dataInizio, dataFine))) {
      throw new Error(`La camera ${camera.codice} non è libera nel periodo richiesto.`);
    }
  } else {
    const liberi = await capacitaLiberaPerTipo(db, segInput.tipoCameraId, dataInizio, dataFine);
    if (liberi <= 0) {
      throw new Error(`Nessuna camera di tipo "${tipoCamera.descrizione}" disponibile nel periodo richiesto.`);
    }
  }

  const segmento = await db.segmentoSoggiorno.create({
    data: {
      prenotazioneId,
      cameraId: segInput.cameraId,
      tipoCameraId: segInput.tipoCameraId,
      ospiteId,
      trattamento: segInput.trattamento,
      listinoId: listino.id,
      dataInizio,
      dataFine,
      segmentoPrecedenteId,
    },
  });

  await generaNottiETasse(
    db,
    segmento.id,
    listino,
    { codice: camera?.codice ?? tipoCamera.descrizione, tipoCameraId: segInput.tipoCameraId, hotel },
    ospite,
    dataInizio,
    dataFine,
    contatoreIniziale
  );

  return segmento;
}

async function generaNottiETasse(
  db: Db,
  segmentoId: number,
  listino: { id: number; tipo: string },
  riferimento: { codice: string; tipoCameraId: number; hotel: { comuneId: number; categoria: string | null } },
  ospite: { id: number; dataNascita: Date | null },
  dataInizio: Date,
  dataFine: Date,
  contatoreIniziale: number
) {
  const notti = nottiTraDate(dataInizio, dataFine);

  let contatoreNottiTassabili = contatoreIniziale;
  for (const notte of notti) {
    const prezzoInfo = await trovaPrezzoNotte(db, listino.id, riferimento.tipoCameraId, notte);
    // Nessuna tariffa impostata per questa notte: non blocca piu' la prenotazione (l'operatore
    // puo' bloccare le camere comunque e sistemare il listino piu' avanti — richiesto esplicitamente
    // dall'utente 2026-09-26), ma la notte resta segnata con prezzo 0 e motivo "mancante" cosi'
    // si vede chiaramente nel dettaglio prenotazione che il totale e' incompleto.
    const notteSoggiorno = await db.notteSoggiorno.create({
      data: {
        segmentoId,
        data: notte,
        prezzo: prezzoInfo?.prezzo ?? 0,
        motivoPrezzo: prezzoInfo ? listino.tipo : "mancante",
      },
    });

    const tassaInfo = await calcolaTassaNotte(db, {
      comuneId: riferimento.hotel.comuneId,
      categoriaStruttura: riferimento.hotel.categoria,
      data: notte,
      ospiteId: ospite.id,
      ospiteDataNascita: ospite.dataNascita,
      notteGiaContataNelSegmento: contatoreNottiTassabili,
    });

    if (tassaInfo) {
      await db.tassaNotte.create({
        data: {
          notteId: notteSoggiorno.id,
          regolamentoId: tassaInfo.regolamentoId,
          importo: tassaInfo.importo,
          esente: tassaInfo.esente,
          motivoEsenzioneId: tassaInfo.motivoEsenzioneId,
        },
      });
      if (!tassaInfo.esente) contatoreNottiTassabili += 1;
    }
  }
}

/** Aggiunge un nuovo segmento a una prenotazione già esistente (es. un componente del gruppo che arriva dopo). */
export async function aggiungiSegmentoAPrenotazione(hotelId: number, prenotazioneId: number, segInput: NuovoSegmentoInput) {
  return prisma.$transaction(async (tx) => {
    // Verifica che la prenotazione appartenga all'hotel prima di aggiungerci qualcosa.
    await tx.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId } });
    await creaSegmento(tx, hotelId, prenotazioneId, segInput, 0);
    return caricaPrenotazioneCompleta(tx, hotelId, prenotazioneId);
  });
}

/**
 * Accorcia o allunga un segmento esistente. Accorciare cancella le notti/tasse
 * in eccesso (mai fonte di verità: si rigenerano se serve riallungare in futuro).
 * Allungare verifica prima la disponibilità (camera specifica se assegnata,
 * altrimenti capacità del tipo) per le notti aggiuntive.
 */
export async function cambiaDataFineSegmento(hotelId: number, segmentoId: number, nuovaDataFineIso: string) {
  return prisma.$transaction(async (tx) => {
    const segmento = await trovaSegmentoDelHotel(tx, hotelId, segmentoId);
    const hotel = await tx.hotel.findUniqueOrThrow({ where: { id: hotelId } });

    const nuovaDataFine = new Date(nuovaDataFineIso);
    if (nuovaDataFine <= segmento.dataInizio) {
      throw new Error("La nuova data di partenza deve essere dopo l'arrivo.");
    }

    if (nuovaDataFine < segmento.dataFine) {
      // Accorcia: elimina le notti (e le tasse a cascata) dalla nuova data in poi.
      const notti = await tx.notteSoggiorno.findMany({
        where: { segmentoId, data: { gte: nuovaDataFine } },
        select: { id: true },
      });
      await tx.tassaNotte.deleteMany({ where: { notteId: { in: notti.map((n) => n.id) } } });
      await tx.notteSoggiorno.deleteMany({ where: { id: { in: notti.map((n) => n.id) } } });
    } else if (nuovaDataFine > segmento.dataFine) {
      // Allunga: verifica disponibilità e genera le notti aggiuntive.
      if (segmento.cameraId) {
        const disponibile = await cameraDisponibile(tx, segmento.cameraId, segmento.dataFine, nuovaDataFine, segmentoId);
        if (!disponibile) {
          throw new Error(`La camera ${segmento.camera!.codice} non è libera per le notti aggiuntive richieste.`);
        }
      } else {
        const liberi = await capacitaLiberaPerTipo(tx, segmento.tipoCameraId, segmento.dataFine, nuovaDataFine, segmentoId);
        if (liberi <= 0) {
          throw new Error(`Nessuna camera di tipo "${segmento.tipoCamera.descrizione}" disponibile per le notti aggiuntive.`);
        }
      }
      const listino = await tx.listino.findUniqueOrThrow({ where: { id: segmento.listinoId } });
      const contatorePrecedente = await contaNottiTassabiliCatena(tx, segmentoId);
      await generaNottiETasse(
        tx,
        segmentoId,
        listino,
        { codice: segmento.camera?.codice ?? segmento.tipoCamera.descrizione, tipoCameraId: segmento.tipoCameraId, hotel },
        segmento.ospite,
        segmento.dataFine,
        nuovaDataFine,
        contatorePrecedente
      );
    }

    await tx.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { dataFine: nuovaDataFine } });

    return caricaPrenotazioneCompleta(tx, hotelId, segmento.prenotazioneId);
  });
}

/**
 * Cambio camera a metà soggiorno: chiude il segmento corrente alla data indicata
 * e ne apre uno nuovo, nella nuova camera, collegato al precedente — mai una
 * cancellazione della prenotazione (era il problema del sistema legacy).
 */
export async function cambiaCameraSegmento(hotelId: number, segmentoId: number, dataCambioIso: string, nuovaCameraId: number) {
  return prisma.$transaction(async (tx) => {
    const segmento = await trovaSegmentoDelHotel(tx, hotelId, segmentoId);

    const dataCambio = new Date(dataCambioIso);
    if (dataCambio <= segmento.dataInizio || dataCambio >= segmento.dataFine) {
      throw new Error("La data del cambio camera deve cadere durante il soggiorno (non al primo o ultimo giorno).");
    }

    const nuovaCamera = await trovaCameraDelHotel(tx, hotelId, nuovaCameraId);

    const disponibile = await cameraDisponibile(tx, nuovaCameraId, dataCambio, segmento.dataFine);
    if (!disponibile) {
      throw new Error("La camera scelta non è libera per il periodo richiesto.");
    }

    const dataFineOriginale = segmento.dataFine;

    // Chiudi il segmento corrente alla data del cambio: elimina le notti/tasse successive.
    const nottiDaRimuovere = await tx.notteSoggiorno.findMany({
      where: { segmentoId, data: { gte: dataCambio } },
      select: { id: true },
    });
    await tx.tassaNotte.deleteMany({ where: { notteId: { in: nottiDaRimuovere.map((n) => n.id) } } });
    await tx.notteSoggiorno.deleteMany({ where: { id: { in: nottiDaRimuovere.map((n) => n.id) } } });
    await tx.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { dataFine: dataCambio } });

    const contatorePrecedente = await contaNottiTassabiliCatena(tx, segmentoId);

    await creaSegmento(
      tx,
      hotelId,
      segmento.prenotazioneId,
      {
        cameraId: nuovaCameraId,
        tipoCameraId: nuovaCamera.tipoCameraId,
        ospite: { id: segmento.ospiteId },
        trattamento: segmento.trattamento,
        listinoId: segmento.listinoId,
        dataInizio: dataCambioIso,
        dataFine: dataFineOriginale.toISOString().slice(0, 10),
      },
      contatorePrecedente,
      segmentoId
    );

    return caricaPrenotazioneCompleta(tx, hotelId, segmento.prenotazioneId);
  });
}
