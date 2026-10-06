/**
 * Consegne fra turni: il turno che smonta lascia note a chi entra. Ogni collega le vede in evidenza
 * finché non le segna come lette (resta chi le ha lette e quando); si chiudono quando sono risolte.
 */
import { prisma } from "@/lib/prisma";
import { GIORNI_CONSEGNA_IN_EVIDENZA, validaTesto } from "@/lib/reclamiRegole";

type Utente = { id: number; nome: string };
const giorniFa = (n: number) => new Date(Date.now() - n * 86400000);

export async function creaConsegna(hotelId: number, testo: string, importante: boolean, utente: Utente) {
  validaTesto(testo, "la consegna");
  const c = await prisma.consegnaTurno.create({ data: { hotelId, testo: testo.trim(), importante, creataDa: utente.nome, creataDaId: utente.id } });
  return c.id;
}

/** Quante consegne recenti e aperte, scritte da altri, questo utente non ha ancora letto (avviso in cima all'app). */
export async function consegneDaLeggere(hotelId: number, utenteId: number) {
  return prisma.consegnaTurno.count({
    where: { hotelId, chiusaIl: null, creataDaId: { not: utenteId }, creataIl: { gte: giorniFa(GIORNI_CONSEGNA_IN_EVIDENZA) }, letture: { none: { utenteId } } },
  });
}

export async function elencoConsegne(hotelId: number, utenteId: number) {
  const r = await prisma.consegnaTurno.findMany({
    where: { hotelId, OR: [{ chiusaIl: null }, { chiusaIl: { gte: giorniFa(7) } }] },
    include: { letture: { orderBy: { lettaIl: "asc" } } },
    orderBy: [{ creataIl: "desc" }],
  });
  const voce = (c: (typeof r)[number]) => ({
    id: c.id,
    testo: c.testo,
    importante: c.importante,
    creataIl: c.creataIl.toISOString(),
    creataDa: c.creataDa,
    mia: c.creataDaId === utenteId,
    lettaDaMe: c.letture.some((l) => l.utenteId === utenteId),
    letture: c.letture.map((l) => ({ nome: l.nome, lettaIl: l.lettaIl.toISOString() })),
    chiusaIl: c.chiusaIl?.toISOString() ?? null,
    chiusaDa: c.chiusaDa,
  });
  return {
    aperte: r.filter((c) => !c.chiusaIl).sort((a, b) => Number(b.importante) - Number(a.importante) || b.creataIl.getTime() - a.creataIl.getTime()).map(voce),
    chiuse: r.filter((c) => c.chiusaIl).map(voce),
  };
}

export async function segnaConsegnaLetta(hotelId: number, id: number, utente: Utente) {
  const c = await prisma.consegnaTurno.findFirst({ where: { id, hotelId }, select: { id: true } });
  if (!c) throw new Error("Consegna non trovata.");
  await prisma.letturaConsegna.upsert({ where: { consegnaId_utenteId: { consegnaId: id, utenteId: utente.id } }, create: { consegnaId: id, utenteId: utente.id, nome: utente.nome }, update: {} });
}

/** Chiusa = risolta: non serve più passarla al turno dopo. */
export async function chiudiConsegna(hotelId: number, id: number, utente: Utente) {
  const n = await prisma.consegnaTurno.updateMany({ where: { id, hotelId, chiusaIl: null }, data: { chiusaIl: new Date(), chiusaDa: utente.nome } });
  if (n.count === 0) throw new Error("Consegna non trovata o già chiusa.");
}
