/**
 * Sicurezza degli accessi: registro degli eventi, blocco dopo troppi tentativi, cambio e
 * reimpostazione della password (vedi accessiRegole.ts per le regole pure).
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UtenteSessione } from "@/lib/auth";
import { offsetRoma } from "@/lib/backupRegole";
import { EVENTI_PROBLEMA, LIMITE_EMAIL, LIMITE_IP, FINESTRA_MINUTI, MESI_CONSERVAZIONE, passwordTemporanea, problemaPassword, statoBlocco } from "@/lib/accessiRegole";

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
// Contano per il blocco sia le password sbagliate sia i codici sbagliati della verifica in due passaggi.
const ERRORI = ["accesso_fallito", "verifica_fallita"];

export async function minutiDiBlocco(email: string, ip: string | null, ora = new Date()) {
  const da = new Date(ora.getTime() - FINESTRA_MINUTI * 60_000);
  const ultimoOk = await prisma.eventoAccesso.findFirst({ where: { email, tipo: "accesso" }, orderBy: { creatoIl: "desc" }, select: { creatoIl: true } });
  const dopo = ultimoOk && ultimoOk.creatoIl > da ? ultimoOk.creatoIl : da;
  const [perEmail, perIp] = await Promise.all([
    prisma.eventoAccesso.findMany({ where: { email, tipo: { in: ERRORI }, creatoIl: { gt: dopo } }, select: { creatoIl: true } }),
    ip ? prisma.eventoAccesso.findMany({ where: { ip, tipo: { in: ERRORI }, creatoIl: { gt: da } }, select: { creatoIl: true } }) : Promise.resolve([]),
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
  // I dispositivi ricordati per la verifica in due passaggi si dimenticano: al prossimo accesso il codice si richiede.
  await prisma.dispositivoFidato.deleteMany({ where: { utenteId } });
  await registraEvento({ utenteId, email: u.email, ip, tipo: "password_cambiata" });
  return r.versioneSessione;
}

/** Chiude tutte le sessioni dell'utente; chi lo chiede resta dentro con una sessione nuova. */
export async function esciDagliAltriDispositivi(utenteId: number, ip: string | null) {
  const r = await prisma.utente.update({ where: { id: utenteId }, data: { versioneSessione: { increment: 1 } }, select: { versioneSessione: true, email: true } });
  await prisma.dispositivoFidato.deleteMany({ where: { utenteId } });
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
  await prisma.dispositivoFidato.deleteMany({ where: { utenteId } });
  await registraEvento({ utenteId, email: u.email, ip, tipo: "password_reimpostata", dettaglio: `da ${chi.nome}` });
  return temporanea;
}

/** Cancella gli eventi più vecchi del periodo di conservazione (si chiama a ogni accesso riuscito). */
export async function pulisciEventiVecchi(ora = new Date()) {
  const limite = new Date(ora);
  limite.setMonth(limite.getMonth() - MESI_CONSERVAZIONE);
  await prisma.eventoAccesso.deleteMany({ where: { creatoIl: { lt: limite } } });
}

export type FiltroRegistro = { dal: string; al: string; utenteId: number | null; soloProblemi: boolean };

/**
 * Registro degli accessi. Con hotelId: solo gli utenti che lavorano in quella struttura (il gestore
 * della piattaforma no); senza: tutto, anche i tentativi su email inesistenti (pagina del fornitore).
 * Al massimo 500 righe, le più recenti.
 */
export async function registroAccessi(hotelId: number | null, f: FiltroRegistro) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.dal) || !/^\d{4}-\d{2}-\d{2}$/.test(f.al) || f.dal > f.al) throw new Error("Periodo non valido.");
  const utenti = hotelId
    ? await prisma.utente.findMany({ where: { superAdmin: false, accessi: { some: { hotelId } } }, select: { id: true, nome: true, email: true }, orderBy: { nome: "asc" } })
    : await prisma.utente.findMany({ select: { id: true, nome: true, email: true }, orderBy: { nome: "asc" } });
  const ids = utenti.map((u) => u.id);
  if (f.utenteId !== null && !ids.includes(f.utenteId)) throw new Error("Utente non trovato.");
  // Le date sono giorni italiani: la fine del giorno "al" è compresa.
  const dal = new Date(`${f.dal}T00:00:00${offsetRoma(f.dal)}`);
  const al = new Date(`${f.al}T23:59:59.999${offsetRoma(f.al)}`);
  const eventi = await prisma.eventoAccesso.findMany({
    where: {
      creatoIl: { gte: dal, lte: al },
      ...(f.utenteId !== null ? { utenteId: f.utenteId } : hotelId ? { utenteId: { in: ids } } : {}),
      ...(f.soloProblemi ? { tipo: { in: [...EVENTI_PROBLEMA] } } : {}),
    },
    include: { utente: { select: { nome: true } } },
    orderBy: { creatoIl: "desc" },
    take: 501,
  });
  return {
    utenti,
    troppi: eventi.length > 500,
    eventi: eventi.slice(0, 500).map((e) => ({ id: e.id, quando: e.creatoIl.toISOString(), tipo: e.tipo, utente: e.utente?.nome ?? null, email: e.email, ip: e.ip, dettaglio: e.dettaglio })),
  };
}
