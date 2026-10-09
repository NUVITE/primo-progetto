import { prisma } from "@/lib/prisma";
import { permessiAccesso, type Permesso } from "@/lib/permessi";

/** Utenti attivi dell'hotel che hanno un permesso (ruolo principale + ruoli in più, o titolare). */
export async function utentiConPermesso(hotelId: number, permesso: Permesso) {
  const [hotel, accessi] = await Promise.all([
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { modalitaUtenti: true } }),
    prisma.utenteHotel.findMany({ where: { hotelId, utente: { attivo: true } }, include: { utente: true, ruolo: true, ruoliAggiuntivi: { include: { ruolo: true } } } }),
  ]);
  return accessi
    .filter((a) => permessiAccesso(hotel.modalitaUtenti, [a.ruolo.permessi, ...a.ruoliAggiuntivi.map((r) => r.ruolo.permessi)]).includes(permesso))
    .map((a) => ({ id: a.utenteId, nome: a.utente.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}
