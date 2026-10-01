import { prisma } from "@/lib/prisma";

/**
 * Calendario di chiusura della struttura (es. chiusura invernale). Serve all'ISTAT: nei giorni di
 * chiusura si comunica "chiuso" con camere e letti a zero. Date incluse entrambe.
 */
export async function elencoChiusure(hotelId: number) {
  const r = await prisma.periodoChiusura.findMany({ where: { hotelId }, orderBy: { dal: "desc" } });
  return r.map((c) => ({ id: c.id, dal: c.dal.toISOString().slice(0, 10), al: c.al.toISOString().slice(0, 10), nota: c.nota ?? "" }));
}

export async function aggiungiChiusura(hotelId: number, d: { dal: string; al: string; nota: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.dal) || !/^\d{4}-\d{2}-\d{2}$/.test(d.al)) throw new Error("Indica le date di inizio e fine della chiusura.");
  if (d.al < d.dal) throw new Error("La fine della chiusura deve essere uguale o successiva all'inizio.");
  const dal = new Date(`${d.dal}T00:00:00Z`);
  const al = new Date(`${d.al}T00:00:00Z`);
  const sovrapposta = await prisma.periodoChiusura.findFirst({ where: { hotelId, dal: { lte: al }, al: { gte: dal } } });
  if (sovrapposta) throw new Error("Il periodo si sovrappone a una chiusura già inserita: modifica quella.");
  // Ospiti presenti in quei giorni: la chiusura non avrebbe senso (e l'ISTAT segnalerebbe un errore).
  const occupata = await prisma.segmentoSoggiorno.findFirst({
    where: { prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, stato: { not: "ANNULLATO" }, dataInizio: { lte: al }, dataFine: { gt: dal } },
    include: { prenotazione: true },
  });
  if (occupata) throw new Error(`Nel periodo ci sono camere prenotate (prenotazione ${occupata.prenotazioneId}): spostale o annullale prima.`);
  await prisma.periodoChiusura.create({ data: { hotelId, dal, al, nota: d.nota.trim() || null } });
  return elencoChiusure(hotelId);
}

export async function eliminaChiusura(hotelId: number, id: number) {
  await prisma.periodoChiusura.deleteMany({ where: { id, hotelId } });
  return elencoChiusure(hotelId);
}
