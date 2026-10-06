/** Funzioni del nucleo spente per una struttura (si salvano le spente: vuoto = tutto acceso). */
import { prisma } from "@/lib/prisma";
import { FUNZIONI, funzioniSpente, type Funzione } from "@/lib/funzioniRegole";

export async function funzioniDellaStruttura(hotelId: number) {
  const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { funzioniSpente: true } });
  return funzioniSpente(h.funzioniSpente);
}

export async function impostaFunzioniSpente(hotelId: number, spente: string[]) {
  const pulite = [...new Set(spente)];
  if (pulite.some((f) => !(f in FUNZIONI))) throw new Error("Funzione non prevista.");
  await prisma.hotel.update({ where: { id: hotelId }, data: { funzioniSpente: pulite as Funzione[] } });
  return funzioniDellaStruttura(hotelId);
}
