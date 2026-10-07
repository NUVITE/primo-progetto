/**
 * Sicurezza degli accessi: registro degli eventi, blocco dopo troppi tentativi, cambio e
 * reimpostazione della password (vedi accessiRegole.ts per le regole pure).
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UtenteSessione } from "@/lib/auth";
import { LIMITE_EMAIL, LIMITE_IP, FINESTRA_MINUTI, passwordTemporanea, problemaPassword, statoBlocco } from "@/lib/accessiRegole";

// Come in auth.ts (che è solo per il server e non si può importare dai collaudi).
const creaPasswordHash = (p: string) => bcrypt.hash(p, 10);
const verificaPassword = (p: string, hash: string) => bcrypt.compare(p, hash);

/** Indirizzo di rete di chi fa la richiesta: lo scrive nginx (X-Real-IP), non il browser. */
export async function ipRichiesta() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim().slice(0, 64) || null;
}

export async function registraEvento(e: { utenteId?: number | null; email: string; ip?: string | null; tipo: string; dettaglio?: string | null }) {
  await prisma.eventoAccesso.create({
    data: { utenteId: e.utenteId ?? null, email: e.email.toLowerCase().slice(0, 191), ip: e.ip ?? null, tipo: e.tipo, dettaglio: e.dettaglio?.slice(0, 191) ?? null },
  });
}

/**
 * Login bloccato? Per l'email contano gli errori dopo l'ultimo accesso riuscito; per l'indirizzo di
 * rete tutti quelli della finestra. Restituisce i minuti di attesa, o null se si può provare.
 */
export async function minutiDiBlocco(email: string, ip: string | null, ora = new Date()) {
  const da = new Date(ora.getTime() - FINESTRA_MINUTI * 60_000);
  const ultimoOk = await prisma.eventoAccesso.findFirst({ where: { email, tipo: "accesso" }, orderBy: { creatoIl: "desc" }, select: { creatoIl: true } });
  const dopo = ultimoOk && ultimoOk.creatoIl > da ? ultimoOk.creatoIl : da;
  const [perEmail, perIp] = await Promise.all([
    prisma.eventoAccesso.findMany({ where: { email, tipo: "accesso_fallito", creatoIl: { gt: dopo } }, select: { creatoIl: true } }),
    ip ? prisma.eventoAccesso.findMany({ where: { ip, tipo: "accesso_fallito", creatoIl: { gt: da } }, select: { creatoIl: true } }) : Promise.resolve([]),
  ]);
  const a = statoBlocco(perEmail.map((x) => x.creatoIl), ora, LIMITE_EMAIL);
  const b = statoBlocco(perIp.map((x) => x.creatoIl), ora, LIMITE_IP);
  const minuti = Math.max(a.bloccato ? a.minuti : 0, b.bloccato ? b.minuti : 0);
  return minuti || null;
}

/** Cambio della propria password: chiude le altre sessioni (la versione cambia). Restituisce la nuova versione. */
export async function cambiaPassword(utenteId: number, attuale: string, nuova: string, ip: string | null) {
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId } });
  if (!(await verificaPassword(attuale, u.passwordHash))) throw new Error("La password attuale non è corretta.");
  if (attuale === nuova) throw new Error("La nuova password deve essere diversa da quella attuale.");
  const problema = problemaPassword(nuova, u);
  if (problema) throw new Error(problema);
  const r = await prisma.utente.update({
    where: { id: utenteId },
    data: { passwordHash: await creaPasswordHash(nuova), cambioPasswordObbligatorio: false, passwordCambiataIl: new Date(), versioneSessione: { increment: 1 } },
    select: { versioneSessione: true },
  });
  await registraEvento({ utenteId, email: u.email, ip, tipo: "password_cambiata" });
  return r.versioneSessione;
}

/** Chiude tutte le sessioni dell'utente; chi lo chiede resta dentro con una sessione nuova. */
export async function esciDagliAltriDispositivi(utenteId: number, ip: string | null) {
  const r = await prisma.utente.update({ where: { id: utenteId }, data: { versioneSessione: { increment: 1 } }, select: { versioneSessione: true, email: true } });
  await registraEvento({ utenteId, email: r.email, ip, tipo: "uscita_dispositivi" });
  return r.versioneSessione;
}

/**
 * Password dimenticata: chi gestisce gli utenti ne crea una temporanea, da cambiare al primo accesso;
 * le sessioni aperte dell'utente si chiudono. Un amministratore d'hotel può farlo solo per chi lavora
 * soltanto nella sua struttura e non ha più permessi di lui (l'account vale anche per gli altri hotel);
 * il gestore della piattaforma per tutti.
 */
export async function reimpostaPassword(chi: UtenteSessione, utenteId: number, ip: string | null, controllaAccesso: (chi: UtenteSessione, utenteId: number) => Promise<unknown>) {
  if (utenteId === chi.id) throw new Error("La tua password la cambi da «Il mio profilo».");
  const u = await prisma.utente.findUniqueOrThrow({ where: { id: utenteId }, include: { accessi: { select: { hotelId: true } } } });
  if (!chi.superAdmin) {
    await controllaAccesso(chi, utenteId);
    if (u.accessi.some((a) => a.hotelId !== chi.hotelId))
      throw new Error("Questo utente lavora anche in un'altra struttura: la password gliela reimposta il gestore della piattaforma.");
  }
  const temporanea = passwordTemporanea(randomBytes(12));
  await prisma.utente.update({
    where: { id: utenteId },
    data: { passwordHash: await creaPasswordHash(temporanea), cambioPasswordObbligatorio: true, versioneSessione: { increment: 1 } },
  });
  await registraEvento({ utenteId, email: u.email, ip, tipo: "password_reimpostata", dettaglio: `da ${chi.nome}` });
  return temporanea;
}
