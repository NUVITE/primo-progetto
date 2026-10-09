/**
 * Questionario di gradimento e ringraziamento dopo la partenza: link segreto per prenotazione, pagina
 * pubblica (/qs/<codice>), invio del ringraziamento (a mano o automatico al check-out dell'ultima
 * camera), partenze ancora da ringraziare e risultati per la direzione.
 */
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { anteprimaEmail, inviaEmail, type Trasporto } from "@/lib/email";
import { EMAIL_VALIDA, LINGUE, type Lingua } from "@/lib/emailRegole";
import {
  GIORNI_VALIDITA,
  VOTO_BASSO,
  VOTO_RECENSIONE,
  riepilogoQuestionari,
  validaRisposta,
  type RispostaQuestionario,
  type VoceQuestionario,
} from "@/lib/questionariRegole";

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const giorno = (d: Date) => d.toISOString().slice(0, 10);
const traGiorni = (g: string, n: number) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** Link al questionario della prenotazione (lo crea la prima volta, nella lingua dell'email). */
export async function linkQuestionario(hotelId: number, prenotazioneId: number, lingua: Lingua, base: string) {
  const p = await prisma.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId }, select: { ospitePrenotanteId: true, questionario: true } });
  const q =
    p.questionario ??
    (await prisma.questionario.create({ data: { hotelId, prenotazioneId, ospiteId: p.ospitePrenotanteId, codice: randomBytes(18).toString("base64url"), lingua } }));
  return `${base.replace(/\/$/, "")}/qs/${q.codice}`;
}

// ---------------- Pagina pubblica ----------------

async function questionarioDaCodice(codice: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(codice)) return null;
  return prisma.questionario.findUnique({
    where: { codice },
    include: {
      hotel: { select: { nome: true, telefono: true, email: true, linkRecensioni: true } },
      prenotazione: { select: { ospitePrenotante: { select: { nome: true } }, segmenti: { select: { dataInizio: true, dataFine: true, stato: true } } } },
    },
  });
}

export async function paginaQuestionario(codice: string) {
  const q = await questionarioDaCodice(codice);
  if (!q) return null;
  const validi = q.prenotazione.segmenti.filter((s) => s.stato !== "ANNULLATO");
  const segmenti = validi.length ? validi : q.prenotazione.segmenti;
  const scaduto = traGiorni(giorno(q.creatoIl), GIORNI_VALIDITA) < oggiItalia();
  return {
    hotel: { nome: q.hotel.nome, telefono: q.hotel.telefono ?? "", email: q.hotel.email ?? "" },
    lingua: (q.lingua in LINGUE ? q.lingua : "it") as Lingua,
    nome: q.prenotazione.ospitePrenotante.nome,
    dal: segmenti.map((s) => giorno(s.dataInizio)).sort()[0] ?? null,
    al: segmenti.map((s) => giorno(s.dataFine)).sort().at(-1) ?? null,
    stato: q.compilatoIl ? "compilato" : scaduto ? "scaduto" : "aperto",
    // Dopo un voto alto si propone la recensione online (solo se l'hotel ha indicato la pagina).
    linkRecensioni: q.compilatoIl && (q.generale ?? 0) >= VOTO_RECENSIONE ? q.hotel.linkRecensioni : null,
  };
}

/** L'ospite compila il questionario (una volta sola, entro la validità). */
export async function compilaQuestionario(codice: string, risposta: RispostaQuestionario) {
  const q = await questionarioDaCodice(codice);
  if (!q) throw new Error("Questionario non trovato. / Questionnaire not found.");
  if (q.compilatoIl) throw new Error("Il questionario è già stato compilato: grazie! / The questionnaire has already been completed: thank you!");
  if (traGiorni(giorno(q.creatoIl), GIORNI_VALIDITA) < oggiItalia()) throw new Error("Il questionario è scaduto. / The questionnaire has expired.");
  const r = validaRisposta(risposta);
  // updateMany con compilatoIl null: due invii contemporanei non si sovrascrivono.
  const n = await prisma.questionario.updateMany({
    where: { id: q.id, compilatoIl: null },
    data: { compilatoIl: new Date(), generale: r.generale, voti: r.voti, consiglia: r.consiglia, commento: r.commento || null },
  });
  if (n.count === 0) throw new Error("Il questionario è già stato compilato: grazie! / The questionnaire has already been completed: thank you!");
}

// ---------------- Ringraziamento ----------------

const ringraziata = (hotelId: number, prenotazioneId: number) =>
  prisma.emailInviata.findFirst({ where: { hotelId, prenotazioneId, modello: "ringraziamento", esito: { in: ["inviata", "simulata"] } }, select: { id: true } });

/** Partiti tutti: ogni camera non annullata ha almeno una persona e sono tutte partite. */
async function tuttiPartiti(prenotazioneId: number) {
  const segmenti = await prisma.segmentoSoggiorno.findMany({ where: { prenotazioneId, stato: { not: "ANNULLATO" } }, select: { presenze: { select: { stato: true } } } });
  return segmenti.length > 0 && segmenti.every((s) => s.presenze.length > 0 && s.presenze.every((p) => p.stato === "partito"));
}

/**
 * Invia il ringraziamento con il link al questionario a chi ha prenotato, nella sua lingua (una
 * volta sola per prenotazione). Restituisce destinatario ed esito ("inviata" o "simulata").
 */
export async function ringraziaPartenza(hotelId: number, prenotazioneId: number, base: string, utente: string, trasportoProva?: Trasporto) {
  const p = await prisma.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId }, select: { stato: true, ospitePrenotante: { select: { id: true, email: true } } } });
  if (p.stato === "ANNULLATA") throw new Error("La prenotazione è annullata.");
  if (await ringraziata(hotelId, prenotazioneId)) throw new Error("Il ringraziamento è già stato inviato.");
  const destinatario = p.ospitePrenotante.email?.trim() ?? "";
  if (!EMAIL_VALIDA.test(destinatario)) throw new Error("Chi ha prenotato non ha un indirizzo email valido.");
  const a = await anteprimaEmail(hotelId, prenotazioneId, "ringraziamento", null, true, async (lingua) => ({ link_questionario: await linkQuestionario(hotelId, prenotazioneId, lingua, base) }));
  if (a.mancanti.length) throw new Error(`Nel modello del ringraziamento mancano dei dati: ${a.mancanti.join(", ")}.`);
  const esito = await inviaEmail(
    hotelId,
    { prenotazioneId, ospiteId: p.ospitePrenotante.id, richiestaId: null },
    { destinatario, oggetto: a.oggetto, corpo: a.corpo, lingua: a.lingua, modello: "ringraziamento" },
    utente,
    trasportoProva,
  );
  return { destinatario, esito };
}

/**
 * Dopo un check-out: se l'hotel lo vuole, la posta è configurata e sono partiti tutti, parte il
 * ringraziamento. Non blocca mai il check-out: restituisce solo un messaggio per l'operatore.
 */
export async function ringraziamentoAutomatico(hotelId: number, prenotazioneId: number, base: string, utente: string, trasportoProva?: Trasporto) {
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { ringraziamentoAuto: true, configurazioneEmail: { select: { id: true } } } });
  if (!hotel.ringraziamentoAuto || !hotel.configurazioneEmail) return null;
  if (!(await tuttiPartiti(prenotazioneId)) || (await ringraziata(hotelId, prenotazioneId))) return null;
  try {
    const r = await ringraziaPartenza(hotelId, prenotazioneId, base, `${utente} (automatico)`, trasportoProva);
    return r.esito === "simulata" ? `Ringraziamento con questionario simulato per ${r.destinatario} (ambiente di prova).` : `Email di ringraziamento con il questionario inviata a ${r.destinatario}.`;
  } catch (e) {
    return `Ringraziamento automatico non inviato: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** Partenze degli ultimi giorni ancora senza ringraziamento (per l'invio a mano). */
export async function daRingraziare(hotelId: number, giorni = 30) {
  const oggi = oggiItalia();
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hotelId,
      stato: { not: "ANNULLATA" },
      segmenti: { some: { stato: { not: "ANNULLATO" }, dataFine: { gte: new Date(traGiorni(oggi, -giorni)), lte: new Date(oggi) } } },
      emailInviate: { none: { modello: "ringraziamento", esito: { in: ["inviata", "simulata"] } } },
    },
    select: {
      id: true,
      ospitePrenotante: { select: { id: true, nome: true, cognome: true, email: true } },
      segmenti: { select: { stato: true, dataFine: true, presenze: { select: { stato: true } } } },
    },
  });
  return prenotazioni
    .map((p) => {
      const validi = p.segmenti.filter((s) => s.stato !== "ANNULLATO");
      return {
        id: p.id,
        ospite: `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`,
        ospiteId: p.ospitePrenotante.id,
        email: p.ospitePrenotante.email && EMAIL_VALIDA.test(p.ospitePrenotante.email) ? p.ospitePrenotante.email : null,
        partenza: validi.map((s) => giorno(s.dataFine)).sort().at(-1)!,
        partiti: validi.every((s) => s.presenze.length > 0 && s.presenze.every((x) => x.stato === "partito")),
      };
    })
    // Solo le prenotazioni finite del tutto (l'ultima camera è già partita).
    .filter((p) => p.partenza <= oggi)
    .sort((a, b) => b.partenza.localeCompare(a.partenza));
}

// ---------------- Risultati ----------------

export async function risultatiQuestionari(hotelId: number, dal: string, al: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dal) || !/^\d{4}-\d{2}-\d{2}$/.test(al) || dal > al) throw new Error("Periodo non valido.");
  const inizio = new Date(`${dal}T00:00:00`);
  const fine = new Date(`${traGiorni(al, 1)}T00:00:00`);
  const [compilati, inviati] = await Promise.all([
    prisma.questionario.findMany({
      where: { hotelId, compilatoIl: { gte: inizio, lt: fine } },
      orderBy: { compilatoIl: "desc" },
      include: { prenotazione: { select: { id: true, ospitePrenotante: { select: { id: true, nome: true, cognome: true } } } } },
    }),
    prisma.questionario.count({ where: { hotelId, creatoIl: { gte: inizio, lt: fine } } }),
  ]);
  const righe = compilati.map((q) => ({
    id: q.id,
    prenotazioneId: q.prenotazioneId,
    ospite: `${q.prenotazione.ospitePrenotante.nome} ${q.prenotazione.ospitePrenotante.cognome}`,
    ospiteId: q.prenotazione.ospitePrenotante.id,
    compilatoIl: q.compilatoIl!.toISOString(),
    lingua: q.lingua,
    generale: q.generale!,
    voti: (q.voti ?? {}) as Partial<Record<VoceQuestionario, number>>,
    consiglia: q.consiglia,
    commento: q.commento ?? "",
    basso: q.generale! <= VOTO_BASSO,
    lettoIl: q.lettoIl?.toISOString() ?? null,
    lettoDa: q.lettoDa,
  }));
  return { dal, al, inviati, ...riepilogoQuestionari(righe), righe };
}

export async function segnaLetto(hotelId: number, id: number, utente: string) {
  const n = await prisma.questionario.updateMany({ where: { id, hotelId, compilatoIl: { not: null }, lettoIl: null }, data: { lettoIl: new Date(), lettoDa: utente } });
  if (n.count === 0) throw new Error("Questionario non trovato o già letto.");
}

/** Questionari con voto basso non ancora letti (avviso in cima all'app). */
export const votiBassiDaLeggere = (hotelId: number) => prisma.questionario.count({ where: { hotelId, generale: { lte: VOTO_BASSO }, lettoIl: null, compilatoIl: { not: null } } });
