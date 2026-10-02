import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { filtraPerModuli, permessiAccesso, TUTTI_I_PERMESSI, type Permesso } from "@/lib/permessi";
import { moduliAttivi, type Modulo } from "@/lib/moduli";

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
async function firmaSessione(utenteId: number, hotelId: number) {
  const token = await new SignJWT({ sub: String(utenteId), hotelId })
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

/** Da chiamare al login: sceglie il primo hotel accessibile come hotel attivo iniziale. */
export async function creaSessione(utenteId: number) {
  const utente = await prisma.utente.findUniqueOrThrow({
    where: { id: utenteId },
    include: { accessi: { include: { hotel: { select: { id: true, nome: true, attivo: true } } } } },
  });
  const hotels = await hotelAccessibili(utente);
  if (hotels.length === 0) {
    throw new Error(`L'utente ${utente.email} non è associato a nessun hotel.`);
  }
  await firmaSessione(utenteId, hotels[0].id);
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

  await firmaSessione(sessione.utenteId, nuovoHotelId);
}

export async function distruggiSessione() {
  const store = await cookies();
  store.delete(COOKIE_SESSIONE);
}

async function leggiSessioneDaCookie(): Promise<{ utenteId: number; hotelId: number } | null> {
  const store = await cookies();
  const token = store.get(COOKIE_SESSIONE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chiaveSegreta());
    if (!payload.sub || typeof payload.hotelId !== "number") return null;
    return { utenteId: Number(payload.sub), hotelId: payload.hotelId };
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
};

/** Utente loggato, o null. Non reindirizza: usarla dove l'assenza di sessione è un caso normale. */
export async function getUtenteCorrente(): Promise<UtenteSessione | null> {
  const sessione = await leggiSessioneDaCookie();
  if (!sessione) return null;

  const utente = await prisma.utente.findUnique({
    where: { id: sessione.utenteId },
    include: {
      accessi: { include: { hotel: { select: { id: true, nome: true, attivo: true } }, ruolo: true, ruoliAggiuntivi: { include: { ruolo: true } } } },
    },
  });
  if (!utente || !utente.attivo) return null;

  const hotels = await hotelAccessibili(utente);
  if (hotels.length === 0) return null;

  // L'hotel attivo nel cookie non è più tra quelli dell'utente (es. accesso revocato
  // dopo il login): si ripiega silenziosamente sul primo disponibile.
  const hotelAttivo = hotels.find((h) => h.id === sessione.hotelId) ?? hotels[0];
  const accesso = utente.accessi.find((a) => a.hotelId === hotelAttivo.id);
  const hotelDati = await prisma.hotel.findUnique({ where: { id: hotelAttivo.id }, select: { moduli: true, modalitaUtenti: true } });
  const titolare = hotelDati?.modalitaUtenti === "titolare";
  const ruoli = accesso ? [accesso.ruolo, ...accesso.ruoliAggiuntivi.map((x) => x.ruolo)] : [];
  const moduli = moduliAttivi(hotelDati?.moduli);

  return {
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
  };
}

export function puo(utente: Pick<UtenteSessione, "permessi">, permesso: Permesso) {
  return utente.permessi.includes(permesso);
}

/** Come getUtenteCorrente, ma manda a /login se non c'è sessione — da usare in cima alle pagine protette. */
export async function richiediUtente(): Promise<UtenteSessione> {
  const utente = await getUtenteCorrente();
  if (!utente) redirect("/login");
  return utente;
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
