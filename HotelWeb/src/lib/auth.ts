import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { RuoloUtente } from "@/generated/prisma/enums";

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

/** Da chiamare al login: sceglie il primo hotel dell'utente come hotel attivo iniziale. */
export async function creaSessione(utenteId: number) {
  const utente = await prisma.utente.findUniqueOrThrow({
    where: { id: utenteId },
    include: { hotels: true },
  });
  if (utente.hotels.length === 0) {
    throw new Error(`L'utente ${utente.email} non è associato a nessun hotel.`);
  }
  await firmaSessione(utenteId, utente.hotels[0].id);
}

/** Cambia l'hotel attivo di un account con accesso a più strutture, senza rifare login. */
export async function cambiaHotelAttivo(nuovoHotelId: number) {
  const sessione = await leggiSessioneDaCookie();
  if (!sessione) redirect("/login");

  const haAccesso = await prisma.utente.findFirst({
    where: { id: sessione.utenteId, hotels: { some: { id: nuovoHotelId } } },
  });
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
  ruolo: RuoloUtente;
  hotelId: number;
  hotelNome: string;
  hotels: { id: number; nome: string }[];
};

/** Utente loggato, o null. Non reindirizza: usarla dove l'assenza di sessione è un caso normale. */
export async function getUtenteCorrente(): Promise<UtenteSessione | null> {
  const sessione = await leggiSessioneDaCookie();
  if (!sessione) return null;

  const utente = await prisma.utente.findUnique({
    where: { id: sessione.utenteId },
    include: { hotels: true },
  });
  if (!utente || !utente.attivo || utente.hotels.length === 0) return null;

  // L'hotel attivo nel cookie non è più tra quelli dell'utente (es. accesso revocato
  // dopo il login): si ripiega silenziosamente sul primo disponibile.
  const hotelAttivo = utente.hotels.find((h) => h.id === sessione.hotelId) ?? utente.hotels[0];

  return {
    id: utente.id,
    nome: utente.nome,
    email: utente.email,
    ruolo: utente.ruolo,
    hotelId: hotelAttivo.id,
    hotelNome: hotelAttivo.nome,
    hotels: utente.hotels.map((h) => ({ id: h.id, nome: h.nome })),
  };
}

/** Come getUtenteCorrente, ma manda a /login se non c'è sessione — da usare in cima alle pagine protette. */
export async function richiediUtente(): Promise<UtenteSessione> {
  const utente = await getUtenteCorrente();
  if (!utente) redirect("/login");
  return utente;
}

/** Come richiediUtente, ma in piu' verifica il ruolo — pagine riservate (es. gestione camere/utenti). */
export async function richiediRuolo(ruoli: RuoloUtente[]): Promise<UtenteSessione> {
  const utente = await richiediUtente();
  if (!ruoli.includes(utente.ruolo)) redirect("/");
  return utente;
}
