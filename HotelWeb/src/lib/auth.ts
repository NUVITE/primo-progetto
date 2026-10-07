import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { filtraPerModuli, permessiAccesso, TUTTI_I_PERMESSI, type Permesso } from "@/lib/permessi";
import { moduliAttivi, type Modulo } from "@/lib/moduli";
import { funzioniSpente, type Funzione } from "@/lib/funzioniRegole";

const COOKIE_SESSIONE = "hotelweb_sessione";
const DURATA_SESSIONE_SECONDI = 60 * 60 * 24 * 7; // 7 giorni

function chiaveSegreta() {
  const segreto = process.env.AUTH_SECRET;
  if (!segreto) throw new Error("AUTH_SECRET non impostata nel .env.");
  return new TextEncoder().encode(segreto);
}

export async function creaPasswordHash(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verificaPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/**
 * hotelId nel token è l'hotel attivo nella sessione — per un utente con un solo hotel
 * coincide sempre con quello; per un account multi-struttura è quello scelto con
 * cambiaHotelAttivo() e può cambiare senza dover rifare login.
 */
async function firmaSessione(utenteId: number, hotelId: number, versione: number, attivaVerifica = false) {
  // v = versione della sessione dell'utente: se cambia (cambio password, uscita dagli altri dispositivi) il cookie non vale più.
  // a2 = deve attivare la verifica in due passaggi (obbligatoria per lui) prima di fare altro.
  const token = await new SignJWT({ sub: String(utenteId), hotelId, v: versione, ...(attivaVerifica ? { a2: true } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURATA_SESSIONE_SECONDI}s`)
    .sign(chiaveSegreta());

  const store = await cookies();
  store.set(COOKIE_SESSIONE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURATA_SESSIONE_SECONDI,
  });
}

/** Hotel accessibili: tutti per il superadmin, altrimenti quelli con una riga UtenteHotel. */
/** Hotel accessibili: tutti per il superadmin (anche disattivati), altrimenti quelli attivi con una riga UtenteHotel. */
async function hotelAccessibili(utente: { superAdmin: boolean; accessi: { hotel: { id: number; nome: string; attivo: boolean } }[] }) {
  if (utente.superAdmin) {
    return prisma.hotel.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } });
  }
  return utente.accessi
    .filter((a) => a.hotel.attivo)
    .map(({ hotel }) => ({ id: hotel.id, nome: hotel.nome }))
    .sort((x, y) => x.nome.localeCompare(y.nome));
}

/**
 * Da chiamare al login: sceglie il primo hotel accessibile come hotel attivo iniziale. Con
 * attivaVerifica l'utente, prima di fare altro, attiva la verifica in due passaggi (obbligatoria per lui).
 */
export async function creaSessione(utenteId: number, attivaVerifica = false) {
  const utente = await prisma.utente.findUniqueOrThrow({
    where: { id: utenteId },
    include: { accessi: { include: { hotel: { select: { id: true, nome: true, attivo: true } } } } },
  });
  const hotels = await hotelAccessibili(utente);
  if (hotels.length === 0) {
    throw new Error(`L'utente ${utente.email} non è associato a nessun hotel.`);
  }
  await firmaSessione(utenteId, hotels[0].id, utente.versioneSessione, attivaVerifica && !utente.totpAttivoIl);
}

/** Dopo un cambio di versione (es. cambio password) chi lo ha fatto resta dentro, nello stesso hotel. */
export async function rinnovaSessione(utenteId: number, versione: number) {
  const sessione = await leggiSessioneDaCookie();
  if (!sessione || sessione.utenteId !== utenteId) return;
  // La verifica appena attivata toglie l'obbligo di attivarla.
  const u = await prisma.utente.findUnique({ where: { id: utenteId }, select: { totpAttivoIl: true } });
  await firmaSessione(utenteId, sessione.hotelId, versione, sessione.attivaVerifica && !u?.totpAttivoIl);
}

/** Cambia l'hotel attivo di un account con accesso a più strutture, senza rifare login. */
export async function cambiaHotelAttivo(nuovoHotelId: number) {
  const sessione = await leggiSessioneDaCookie();
  if (!sessione) redirect("/login");

  const utente = await prisma.utente.findUnique({ where: { id: sessione.utenteId } });
  const haAccesso = utente?.superAdmin
    ? await prisma.hotel.findUnique({ where: { id: nuovoHotelId } })
    : await prisma.utenteHotel.findFirst({ where: { utenteId: sessione.utenteId, hotelId: nuovoHotelId, hotel: { attivo: true } } });
  if (!haAccesso) {
    throw new Error("Non hai accesso a questo hotel.");
  }

  await firmaSessione(sessione.utenteId, nuovoHotelId, sessione.versione, sessione.attivaVerifica);
}

// ---- Tra password e codice della verifica in due passaggi ----

const COOKIE_VERIFICA = "hotelweb_verifica";
const COOKIE_DISPOSITIVO = "hotelweb_dispositivo";
const MINUTI_VERIFICA = 10;

/** Password giusta, manca il codice: un cookie provvisorio (10 minuti) che non è ancora una sessione. */
export async function avviaVerifica(utenteId: number, destinazione: string) {
  const token = await new SignJWT({ sub: String(utenteId), scopo: "verifica", dest: destinazione })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MINUTI_VERIFICA}m`)
    .sign(chiaveSegreta());
  (await cookies()).set(COOKIE_VERIFICA, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MINUTI_VERIFICA * 60 });
}

/** Chi sta facendo il secondo passaggio (o null se il cookie manca o è scaduto). */
export async function utenteInVerifica(): Promise<{ utenteId: number; destinazione: string } | null> {
  const token = (await cookies()).get(COOKIE_VERIFICA)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chiaveSegreta());
    if (payload.scopo !== "verifica" || !payload.sub) return null;
    return { utenteId: Number(payload.sub), destinazione: typeof payload.dest === "string" ? payload.dest : "/" };
  } catch {
    return null;
  }
}

export async function chiudiVerifica() {
  (await cookies()).delete(COOKIE_VERIFICA);
}

export async function leggiDispositivo() {
  return (await cookies()).get(COOKIE_DISPOSITIVO)?.value ?? null;
}

export async function salvaDispositivo(token: string, giorni: number) {
  (await cookies()).set(COOKIE_DISPOSITIVO, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: giorni * 86400 });
}

export async function distruggiSessione() {
  const store = await cookies();
  store.delete(COOKIE_SESSIONE);
}

async function leggiSessioneDaCookie(): Promise<{ utenteId: number; hotelId: number; versione: number; attivaVerifica: boolean } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_SESSIONE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chiaveSegreta());
    if (!payload.sub || typeof payload.hotelId !== "number") return null;
    // Cookie di prima della versione: valgono come versione 0 (nessuno viene buttato fuori dall'aggiornamento).
    return { utenteId: Number(payload.sub), hotelId: payload.hotelId, versione: typeof payload.v === "number" ? payload.v : 0, attivaVerifica: payload.a2 === true };
  } catch {
    return null;
  }
}

export type UtenteSessione = {
  id: number;
  nome: string;
  email: string;
  superAdmin: boolean;
  hotelId: number;
  hotelNome: string;
  hotels: { id: number; nome: string }[];
  /** Nome del ruolo nell'hotel attivo ("Superadmin" per il gestore della piattaforma). */
  ruoloNome: string;
  /** Permessi effettivi nell'hotel attivo (implicazioni applicate, moduli spenti esclusi). */
  permessi: Permesso[];
  /** Moduli opzionali attivi nell'hotel attivo. */
  moduli: Modulo[];
  /** Tipologia della struttura (nomi delle unità) e funzioni del nucleo spente. */
  tipologia: string;
  funzioniSpente: Funzione[];
};

/**
 * Utente loggato, o null. Non reindirizza: usarla dove l'assenza di sessione è un caso normale.
 * Chi deve ancora cambiare la password temporanea non conta come loggato (solo la pagina
 * /cambia-password lo vede, con utenteDaCambiarePassword).
 */
export async function getUtenteCorrente(): Promise<UtenteSessione | null> {
  const u = await caricaUtente();
  return u && !u.obbligo ? u.utente : null;
}

/** Utente con la sessione valida che deve cambiare la password prima di fare altro, o null. */
export async function utenteDaCambiarePassword() {
  const u = await caricaUtente();
  return u?.obbligo === "password" ? u.utente : null;
}

/** Utente con la sessione valida che deve attivare la verifica in due passaggi prima di fare altro, o null. */
export async function utenteDaAttivareVerifica() {
  const u = await caricaUtente();
  return u?.obbligo === "verifica" ? u.utente : null;
}

/** Cosa deve fare l'utente prima di usare il programma: cambiare la password temporanea o attivare la verifica. */
type Obbligo = "password" | "verifica" | null;

async function caricaUtente(): Promise<{ utente: UtenteSessione; obbligo: Obbligo } | null> {
  const sessione = await leggiSessioneDaCookie();
  if (!sessione) return null;

  const utente = await prisma.utente.findUnique({
    where: { id: sessione.utenteId },
    include: {
      accessi: { include: { hotel: { select: { id: true, nome: true, attivo: true } }, ruolo: true, ruoliAggiuntivi: { include: { ruolo: true } } } },
    },
  });
  if (!utente || !utente.attivo) return null;
  // Sessione di prima di un cambio password o di un'uscita da tutti i dispositivi.
  if (utente.versioneSessione !== sessione.versione) return null;

  const hotels = await hotelAccessibili(utente);
  if (hotels.length === 0) return null;

  // L'hotel attivo nel cookie non è più tra quelli dell'utente (es. accesso revocato
  // dopo il login): si ripiega silenziosamente sul primo disponibile.
  const hotelAttivo = hotels.find((h) => h.id === sessione.hotelId) ?? hotels[0];
  const accesso = utente.accessi.find((a) => a.hotelId === hotelAttivo.id);
  const hotelDati = await prisma.hotel.findUnique({ where: { id: hotelAttivo.id }, select: { moduli: true, modalitaUtenti: true, tipologia: true, funzioniSpente: true } });
  const titolare = hotelDati?.modalitaUtenti === "titolare";
  const ruoli = accesso ? [accesso.ruolo, ...accesso.ruoliAggiuntivi.map((x) => x.ruolo)] : [];
  const moduli = moduliAttivi(hotelDati?.moduli);

  const dati: UtenteSessione = {
    id: utente.id,
    nome: utente.nome,
    email: utente.email,
    superAdmin: utente.superAdmin,
    hotelId: hotelAttivo.id,
    hotelNome: hotelAttivo.nome,
    hotels,
    ruoloNome: utente.superAdmin ? "Superadmin" : titolare ? "Titolare" : ruoli.map((r) => r.nome).join(" + "),
    permessi: filtraPerModuli(
      utente.superAdmin ? TUTTI_I_PERMESSI : accesso ? permessiAccesso(hotelDati?.modalitaUtenti ?? "ruoli", ruoli.map((r) => r.permessi)) : [],
      moduli,
    ),
    moduli,
    tipologia: hotelDati?.tipologia ?? "albergo",
    funzioniSpente: funzioniSpente(hotelDati?.funzioniSpente),
  };
  const obbligo: Obbligo = utente.cambioPasswordObbligatorio ? "password" : sessione.attivaVerifica && !utente.totpAttivoIl ? "verifica" : null;
  return { utente: dati, obbligo };
}

export function puo(utente: Pick<UtenteSessione, "permessi">, permesso: Permesso) {
  return utente.permessi.includes(permesso);
}

/** Come getUtenteCorrente, ma manda a /login se non c'è sessione — da usare in cima alle pagine protette. */
export async function richiediUtente(): Promise<UtenteSessione> {
  const u = await caricaUtente();
  if (!u) redirect("/login");
  // Password temporanea: prima di tutto va cambiata; poi, se obbligatoria, si attiva la verifica in due passaggi.
  if (u.obbligo === "password") redirect("/cambia-password");
  if (u.obbligo === "verifica") redirect("/attiva-verifica");
  return u.utente;
}

/**
 * Come richiediUtente, ma in più verifica un permesso nell'hotel attivo. Senza permesso si torna
 * alla home, che per chi non vede nemmeno le prenotazioni mostra un messaggio invece di rimandare
 * di nuovo altrove (niente redirect in loop).
 */
export async function richiediPermesso(permesso: Permesso | Permesso[]): Promise<UtenteSessione> {
  const utente = await richiediUtente();
  // Con un elenco basta uno dei permessi.
  if (![permesso].flat().some((p) => puo(utente, p))) redirect("/");
  return utente;
}

/** Pagine e azioni della sezione Piattaforma: solo il gestore della piattaforma. */
export async function richiediSuperAdmin(): Promise<UtenteSessione> {
  const utente = await richiediUtente();
  if (!utente.superAdmin) redirect("/");
  return utente;
}
