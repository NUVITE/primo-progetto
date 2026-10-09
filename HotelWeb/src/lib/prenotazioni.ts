import { oggiItaliano, verificaCassaAperta } from "@/lib/cassaAperta";
import { prisma } from "@/lib/prisma";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { calcolaNotte, composizioneDi, nottiTraDate, regoleListino, ricalcolaGratuita, verificaComposizione, type Composizione } from "@/lib/pricing";
import { regolamentiDelComune, ricalcolaTassaPosizione, stimaTassaMancanti, verificaPosizioneAperta } from "@/lib/tassaSoggiorno";
import { calcolaPenale, istanteItalia, politicaPer, type PoliticaCopiata } from "@/lib/politiche";

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
  // Composizione prenotata (base del prezzo). Assente = 1 adulto.
  composizione?: Composizione;
};

// Provenienza e garanzia (vedi schema Prenotazione). Tutto facoltativo: diretta, senza garanzia.
export const CANALI = { diretta: "Diretta (il cliente)", azienda: "Azienda / ente", agenzia: "Agenzia / tour operator", portale: "Portale online", altro: "Altro" } as const;
export const MEZZI = { telefono: "Telefono", email: "Email", web: "Sito / motore di prenotazione", persona: "Di persona", altro: "Altro" } as const;
export const GARANZIE = { nessuna: "Nessuna", caparra: "Caparra", carta: "Carta di credito", prepagata: "Prepagata (non rimborsabile)" } as const;
export type ProvenienzaInput = {
  canale?: string;
  mezzo?: string | null;
  intermediarioId?: number | null;
  clientePaganteId?: number | null;
  garanzia?: string;
  oraArrivo?: string | null;
};

/** Valida provenienza e garanzia; intermediario e pagante devono essere clienti dell'hotel. */
async function datiProvenienza(db: Db, hotelId: number, p: ProvenienzaInput) {
  const out: Record<string, unknown> = {};
  if (p.canale !== undefined) {
    if (!(p.canale in CANALI)) throw new Error("Canale di prenotazione non valido.");
    out.canale = p.canale;
  }
  if (p.mezzo !== undefined) {
    if (p.mezzo && !(p.mezzo in MEZZI)) throw new Error("Mezzo di prenotazione non valido.");
    out.mezzo = p.mezzo || null;
  }
  if (p.garanzia !== undefined) {
    if (!(p.garanzia in GARANZIE)) throw new Error("Garanzia non valida.");
    out.garanzia = p.garanzia;
  }
  if (p.oraArrivo !== undefined) {
    if (p.oraArrivo && !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.oraArrivo)) throw new Error("Ora di arrivo non valida (hh:mm).");
    out.oraArrivo = p.oraArrivo || null;
  }
  for (const campo of ["intermediarioId", "clientePaganteId"] as const) {
    if (p[campo] === undefined) continue;
    if (p[campo]) await db.cliente.findFirstOrThrow({ where: { id: p[campo]!, hotelId } });
    out[campo] = p[campo] || null;
  }
  return out;
}

/** Copia della politica di cancellazione da applicare (quella del listino o la predefinita). */
async function politicaIniziale(db: Db, hotelId: number, listinoId: number | null) {
  const p = await politicaPer(db, hotelId, listinoId);
  return p ? { politicaId: p.id, politica: p as unknown as Prisma.InputJsonValue } : {};
}

export type CreaPrenotazioneInput = {
  ospitePrenotante: OspiteRif;
  gruppoNome?: string;
  accontoRichiesto?: number;
  // Opzione valida fino al / acconto entro il (ISO): assente = proposta dell'hotel (giorni di opzione).
  scadenzaOpzione?: string;
  accontoEntro?: string;
  provenienza?: ProvenienzaInput;
  segmenti: NuovoSegmentoInput[];
};

// composizione = persone in OGNI camera di quel tipo.
export type RichiestaGenerica = { tipoCameraId: number; quantita: number; composizione?: Composizione };

export type CreaPrenotazioneGenericaInput = {
  ospitePrenotante: OspiteRif;
  gruppoNome?: string;
  accontoRichiesto?: number;
  scadenzaOpzione?: string;
  accontoEntro?: string;
  listinoId: number;
  trattamento: string;
  dataInizio: string;
  dataFine: string;
  richieste: RichiestaGenerica[];
  numeroPersone?: number;
  note?: string;
  provenienza?: ProvenienzaInput;
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
        ...(await scadenzeIniziali(tx, hotelId, input)),
        ...(await datiProvenienza(tx, hotelId, input.provenienza ?? {})),
        ...(await politicaIniziale(tx, hotelId, input.segmenti[0]?.listinoId ?? null)),
      },
    });

    for (const segInput of input.segmenti) {
      await creaSegmento(tx, hotelId, prenotazione.id, segInput);
    }
    await ricalcolaGratuita(tx, prenotazione.id);
    await aggiungiPulizieFinali(tx, prenotazione.id);

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
        ...(await scadenzeIniziali(tx, hotelId, input)),
        numeroPersone: input.numeroPersone,
        note: input.note,
        ...(await datiProvenienza(tx, hotelId, input.provenienza ?? {})),
        ...(await politicaIniziale(tx, hotelId, input.listinoId)),
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
          composizione: richiesta.composizione,
        });
      }
    }
    await ricalcolaGratuita(tx, prenotazione.id);
    await aggiungiPulizieFinali(tx, prenotazione.id);

    return caricaPrenotazioneCompleta(tx, hotelId, prenotazione.id);
  });
}

/** Assegna una camera fisica specifica a un segmento creato senza camera (prenotazione generica). */
export async function assegnaCamera(hotelId: number, segmentoId: number, cameraId: number) {
  return prisma.$transaction(async (tx) => {
    const segmento = await trovaSegmentoDelHotel(tx, hotelId, segmentoId);
    await verificaCameraAperta(tx, segmento.prenotazioneId, segmentoId);
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
  const pagato = pagatoNetto(prenotazione.pagamenti);
  // Prenotazione annullata: l'unico importo dovuto è la penale trattenuta (se c'è).
  if (prenotazione.stato === "ANNULLATA") {
    const penale = Number(prenotazione.penale ?? 0);
    return { subtotale: 0, tassa: 0, tassaStimata: 0, personeStimate: 0, servizi: 0, extra: 0, totale: penale, pagato, daPagare: arrotonda2(penale - pagato) };
  }
  const attivi = prenotazione.segmenti.filter((s) => s.stato !== "ANNULLATO");
  const idAttivi = new Set(attivi.map((s) => s.id));
  const subtotale = attivi.reduce(
    (tot, seg) => tot + (seg.usoDiurno ? Number(seg.prezzoUsoDiurno ?? 0) : seg.notti.reduce((s, n) => s + Number(n.prezzo), 0)),
    0,
  );
  const tassaCalcolata = attivi.reduce(
    (tot, seg) => tot + seg.notti.reduce((s, n) => s + n.tasse.reduce((t, x) => t + Number(x.importo), 0), 0),
    0
  );
  // Persone prenotate non ancora registrate: la loro tassa è stimata e si somma a quella calcolata.
  const tassaStimata = arrotonda2(attivi.reduce((t, seg) => t + seg.tassaStimata.importo, 0));
  const personeStimate = attivi.reduce((t, seg) => t + seg.tassaStimata.persone, 0);
  const tassa = arrotonda2(tassaCalcolata + tassaStimata);
  // Un servizio legato solo a camere annullate non si addebita più.
  const servizi = prenotazione.serviziAggiunti
    .filter((s) => s.segmenti.length === 0 || s.segmenti.some((sg) => idAttivi.has(sg.segmentoId)))
    .reduce((tot, s) => tot + Number(s.prezzoUnitario) * s.quantita, 0);
  // Addebiti a mano sul conto (consumi, esborsi; gli abbuoni sottraggono), esclusi gli stornati.
  const extra = arrotonda2(
    prenotazione.addebiti.filter((a) => !a.stornatoIl).reduce((t, a) => t + (a.tipo === "abbuono" ? -1 : 1) * Number(a.prezzoUnitario) * a.quantita, 0),
  );
  const totale = arrotonda2(subtotale + tassa + servizi + extra);
  return { subtotale, tassa, tassaStimata, personeStimate, servizi, extra, totale, pagato, daPagare: arrotonda2(totale - pagato) };
}

const arrotonda2 = (n: number) => Math.round(n * 100) / 100;

/** Incassato al netto di rimborsi e storni. */
export function pagatoNetto(pagamenti: { importo: unknown; tipo: string; stornatoIl: Date | null }[]) {
  return arrotonda2(
    pagamenti.filter((p) => !p.stornatoIl).reduce((t, p) => t + (p.tipo === "rimborso" ? -1 : 1) * Number(p.importo), 0),
  );
}

async function scadenzeIniziali(db: Db, hotelId: number, input: { scadenzaOpzione?: string; accontoEntro?: string }) {
  const hotel = await db.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  const oggi = new Date(new Date().toISOString().slice(0, 10));
  const proposta = new Date(oggi.getTime() + hotel.giorniOpzione * 24 * 60 * 60 * 1000);
  return {
    scadenzaOpzione: input.scadenzaOpzione ? new Date(input.scadenzaOpzione) : hotel.giorniOpzione > 0 ? proposta : null,
    accontoEntro: input.accontoEntro ? new Date(input.accontoEntro) : null,
  };
}

export async function elencoPrenotazioni(hotelId: number) {
  return prisma.prenotazione.findMany({
    where: { hotelId },
    include: {
      ospitePrenotante: true,
      gruppo: true,
      segmenti: { select: SEGMENTI_ELENCO },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** Opzioni da seguire: scadute o in scadenza entro 2 giorni (da confermare o annullare). */
export async function opzioniDaSeguire(hotelId: number) {
  const limite = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return prisma.prenotazione.findMany({
    where: { hotelId, stato: "OPZIONE", scadenzaOpzione: { lte: limite } },
    include: {
      ospitePrenotante: true,
      gruppo: true,
      segmenti: { select: SEGMENTI_ELENCO },
    },
    orderBy: { scadenzaOpzione: "asc" },
  });
}

/**
 * Cerca prenotazioni per nome/cognome, sia dell'ospite prenotante sia di un qualsiasi
 * componente del gruppo — passate o future, non solo le piu' recenti (a differenza di
 * elencoPrenotazioni che mostra solo le ultime create): serve a ritrovare velocemente una
 * prenotazione per nome invece di scorrere il planning giorno per giorno.
 */
// Camere per l'elenco prenotazioni: periodo, camera, stato e chi è già arrivato (per gli arrivi del giorno).
const SEGMENTI_ELENCO = {
  dataInizio: true,
  dataFine: true,
  stato: true,
  usoDiurno: true,
  oraDal: true,
  oraAl: true,
  camera: { select: { codice: true } },
  tipoCamera: { select: { descrizione: true } },
  presenze: { select: { stato: true } },
} satisfies Prisma.SegmentoSoggiornoSelect;

/** Prenotazioni con almeno una camera che arriva quel giorno (aaaa-mm-gg), escluse le annullate. */
export async function arriviDelGiorno(hotelId: number, giorno: string) {
  const d = new Date(`${giorno}T00:00:00.000Z`);
  return prisma.prenotazione.findMany({
    where: { hotelId, stato: { not: "ANNULLATA" }, segmenti: { some: { dataInizio: d, stato: { not: "ANNULLATO" } } } },
    include: { ospitePrenotante: true, gruppo: true, segmenti: { select: SEGMENTI_ELENCO } },
    orderBy: [{ oraArrivo: "asc" }, { id: "asc" }],
  });
}

export async function cercaPrenotazioni(hotelId: number, query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return prisma.prenotazione.findMany({
    where: {
      hotelId,
      OR: [
        { ospitePrenotante: { OR: [{ nome: { contains: q } }, { cognome: { contains: q } }] } },
        { segmenti: { some: { ospite: { OR: [{ nome: { contains: q } }, { cognome: { contains: q } }] } } } },
        { segmenti: { some: { presenze: { some: { ospite: { OR: [{ nome: { contains: q } }, { cognome: { contains: q } }] } } } } } },
      ],
    },
    include: {
      ospitePrenotante: true,
      gruppo: true,
      segmenti: { select: SEGMENTI_ELENCO },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

/** Sempre filtrato per hotelId: una prenotazione di un altro hotel deve dare "non trovata", non i suoi dati. */
async function caricaPrenotazioneCompleta(db: Db, hotelId: number, id: number) {
  const p = await db.prenotazione.findFirstOrThrow({
    where: { id, hotelId },
    include: {
      hotel: { select: { comuneId: true, categoria: true } },
      ospitePrenotante: true,
      gruppo: true,
      intermediario: true,
      clientePagante: true,
      sospesoCliente: true,
      ospitePagante: true,
      intestazioniRighe: true,
      righeFatturate: true,
      addebiti: { include: { reparto: true, segmento: { include: { camera: true } } }, orderBy: [{ data: "asc" }, { id: "asc" }] },
      segmenti: {
        orderBy: { dataInizio: "asc" },
        include: {
          camera: true,
          tipoCamera: true,
          ospite: true,
          notti: { include: { tasse: true } },
          presenze: { include: { ospite: true }, orderBy: { id: "asc" } },
        },
      },
      pagamenti: { orderBy: [{ data: "asc" }, { id: "asc" }] },
      serviziAggiunti: {
        orderBy: { createdAt: "asc" },
        include: { servizioCatalogo: true, segmenti: { include: { segmento: { include: { ospite: true, camera: true } } } } },
      },
    },
  });
  // Stima della tassa per le persone prenotate non ancora registrate, camera per camera: si
  // ricalcola a ogni lettura, quindi segue da sola check-in, date di nascita, persone e date.
  const versioni = await regolamentiDelComune(db, p.hotel.comuneId);
  const segmenti = await Promise.all(
    p.segmenti.map(async (s) => ({
      ...s,
      tassaStimata: p.stato === "ANNULLATA" ? { persone: 0, importo: 0 } : await stimaTassaMancanti(db, p.hotel, s, versioni),
    })),
  );
  return { ...p, segmenti };
}

/** Camera della prenotazione, sempre dell'hotel. Una camera annullata non si modifica (solo annullaCamera la legge così). */
async function trovaSegmentoDelHotel(db: Db, hotelId: number, segmentoId: number, ancheAnnullato = false, ancheUsoDiurno = false) {
  const segmento = await db.segmentoSoggiorno.findFirstOrThrow({
    where: { id: segmentoId, prenotazione: { hotelId } },
    include: { camera: true, tipoCamera: true, ospite: true },
  });
  if (!ancheAnnullato && segmento.stato === "ANNULLATO") throw new Error("Questa camera è annullata: non si può modificare.");
  if (!ancheUsoDiurno && segmento.usoDiurno) throw new Error("È un uso diurno (day use): non ha notti né ospiti registrati, si può solo annullare.");
  return segmento;
}

/** Ospiti che occupano una camera prenotata (le sue Presenze). */
async function occupanti(db: Db, segmentoId: number) {
  const presenze = await db.presenza.findMany({ where: { segmentoId }, select: { ospiteId: true } });
  return [...new Set(presenze.map((p) => p.ospiteId))];
}

/** Nessuna modifica a una camera se uno dei suoi occupanti ha già chiuso il soggiorno. */
async function verificaCameraAperta(db: Db, prenotazioneId: number, segmentoId: number) {
  for (const ospiteId of await occupanti(db, segmentoId)) await verificaPosizioneAperta(db, prenotazioneId, ospiteId);
}

/**
 * Come verificaCameraAperta, ma solo per chi è ancora nella camera dopo la data indicata: chi è già
 * partito prima (soggiorno chiuso) non viene toccato dall'accorciamento o allungamento.
 */
async function verificaOccupantiDopo(db: Db, prenotazioneId: number, segmento: { id: number; dataFine: Date }, data: Date) {
  const presenze = await db.presenza.findMany({ where: { segmentoId: segmento.id } });
  for (const p of presenze) {
    const fine = p.al ?? segmento.dataFine;
    if (fine > data || !p.al) await verificaPosizioneAperta(db, prenotazioneId, p.ospiteId);
  }
}

async function ricalcolaOccupanti(db: Db, prenotazioneId: number, ospiti: number[]) {
  for (const ospiteId of new Set(ospiti)) await ricalcolaTassaPosizione(db, prenotazioneId, ospiteId);
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

export const DESCRIZIONE_PULIZIA_FINALE = "Pulizia finale";

/**
 * Pulizia finale: a ogni camera della prenotazione il cui tipo ha il prezzo della pulizia finale si
 * aggiunge il servizio "Pulizia finale" (una volta per soggiorno, legato alla camera). Non si duplica
 * (camera che l'ha già) e non riguarda il cambio camera, che non passa di qui. Il servizio resta
 * modificabile o eliminabile come gli altri.
 */
async function aggiungiPulizieFinali(db: Db, prenotazioneId: number) {
  const segmenti = await db.segmentoSoggiorno.findMany({
    where: { prenotazioneId, stato: { not: "ANNULLATO" }, tipoCamera: { puliziaFinale: { gt: 0 } } },
    include: { tipoCamera: { select: { puliziaFinale: true } }, serviziAggiunti: { include: { servizioAggiunto: { select: { descrizione: true } } } } },
  });
  for (const s of segmenti) {
    if (s.serviziAggiunti.some((x) => x.servizioAggiunto.descrizione === DESCRIZIONE_PULIZIA_FINALE)) continue;
    await db.servizioAggiunto.create({
      data: {
        prenotazioneId,
        descrizione: DESCRIZIONE_PULIZIA_FINALE,
        prezzoUnitario: s.tipoCamera.puliziaFinale!,
        addebito: "una_tantum",
        unita: 1,
        quantita: 1,
        note: "Aggiunta in automatico dal tipo di camera",
        segmenti: { create: { segmentoId: s.id } },
      },
    });
  }
}

async function creaSegmento(
  db: Db,
  hotelId: number,
  prenotazioneId: number,
  segInput: NuovoSegmentoInput,
  segmentoPrecedenteId?: number
) {
  const ospiteId = await risolviOspite(db, hotelId, segInput.ospite);
  const ospite = await db.ospite.findUniqueOrThrow({ where: { id: ospiteId } });
  const tipoCamera = await db.tipoCamera.findFirstOrThrow({ where: { id: segInput.tipoCameraId, hotelId } });
  const listino = await db.listino.findFirstOrThrow({ where: { id: segInput.listinoId, hotelId } });
  const hotel = await db.hotel.findUniqueOrThrow({ where: { id: hotelId } });

  const dataInizio = new Date(segInput.dataInizio);
  const dataFine = new Date(segInput.dataFine);
  const composizione = segInput.composizione ?? { adulti: 1, etaBambini: [] };
  verificaComposizione(composizione);
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
      adulti: composizione.adulti,
      etaBambini: composizione.etaBambini,
    },
  });

  await generaNotti(db, segmento, dataInizio, dataFine);
  // L'intestatario è anche il primo occupante; gli altri si aggiungono al check-in.
  await db.presenza.create({ data: { segmentoId: segmento.id, ospiteId: ospite.id } });
  await ricalcolaTassaPosizione(db, prenotazioneId, ospite.id);

  return segmento;
}

/**
 * Crea le notti [dal, al) di un segmento con il loro prezzo, dalla composizione e dal trattamento
 * del segmento (motore unico in pricing.ts). La tassa la calcola poi ricalcolaTassaPosizione; la
 * gratuità dei gruppi ricalcolaGratuita sull'intera prenotazione.
 */
type SegmentoPrezzo = { id: number; listinoId: number; tipoCameraId: number; trattamento: string; adulti: number; etaBambini: unknown; prezzoConcordato?: unknown };

/** Prezzo di una notte della camera: il prezzo concordato a mano, se c'è, altrimenti il listino. */
async function prezzoNotte(db: Db, regole: Awaited<ReturnType<typeof regoleListino>>, segmento: SegmentoPrezzo, notte: Date) {
  if (segmento.prezzoConcordato !== null && segmento.prezzoConcordato !== undefined) {
    const importo = Math.round(Number(segmento.prezzoConcordato) * 100) / 100;
    // quote vuote: la gratuità dei gruppi non tocca un prezzo concordato.
    return { mancante: false as const, righe: [{ voce: "Prezzo concordato", importo }], lordo: importo, quote: [] as number[], gratuita: 0, concordato: true };
  }
  return { ...(await calcolaNotte(db, regole, segmento.tipoCameraId, notte, composizioneDi(segmento), segmento.trattamento)), concordato: false };
}

async function generaNotti(
  db: Db,
  segmento: SegmentoPrezzo,
  dataInizio: Date,
  dataFine: Date
) {
  const regole = await regoleListino(db, segmento.listinoId);
  for (const notte of nottiTraDate(dataInizio, dataFine)) {
    const calcolo = await prezzoNotte(db, regole, segmento, notte);
    // Nessuna tariffa impostata per questa notte: non blocca piu' la prenotazione (l'operatore
    // puo' bloccare le camere comunque e sistemare il listino piu' avanti — richiesto esplicitamente
    // dall'utente 2026-09-26), ma la notte resta segnata con prezzo 0 e motivo "mancante" cosi'
    // si vede chiaramente nel dettaglio prenotazione che il totale e' incompleto.
    await db.notteSoggiorno.create({
      data: calcolo.mancante
        ? { segmentoId: segmento.id, data: notte, prezzo: 0, motivoPrezzo: "mancante" }
        : {
            segmentoId: segmento.id,
            data: notte,
            prezzo: calcolo.lordo,
            motivoPrezzo: calcolo.concordato ? "concordato" : regole.tipo,
            dettaglio: { righe: calcolo.righe, lordo: calcolo.lordo, quote: calcolo.quote, gratuita: 0 },
          },
    });
  }
}

/**
 * Ricalcola il prezzo di TUTTE le notti di un segmento con composizione/trattamento/listino attuali
 * (es. dopo il check-in con persone diverse da quelle prenotate). Solo su richiesta esplicita:
 * altrimenti vale il prezzo fissato alla prenotazione. La tassa non cambia (dipende dalle presenze).
 */
async function riscriviPrezziSegmento(db: Db, segmentoId: number) {
  const segmento = await db.segmentoSoggiorno.findUniqueOrThrow({ where: { id: segmentoId } });
  const regole = await regoleListino(db, segmento.listinoId);
  const notti = await db.notteSoggiorno.findMany({ where: { segmentoId } });
  for (const n of notti) {
    const calcolo = await prezzoNotte(db, regole, segmento, n.data);
    await db.notteSoggiorno.update({
      where: { id: n.id },
      data: calcolo.mancante
        ? { prezzo: 0, motivoPrezzo: "mancante", dettaglio: Prisma.DbNull }
        : {
            prezzo: calcolo.lordo,
            motivoPrezzo: calcolo.concordato ? "concordato" : regole.tipo,
            dettaglio: { righe: calcolo.righe, lordo: calcolo.lordo, quote: calcolo.quote, gratuita: 0 },
          },
    });
  }
}

/**
 * Prezzo per notte concordato a mano su una camera (null = si torna al listino): riscrive tutte le
 * sue notti; i ricalcoli successivi lo rispettano. Resta traccia di chi l'ha fissato e perché.
 */
export async function impostaPrezzoConcordato(hotelId: number, segmentoId: number, prezzo: number | null, nota: string, utente: string) {
  if (prezzo !== null && !(prezzo >= 0)) throw new Error("Prezzo non valido.");
  if (prezzo !== null && !nota.trim()) throw new Error("Scrivi il motivo del prezzo concordato.");
  return prisma.$transaction(async (tx) => {
    const segmento = await trovaSegmentoDelHotel(tx, hotelId, segmentoId);
    await verificaCameraAperta(tx, segmento.prenotazioneId, segmentoId);
    await tx.segmentoSoggiorno.update({
      where: { id: segmentoId },
      data: prezzo === null
        ? { prezzoConcordato: null, prezzoConcordatoNota: null, prezzoConcordatoDa: null }
        : { prezzoConcordato: Math.round(prezzo * 100) / 100, prezzoConcordatoNota: nota.trim(), prezzoConcordatoDa: utente },
    });
    await riscriviPrezziSegmento(tx, segmentoId);
    await ricalcolaGratuita(tx, segmento.prenotazioneId);
    return caricaPrenotazioneCompleta(tx, hotelId, segmento.prenotazioneId);
  });
}

/** Cambia la composizione di una camera prenotata e, se richiesto, ricalcola i prezzi delle sue notti. */
export async function aggiornaComposizione(hotelId: number, segmentoId: number, composizione: Composizione, ricalcola: boolean) {
  verificaComposizione(composizione);
  return prisma.$transaction(async (tx) => {
    const segmento = await trovaSegmentoDelHotel(tx, hotelId, segmentoId);
    await tx.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { adulti: composizione.adulti, etaBambini: composizione.etaBambini } });
    if (ricalcola) {
      await riscriviPrezziSegmento(tx, segmentoId);
      await ricalcolaGratuita(tx, segmento.prenotazioneId);
    }
    return caricaPrenotazioneCompleta(tx, hotelId, segmento.prenotazioneId);
  });
}

/** Aggiunge un nuovo segmento a una prenotazione già esistente (es. un componente del gruppo che arriva dopo). */
export async function aggiungiSegmentoAPrenotazione(hotelId: number, prenotazioneId: number, segInput: NuovoSegmentoInput) {
  return prisma.$transaction(async (tx) => {
    // Verifica che la prenotazione appartenga all'hotel prima di aggiungerci qualcosa.
    const p = await tx.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId } });
    if (p.stato === "ANNULLATA") throw new Error("La prenotazione è annullata: riattivala prima di aggiungere camere.");
    if ("id" in segInput.ospite) await verificaPosizioneAperta(tx, prenotazioneId, segInput.ospite.id);
    await creaSegmento(tx, hotelId, prenotazioneId, segInput);
    await ricalcolaGratuita(tx, prenotazioneId);
    await aggiungiPulizieFinali(tx, prenotazioneId);
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
    const nuovaDataFine = new Date(nuovaDataFineIso);
    await verificaOccupantiDopo(tx, segmento.prenotazioneId, segmento, nuovaDataFine < segmento.dataFine ? nuovaDataFine : segmento.dataFine);
    const ospiti = await occupanti(tx, segmentoId);

    if (nuovaDataFine <= segmento.dataInizio) {
      throw new Error("La nuova data di partenza deve essere dopo l'arrivo.");
    }
    const arrivaDopo = await tx.presenza.findFirst({ where: { segmentoId, dal: { gte: nuovaDataFine } }, include: { ospite: true } });
    if (arrivaDopo) {
      throw new Error(`${arrivaDopo.ospite.nome} ${arrivaDopo.ospite.cognome} arriva dopo la nuova data di partenza: toglilo prima dalla camera.`);
    }

    if (nuovaDataFine < segmento.dataFine) {
      // Accorcia: elimina le notti (e le tasse a cascata) dalla nuova data in poi.
      const notti = await tx.notteSoggiorno.findMany({
        where: { segmentoId, data: { gte: nuovaDataFine } },
        select: { id: true },
      });
      await tx.tassaNotte.deleteMany({ where: { notteId: { in: notti.map((n) => n.id) } } });
      await tx.notteSoggiorno.deleteMany({ where: { id: { in: notti.map((n) => n.id) } } });
      // Chi partiva dopo la nuova data ora parte con la camera.
      await tx.presenza.updateMany({ where: { segmentoId, al: { gte: nuovaDataFine } }, data: { al: null } });
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
      await generaNotti(tx, segmento, segmento.dataFine, nuovaDataFine);
    }

    await tx.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { dataFine: nuovaDataFine } });
    await ricalcolaOccupanti(tx, segmento.prenotazioneId, ospiti);
    await ricalcolaGratuita(tx, segmento.prenotazioneId);

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
    await verificaCameraAperta(tx, segmento.prenotazioneId, segmentoId);

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

    const nuovo = await creaSegmento(
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
        composizione: composizioneDi(segmento),
      },
      segmentoId
    );
    if (segmento.prezzoConcordato !== null) {
      await tx.segmentoSoggiorno.update({
        where: { id: nuovo.id },
        data: { prezzoConcordato: segmento.prezzoConcordato, prezzoConcordatoNota: segmento.prezzoConcordatoNota, prezzoConcordatoDa: segmento.prezzoConcordatoDa },
      });
      await riscriviPrezziSegmento(tx, nuovo.id);
    }

    // Gli occupanti ancora presenti alla data del cambio passano nella nuova camera con i loro dati
    // di check-in; chi arriva dopo il cambio si sposta del tutto.
    const presenze = await tx.presenza.findMany({ where: { segmentoId } });
    for (const p of presenze) {
      if (p.al && p.al <= dataCambio) continue; // già partito prima del cambio
      const { id, segmentoId: _vecchio, createdAt: _c, updatedAt: _u, ...dati } = p;
      await tx.presenza.upsert({
        where: { segmentoId_ospiteId: { segmentoId: nuovo.id, ospiteId: p.ospiteId } },
        update: { ...dati, dal: p.dal && p.dal > dataCambio ? p.dal : null },
        create: { ...dati, segmentoId: nuovo.id, dal: p.dal && p.dal > dataCambio ? p.dal : null },
      });
      if (p.dal && p.dal >= dataCambio) await tx.presenza.delete({ where: { id } });
      else if (p.al) await tx.presenza.update({ where: { id }, data: { al: null } });
    }
    await ricalcolaOccupanti(tx, segmento.prenotazioneId, presenze.map((p) => p.ospiteId));

    return caricaPrenotazioneCompleta(tx, hotelId, segmento.prenotazioneId);
  });
}

// ---------------- Stato della prenotazione (conferma, annullamento, riattivazione) ----------------

export const MOTIVI_ANNULLAMENTO = { cliente: "Annullata dal cliente", no_show: "Mancato arrivo (no-show)", errore: "Errore di inserimento", altro: "Altro" } as const;
export type MotivoAnnullamento = keyof typeof MOTIVI_ANNULLAMENTO;

/** Nessuno degli ospiti è arrivato: si può annullare (dopo l'arrivo si usano partenza anticipata e check-out). */
async function verificaNessunArrivo(db: Db, where: Prisma.PresenzaWhereInput, cosa: string) {
  const arrivato = await db.presenza.findFirst({ where: { ...where, stato: { not: "attesa" } }, include: { ospite: true } });
  if (arrivato) {
    throw new Error(
      `${arrivato.ospite.nome} ${arrivato.ospite.cognome} è già arrivato: ${cosa} non si può annullare. Usa "Cambia partenza" o il check-out.`,
    );
  }
}

export async function confermaPrenotazione(hotelId: number, id: number) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.prenotazione.findFirstOrThrow({ where: { id, hotelId } });
    if (p.stato !== "OPZIONE") throw new Error("Si può confermare solo una prenotazione in opzione.");
    await tx.prenotazione.update({ where: { id }, data: { stato: "CONFERMATA", confermataIl: new Date() } });
    return caricaPrenotazioneCompleta(tx, hotelId, id);
  });
}

/**
 * Annulla tutta la prenotazione: camere libere subito, tassa azzerata, storico conservato.
 * Con incassi già fatti si decide: trattenerli come penale o registrarne il rimborso.
 */
/** Momento di arrivo (primo giorno all'orario di check-in), notti e base della penale. */
async function datiPenale(db: Db, hotelId: number, id: number) {
  const p = await caricaPrenotazioneCompleta(db, hotelId, id);
  const hotel = await db.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  const attivi = p.segmenti.filter((x) => x.stato !== "ANNULLATO");
  const nottiPerData = attivi.flatMap((x) => x.notti.map((n) => ({ data: n.data.toISOString().slice(0, 10), importo: Number(n.prezzo) })));
  const t = calcolaTotaliPrenotazione(p);
  const primo = attivi.map((x) => x.dataInizio.toISOString().slice(0, 10)).sort()[0] ?? new Date().toISOString().slice(0, 10);
  const caparra = arrotonda2(
    p.pagamenti.filter((x) => !x.stornatoIl && x.tipo === "caparra").reduce((s, x) => s + Number(x.importo), 0),
  );
  return { p, arrivo: istanteItalia(primo, hotel.orarioCheckIn ?? "14:00"), nottiPerData, soggiorno: arrotonda2(t.subtotale + t.servizi), caparra };
}

/**
 * Penale proposta per un annullamento con quel motivo: dalla politica copiata nella prenotazione.
 * Se il cliente annulla o non si presenta, la caparra confirmatoria si trattiene comunque.
 */
export async function penaleProposta(hotelId: number, id: number, motivo: string) {
  const d = await datiPenale(prisma, hotelId, id);
  const politica = (d.p.politica as PoliticaCopiata | null) ?? null;
  const r = calcolaPenale(politica, motivo, { arrivo: d.arrivo, adesso: new Date(), nottiPerData: d.nottiPerData, soggiorno: d.soggiorno });
  const incassato = pagatoNetto(d.p.pagamenti);
  if (motivo !== "errore" && d.caparra > 0 && (r.importo ?? 0) < d.caparra) {
    return { importo: d.caparra, spiegazione: `${r.importo === null ? "" : `${r.spiegazione} `}La caparra confirmatoria (${d.caparra.toFixed(2)} €) si trattiene.`, incassato };
  }
  return { ...r, incassato };
}

export async function annullaPrenotazione(
  hotelId: number,
  id: number,
  dati: { motivo: MotivoAnnullamento; nota: string; penale: number; rimborsaEccedenza: boolean; metodoRimborso?: string },
  utente: string,
) {
  if (!(dati.motivo in MOTIVI_ANNULLAMENTO)) throw new Error("Indica il motivo dell'annullamento.");
  const penale = arrotonda2(Number(dati.penale));
  if (!(penale >= 0)) throw new Error("La penale non può essere negativa.");
  return prisma.$transaction(async (tx) => {
    const p = await tx.prenotazione.findFirstOrThrow({ where: { id, hotelId }, include: { pagamenti: true } });
    if (p.stato === "ANNULLATA") throw new Error("La prenotazione è già annullata.");
    await verificaNessunArrivo(tx, { segmento: { prenotazioneId: id } }, "la prenotazione");
    // Incassato oltre la penale: si rimborsa o, se si sceglie di non farlo, diventa penale.
    const incassato = pagatoNetto(p.pagamenti);
    const eccedenza = arrotonda2(incassato - penale);
    let penaleFinale = penale;
    if (eccedenza > 0 && dati.rimborsaEccedenza) {
      await verificaCassaAperta(tx, hotelId, oggiItaliano());
      await tx.pagamento.create({
        data: {
          hotelId,
          prenotazioneId: id,
          data: new Date(oggiItaliano()),
          importo: eccedenza,
          metodo: dati.metodoRimborso || "altro",
          tipo: "rimborso",
          nota: "Rimborso per annullamento",
          registratoDa: utente,
        },
      });
    } else if (eccedenza > 0) penaleFinale = incassato;
    await tx.segmentoSoggiorno.updateMany({ where: { prenotazioneId: id }, data: { stato: "ANNULLATO" } });
    await tx.prenotazione.update({
      where: { id },
      data: {
        stato: "ANNULLATA",
        annullataIl: new Date(),
        annullataDa: utente,
        motivoAnnullamento: dati.motivo,
        notaAnnullamento: dati.nota.trim() || null,
        penale: penaleFinale > 0 ? penaleFinale : null,
      },
    });
    const ospiti = await tx.presenza.findMany({ where: { segmento: { prenotazioneId: id } }, select: { ospiteId: true } });
    await ricalcolaOccupanti(tx, id, ospiti.map((o) => o.ospiteId));
    return caricaPrenotazioneCompleta(tx, hotelId, id);
  });
}

/** Provenienza e garanzia di una prenotazione esistente. */
export async function aggiornaProvenienza(hotelId: number, id: number, dati: ProvenienzaInput) {
  return prisma.$transaction(async (tx) => {
    await tx.prenotazione.findFirstOrThrow({ where: { id, hotelId } });
    await tx.prenotazione.update({ where: { id }, data: await datiProvenienza(tx, hotelId, dati) });
    return caricaPrenotazioneCompleta(tx, hotelId, id);
  });
}

/** Cambia la politica di cancellazione della prenotazione (es. tariffa non rimborsabile concordata). */
export async function cambiaPoliticaPrenotazione(hotelId: number, id: number, politicaId: number | null) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.prenotazione.findFirstOrThrow({ where: { id, hotelId } });
    if (p.stato === "ANNULLATA") throw new Error("La prenotazione è annullata.");
    if (!politicaId) {
      await tx.prenotazione.update({ where: { id }, data: { politicaId: null, politica: Prisma.DbNull } });
    } else {
      const r = await tx.politicaCancellazione.findFirstOrThrow({ where: { id: politicaId, hotelId, attiva: true } });
      const copia: PoliticaCopiata = { id: r.id, nome: r.nome, scaglioni: r.scaglioni as PoliticaCopiata["scaglioni"], noShow: r.noShow as PoliticaCopiata["noShow"] };
      await tx.prenotazione.update({ where: { id }, data: { politicaId: r.id, politica: copia as unknown as Prisma.InputJsonValue } });
    }
    return caricaPrenotazioneCompleta(tx, hotelId, id);
  });
}

/** Annulla una sola camera di una prenotazione con più camere (es. il gruppo si è ridotto). */
export async function annullaCamera(hotelId: number, segmentoId: number) {
  return prisma.$transaction(async (tx) => {
    const segmento = await trovaSegmentoDelHotel(tx, hotelId, segmentoId, true, true);
    if (segmento.stato === "ANNULLATO") throw new Error("La camera è già annullata.");
    await verificaNessunArrivo(tx, { segmentoId }, "la camera");
    const attive = await tx.segmentoSoggiorno.count({ where: { prenotazioneId: segmento.prenotazioneId, stato: { not: "ANNULLATO" } } });
    if (attive <= 1) throw new Error("È l'ultima camera della prenotazione: per liberarla annulla l'intera prenotazione.");
    await tx.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { stato: "ANNULLATO" } });
    await ricalcolaOccupanti(tx, segmento.prenotazioneId, await occupanti(tx, segmentoId));
    await ricalcolaGratuita(tx, segmento.prenotazioneId);
    return caricaPrenotazioneCompleta(tx, hotelId, segmento.prenotazioneId);
  });
}

/** Riattiva una prenotazione annullata (torna in opzione) se tutte le sue camere sono ancora libere. */
export async function riattivaPrenotazione(hotelId: number, id: number) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.prenotazione.findFirstOrThrow({ where: { id, hotelId }, include: { segmenti: { include: { camera: true, tipoCamera: true } } } });
    if (p.stato !== "ANNULLATA") throw new Error("La prenotazione non è annullata.");
    for (const s of p.segmenti) {
      if (s.usoDiurno) {
        await verificaUsoDiurnoLibero(tx, hotelId, { cameraId: s.cameraId!, giorno: s.dataInizio, dalle: s.oraDal ?? "00:00", alle: s.oraAl ?? "23:59" }, s.id);
        continue;
      }
      const libera = s.cameraId
        ? await cameraDisponibile(tx, s.cameraId, s.dataInizio, s.dataFine, s.id)
        : (await capacitaLiberaPerTipo(tx, s.tipoCameraId, s.dataInizio, s.dataFine, s.id)) > 0;
      if (!libera) throw new Error(`Non si può riattivare: ${s.camera ? `la camera ${s.camera.codice} non è più libera` : `nessuna camera "${s.tipoCamera.descrizione}" è libera`} nel periodo.`);
    }
    await tx.segmentoSoggiorno.updateMany({ where: { prenotazioneId: id }, data: { stato: "PREVISTO" } });
    await tx.prenotazione.update({
      where: { id },
      data: { stato: "OPZIONE", annullataIl: null, annullataDa: null, motivoAnnullamento: null, notaAnnullamento: null, penale: null, ...(await scadenzeIniziali(tx, hotelId, {})) },
    });
    const ospiti = await tx.presenza.findMany({ where: { segmento: { prenotazioneId: id } }, select: { ospiteId: true } });
    await ricalcolaOccupanti(tx, id, ospiti.map((o) => o.ospiteId));
    await ricalcolaGratuita(tx, id);
    return caricaPrenotazioneCompleta(tx, hotelId, id);
  });
}

export async function impostaScadenze(hotelId: number, id: number, d: { scadenzaOpzione: string; accontoEntro: string; accontoRichiesto: number | null }) {
  if (d.accontoRichiesto !== null && !(d.accontoRichiesto >= 0)) throw new Error("Acconto non valido.");
  return prisma.$transaction(async (tx) => {
    await tx.prenotazione.findFirstOrThrow({ where: { id, hotelId } });
    await tx.prenotazione.update({
      where: { id },
      data: {
        scadenzaOpzione: d.scadenzaOpzione ? new Date(d.scadenzaOpzione) : null,
        accontoEntro: d.accontoEntro ? new Date(d.accontoEntro) : null,
        accontoRichiesto: d.accontoRichiesto,
      },
    });
    return caricaPrenotazioneCompleta(tx, hotelId, id);
  });
}

// ---------------- Pagamenti ----------------

export const METODI_PAGAMENTO = { contanti: "Contanti", carta: "Carta di credito", bancomat: "Bancomat", bonifico: "Bonifico", assegno: "Assegno", altro: "Altro" } as const;
// Caparra confirmatoria (art. 1385 c.c.): se il cliente annulla o non si presenta l'hotel la trattiene.
export const TIPI_PAGAMENTO = { caparra: "Caparra confirmatoria", acconto: "Acconto", saldo: "Saldo", rimborso: "Rimborso" } as const;

export async function registraPagamento(
  hotelId: number,
  prenotazioneId: number,
  d: { data: string; importo: number; metodo: string; tipo: string; nota: string; intestatario?: string | null },
  utente: string,
) {
  if (!d.data) throw new Error("Indica la data del pagamento.");
  if (d.intestatario && d.intestatario !== "ospite" && !/^cliente:\d+$/.test(d.intestatario)) throw new Error("Intestatario non valido.");
  if (!(d.importo > 0)) throw new Error("L'importo deve essere maggiore di zero.");
  if (!(d.metodo in METODI_PAGAMENTO)) throw new Error("Metodo di pagamento non valido.");
  if (!(d.tipo in TIPI_PAGAMENTO)) throw new Error("Tipo di pagamento non valido.");
  return prisma.$transaction(async (tx) => {
    const p = await tx.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId }, include: { pagamenti: true } });
    await verificaCassaAperta(tx, hotelId, d.data);
    if (d.tipo === "rimborso" && d.importo > pagatoNetto(p.pagamenti) + 0.001) {
      throw new Error(`Non si può rimborsare più di quanto incassato (€ ${pagatoNetto(p.pagamenti).toFixed(2)}).`);
    }
    await tx.pagamento.create({
      data: {
        hotelId,
        prenotazioneId,
        data: new Date(d.data),
        importo: d.importo,
        metodo: d.metodo,
        tipo: d.tipo,
        nota: d.nota.trim() || null,
        registratoDa: utente,
        intestatario: d.intestatario && d.intestatario !== "ospite" ? d.intestatario : null,
      },
    });
    return caricaPrenotazioneCompleta(tx, hotelId, prenotazioneId);
  });
}

/** Un incasso sbagliato non si cancella: si storna con motivo, e resta visibile. */
export async function stornaPagamento(hotelId: number, pagamentoId: number, motivo: string, utente: string) {
  if (!motivo.trim()) throw new Error("Indica il motivo dello storno.");
  return prisma.$transaction(async (tx) => {
    const pag = await tx.pagamento.findFirstOrThrow({ where: { id: pagamentoId, hotelId, prenotazioneId: { not: null } } });
    if (pag.stornatoIl) throw new Error("Pagamento già stornato.");
    await verificaCassaAperta(tx, hotelId, oggiItaliano());
    await tx.pagamento.update({ where: { id: pagamentoId }, data: { stornatoIl: new Date(), stornatoDa: utente, motivoStorno: motivo.trim() } });
    return caricaPrenotazioneCompleta(tx, hotelId, pag.prenotazioneId!);
  });
}

// ---------------- Uso diurno (day use) ----------------

const ORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const minuti = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/**
 * La camera è libera per un uso diurno quel giorno in quella fascia: non c'è un soggiorno che la
 * occupa per tutta la giornata (chi parte la mattina o arriva la sera non la blocca), non è fuori
 * servizio e non c'è un altro uso diurno che si sovrappone negli orari.
 */
async function verificaUsoDiurnoLibero(db: Db, hotelId: number, d: { cameraId: number; giorno: Date; dalle: string; alle: string }, escludiId?: number) {
  const camera = await trovaCameraDelHotel(db, hotelId, d.cameraId);
  const occupata = await db.segmentoSoggiorno.findFirst({
    where: { cameraId: d.cameraId, stato: { not: "ANNULLATO" }, usoDiurno: false, dataInizio: { lt: d.giorno }, dataFine: { gt: d.giorno }, id: escludiId ? { not: escludiId } : undefined },
  });
  if (occupata) throw new Error(`La camera ${camera.codice} quel giorno è occupata da un soggiorno.`);
  const ferma = await db.cameraIndisponibilita.findFirst({ where: { cameraId: d.cameraId, dal: { lte: d.giorno }, al: { gt: d.giorno } } });
  if (ferma) throw new Error(`La camera ${camera.codice} quel giorno è fuori servizio.`);
  const altri = await db.segmentoSoggiorno.findMany({
    where: { cameraId: d.cameraId, stato: { not: "ANNULLATO" }, usoDiurno: true, dataInizio: d.giorno, id: escludiId ? { not: escludiId } : undefined },
  });
  const sovrapposto = altri.find((x) => minuti(x.oraDal ?? "00:00") < minuti(d.alle) && minuti(x.oraAl ?? "23:59") > minuti(d.dalle));
  if (sovrapposto) throw new Error(`La camera ${camera.codice} è già in uso diurno dalle ${sovrapposto.oraDal} alle ${sovrapposto.oraAl}.`);
  return camera;
}

/** Prezzo proposto: prezzo orario del tipo di camera per le ore della fascia (arrotondato ai centesimi). */
export async function prezzoPropostoUsoDiurno(hotelId: number, cameraId: number, dalle: string, alle: string) {
  const camera = await trovaCameraDelHotel(prisma, hotelId, cameraId);
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { id: camera.tipoCameraId, hotelId } });
  if (!ORA.test(dalle) || !ORA.test(alle) || minuti(alle) <= minuti(dalle) || tipo.prezzoOraUsoDiurno === null) return null;
  return Math.round(((Number(tipo.prezzoOraUsoDiurno) * (minuti(alle) - minuti(dalle))) / 60) * 100) / 100;
}

export type UsoDiurnoInput = {
  cameraId: number;
  giorno: string;
  dalle: string;
  alle: string;
  ospite: OspiteRif;
  prezzo: number;
  note?: string;
  provenienza?: ProvenienzaInput;
};

/**
 * Uso diurno (day use): la camera usata di giorno, senza pernottamento (es. relatore di un evento,
 * ospite con il volo la sera). Nasce come prenotazione confermata con una sola camera, senza notti:
 * niente tassa di soggiorno, schedina di Polizia né ISTAT, che riguardano i pernottamenti.
 */
export async function creaUsoDiurno(hotelId: number, d: UsoDiurnoInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.giorno)) throw new Error("Indica il giorno.");
  if (!ORA.test(d.dalle) || !ORA.test(d.alle)) throw new Error("Indica gli orari (hh:mm).");
  if (minuti(d.alle) <= minuti(d.dalle)) throw new Error("L'ora di fine deve essere dopo quella di inizio.");
  if (!(d.prezzo >= 0)) throw new Error("Prezzo non valido.");
  const giorno = new Date(`${d.giorno}T00:00:00.000Z`);
  return prisma.$transaction(async (tx) => {
    const camera = await verificaUsoDiurnoLibero(tx, hotelId, { cameraId: d.cameraId, giorno, dalle: d.dalle, alle: d.alle });
    const ospiteId = await risolviOspite(tx, hotelId, d.ospite);
    const listino =
      (await tx.listino.findFirst({ where: { hotelId, tipo: "base" } })) ?? (await tx.listino.findFirstOrThrow({ where: { hotelId }, orderBy: { id: "asc" } }));
    const p = await tx.prenotazione.create({
      data: {
        hotelId,
        ospitePrenotanteId: ospiteId,
        stato: "CONFERMATA",
        confermataIl: new Date(),
        note: d.note?.trim() || null,
        ...(await datiProvenienza(tx, hotelId, d.provenienza ?? {})),
      },
    });
    await tx.segmentoSoggiorno.create({
      data: {
        prenotazioneId: p.id,
        cameraId: camera.id,
        tipoCameraId: camera.tipoCameraId,
        ospiteId,
        trattamento: "Uso diurno",
        listinoId: listino.id,
        dataInizio: giorno,
        dataFine: giorno,
        stato: "PREVISTO",
        usoDiurno: true,
        oraDal: d.dalle,
        oraAl: d.alle,
        prezzoUsoDiurno: Math.round(d.prezzo * 100) / 100,
      },
    });
    return caricaPrenotazioneCompleta(tx, hotelId, p.id);
  });
}
