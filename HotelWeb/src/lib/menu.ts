import { prisma } from "@/lib/prisma";
import { ORDINE_CATEGORIE, validaPiatto, validaTestataMenu, type PiattoInput, type TestataMenu } from "@/lib/menuRegole";
import type { Pasto } from "@/lib/pastiRegole";

/** Piatti e menu della ristorazione (regole pure in menuRegole.ts). */

const giorno = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

// ---------------- Piatti ----------------

export async function elencoPiatti(hotelId: number, soloAttivi = false) {
  const piatti = await prisma.piatto.findMany({
    where: { hotelId, ...(soloAttivi ? { attivo: true } : {}) },
    include: { reparto: true, _count: { select: { voci: true } } },
    orderBy: { nome: "asc" },
  });
  return piatti
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      descrizione: p.descrizione ?? "",
      categoria: p.categoria,
      prezzo: num(p.prezzo),
      repartoId: p.repartoId,
      reparto: p.reparto?.nome ?? null,
      allergeni: (p.allergeni as string[]) ?? [],
      senzaAllergeni: p.senzaAllergeni,
      regimi: (p.regimi as string[]) ?? [],
      attivo: p.attivo,
      nelMenu: p._count.voci,
    }))
    .sort((a, b) => ORDINE_CATEGORIE.indexOf(a.categoria as never) - ORDINE_CATEGORIE.indexOf(b.categoria as never) || a.nome.localeCompare(b.nome, "it"));
}

export async function salvaPiatto(hotelId: number, id: number | null, d: PiattoInput) {
  const v = validaPiatto(d);
  if (v.repartoId !== null) {
    const r = await prisma.repartoAddebito.findFirst({ where: { id: v.repartoId, hotelId } });
    if (!r || r.esborso) throw new Error("Reparto non valido.");
  }
  const doppio = await prisma.piatto.findFirst({ where: { hotelId, nome: v.nome, ...(id ? { id: { not: id } } : {}) } });
  if (doppio) throw new Error(`Esiste già un piatto «${v.nome}».`);
  if (id) {
    await prisma.piatto.findFirstOrThrow({ where: { id, hotelId } });
    await prisma.piatto.update({ where: { id }, data: v });
  } else {
    await prisma.piatto.create({ data: { hotelId, ...v } });
  }
}

/** Un piatto usato in un menu non si cancella: si disattiva (o si toglie prima dai menu). */
export async function eliminaPiatto(hotelId: number, id: number) {
  const p = await prisma.piatto.findFirstOrThrow({ where: { id, hotelId }, include: { _count: { select: { voci: true } } } });
  if (p._count.voci) throw new Error("Il piatto è in uno o più menu: toglilo dai menu oppure disattivalo.");
  await prisma.piatto.delete({ where: { id } });
}

// ---------------- Menu ----------------

export async function elencoMenu(hotelId: number) {
  const menu = await prisma.menu.findMany({ where: { hotelId }, include: { _count: { select: { voci: true } } }, orderBy: [{ attivo: "desc" }, { giorno: "desc" }, { nome: "asc" }] });
  return menu.map((m) => ({
    id: m.id,
    nome: m.nome,
    pasti: (m.pasti as Pasto[]) ?? [],
    giorno: giorno(m.giorno),
    dalle: m.dalle ?? "",
    alle: m.alle ?? "",
    roomService: m.roomService,
    attivo: m.attivo,
    piatti: m._count.voci,
  }));
}

export async function dettaglioMenu(hotelId: number, id: number) {
  const m = await prisma.menu.findFirstOrThrow({
    where: { id, hotelId },
    include: { voci: { include: { piatto: true }, orderBy: [{ ordine: "asc" }, { id: "asc" }] } },
  });
  return {
    id: m.id,
    nome: m.nome,
    pasti: (m.pasti as Pasto[]) ?? [],
    giorno: giorno(m.giorno),
    dalle: m.dalle ?? "",
    alle: m.alle ?? "",
    roomService: m.roomService,
    attivo: m.attivo,
    note: m.note ?? "",
    voci: m.voci.map((v) => ({
      id: v.id,
      piattoId: v.piattoId,
      nome: v.piatto.nome,
      descrizione: v.piatto.descrizione ?? "",
      categoria: v.piatto.categoria,
      allergeni: (v.piatto.allergeni as string[]) ?? [],
      regimi: (v.piatto.regimi as string[]) ?? [],
      piattoAttivo: v.piatto.attivo,
      disponibile: v.disponibile,
      prezzoPiatto: num(v.piatto.prezzo),
      prezzo: num(v.prezzo),
    })),
  };
}

export async function salvaMenu(hotelId: number, id: number | null, d: TestataMenu) {
  const v = validaTestataMenu(d);
  const dati = { ...v, giorno: v.giorno ? new Date(v.giorno) : null };
  if (id) {
    await prisma.menu.findFirstOrThrow({ where: { id, hotelId } });
    await prisma.menu.update({ where: { id }, data: dati });
    return id;
  }
  return (await prisma.menu.create({ data: { hotelId, ...dati } })).id;
}

export async function eliminaMenu(hotelId: number, id: number) {
  await prisma.menu.findFirstOrThrow({ where: { id, hotelId } });
  await prisma.menu.delete({ where: { id } });
}

/** Copia un menu (es. il menu del giorno di oggi per domani), con le stesse voci. */
export async function duplicaMenu(hotelId: number, id: number, nome: string, giornoNuovo: string | null) {
  const m = await prisma.menu.findFirstOrThrow({ where: { id, hotelId }, include: { voci: true } });
  const v = validaTestataMenu({
    nome,
    pasti: (m.pasti as Pasto[]) ?? [],
    giorno: giornoNuovo,
    dalle: m.dalle ?? "",
    alle: m.alle ?? "",
    roomService: m.roomService,
    attivo: m.attivo,
    note: m.note ?? "",
  });
  const nuovo = await prisma.menu.create({
    data: {
      hotelId,
      ...v,
      giorno: v.giorno ? new Date(v.giorno) : null,
      voci: { create: m.voci.map((x) => ({ piattoId: x.piattoId, ordine: x.ordine, disponibile: true, prezzo: x.prezzo })) },
    },
  });
  return nuovo.id;
}

async function menuDelHotel(hotelId: number, menuId: number) {
  return prisma.menu.findFirstOrThrow({ where: { id: menuId, hotelId } });
}

export async function aggiungiPiattoAlMenu(hotelId: number, menuId: number, piattoId: number) {
  await menuDelHotel(hotelId, menuId);
  await prisma.piatto.findFirstOrThrow({ where: { id: piattoId, hotelId } });
  if (await prisma.voceMenu.findUnique({ where: { menuId_piattoId: { menuId, piattoId } } })) throw new Error("Il piatto è già nel menu.");
  const ultimo = await prisma.voceMenu.aggregate({ where: { menuId }, _max: { ordine: true } });
  await prisma.voceMenu.create({ data: { menuId, piattoId, ordine: (ultimo._max.ordine ?? 0) + 1 } });
}

export async function togliVoce(hotelId: number, menuId: number, voceId: number) {
  await menuDelHotel(hotelId, menuId);
  await prisma.voceMenu.deleteMany({ where: { id: voceId, menuId } });
}

/** Disponibile (es. finito: "non disponibile") e prezzo nel menu (null = quello del piatto). */
export async function impostaVoce(hotelId: number, menuId: number, voceId: number, d: { disponibile: boolean; prezzo: number | null }) {
  await menuDelHotel(hotelId, menuId);
  if (d.prezzo !== null && !(d.prezzo >= 0)) throw new Error("Prezzo non valido.");
  await prisma.voceMenu.updateMany({ where: { id: voceId, menuId }, data: { disponibile: d.disponibile, prezzo: d.prezzo } });
}

export async function spostaVoce(hotelId: number, menuId: number, voceId: number, direzione: -1 | 1) {
  await menuDelHotel(hotelId, menuId);
  const voci = await prisma.voceMenu.findMany({ where: { menuId }, orderBy: [{ ordine: "asc" }, { id: "asc" }] });
  const i = voci.findIndex((v) => v.id === voceId);
  const j = i + direzione;
  if (i < 0 || j < 0 || j >= voci.length) return;
  [voci[i], voci[j]] = [voci[j], voci[i]];
  await prisma.$transaction(voci.map((v, k) => prisma.voceMenu.update({ where: { id: v.id }, data: { ordine: k + 1 } })));
}

/** Piatti disponibili nei menu attivi di quel servizio e quel giorno (per i piatti da evitare). */
export async function piattiDelServizio(hotelId: number, g: string, pasto: Pasto) {
  const menu = await prisma.menu.findMany({
    where: { hotelId, attivo: true, OR: [{ giorno: null }, { giorno: new Date(g) }] },
    include: { voci: { where: { disponibile: true }, include: { piatto: true } } },
  });
  const piatti = new Map<number, { nome: string; allergeni: string[] }>();
  for (const m of menu) {
    if (!((m.pasti as string[]) ?? []).includes(pasto)) continue;
    for (const v of m.voci) if (v.piatto.attivo) piatti.set(v.piattoId, { nome: v.piatto.nome, allergeni: (v.piatto.allergeni as string[]) ?? [] });
  }
  return [...piatti.values()];
}
