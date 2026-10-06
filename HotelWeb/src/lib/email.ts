import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { cifra, decifra } from "@/lib/cifratura";
import { CODICE_ITALIA } from "@/lib/codiciPolizia";
import { calcolaTotaliPrenotazione, trovaPrenotazione } from "@/lib/prenotazioni";
import { compila, EMAIL_VALIDA, linguaPerOspite, LINGUE, MODELLI, MODELLI_PREDEFINITI, type ChiaveModello, type Lingua, type Segnaposto } from "@/lib/emailRegole";

/**
 * Email agli ospiti dalla casella dell'hotel (server di posta suo, password cifrata). Ogni invio
 * resta nello storico. Con EMAIL_SIMULA=1 nell'ambiente (sviluppo) non parte nulla: l'email si
 * registra come "simulata". I collaudi passano un loro trasporto finto.
 */

export type Trasporto = { invia: (m: { from: string; replyTo?: string; to: string; subject: string; text: string; html: string }) => Promise<void> };
const SICUREZZE = ["ssl", "starttls", "nessuna"] as const;

// ---------------- Configurazione ----------------

export async function configurazioneEmail(hotelId: number) {
  const c = await prisma.configurazioneEmail.findUnique({ where: { hotelId } });
  if (!c) return null;
  return {
    host: c.host,
    porta: c.porta,
    sicurezza: c.sicurezza,
    utente: c.utente,
    passwordSalvata: true,
    mittenteNome: c.mittenteNome,
    mittenteEmail: c.mittenteEmail,
    rispondiA: c.rispondiA ?? "",
    ultimaProvaIl: c.ultimaProvaIl?.toISOString() ?? null,
    ultimaProvaEsito: c.ultimaProvaEsito ?? null,
  };
}

export type ConfigurazioneInput = { host: string; porta: number; sicurezza: string; utente: string; password: string; mittenteNome: string; mittenteEmail: string; rispondiA: string };

export async function salvaConfigurazioneEmail(hotelId: number, d: ConfigurazioneInput, utente: string) {
  const host = d.host.trim();
  if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error("Indica il server di posta in uscita (es. smtps.aruba.it).");
  if (!Number.isInteger(d.porta) || d.porta < 1 || d.porta > 65535) throw new Error("Porta non valida.");
  if (!SICUREZZE.includes(d.sicurezza as (typeof SICUREZZE)[number])) throw new Error("Scegli la sicurezza della connessione.");
  if (!d.utente.trim()) throw new Error("Indica l'utente (di solito l'indirizzo email).");
  if (!d.mittenteNome.trim()) throw new Error("Indica il nome del mittente (es. il nome dell'hotel).");
  if (!EMAIL_VALIDA.test(d.mittenteEmail.trim())) throw new Error("Indirizzo del mittente non valido.");
  if (d.rispondiA.trim() && !EMAIL_VALIDA.test(d.rispondiA.trim())) throw new Error("Indirizzo per le risposte non valido.");
  const esistente = await prisma.configurazioneEmail.findUnique({ where: { hotelId } });
  if (!esistente && !d.password) throw new Error("Indica la password della casella.");
  const dati = {
    host,
    porta: d.porta,
    sicurezza: d.sicurezza,
    utente: d.utente.trim(),
    mittenteNome: d.mittenteNome.trim(),
    mittenteEmail: d.mittenteEmail.trim(),
    rispondiA: d.rispondiA.trim() || null,
    aggiornataDa: utente,
    // Password vuota = resta quella salvata.
    ...(d.password ? { passwordCifrata: cifra(d.password) } : {}),
  };
  if (esistente) await prisma.configurazioneEmail.update({ where: { hotelId }, data: dati });
  else await prisma.configurazioneEmail.create({ data: { hotelId, ...dati, passwordCifrata: cifra(d.password) } });
}

/** Trasporto reale (nodemailer con il server dell'hotel) o simulato con EMAIL_SIMULA=1. */
async function trasportoHotel(hotelId: number): Promise<{ trasporto: Trasporto; simulato: boolean; mittente: string; rispondiA?: string }> {
  const c = await prisma.configurazioneEmail.findUnique({ where: { hotelId } });
  if (!c) throw new Error("La posta non è configurata: inserisci il server in Impostazioni › Email.");
  const mittente = `"${c.mittenteNome.replace(/"/g, "")}" <${c.mittenteEmail}>`;
  if (process.env.EMAIL_SIMULA === "1") return { trasporto: { invia: async () => undefined }, simulato: true, mittente, rispondiA: c.rispondiA ?? undefined };
  const t = nodemailer.createTransport({
    host: c.host,
    port: c.porta,
    secure: c.sicurezza === "ssl",
    requireTLS: c.sicurezza === "starttls",
    auth: { user: c.utente, pass: decifra(c.passwordCifrata) },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  return { trasporto: { invia: async (m) => void (await t.sendMail(m)) }, simulato: false, mittente, rispondiA: c.rispondiA ?? undefined };
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const html = (testo: string) => `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${escape(testo).replace(/\n/g, "<br>")}</div>`;
const messaggioErrore = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500);

/** Email di prova all'indirizzo indicato: verifica server, utente e password. */
export async function provaConfigurazione(hotelId: number, destinatario: string, utente: string, trasportoProva?: Trasporto) {
  if (!EMAIL_VALIDA.test(destinatario.trim())) throw new Error("Indirizzo non valido.");
  const t = await trasportoHotel(hotelId);
  const trasporto = trasportoProva ?? t.trasporto;
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  let esito: string;
  try {
    const testo = `Questa è un'email di prova di ${hotel.nome}: la posta è configurata correttamente.`;
    await trasporto.invia({ from: t.mittente, replyTo: t.rispondiA, to: destinatario.trim(), subject: `Prova della posta - ${hotel.nome}`, text: testo, html: html(testo) });
    esito = t.simulato && !trasportoProva ? "simulata (ambiente di prova: non è partito nulla)" : "riuscita";
  } catch (e) {
    esito = `non riuscita: ${messaggioErrore(e)}`;
  }
  await prisma.configurazioneEmail.update({ where: { hotelId }, data: { ultimaProvaIl: new Date(), ultimaProvaEsito: esito } });
  if (esito.startsWith("non riuscita")) throw new Error(`Prova ${esito}`);
  return esito;
}

// ---------------- Modelli ----------------

export async function modelloEmail(hotelId: number, chiave: ChiaveModello, lingua: Lingua) {
  if (!(chiave in MODELLI) || !(lingua in LINGUE)) throw new Error("Modello non valido.");
  const m = await prisma.modelloEmail.findUnique({ where: { hotelId_chiave_lingua: { hotelId, chiave, lingua } } });
  const base = MODELLI_PREDEFINITI[chiave][lingua];
  return { chiave, lingua, oggetto: m?.oggetto ?? base.oggetto, corpo: m?.corpo ?? base.corpo, personalizzato: !!m };
}

export async function salvaModelloEmail(hotelId: number, chiave: ChiaveModello, lingua: Lingua, d: { oggetto: string; corpo: string }, utente: string) {
  if (!(chiave in MODELLI) || !(lingua in LINGUE)) throw new Error("Modello non valido.");
  if (!d.oggetto.trim()) throw new Error("Scrivi l'oggetto.");
  if (!d.corpo.trim()) throw new Error("Scrivi il testo.");
  if (d.corpo.length > 20000) throw new Error("Testo troppo lungo.");
  const dati = { oggetto: d.oggetto.trim(), corpo: d.corpo, aggiornatoDa: utente };
  await prisma.modelloEmail.upsert({ where: { hotelId_chiave_lingua: { hotelId, chiave, lingua } }, update: dati, create: { hotelId, chiave, lingua, ...dati } });
}

/** Torna al testo di partenza del programma. */
export async function ripristinaModelloEmail(hotelId: number, chiave: ChiaveModello, lingua: Lingua) {
  await prisma.modelloEmail.deleteMany({ where: { hotelId, chiave, lingua } });
}

// ---------------- Dalla prenotazione ----------------

const formati = (lingua: Lingua) => {
  const loc = lingua === "it" ? "it-IT" : "en-GB";
  return {
    data: (d: Date | string) => new Date(typeof d === "string" ? `${d}T12:00:00Z` : d).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    euro: (n: number) => n.toLocaleString(loc, { style: "currency", currency: "EUR" }),
  };
};

/** Valori dei segnaposto per una prenotazione, nella lingua dell'email. */
export async function valoriPrenotazione(hotelId: number, prenotazioneId: number, lingua: Lingua, importiVisibili = true) {
  const [p, hotel] = await Promise.all([trovaPrenotazione(hotelId, prenotazioneId), prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, include: { comune: true } })]);
  const f = formati(lingua);
  const attivi = p.segmenti.filter((s) => s.stato !== "ANNULLATO");
  const segmenti = attivi.length ? attivi : p.segmenti;
  const arrivo = segmenti.map((s) => s.dataInizio.getTime()).sort()[0];
  const partenza = segmenti.map((s) => s.dataFine.getTime()).sort().pop();
  const tot = calcolaTotaliPrenotazione(p);
  const tipi = [...new Set(segmenti.map((s) => s.tipoCamera.descrizione))];
  const persone = segmenti.reduce((t, s) => t + s.adulti + (Array.isArray(s.etaBambini) ? (s.etaBambini as number[]).length : 0), 0);
  const trattamenti = [...new Set(segmenti.map((s) => s.trattamento))];
  const valori: Partial<Record<Segnaposto, string>> = {
    nome: p.ospitePrenotante.nome,
    cognome: p.ospitePrenotante.cognome,
    numero_prenotazione: String(p.id),
    arrivo: arrivo ? f.data(new Date(arrivo)) : "",
    partenza: partenza ? f.data(new Date(partenza)) : "",
    notti: arrivo && partenza ? String(Math.round((partenza - arrivo) / 86400000)) : "",
    camere: `${segmenti.length} (${tipi.join(", ")})`,
    persone: String(persone),
    trattamento: trattamenti.join(", "),
    totale: f.euro(tot.totale),
    pagato: f.euro(tot.pagato),
    da_pagare: f.euro(tot.daPagare),
    acconto: p.accontoRichiesto !== null ? f.euro(Number(p.accontoRichiesto)) : "",
    acconto_entro: p.accontoEntro ? f.data(p.accontoEntro) : "",
    iban: hotel.iban ?? "",
    causale: `${lingua === "it" ? "Prenotazione n." : "Booking no."} ${p.id} ${p.ospitePrenotante.cognome}`.trim(),
    checkin_dalle: hotel.orarioCheckIn ?? "",
    checkout_entro: hotel.orarioCheckOut ?? "",
    hotel: hotel.nome,
    telefono_hotel: hotel.telefono ?? "",
    email_hotel: hotel.email ?? "",
    indirizzo_hotel: [hotel.indirizzo, [hotel.cap, hotel.comune?.nome].filter(Boolean).join(" ")].filter(Boolean).join(", "),
  };
  // Senza il permesso "Vedere importi" gli importi non escono dal server: restano segnaposto e l'email non parte.
  if (!importiVisibili) for (const k of ["totale", "pagato", "da_pagare", "acconto"] as const) valori[k] = "";
  // Destinatari possibili: chi ha prenotato, chi paga, il cliente (azienda o agenzia).
  const destinatari = [
    { email: p.ospitePrenotante.email, nome: `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`, ruolo: "ha prenotato", ospiteId: p.ospitePrenotante.id },
    ...(p.ospitePagante && p.ospitePagante.id !== p.ospitePrenotante.id
      ? [{ email: p.ospitePagante.email, nome: `${p.ospitePagante.nome} ${p.ospitePagante.cognome}`, ruolo: "paga", ospiteId: p.ospitePagante.id }]
      : []),
    ...(p.clientePagante ? [{ email: p.clientePagante.email, nome: p.clientePagante.denominazione, ruolo: "cliente", ospiteId: null }] : []),
  ].filter((d): d is { email: string; nome: string; ruolo: string; ospiteId: number | null } => !!d.email && EMAIL_VALIDA.test(d.email));
  return {
    valori,
    destinatari,
    linguaProposta: linguaPerOspite(p.ospitePrenotante.lingua, p.ospitePrenotante.cittadinanzaCodice, CODICE_ITALIA),
  };
}

/** Anteprima di un modello compilato con i dati della prenotazione. */
export async function anteprimaEmail(
  hotelId: number,
  prenotazioneId: number,
  chiave: ChiaveModello,
  linguaScelta: Lingua | null,
  importiVisibili = true,
  // Valori in più che dipendono dalla lingua (es. il link al questionario del ringraziamento).
  extra?: (lingua: Lingua) => Promise<Partial<Record<Segnaposto, string>>>,
) {
  // Senza lingua scelta: quella proposta per l'ospite (inglese per chi non è italiano).
  let v = await valoriPrenotazione(hotelId, prenotazioneId, linguaScelta ?? "it", importiVisibili);
  const lingua = linguaScelta ?? v.linguaProposta;
  if (lingua !== (linguaScelta ?? "it")) v = await valoriPrenotazione(hotelId, prenotazioneId, lingua, importiVisibili);
  const m = await modelloEmail(hotelId, chiave, lingua);
  const valori = extra ? { ...v.valori, ...(await extra(lingua)) } : v.valori;
  const oggetto = compila(m.oggetto, valori);
  const corpo = compila(m.corpo, valori);
  return { lingua, oggetto: oggetto.testo, corpo: corpo.testo, mancanti: [...new Set([...oggetto.mancanti, ...corpo.mancanti])], destinatari: v.destinatari };
}

export type InvioInput = { destinatario: string; oggetto: string; corpo: string; lingua: Lingua; modello: ChiaveModello | null };

/** Invia l'email dalla prenotazione (o la simula) e la registra nello storico. */
export async function inviaEmailPrenotazione(hotelId: number, prenotazioneId: number, d: InvioInput, utente: string, trasportoProva?: Trasporto) {
  const p = await trovaPrenotazione(hotelId, prenotazioneId);
  const ospite = [p.ospitePrenotante, p.ospitePagante].find((o) => o?.email?.toLowerCase() === d.destinatario.trim().toLowerCase());
  return inviaEmail(hotelId, { prenotazioneId, ospiteId: ospite?.id ?? null, richiestaId: null }, d, utente, trasportoProva);
}

/**
 * Invia (o simula) un'email e la registra nello storico, collegata a prenotazione, ospite o
 * richiesta di disponibilità; un errore del server resta nello storico con il messaggio.
 */
export async function inviaEmail(
  hotelId: number,
  legami: { prenotazioneId: number | null; ospiteId: number | null; richiestaId: number | null },
  d: InvioInput,
  utente: string,
  trasportoProva?: Trasporto,
) {
  const destinatario = d.destinatario.trim();
  if (!EMAIL_VALIDA.test(destinatario)) throw new Error("Indirizzo del destinatario non valido.");
  if (!d.oggetto.trim() || !d.corpo.trim()) throw new Error("Oggetto e testo sono obbligatori.");
  if (/\{\{\s*[a-z_]+\s*\}\}/.test(d.oggetto + d.corpo)) throw new Error("Nel testo ci sono ancora segnaposto da completare (tra {{ }}).");
  const t = await trasportoHotel(hotelId);
  const trasporto = trasportoProva ?? t.trasporto;
  let esito = t.simulato && !trasportoProva ? "simulata" : "inviata";
  let errore: string | null = null;
  try {
    await trasporto.invia({ from: t.mittente, replyTo: t.rispondiA, to: destinatario, subject: d.oggetto.trim(), text: d.corpo, html: html(d.corpo) });
  } catch (e) {
    esito = "errore";
    errore = messaggioErrore(e);
  }
  await prisma.emailInviata.create({
    data: { hotelId, ...legami, modello: d.modello, lingua: d.lingua, destinatario, oggetto: d.oggetto.trim(), corpo: d.corpo, esito, errore, inviataDa: utente },
  });
  if (esito === "errore") throw new Error(`Email non inviata: ${errore}`);
  return esito;
}

export async function storicoEmail(hotelId: number, prenotazioneId: number) {
  const r = await prisma.emailInviata.findMany({ where: { hotelId, prenotazioneId }, orderBy: { inviataIl: "desc" } });
  return r.map((e) => ({
    id: e.id,
    modello: e.modello,
    destinatario: e.destinatario,
    oggetto: e.oggetto,
    corpo: e.corpo,
    esito: e.esito,
    errore: e.errore,
    inviataIl: e.inviataIl.toISOString(),
    inviataDa: e.inviataDa,
  }));
}
