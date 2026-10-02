"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { elencoReparti, salvaReparto } from "@/lib/conto";

/** Reparti e aliquote IVA: li configura chi configura l'hotel. */
export async function datiReparti() {
  const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
  const [reparti, hotel] = await Promise.all([elencoReparti(u.hotelId), prisma.hotel.findUniqueOrThrow({ where: { id: u.hotelId }, select: { aliquotaAlloggio: true } })]);
  return { reparti, aliquotaAlloggio: Number(hotel.aliquotaAlloggio) };
}

export async function azioneSalvaReparto(id: number | null, d: { nome: string; aliquotaIva: number | null; esborso: boolean; attivo: boolean }) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    await salvaReparto(u.hotelId, id, d);
    return datiReparti();
  });
}

/** IVA di camere, trattamenti e uso diurno: vale per i conti da qui in avanti (anche quelli aperti). */
export async function azioneAliquotaAlloggio(aliquota: number) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
    if (!(aliquota >= 0 && aliquota <= 100)) throw new Error("Aliquota non valida.");
    await prisma.hotel.update({ where: { id: u.hotelId }, data: { aliquotaAlloggio: aliquota } });
    return datiReparti();
  });
}
