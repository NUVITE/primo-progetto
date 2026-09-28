import { prisma } from "@/lib/prisma";
import type { RuoloUtente } from "@/generated/prisma/enums";

/**
 * Un amministratore vede e gestisce solo gli utenti che condividono almeno un hotel con lui,
 * e può assegnare/togliere solo gli hotel che lui stesso amministra — non può toccare l'accesso
 * a un hotel che non è tra i suoi, anche se in teoria esistesse (evita scalate di privilegio).
 */
export async function datiGestioneUtenti(hotelIdsAmmin: number[]) {
  const utenti = await prisma.utente.findMany({
    where: { hotels: { some: { id: { in: hotelIdsAmmin } } } },
    include: { hotels: { select: { id: true, nome: true } } },
    orderBy: { nome: "asc" },
  });
  const hotels = await prisma.hotel.findMany({ where: { id: { in: hotelIdsAmmin } }, select: { id: true, nome: true } });
  return { utenti, hotelsGestibili: hotels };
}

export async function creaUtente(
  hotelIdsAmmin: number[],
  input: { nome: string; email: string; password: string; ruolo: RuoloUtente; hotelIds: number[] }
) {
  const bcrypt = await import("bcryptjs");
  const hotelIds = input.hotelIds.filter((id) => hotelIdsAmmin.includes(id));
  if (hotelIds.length === 0) {
    throw new Error("Seleziona almeno un hotel tra quelli che amministri.");
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.utente.create({
    data: {
      nome: input.nome,
      email: input.email,
      passwordHash,
      ruolo: input.ruolo,
      hotels: { connect: hotelIds.map((id) => ({ id })) },
    },
  });
}

export async function impostaRuoloUtente(hotelIdsAmmin: number[], utenteId: number, ruolo: RuoloUtente) {
  await verificaUtenteGestibile(hotelIdsAmmin, utenteId);
  return prisma.utente.update({ where: { id: utenteId }, data: { ruolo } });
}

export async function impostaAttivoUtente(hotelIdsAmmin: number[], utenteId: number, attivo: boolean) {
  await verificaUtenteGestibile(hotelIdsAmmin, utenteId);
  return prisma.utente.update({ where: { id: utenteId }, data: { attivo } });
}

/** Aggiunge o toglie l'accesso di un utente a UNO degli hotel amministrati da chi chiama. */
export async function impostaAccessoHotel(hotelIdsAmmin: number[], utenteId: number, hotelId: number, concesso: boolean) {
  await verificaUtenteGestibile(hotelIdsAmmin, utenteId);
  if (!hotelIdsAmmin.includes(hotelId)) {
    throw new Error("Non amministri questo hotel.");
  }
  return prisma.utente.update({
    where: { id: utenteId },
    data: { hotels: concesso ? { connect: { id: hotelId } } : { disconnect: { id: hotelId } } },
  });
}

async function verificaUtenteGestibile(hotelIdsAmmin: number[], utenteId: number) {
  const utente = await prisma.utente.findFirst({
    where: { id: utenteId, hotels: { some: { id: { in: hotelIdsAmmin } } } },
  });
  if (!utente) throw new Error("Utente non gestibile.");
  return utente;
}
