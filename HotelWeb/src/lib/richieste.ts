import { prisma } from "@/lib/prisma";
import { istanteItalia } from "@/lib/politicheRegole";
import { creaSegnalazione } from "@/lib/manutenzioni";
import { soggiornoDelQr } from "@/lib/roomService";
import { TIPI_RICHIESTA, type TipoRichiesta } from "@/lib/richiesteRegole";

/**
 * Richieste degli ospiti (asciugamani, cuscino, sveglia…) e guasti segnalati dall'ospite con il QR,
 * più il registro degli oggetti smarriti. Le richieste arrivano a reception e governante.
 */

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const oraDi = (d: Date) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
const giornoDi = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
const MAX_RICHIESTE_APERTE_QR = 5;
const MAX_GUASTI_APERTI_QR = 3;

export type RichiestaInput = { tipo: TipoRichiesta; dettaglio: string; perQuando: string | null };

function valida(d: RichiestaInput) {
  if (!(d.tipo in TIPI_RICHIESTA)) throw new Error("Scegli cosa ti serve.");
  const dettaglio = d.dettaglio.trim();
  if (dettaglio.length > 300) throw new Error("Testo troppo lungo (massimo 300 caratteri).");
  if (d.tipo === "altro" && !dettaglio) throw new Error("Scrivi cosa ti serve.");
  let quando: Date | null = null;
  if (d.perQuando) {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(d.perQuando);
    if (!m) throw new Error("Orario non valido.");
    quando = istanteItalia(m[1], m[2]);
    if (quando.getTime() < Date.now() - 5 * 60000) throw new Error("L'orario è già passato.");
    if (quando.getTime() > Date.now() + 36 * 3600000) throw new Error("Si può chiedere al massimo per domani.");
  }
  if (d.tipo === "sveglia" && !quando) throw new Error("Indica l'ora della sveglia.");
  return { tipo: d.tipo, dettaglio: dettaglio || null, perQuando: quando };
}

/** Richiesta presa dal personale (a voce o al telefono) per una camera. */
export async function creaRichiesta(hotelId: number, cameraId: number, d: RichiestaInput, autore: string) {
  const v = valida(d);
  const camera = await prisma.camera.findFirst({ where: { id: cameraId, hotelId } });
  if (!camera) throw new Error("Camera non trovata.");
  const g = new Date(oggiItalia());
  const seg = await prisma.segmentoSoggiorno.findFirst({
    where: { cameraId, stato: { not: "ANNULLATO" }, prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, dataInizio: { lte: g }, dataFine: { gte: g } },
    orderBy: { dataInizio: "desc" },
  });
  await prisma.richiestaOspite.create({ data: { hotelId, cameraId, segmentoId: seg?.id ?? null, ...v, origine: "personale", creataDa: autore } });
}

/** Richiesta dell'ospite dal QR: al massimo 5 in attesa per camera. */
export async function richiestaDaQr(codice: string, d: RichiestaInput) {
  const s = await soggiornoDelQr(codice, "richieste");
  const v = valida(d);
  const aperte = await prisma.richiestaOspite.count({ where: { segmentoId: s.id, stato: "aperta" } });
  if (aperte >= MAX_RICHIESTE_APERTE_QR) throw new Error("Ci sono già diverse richieste in attesa: per altro chiama la reception.");
  await prisma.richiestaOspite.create({ data: { hotelId: s.prenotazione.hotelId, cameraId: s.cameraId, segmentoId: s.id, ...v, origine: "qr" } });
}

/** Guasto segnalato dall'ospite dal QR: arriva alle manutenzioni (priorità normale, la valuta il personale). */
export async function guastoDaQr(codice: string, descrizione: string) {
  const s = await soggiornoDelQr(codice, "guasti");
  if (!s.cameraId) throw new Error("La camera non è ancora assegnata: chiama la reception.");
  const aperti = await prisma.segnalazione.count({ where: { cameraId: s.cameraId, origine: "ospite", stato: { in: ["aperta", "in_lavorazione"] } } });
  if (aperti >= MAX_GUASTI_APERTI_QR) throw new Error("Abbiamo già le tue segnalazioni: per altro chiama la reception.");
  await creaSegnalazione(s.prenotazione.hotelId, { cameraId: s.cameraId, zona: "", descrizione, priorita: "normale" }, `Ospite camera ${s.camera?.codice ?? ""}`.trim(), "ospite");
}

export async function elencoRichieste(hotelId: number, vista: "aperte" | "chiuse") {
  const r = await prisma.richiestaOspite.findMany({
    where: { hotelId, ...(vista === "aperte" ? { stato: "aperta" } : { stato: { not: "aperta" }, chiusaIl: { gte: new Date(Date.now() - 7 * 86400000) } }) },
    include: { camera: true },
    orderBy: vista === "aperte" ? [{ creataIl: "asc" }] : [{ chiusaIl: "desc" }],
    take: 200,
  });
  const lista = r.map((x) => ({
    id: x.id,
    camera: x.camera?.codice ?? null,
    tipo: x.tipo as TipoRichiesta,
    dettaglio: x.dettaglio ?? "",
    perQuando: x.perQuando ? `${giornoDi(x.perQuando) === oggiItalia() ? "oggi" : "domani"} alle ${oraDi(x.perQuando)}` : null,
    perQuandoIso: x.perQuando?.toISOString() ?? null,
    origine: x.origine,
    stato: x.stato,
    creataIl: x.creataIl.toISOString(),
    creataDa: x.creataDa ?? "",
    chiusaDa: x.chiusaDa ?? "",
    nota: x.nota ?? "",
  }));
  // Le sveglie e le richieste con un'ora vanno in ordine di ora, prima delle altre.
  if (vista === "aperte") lista.sort((a, b) => (a.perQuandoIso && b.perQuandoIso ? a.perQuandoIso.localeCompare(b.perQuandoIso) : a.perQuandoIso ? -1 : b.perQuandoIso ? 1 : 0));
  return lista;
}

export async function chiudiRichiesta(hotelId: number, id: number, esito: "fatta" | "annullata", nota: string, utente: string) {
  const r = await prisma.richiestaOspite.findFirst({ where: { id, hotelId } });
  if (!r) throw new Error("Richiesta non trovata.");
  if (r.stato !== "aperta") throw new Error("La richiesta è già chiusa.");
  if (esito === "annullata" && !nota.trim()) throw new Error("Scrivi il motivo.");
  await prisma.richiestaOspite.update({ where: { id }, data: { stato: esito, nota: nota.trim() || null, chiusaIl: new Date(), chiusaDa: utente } });
}

// ---------------- Oggetti smarriti ----------------

export type OggettoInput = { trovatoIl: string; cameraId: number | null; zona: string; descrizione: string; conservatoIn: string };

/**
 * Probabile proprietario: chi ha lasciato la camera quel giorno o il giorno prima, altrimenti chi
 * c'era quel giorno.
 */
async function prenotazioneProbabile(hotelId: number, cameraId: number, trovatoIl: string) {
  const g = new Date(trovatoIl);
  const ieri = new Date(Date.parse(`${trovatoIl}T00:00:00Z`) - 86400000);
  const partito = await prisma.segmentoSoggiorno.findFirst({
    where: { cameraId, stato: { not: "ANNULLATO" }, prenotazione: { hotelId }, dataFine: { gte: ieri, lte: g }, dataInizio: { lt: g } },
    orderBy: { dataFine: "desc" },
  });
  if (partito) return partito.prenotazioneId;
  const presente = await prisma.segmentoSoggiorno.findFirst({ where: { cameraId, stato: { not: "ANNULLATO" }, prenotazione: { hotelId }, dataInizio: { lte: g }, dataFine: { gt: g } } });
  return presente?.prenotazioneId ?? null;
}

export async function registraOggetto(hotelId: number, d: OggettoInput, autore: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.trovatoIl)) throw new Error("Indica quando è stato trovato.");
  if (d.trovatoIl > oggiItalia()) throw new Error("La data non può essere futura.");
  const descrizione = d.descrizione.trim();
  if (descrizione.length < 3) throw new Error("Descrivi l'oggetto (es. caricabatterie nero, occhiali da sole).");
  const zona = d.zona.trim();
  if (d.cameraId === null && !zona) throw new Error("Indica la camera o il posto dove è stato trovato.");
  if (d.cameraId !== null) await prisma.camera.findFirstOrThrow({ where: { id: d.cameraId, hotelId } });
  const prenotazioneId = d.cameraId !== null ? await prenotazioneProbabile(hotelId, d.cameraId, d.trovatoIl) : null;
  const o = await prisma.oggettoSmarrito.create({
    data: { hotelId, trovatoIl: new Date(d.trovatoIl), cameraId: d.cameraId, zona: d.cameraId === null ? zona : null, descrizione, conservatoIn: d.conservatoIn.trim() || null, trovatoDa: autore, prenotazioneId },
  });
  return o.id;
}

export async function elencoOggetti(hotelId: number, vista: "deposito" | "chiusi") {
  const [hotel, r] = await Promise.all([
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { mesiConservazioneOggetti: true } }),
    prisma.oggettoSmarrito.findMany({
      where: { hotelId, stato: vista === "deposito" ? "in_deposito" : { not: "in_deposito" } },
      include: { camera: true, prenotazione: { include: { ospitePrenotante: true } } },
      orderBy: { trovatoIl: vista === "deposito" ? "asc" : "desc" },
      take: 300,
    }),
  ]);
  const limite = new Date(new Date(oggiItalia()).setUTCMonth(new Date(oggiItalia()).getUTCMonth() - hotel.mesiConservazioneOggetti));
  return {
    mesi: hotel.mesiConservazioneOggetti,
    oggetti: r.map((o) => ({
      id: o.id,
      trovatoIl: o.trovatoIl.toISOString().slice(0, 10),
      camera: o.camera?.codice ?? null,
      zona: o.zona,
      descrizione: o.descrizione,
      trovatoDa: o.trovatoDa,
      conservatoIn: o.conservatoIn ?? "",
      stato: o.stato,
      daSmaltire: o.stato === "in_deposito" && o.trovatoIl < limite,
      proprietario: o.prenotazione
        ? {
            prenotazioneId: o.prenotazione.id,
            nome: `${o.prenotazione.ospitePrenotante.cognome} ${o.prenotazione.ospitePrenotante.nome}`.trim(),
            contatto: [o.prenotazione.ospitePrenotante.telefono, o.prenotazione.ospitePrenotante.email].filter(Boolean).join(" · "),
          }
        : null,
      restituitoA: o.restituitoA ?? "",
      chiusoIl: o.chiusoIl?.toISOString() ?? null,
      chiusoDa: o.chiusoDa ?? "",
      nota: o.nota ?? "",
    })),
  };
}

async function oggettoInDeposito(hotelId: number, id: number) {
  const o = await prisma.oggettoSmarrito.findFirst({ where: { id, hotelId } });
  if (!o) throw new Error("Oggetto non trovato.");
  if (o.stato !== "in_deposito") throw new Error("L'oggetto non è più in deposito.");
  return o;
}

/** Restituito (consegnato o spedito): a chi, con una nota (es. spedito con corriere, a carico dell'ospite). */
export async function restituisciOggetto(hotelId: number, id: number, a: string, nota: string, utente: string) {
  await oggettoInDeposito(hotelId, id);
  if (!a.trim()) throw new Error("Scrivi a chi è stato restituito.");
  await prisma.oggettoSmarrito.update({ where: { id }, data: { stato: "restituito", restituitoA: a.trim(), nota: nota.trim() || null, chiusoIl: new Date(), chiusoDa: utente } });
}

export async function smaltisciOggetto(hotelId: number, id: number, nota: string, utente: string) {
  await oggettoInDeposito(hotelId, id);
  if (!nota.trim()) throw new Error("Scrivi come è stato smaltito (es. donato, buttato).");
  await prisma.oggettoSmarrito.update({ where: { id }, data: { stato: "smaltito", nota: nota.trim(), chiusoIl: new Date(), chiusoDa: utente } });
}

export async function impostaConservazione(hotelId: number, mesi: number) {
  if (!Number.isInteger(mesi) || mesi < 1 || mesi > 36) throw new Error("Indica i mesi di conservazione (da 1 a 36).");
  await prisma.hotel.update({ where: { id: hotelId }, data: { mesiConservazioneOggetti: mesi } });
}
