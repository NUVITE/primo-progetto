import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { descriviPolitica, validaPolitica, type DatiPolitica, type Penale, type PoliticaCopiata, type Scaglione } from "@/lib/politicheRegole";

export * from "@/lib/politicheRegole";

type Db = PrismaClient | Prisma.TransactionClient;

/** Politiche di cancellazione dell'hotel: anagrafica e scelta per una nuova prenotazione (regole in politicheRegole.ts). */

const leggi = (p: { id: number; nome: string; scaglioni: unknown; noShow: unknown }): PoliticaCopiata => ({
  id: p.id,
  nome: p.nome,
  scaglioni: p.scaglioni as Scaglione[],
  noShow: p.noShow as Penale,
});

// ---------------- Anagrafica ----------------

export async function elencoPolitiche(hotelId: number) {
  const r = await prisma.politicaCancellazione.findMany({ where: { hotelId, attiva: true }, orderBy: [{ predefinita: "desc" }, { nome: "asc" }] });
  return r.map((p) => ({ ...leggi(p), predefinita: p.predefinita, descrizione: descriviPolitica(leggi(p)) }));
}

export async function salvaPolitica(hotelId: number, id: number | null, d: DatiPolitica) {
  const v = validaPolitica(d);
  const dati = { nome: v.nome, scaglioni: v.scaglioni as unknown as Prisma.InputJsonValue, noShow: v.noShow as unknown as Prisma.InputJsonValue };
  if (id) {
    await prisma.politicaCancellazione.findFirstOrThrow({ where: { id, hotelId, attiva: true } });
    await prisma.politicaCancellazione.update({ where: { id }, data: dati });
  } else {
    const prima = (await prisma.politicaCancellazione.count({ where: { hotelId, attiva: true } })) === 0;
    await prisma.politicaCancellazione.create({ data: { hotelId, ...dati, predefinita: prima } });
  }
  return elencoPolitiche(hotelId);
}

/** Si disattiva (le prenotazioni ne conservano la copia); i listini che la usavano tornano alla predefinita. */
export async function eliminaPolitica(hotelId: number, id: number) {
  const p = await prisma.politicaCancellazione.findFirstOrThrow({ where: { id, hotelId, attiva: true } });
  await prisma.$transaction([
    prisma.listino.updateMany({ where: { politicaId: id }, data: { politicaId: null } }),
    prisma.politicaCancellazione.update({ where: { id }, data: { attiva: false, predefinita: false } }),
  ]);
  if (p.predefinita) {
    const altra = await prisma.politicaCancellazione.findFirst({ where: { hotelId, attiva: true }, orderBy: { id: "asc" } });
    if (altra) await prisma.politicaCancellazione.update({ where: { id: altra.id }, data: { predefinita: true } });
  }
  return elencoPolitiche(hotelId);
}

export async function impostaPredefinita(hotelId: number, id: number) {
  await prisma.politicaCancellazione.findFirstOrThrow({ where: { id, hotelId, attiva: true } });
  await prisma.$transaction([
    prisma.politicaCancellazione.updateMany({ where: { hotelId }, data: { predefinita: false } }),
    prisma.politicaCancellazione.update({ where: { id }, data: { predefinita: true } }),
  ]);
  return elencoPolitiche(hotelId);
}

/** Politica da applicare a una nuova prenotazione: quella del listino, altrimenti la predefinita. */
export async function politicaPer(db: Db, hotelId: number, listinoId: number | null) {
  const listino = listinoId ? await db.listino.findFirst({ where: { id: listinoId, hotelId }, include: { politica: true } }) : null;
  const p =
    listino?.politica && listino.politica.attiva
      ? listino.politica
      : await db.politicaCancellazione.findFirst({ where: { hotelId, attiva: true, predefinita: true } });
  return p ? leggi(p) : null;
}

