/**
 * Verifica in due passaggi: dopo la password, un codice a 6 cifre dall'app sul telefono (o un codice
 * di riserva). Obbligatoria per il gestore della piattaforma e per chi gestisce utenti o impostazioni
 * di una struttura (il titolare unico compreso); facoltativa per gli altri. "Ricorda questo
 * dispositivo" evita il codice per 30 giorni su quel browser.
 */
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cifra, decifra } from "@/lib/cifratura";
import { PERMESSI, permessiAccesso } from "@/lib/permessi";
import type { UtenteSessione } from "@/lib/auth";
import { registraEvento } from "@/lib/accessi";
import { improntaRiserva, normalizzaRiserva, nuoviCodiciRiserva, nuovoSegreto, uriApp, verificaCodice } from "@/lib/totp";

export const GIORNI_DISPOSITIVO = 30;
const impronta = (t: string) => createHash("sha256").update(t).digest("hex");
const riserve = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Obbligatoria per il fornitore e per chi, in almeno una struttura, gestisce utenti o impostazioni. */
export async function verificaObbligatoria(utenteId: number) {
  const u = await prisma.utente.findUniqueOrThrow({
    where: { id: utenteId },
    select: { superAdmin: true, accessi: { select: { hotel: { select: { modalitaUtenti: true } }, ruolo: { select: { permessi: true } }, ruoliAggiuntivi: { select: { ruolo: { select: { permessi: true } } } } } } },
  });
  if (u.superAdmin) return true;
  return u.accessi.some((a) => {
    const p = permessiAccesso(a.hotel.modalitaUtenti, [a.ruolo.permessi, ...a.ruoliAggiuntivi.map((x) => x.ruolo.permessi)]);
    return p.includes(PERMESSI.UTENTI_GESTISCI) || p.includes(PERMESSI.HOTEL_CONFIGURA);
  });
}

export async function statoVerifica(utenteId: number) {
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, select: { totpAttivoIl: true, codiciRiserva: true } });
  return {
    attiva: !!u.totpAttivoIl,
    attivaDal: u.totpAttivoIl?.toISOString() ?? null,
    codiciRimasti: riserve(u.codiciRiserva).length,
    obbligatoria: await verificaObbligatoria(utenteId),
    dispositivi: await prisma.dispositivoFidato.count({ where: { utenteId, scadeIl: { gt: new Date() } } }),
  };
}

/** Primo passo dell'attivazione: nuovo segreto (in attesa) da leggere con l'app tramite il codice QR. */
export async function avviaAttivazione(utenteId: number) {
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, select: { email: true, totpAttivoIl: true } });
  if (u.totpAttivoIl) throw new Error("La verifica in due passaggi è già attiva.");
  const segreto = nuovoSegreto();
  await prisma.utente.update({ where: { id: utenteId }, data: { totpInAttesaCifrato: cifra(segreto) } });
  return { segreto, uri: uriApp(segreto, u.email) };
}

/** Secondo passo: il primo codice dell'app conferma che è tutto a posto. Restituisce i codici di riserva (si vedono una volta). */
export async function confermaAttivazione(utenteId: number, codice: string, ip: string | null) {
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, select: { email: true, totpInAttesaCifrato: true, totpAttivoIl: true } });
  if (u.totpAttivoIl) throw new Error("La verifica in due passaggi è già attiva.");
  if (!u.totpInAttesaCifrato) throw new Error("Inquadra prima il codice QR con l'app.");
  const segreto = decifra(u.totpInAttesaCifrato);
  const passo = verificaCodice(segreto, codice, Date.now(), null);
  if (passo === null) throw new Error("Codice non corretto: controlla di aver inquadrato il QR giusto e che l'ora del telefono sia esatta.");
  const codici = nuoviCodiciRiserva();
  await prisma.utente.update({
    where: { id: utenteId },
    data: { totpSegretoCifrato: cifra(segreto), totpInAttesaCifrato: null, totpAttivoIl: new Date(), totpUltimoPasso: passo, codiciRiserva: codici.map(improntaRiserva) },
  });
  await registraEvento({ utenteId, email: u.email, ip, tipo: "verifica_attivata" });
  return codici;
}

/**
 * Controllo del codice al login: codice dell'app o, in alternativa, un codice di riserva (che poi non
 * vale più). Restituisce null se sbagliato.
 */
export async function controllaCodice(utenteId: number, codice: string) {
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, select: { totpSegretoCifrato: true, totpUltimoPasso: true, codiciRiserva: true } });
  if (!u.totpSegretoCifrato) return null;
  const passo = verificaCodice(decifra(u.totpSegretoCifrato), codice, Date.now(), u.totpUltimoPasso);
  if (passo !== null) {
    // Solo se nessun altro ha usato un passo uguale o successivo nel frattempo (due login in parallelo).
    const r = await prisma.utente.updateMany({ where: { id: utenteId, OR: [{ totpUltimoPasso: null }, { totpUltimoPasso: { lt: passo } }] }, data: { totpUltimoPasso: passo } });
    return r.count ? { riserva: false, rimasti: riserve(u.codiciRiserva).length } : null;
  }
  const c = normalizzaRiserva(codice);
  if (c.length !== 10) return null;
  const elenco = riserve(u.codiciRiserva);
  const i = improntaRiserva(c);
  if (!elenco.includes(i)) return null;
  const restanti = elenco.filter((x) => x !== i);
  await prisma.utente.update({ where: { id: utenteId }, data: { codiciRiserva: restanti } });
  return { riserva: true, rimasti: restanti.length };
}

/** Nuovi codici di riserva (i vecchi non valgono più): serve un codice dell'app. */
export async function rigeneraCodiciRiserva(utenteId: number, codice: string) {
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, select: { totpSegretoCifrato: true, totpUltimoPasso: true } });
  if (!u.totpSegretoCifrato) throw new Error("La verifica in due passaggi non è attiva.");
  const passo = verificaCodice(decifra(u.totpSegretoCifrato), codice, Date.now(), u.totpUltimoPasso);
  if (passo === null) throw new Error("Codice dell'app non corretto.");
  const codici = nuoviCodiciRiserva();
  await prisma.utente.update({ where: { id: utenteId }, data: { totpUltimoPasso: passo, codiciRiserva: codici.map(improntaRiserva) } });
  return codici;
}

/** Disattivazione da parte dell'utente: solo se non è obbligatoria per lui, con la password. */
export async function disattivaVerifica(utenteId: number, password: string, ip: string | null) {
  if (await verificaObbligatoria(utenteId)) throw new Error("Per il tuo ruolo la verifica in due passaggi è obbligatoria: non si può spegnere.");
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, select: { email: true, passwordHash: true } });
  if (!(await bcrypt.compare(password, u.passwordHash))) throw new Error("Password non corretta.");
  await spegni(utenteId);
  await registraEvento({ utenteId, email: u.email, ip, tipo: "verifica_disattivata" });
}

async function spegni(utenteId: number) {
  await prisma.$transaction([
    prisma.utente.update({ where: { id: utenteId }, data: { totpSegretoCifrato: null, totpInAttesaCifrato: null, totpAttivoIl: null, totpUltimoPasso: null, codiciRiserva: [] } }),
    prisma.dispositivoFidato.deleteMany({ where: { utenteId } }),
  ]);
}

/**
 * Telefono perso: chi gestisce gli utenti azzera la verifica di un collega (stesse regole della
 * reimpostazione della password); le sue sessioni si chiudono e al prossimo accesso la riattiva.
 */
export async function azzeraVerifica(chi: UtenteSessione, utenteId: number, ip: string | null, controllaAccesso: (chi: UtenteSessione, utenteId: number) => Promise<unknown>) {
  if (utenteId === chi.id) throw new Error("La tua verifica la gestisci da «Il mio profilo».");
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, include: { accessi: { select: { hotelId: true } } } });
  if (!chi.superAdmin) {
    await controllaAccesso(chi, utenteId);
    if (u.accessi.some((a) => a.hotelId !== chi.hotelId))
      throw new Error("Questo utente lavora anche in un'altra struttura: la verifica gliela azzera il gestore della piattaforma.");
  }
  if (!u.totpAttivoIl) throw new Error("Questo utente non ha la verifica in due passaggi attiva.");
  await spegni(utenteId);
  await prisma.utente.update({ where: { id: utenteId }, data: { versioneSessione: { increment: 1 } } });
  await registraEvento({ utenteId, email: u.email, ip, tipo: "verifica_azzerata", dettaglio: `da ${chi.nome}` });
}

// ---- Dispositivi ricordati ----

/** Ricorda questo dispositivo: restituisce il valore da mettere nel cookie (qui si salva solo l'impronta). */
export async function ricordaDispositivo(utenteId: number) {
  const token = randomBytes(32).toString("base64url");
  await prisma.dispositivoFidato.deleteMany({ where: { utenteId, scadeIl: { lt: new Date() } } });
  await prisma.dispositivoFidato.create({ data: { utenteId, impronta: impronta(token), scadeIl: new Date(Date.now() + GIORNI_DISPOSITIVO * 86400000) } });
  return token;
}

export async function dispositivoRicordato(utenteId: number, token: string | null | undefined) {
  if (!token) return false;
  return !!(await prisma.dispositivoFidato.findFirst({ where: { utenteId, impronta: impronta(token), scadeIl: { gt: new Date() } }, select: { id: true } }));
}

export async function dimenticaDispositivi(utenteId: number) {
  await prisma.dispositivoFidato.deleteMany({ where: { utenteId } });
}
