import { prisma } from "@/lib/prisma";
import type { UtenteSessione } from "@/lib/auth";
import { filtraPerModuli, PERMESSI, permessiAccesso, permessiEffettivi, type Permesso } from "@/lib/permessi";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Regole di sicurezza comuni a Utenti e Ruoli (tutte valgono nell'hotel attivo di chi opera;
 * il superadmin le supera tutte tranne l'ultima):
 * - non si concede un permesso che non si ha (niente scalate di privilegio);
 * - non si toccano utenti/ruoli che hanno più poteri di chi opera (un Direttore non declassa l'Amministratore);
 * - l'hotel non può restare senza nessuno che gestisca gli utenti (vedi conservaGestoreUtenti).
 */
export function contenutoIn(permessi: Permesso[], disponibili: Permesso[]) {
  return permessi.every((p) => disponibili.includes(p));
}

/**
 * Permessi di un ruolo che contano nell'hotel di chi opera: quelli dei moduli spenti non valgono,
 * quindi non devono impedire di gestire un ruolo che li contiene (es. "Reception" con i permessi
 * delle sale in un hotel senza il modulo Sale).
 */
export function permessiValidi(chi: UtenteSessione, permessi: unknown) {
  return filtraPerModuli(permessiEffettivi(permessi), chi.moduli);
}

export function verificaPuoConcedere(chi: UtenteSessione, permessi: unknown) {
  if (chi.superAdmin) return;
  if (!contenutoIn(permessiValidi(chi, permessi), chi.permessi)) {
    throw new Error("Non puoi assegnare permessi che tu stesso non hai.");
  }
}

async function gestoriUtenti(tx: Tx, hotelId: number) {
  const [hotel, accessi] = await Promise.all([
    tx.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { modalitaUtenti: true } }),
    tx.utenteHotel.findMany({
      where: { hotelId, utente: { attivo: true, superAdmin: false } },
      include: { ruolo: true, ruoliAggiuntivi: { include: { ruolo: true } } },
    }),
  ]);
  return accessi.filter((a) => permessiAccesso(hotel.modalitaUtenti, [a.ruolo.permessi, ...a.ruoliAggiuntivi.map((x) => x.ruolo.permessi)]).includes(PERMESSI.UTENTI_GESTISCI)).length;
}

/** Esegue la modifica in transazione e la annulla se l'hotel resterebbe senza gestori utenti. */
export async function conservaGestoreUtenti<T>(hotelId: number, modifica: (tx: Tx) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    const prima = await gestoriUtenti(tx, hotelId);
    const risultato = await modifica(tx);
    if (prima > 0 && (await gestoriUtenti(tx, hotelId)) === 0) {
      throw new Error("Operazione annullata: l'hotel resterebbe senza nessun utente in grado di gestire gli utenti.");
    }
    return risultato;
  });
}

export async function datiGestioneUtenti(chi: UtenteSessione) {
  const [accessi, ruoli, superAdmin, hotel] = await Promise.all([
    prisma.utenteHotel.findMany({
      where: { hotelId: chi.hotelId, utente: { superAdmin: false } },
      include: { utente: true, ruolo: true, ruoliAggiuntivi: true },
      orderBy: { utente: { nome: "asc" } },
    }),
    prisma.ruolo.findMany({ where: { hotelId: chi.hotelId }, orderBy: { nome: "asc" } }),
    chi.superAdmin
      ? prisma.utente.findMany({ where: { superAdmin: true }, orderBy: { nome: "asc" } })
      : Promise.resolve([]),
    prisma.hotel.findUniqueOrThrow({ where: { id: chi.hotelId }, select: { modalitaUtenti: true } }),
  ]);
  return { accessi, ruoli, superAdmin, modalitaUtenti: hotel.modalitaUtenti };
}

/** Accesso di un utente all'hotel attivo, verificando che chi opera possa toccarlo. */
async function accessoGestibile(chi: UtenteSessione, utenteId: number) {
  const accesso = await prisma.utenteHotel.findUnique({
    where: { utenteId_hotelId: { utenteId, hotelId: chi.hotelId } },
    include: { utente: true, ruolo: true, ruoliAggiuntivi: { include: { ruolo: true } } },
  });
  if (!accesso) throw new Error("Questo utente non ha accesso all'hotel.");
  if (!chi.superAdmin) {
    if (accesso.utente.superAdmin) throw new Error("Solo un superadmin può modificare un superadmin.");
    const suoi = [accesso.ruolo.permessi, ...accesso.ruoliAggiuntivi.map((x) => x.ruolo.permessi)].flatMap((p) => (Array.isArray(p) ? p : []));
    if (!contenutoIn(permessiValidi(chi, suoi), chi.permessi)) {
      throw new Error("Non puoi modificare un utente con più permessi dei tuoi.");
    }
  }
  return accesso;
}

async function ruoloDellHotel(chi: UtenteSessione, ruoloId: number) {
  const ruolo = await prisma.ruolo.findFirst({ where: { id: ruoloId, hotelId: chi.hotelId } });
  if (!ruolo) throw new Error("Ruolo non trovato in questo hotel.");
  verificaPuoConcedere(chi, ruolo.permessi);
  return ruolo;
}

/**
 * Crea un utente con accesso all'hotel attivo. Un'email già registrata può essere collegata a
 * un altro hotel solo dal superadmin: un amministratore d'hotel non deve poter "agganciare"
 * account di altre strutture.
 */
export async function aggiungiUtente(
  chi: UtenteSessione,
  input: { nome: string; email: string; password: string; ruoloId: number },
) {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Indica l'email.");
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: chi.hotelId }, select: { modalitaUtenti: true } });
  if (hotel.modalitaUtenti === "titolare" && (await prisma.utenteHotel.count({ where: { hotelId: chi.hotelId, utente: { superAdmin: false } } })) > 0) {
    throw new Error("La struttura è gestita da un titolare unico: per aggiungere altri utenti passa alla gestione con ruoli.");
  }
  const ruolo = await ruoloDellHotel(chi, input.ruoloId);

  const esistente = await prisma.utente.findUnique({ where: { email } });
  if (esistente) {
    if (!chi.superAdmin) {
      throw new Error("Esiste già un utente con questa email: per collegarlo a questo hotel contatta il gestore della piattaforma.");
    }
    const giaPresente = await prisma.utenteHotel.findUnique({
      where: { utenteId_hotelId: { utenteId: esistente.id, hotelId: chi.hotelId } },
    });
    if (giaPresente) throw new Error("Questo utente ha già accesso all'hotel.");
    await prisma.utenteHotel.create({ data: { utenteId: esistente.id, hotelId: chi.hotelId, ruoloId: ruolo.id } });
    return;
  }

  if (!input.nome.trim()) throw new Error("Indica il nome.");
  if (input.password.length < 8) throw new Error("La password iniziale deve avere almeno 8 caratteri.");
  const bcrypt = await import("bcryptjs");
  await prisma.utente.create({
    data: {
      nome: input.nome.trim(),
      email,
      passwordHash: await bcrypt.hash(input.password, 10),
      accessi: { create: { hotelId: chi.hotelId, ruoloId: ruolo.id } },
    },
  });
}

export async function cambiaRuoloUtente(chi: UtenteSessione, utenteId: number, ruoloId: number) {
  await accessoGestibile(chi, utenteId);
  await ruoloDellHotel(chi, ruoloId);
  await conservaGestoreUtenti(chi.hotelId, (tx) =>
    tx.utenteHotel.update({ where: { utenteId_hotelId: { utenteId, hotelId: chi.hotelId } }, data: { ruoloId } }),
  );
}

/**
 * Ruoli in più di un utente (oltre al principale): i permessi si sommano. Solo nella gestione con
 * ruoli e solo con ruoli che chi opera potrebbe assegnare.
 */
export async function impostaRuoliAggiuntivi(chi: UtenteSessione, utenteId: number, ruoliIds: number[]) {
  const accesso = await accessoGestibile(chi, utenteId);
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: chi.hotelId }, select: { modalitaUtenti: true } });
  if (hotel.modalitaUtenti === "titolare") throw new Error("Con il titolare unico non servono altri ruoli: ha già tutti i permessi.");
  const ids = [...new Set(ruoliIds)].filter((id) => id !== accesso.ruoloId);
  for (const id of ids) await ruoloDellHotel(chi, id);
  await conservaGestoreUtenti(chi.hotelId, async (tx) => {
    await tx.ruoloAggiuntivo.deleteMany({ where: { utenteId, hotelId: chi.hotelId } });
    if (ids.length) await tx.ruoloAggiuntivo.createMany({ data: ids.map((ruoloId) => ({ utenteId, hotelId: chi.hotelId, ruoloId })) });
  });
}

/**
 * Modalità di gestione degli utenti dell'hotel. "titolare": un solo utente con tutti i permessi
 * (tipico del B&B): si può scegliere solo se nell'hotel c'è al massimo un utente. "ruoli": più utenti
 * con uno o più ruoli; si può tornare ai ruoli in ogni momento.
 */
export async function impostaModalitaUtenti(chi: UtenteSessione, modalita: "ruoli" | "titolare") {
  if (modalita !== "ruoli" && modalita !== "titolare") throw new Error("Modalità non valida.");
  if (modalita === "titolare") {
    const utenti = await prisma.utenteHotel.findMany({ where: { hotelId: chi.hotelId, utente: { superAdmin: false } }, include: { utente: true } });
    if (utenti.length > 1) {
      throw new Error(`Nell'hotel ci sono ${utenti.length} utenti: con il titolare unico ce ne può essere uno solo. Rimuovi prima gli altri.`);
    }
    await prisma.ruoloAggiuntivo.deleteMany({ where: { hotelId: chi.hotelId } });
  }
  await prisma.hotel.update({ where: { id: chi.hotelId }, data: { modalitaUtenti: modalita } });
}

/** Toglie l'accesso all'hotel attivo (l'account resta, per eventuali altri hotel). */
export async function rimuoviDaHotel(chi: UtenteSessione, utenteId: number) {
  await accessoGestibile(chi, utenteId);
  await conservaGestoreUtenti(chi.hotelId, (tx) =>
    tx.utenteHotel.delete({ where: { utenteId_hotelId: { utenteId, hotelId: chi.hotelId } } }),
  );
}

// --- Solo superadmin: operazioni sull'account intero, che valgono per tutti gli hotel ---

function soloSuperAdmin(chi: UtenteSessione) {
  if (!chi.superAdmin) throw new Error("Operazione riservata al gestore della piattaforma.");
}

export async function impostaAttivoUtente(chi: UtenteSessione, utenteId: number, attivo: boolean) {
  soloSuperAdmin(chi);
  if (utenteId === chi.id && !attivo) throw new Error("Non puoi disattivare il tuo stesso account.");
  await conservaGestoreUtenti(chi.hotelId, (tx) => tx.utente.update({ where: { id: utenteId }, data: { attivo } }));
}

export async function impostaSuperAdmin(chi: UtenteSessione, utenteId: number, superAdmin: boolean) {
  soloSuperAdmin(chi);
  if (!superAdmin) {
    const altri = await prisma.utente.count({ where: { superAdmin: true, attivo: true, id: { not: utenteId } } });
    if (altri === 0) throw new Error("Deve restare almeno un superadmin attivo.");
  }
  await prisma.utente.update({ where: { id: utenteId }, data: { superAdmin } });
}
