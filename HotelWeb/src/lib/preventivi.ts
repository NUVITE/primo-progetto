import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { calcolaNotte, nottiTraDate, regoleListino, verificaComposizione } from "@/lib/pricing";
import { creaPrenotazioneGenerica, impostaPrezzoConcordato } from "@/lib/prenotazioni";
import { politicaPer } from "@/lib/politiche";
import { descriviPolitica } from "@/lib/politicheRegole";
import { compila, EMAIL_VALIDA, LINGUE, type Lingua, type Segnaposto } from "@/lib/emailRegole";
import { inviaEmail, modelloEmail, type Trasporto } from "@/lib/email";
import { camereLibere, CANALI_RICHIESTA, conversione, MAX_PROPOSTE, MOTIVI_RINUNCIA, type MotivoRinuncia } from "@/lib/preventiviRegole";

/**
 * Richieste di disponibilità e preventivi. Il preventivo ha 1-3 proposte calcolate dal listino
 * (prezzo modificabile); l'ospite lo vede con un link segreto e può accettare una proposta: nasce
 * la prenotazione in opzione con la richiesta di acconto, e la reception riceve l'avviso.
 */

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const iso = (d: Date) => d.toISOString().slice(0, 10);
const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
const CODICE = /^[A-Za-z0-9_-]{20,40}$/;
const arrotonda = (n: number) => Math.round(n * 100) / 100;

// ---------------- Richieste ----------------

export type RichiestaDispInput = {
  canale: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  lingua: string;
  dal: string;
  al: string;
  adulti: number;
  etaBambini: number[];
  camere: number;
  trattamento: string;
  budget: string;
  note: string;
};

function validaRichiesta(d: RichiestaDispInput) {
  if (!(d.canale in CANALI_RICHIESTA)) throw new Error("Indica da dove arriva la richiesta.");
  if (!d.nome.trim() || !d.cognome.trim()) throw new Error("Indica nome e cognome.");
  if (d.email.trim() && !EMAIL_VALIDA.test(d.email.trim())) throw new Error("Email non valida.");
  if (!GIORNO.test(d.dal) || !GIORNO.test(d.al) || d.al <= d.dal) throw new Error("Indica le date: la partenza deve essere dopo l'arrivo.");
  if (!Number.isInteger(d.camere) || d.camere < 1 || d.camere > 30) throw new Error("Numero di camere non valido.");
  verificaComposizione({ adulti: d.adulti, etaBambini: d.etaBambini });
  return {
    canale: d.canale,
    nome: d.nome.trim(),
    cognome: d.cognome.trim(),
    email: d.email.trim() || null,
    telefono: d.telefono.trim() || null,
    lingua: d.lingua in LINGUE ? d.lingua : "it",
    dal: new Date(d.dal),
    al: new Date(d.al),
    adulti: d.adulti,
    etaBambini: d.etaBambini,
    camere: d.camere,
    trattamento: d.trattamento.trim() || null,
    budget: d.budget.trim() || null,
    note: d.note.trim() || null,
  };
}

export async function creaRichiestaDisp(hotelId: number, d: RichiestaDispInput, utente: string) {
  const r = await prisma.richiestaDisponibilita.create({ data: { hotelId, ...validaRichiesta(d), creataDa: utente } });
  return r.id;
}

export async function modificaRichiestaDisp(hotelId: number, id: number, d: RichiestaDispInput) {
  const r = await prisma.richiestaDisponibilita.findFirst({ where: { id, hotelId } });
  if (!r) throw new Error("Richiesta non trovata.");
  if (r.stato === "accettata") throw new Error("La richiesta è già diventata una prenotazione: modifica la prenotazione.");
  await prisma.richiestaDisponibilita.update({ where: { id }, data: validaRichiesta(d) });
}

/** I preventivi inviati e oltre la validità diventano "scaduti" (e la richiesta con loro). */
async function aggiornaScaduti(hotelId: number) {
  const oggi = new Date(oggiItalia());
  const scaduti = await prisma.preventivo.findMany({ where: { hotelId, stato: { in: ["inviato", "visto"] }, validoFino: { lt: oggi } }, select: { id: true, richiestaId: true } });
  if (!scaduti.length) return;
  await prisma.preventivo.updateMany({ where: { id: { in: scaduti.map((p) => p.id) } }, data: { stato: "scaduto" } });
  await prisma.richiestaDisponibilita.updateMany({ where: { id: { in: scaduti.map((p) => p.richiestaId) }, stato: "preventivo" }, data: { stato: "scaduta", motivoRinuncia: "nessuna_risposta" } });
}

export async function elencoRichiesteDisp(hotelId: number, vista: "aperte" | "chiuse") {
  await aggiornaScaduti(hotelId);
  const r = await prisma.richiestaDisponibilita.findMany({
    where: { hotelId, stato: vista === "aperte" ? { in: ["nuova", "preventivo"] } : { in: ["accettata", "rifiutata", "scaduta"] } },
    include: { preventivi: { orderBy: { creatoIl: "desc" }, take: 1 } },
    orderBy: vista === "aperte" ? { dal: "asc" } : { creataIl: "desc" },
    take: 300,
  });
  // In cima le risposte online ancora da guardare.
  const da = await prisma.preventivo.findMany({ where: { hotelId, daVedere: true }, select: { richiestaId: true } });
  const daVedere = new Set(da.map((x) => x.richiestaId));
  return r
    .map((x) => ({
      id: x.id,
      nome: `${x.cognome} ${x.nome}`.trim(),
      canale: x.canale,
      dal: iso(x.dal),
      al: iso(x.al),
      persone: x.adulti + ((x.etaBambini as number[]) ?? []).length,
      camere: x.camere,
      stato: x.stato,
      creataIl: x.creataIl.toISOString(),
      preventivo: x.preventivi[0] ? { stato: x.preventivi[0].stato, validoFino: iso(x.preventivi[0].validoFino) } : null,
      daVedere: daVedere.has(x.id),
      prenotazioneId: x.prenotazioneId,
      motivoRinuncia: x.motivoRinuncia,
    }))
    .sort((a, b) => Number(b.daVedere) - Number(a.daVedere));
}

/** Camere libere di un tipo nel periodo (minimo notte per notte, contando fuori servizio e prenotazioni generiche). */
export async function disponibilitaTipo(hotelId: number, tipoCameraId: number, dal: Date, al: Date) {
  const [camere, segmenti, fs] = await Promise.all([
    prisma.camera.count({ where: { hotelId, tipoCameraId, attivo: true } }),
    prisma.segmentoSoggiorno.findMany({
      where: { tipoCameraId, usoDiurno: false, stato: { not: "ANNULLATO" }, prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, dataInizio: { lt: al }, dataFine: { gt: dal } },
      select: { dataInizio: true, dataFine: true },
    }),
    prisma.cameraIndisponibilita.findMany({ where: { camera: { hotelId, tipoCameraId, attivo: true }, dal: { lt: al }, al: { gt: dal } }, select: { dal: true, al: true } }),
  ]);
  const notti = nottiTraDate(dal, al);
  const occupate = notti.map((n) => segmenti.filter((s) => s.dataInizio <= n && s.dataFine > n).length + fs.filter((f) => f.dal <= n && f.al > n).length);
  return camereLibere(camere, occupate);
}

/** Prezzo dal listino di una proposta: tutte le camere, tutte le notti (senza tassa di soggiorno). */
async function prezzoProposta(hotelId: number, r: { dal: Date; al: Date; adulti: number; etaBambini: unknown; camere: number }, p: { tipoCameraId: number; listinoId: number; trattamento: string }) {
  await prisma.listino.findFirstOrThrow({ where: { id: p.listinoId, hotelId } });
  await prisma.tipoCamera.findFirstOrThrow({ where: { id: p.tipoCameraId, hotelId } });
  const regole = await regoleListino(prisma, p.listinoId);
  const composizione = { adulti: r.adulti, etaBambini: (r.etaBambini as number[]) ?? [] };
  let totale = 0;
  let mancante = false;
  for (const notte of nottiTraDate(r.dal, r.al)) {
    const c = await calcolaNotte(prisma, regole, p.tipoCameraId, notte, composizione, p.trattamento);
    if (c.mancante) mancante = true;
    else totale += c.lordo;
  }
  return { prezzo: arrotonda(totale * r.camere), mancante };
}

/** Per la pagina della richiesta: prezzo e camere libere di una proposta prima di salvarla. */
export async function calcolaProposta(hotelId: number, richiestaId: number, p: { tipoCameraId: number; listinoId: number; trattamento: string }) {
  const r = await prisma.richiestaDisponibilita.findFirstOrThrow({ where: { id: richiestaId, hotelId } });
  const [prezzo, libere] = await Promise.all([prezzoProposta(hotelId, r, p), disponibilitaTipo(hotelId, p.tipoCameraId, r.dal, r.al)]);
  return { ...prezzo, libere, camere: r.camere };
}

export type PreventivoInput = {
  validoFino: string;
  accontoRichiesto: number | null;
  messaggio: string;
  proposte: { tipoCameraId: number; listinoId: number; trattamento: string; prezzo: number | null; nota: string }[];
};

/** Nuovo preventivo (da inviare) per la richiesta: i prezzi del listino si ricalcolano qui. */
export async function creaPreventivo(hotelId: number, richiestaId: number, d: PreventivoInput, utente: string) {
  const r = await prisma.richiestaDisponibilita.findFirst({ where: { id: richiestaId, hotelId } });
  if (!r) throw new Error("Richiesta non trovata.");
  if (r.stato === "accettata") throw new Error("La richiesta è già diventata una prenotazione.");
  if (!d.proposte.length || d.proposte.length > MAX_PROPOSTE) throw new Error(`Da 1 a ${MAX_PROPOSTE} proposte.`);
  if (!GIORNO.test(d.validoFino) || d.validoFino < oggiItalia()) throw new Error("Indica fino a quando vale il preventivo (da oggi in poi).");
  if (d.accontoRichiesto !== null && !(d.accontoRichiesto > 0)) throw new Error("Acconto non valido.");
  const proposte = [];
  for (const [i, p] of d.proposte.entries()) {
    if (!p.trattamento.trim()) throw new Error("Scegli il trattamento di ogni proposta.");
    const calcolato = await prezzoProposta(hotelId, r, p);
    if (calcolato.mancante && p.prezzo === null) throw new Error("Per una proposta il listino non ha tutti i prezzi: scrivi tu il prezzo.");
    if (p.prezzo !== null && !(p.prezzo > 0)) throw new Error("Prezzo non valido.");
    // Listino incompleto: prezzo calcolato 0, così all'accettazione il prezzo offerto diventa sempre il prezzo concordato.
    proposte.push({ ordine: i + 1, tipoCameraId: p.tipoCameraId, listinoId: p.listinoId, trattamento: p.trattamento, prezzoCalcolato: calcolato.mancante ? 0 : calcolato.prezzo, prezzo: p.prezzo ?? calcolato.prezzo, nota: p.nota.trim() || null });
  }
  const codice = randomBytes(18).toString("base64url");
  const pv = await prisma.preventivo.create({
    data: {
      hotelId,
      richiestaId,
      codice,
      validoFino: new Date(d.validoFino),
      accontoRichiesto: d.accontoRichiesto,
      messaggio: d.messaggio.trim() || null,
      creatoDa: utente,
      proposte: { create: proposte },
    },
  });
  return pv.id;
}

async function preventivoDelHotel(hotelId: number, id: number) {
  const p = await prisma.preventivo.findFirst({ where: { id, hotelId }, include: { richiesta: true } });
  if (!p) throw new Error("Preventivo non trovato.");
  return p;
}

/** Inviato per altra via (WhatsApp, a voce con il link): da ora l'ospite può rispondere. */
export async function segnaPreventivoInviato(hotelId: number, id: number) {
  const p = await preventivoDelHotel(hotelId, id);
  if (p.stato !== "bozza") return;
  await prisma.preventivo.update({ where: { id }, data: { stato: "inviato", inviatoIl: new Date() } });
  await prisma.richiestaDisponibilita.update({ where: { id: p.richiestaId }, data: { stato: "preventivo" } });
}

/** Valori dei segnaposto per l'email del preventivo. */
async function valoriPreventivo(hotelId: number, id: number, lingua: Lingua, baseUrl: string) {
  const [p, hotel] = await Promise.all([preventivoDelHotel(hotelId, id), prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, include: { comune: true } })]);
  const r = p.richiesta;
  const loc = lingua === "it" ? "it-IT" : "en-GB";
  const data = (d: Date) => d.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const valori: Partial<Record<Segnaposto, string>> = {
    nome: r.nome,
    cognome: r.cognome,
    arrivo: data(r.dal),
    partenza: data(r.al),
    notti: String(nottiTraDate(r.dal, r.al).length),
    persone: String((r.adulti + ((r.etaBambini as number[]) ?? []).length) * r.camere),
    hotel: hotel.nome,
    telefono_hotel: hotel.telefono ?? "",
    email_hotel: hotel.email ?? "",
    indirizzo_hotel: [hotel.indirizzo, [hotel.cap, hotel.comune?.nome].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    link_preventivo: `${baseUrl}/pv/${p.codice}`,
    valido_fino: data(p.validoFino),
  };
  return { valori, richiesta: r, preventivo: p };
}

export async function anteprimaEmailPreventivo(hotelId: number, id: number, lingua: Lingua, baseUrl: string) {
  const [m, v] = await Promise.all([modelloEmail(hotelId, "preventivo", lingua), valoriPreventivo(hotelId, id, lingua, baseUrl)]);
  const oggetto = compila(m.oggetto, v.valori);
  const corpo = compila(m.corpo, v.valori);
  return { oggetto: oggetto.testo, corpo: corpo.testo, mancanti: [...new Set([...oggetto.mancanti, ...corpo.mancanti])], destinatario: v.richiesta.email ?? "", link: v.valori.link_preventivo! };
}

/** Invia il preventivo per email (dalla casella dell'hotel) e lo segna come inviato. */
export async function inviaPreventivo(hotelId: number, id: number, d: { destinatario: string; oggetto: string; corpo: string; lingua: Lingua }, utente: string, trasportoProva?: Trasporto) {
  const p = await preventivoDelHotel(hotelId, id);
  if (["accettato", "rifiutato", "scaduto"].includes(p.stato)) throw new Error("Il preventivo è già chiuso.");
  const esito = await inviaEmail(hotelId, { prenotazioneId: null, ospiteId: null, richiestaId: p.richiestaId }, { ...d, modello: "preventivo" }, utente, trasportoProva);
  await prisma.preventivo.update({ where: { id }, data: { stato: p.stato === "bozza" ? "inviato" : p.stato, inviatoIl: p.inviatoIl ?? new Date() } });
  await prisma.richiestaDisponibilita.update({ where: { id: p.richiestaId }, data: { stato: "preventivo" } });
  return esito;
}

export async function dettaglioRichiestaDisp(hotelId: number, id: number) {
  await aggiornaScaduti(hotelId);
  const r = await prisma.richiestaDisponibilita.findFirst({
    where: { id, hotelId },
    include: {
      preventivi: { include: { proposte: { include: { tipoCamera: true, listino: true }, orderBy: { ordine: "asc" } } }, orderBy: { creatoIl: "desc" } },
      emailInviate: { orderBy: { inviataIl: "desc" } },
    },
  });
  if (!r) throw new Error("Richiesta non trovata.");
  return {
    id: r.id,
    canale: r.canale,
    nome: r.nome,
    cognome: r.cognome,
    email: r.email ?? "",
    telefono: r.telefono ?? "",
    lingua: r.lingua,
    dal: iso(r.dal),
    al: iso(r.al),
    notti: nottiTraDate(r.dal, r.al).length,
    adulti: r.adulti,
    etaBambini: (r.etaBambini as number[]) ?? [],
    camere: r.camere,
    trattamento: r.trattamento ?? "",
    budget: r.budget ?? "",
    note: r.note ?? "",
    stato: r.stato,
    motivoRinuncia: r.motivoRinuncia,
    prenotazioneId: r.prenotazioneId,
    creataIl: r.creataIl.toISOString(),
    creataDa: r.creataDa,
    preventivi: r.preventivi.map((p) => ({
      id: p.id,
      codice: p.codice,
      stato: p.stato,
      validoFino: iso(p.validoFino),
      accontoRichiesto: p.accontoRichiesto === null ? null : Number(p.accontoRichiesto),
      messaggio: p.messaggio ?? "",
      creatoIl: p.creatoIl.toISOString(),
      inviatoIl: p.inviatoIl?.toISOString() ?? null,
      vistoIl: p.vistoIl?.toISOString() ?? null,
      rispostaIl: p.rispostaIl?.toISOString() ?? null,
      motivoRifiuto: p.motivoRifiuto ?? "",
      daVedere: p.daVedere,
      propostaAccettataId: p.propostaAccettataId,
      proposte: p.proposte.map((x) => ({
        id: x.id,
        tipo: x.tipoCamera.descrizione,
        listino: x.listino.descrizione,
        trattamento: x.trattamento,
        prezzoCalcolato: Number(x.prezzoCalcolato),
        prezzo: Number(x.prezzo),
        nota: x.nota ?? "",
      })),
    })),
    emailInviate: r.emailInviate.map((e) => ({ id: e.id, destinatario: e.destinatario, oggetto: e.oggetto, esito: e.esito, inviataIl: e.inviataIl.toISOString(), inviataDa: e.inviataDa })),
  };
}

/** La reception ha visto la risposta dell'ospite: l'avviso sparisce. */
export async function segnaRispostaVista(hotelId: number, richiestaId: number) {
  await prisma.preventivo.updateMany({ where: { hotelId, richiestaId, daVedere: true }, data: { daVedere: false } });
}

/** Richiesta chiusa senza prenotazione, con il motivo (per le statistiche). */
export async function chiudiRichiestaDisp(hotelId: number, id: number, motivo: MotivoRinuncia) {
  const r = await prisma.richiestaDisponibilita.findFirst({ where: { id, hotelId } });
  if (!r) throw new Error("Richiesta non trovata.");
  if (!["nuova", "preventivo"].includes(r.stato)) throw new Error("La richiesta è già chiusa.");
  if (!(motivo in MOTIVI_RINUNCIA)) throw new Error("Scegli il motivo.");
  await prisma.richiestaDisponibilita.update({ where: { id }, data: { stato: "rifiutata", motivoRinuncia: motivo } });
  await prisma.preventivo.updateMany({ where: { richiestaId: id, stato: { in: ["bozza", "inviato", "visto"] } }, data: { stato: "rifiutato", motivoRifiuto: MOTIVI_RINUNCIA[motivo] } });
}

/** Risposte online da guardare (avviso in cima all'app). */
export const risposteDaVedere = (hotelId: number) => prisma.preventivo.count({ where: { hotelId, daVedere: true } });

// ---------------- Pagina pubblica del preventivo ----------------

async function preventivoDaCodice(codice: string) {
  if (!CODICE.test(codice)) return null;
  return prisma.preventivo.findUnique({
    where: { codice },
    include: { richiesta: true, hotel: { include: { comune: true } }, proposte: { include: { tipoCamera: true }, orderBy: { ordine: "asc" } } },
  });
}

/** Quello che vede l'ospite con il link (null = codice inesistente). Alla prima apertura il preventivo risulta "visto". */
export async function paginaPreventivo(codice: string) {
  const p = await preventivoDaCodice(codice);
  if (!p || p.stato === "bozza") return null;
  const oggi = oggiItalia();
  if (p.stato === "inviato") await prisma.preventivo.update({ where: { id: p.id }, data: { stato: "visto", vistoIl: new Date() } });
  const r = p.richiesta;
  const notti = nottiTraDate(r.dal, r.al).length;
  const politiche = await Promise.all(p.proposte.map((x) => politicaPer(prisma, p.hotelId, x.listinoId)));
  const scaduto = iso(p.validoFino) < oggi || p.stato === "scaduto";
  return {
    hotel: { nome: p.hotel.nome, telefono: p.hotel.telefono ?? "", email: p.hotel.email ?? "", indirizzo: [p.hotel.indirizzo, p.hotel.comune?.nome].filter(Boolean).join(", ") },
    lingua: r.lingua as Lingua,
    nome: r.nome,
    dal: iso(r.dal),
    al: iso(r.al),
    notti,
    camere: r.camere,
    adulti: r.adulti,
    bambini: ((r.etaBambini as number[]) ?? []).length,
    validoFino: iso(p.validoFino),
    accontoRichiesto: p.accontoRichiesto === null ? null : Number(p.accontoRichiesto),
    messaggio: p.messaggio ?? "",
    stato: scaduto && !["accettato", "rifiutato"].includes(p.stato) ? "scaduto" : p.stato === "inviato" ? "visto" : p.stato,
    propostaAccettataId: p.propostaAccettataId,
    proposte: p.proposte.map((x, i) => ({
      id: x.id,
      tipo: x.tipoCamera.descrizione,
      descrizioneTipo: x.tipoCamera.descrizione,
      trattamento: x.trattamento,
      prezzo: Number(x.prezzo),
      aNotte: notti ? arrotonda(Number(x.prezzo) / notti / r.camere) : 0,
      nota: x.nota ?? "",
      politica: politiche[i] ? descriviPolitica(politiche[i]!) : [],
    })),
  };
}

/** L'ospite accetta una proposta: nasce la prenotazione in opzione (camere da assegnare) con l'acconto. */
export async function accettaPreventivo(codice: string, propostaId: number) {
  const p = await preventivoDaCodice(codice);
  if (!p || p.stato === "bozza") throw new Error("Preventivo non trovato.");
  if (p.stato === "accettato") throw new Error("Il preventivo è già stato accettato.");
  if (p.stato === "rifiutato") throw new Error("Il preventivo è stato chiuso: contatta l'hotel.");
  if (p.stato === "scaduto" || iso(p.validoFino) < oggiItalia()) throw new Error("Il preventivo è scaduto: contatta l'hotel per un nuovo preventivo.");
  const proposta = p.proposte.find((x) => x.id === propostaId);
  if (!proposta) throw new Error("Proposta non valida.");
  const r = p.richiesta;
  if ((await disponibilitaTipo(p.hotelId, proposta.tipoCameraId, r.dal, r.al)) < r.camere) {
    throw new Error("Nel frattempo le camere di questa proposta sono state occupate: contatta l'hotel, troveremo un'alternativa.");
  }
  const composizione = { adulti: r.adulti, etaBambini: (r.etaBambini as number[]) ?? [] };
  const prenotazione = await creaPrenotazioneGenerica(p.hotelId, {
    ospitePrenotante: { nome: r.nome, cognome: r.cognome, ...(r.email ? { email: r.email } : {}), ...(r.telefono ? { telefono: r.telefono } : {}) },
    listinoId: proposta.listinoId,
    trattamento: proposta.trattamento,
    dataInizio: iso(r.dal),
    dataFine: iso(r.al),
    richieste: [{ tipoCameraId: proposta.tipoCameraId, quantita: r.camere, composizione }],
    accontoRichiesto: p.accontoRichiesto === null ? undefined : Number(p.accontoRichiesto),
    note: `Da preventivo n. ${p.id} accettato online.`,
    provenienza: { canale: "diretta", mezzo: r.canale in { telefono: 1, email: 1, web: 1, persona: 1, altro: 1 } ? r.canale : "altro" },
  });
  // Prezzo del preventivo diverso dal listino: diventa il prezzo concordato di ogni camera.
  if (Math.abs(Number(proposta.prezzo) - Number(proposta.prezzoCalcolato)) > 0.005) {
    const notti = nottiTraDate(r.dal, r.al).length;
    const aNotte = arrotonda(Number(proposta.prezzo) / notti / r.camere);
    for (const s of prenotazione.segmenti) await impostaPrezzoConcordato(p.hotelId, s.id, aNotte, `Preventivo n. ${p.id}`, "ospite (preventivo online)");
  }
  if (r.lingua !== "it") await prisma.ospite.update({ where: { id: prenotazione.ospitePrenotanteId }, data: { lingua: r.lingua } });
  await prisma.preventivo.update({ where: { id: p.id }, data: { stato: "accettato", propostaAccettataId: proposta.id, rispostaIl: new Date(), daVedere: true } });
  await prisma.richiestaDisponibilita.update({ where: { id: r.id }, data: { stato: "accettata", prenotazioneId: prenotazione.id } });
  return prenotazione.id;
}

export async function rifiutaPreventivo(codice: string, motivo: string) {
  const p = await preventivoDaCodice(codice);
  if (!p || p.stato === "bozza") throw new Error("Preventivo non trovato.");
  if (!["inviato", "visto"].includes(p.stato)) throw new Error("Il preventivo è già chiuso.");
  const testo = motivo.trim().slice(0, 300);
  await prisma.preventivo.update({ where: { id: p.id }, data: { stato: "rifiutato", rispostaIl: new Date(), motivoRifiuto: testo || null, daVedere: true } });
  await prisma.richiestaDisponibilita.update({ where: { id: p.richiestaId }, data: { stato: "rifiutata", motivoRinuncia: "altro" } });
}

// ---------------- Statistiche ----------------

export async function statisticheRichieste(hotelId: number, giorni = 90) {
  await aggiornaScaduti(hotelId);
  const da = new Date(Date.now() - giorni * 86400000);
  const r = await prisma.richiestaDisponibilita.findMany({ where: { hotelId, creataIl: { gte: da } }, select: { canale: true, stato: true, motivoRinuncia: true, preventivi: { select: { id: true } } } });
  const conPreventivo = r.filter((x) => x.preventivi.length).length;
  const accettate = r.filter((x) => x.stato === "accettata").length;
  const perCanale = Object.keys(CANALI_RICHIESTA).map((c) => {
    const lista = r.filter((x) => x.canale === c);
    const ok = lista.filter((x) => x.stato === "accettata").length;
    return { canale: c, richieste: lista.length, accettate: ok, conversione: conversione(ok, lista.length) };
  });
  const motivi = Object.keys(MOTIVI_RINUNCIA).map((m) => ({ motivo: m, quante: r.filter((x) => x.motivoRinuncia === m).length })).filter((x) => x.quante);
  return { giorni, richieste: r.length, conPreventivo, accettate, conversione: conversione(accettate, r.length), perCanale: perCanale.filter((x) => x.richieste), motivi };
}
