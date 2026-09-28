import { prisma } from "@/lib/prisma";
import type { UtenteSessione } from "@/lib/auth";
import { permessiEffettivi, RUOLI_PREDEFINITI, type Permesso } from "@/lib/permessi";
import { conservaGestoreUtenti, contenutoIn, verificaPuoConcedere } from "@/lib/utenti";

export async function elencoRuoli(hotelId: number) {
  const ruoli = await prisma.ruolo.findMany({
    where: { hotelId },
    include: { _count: { select: { accessi: { where: { utente: { superAdmin: false } } } } } },
    orderBy: { nome: "asc" },
  });
  return ruoli.map((r) => ({ id: r.id, nome: r.nome, permessi: permessiEffettivi(r.permessi), utenti: r._count.accessi }));
}

/** Ruoli predefiniti di un hotel appena creato (i nomi già presenti vengono lasciati come sono). */
export async function creaRuoliPredefiniti(hotelId: number) {
  for (const r of RUOLI_PREDEFINITI) {
    await prisma.ruolo.upsert({
      where: { hotelId_nome: { hotelId, nome: r.nome } },
      update: {},
      create: { hotelId, nome: r.nome, permessi: r.permessi },
    });
  }
}

/** Ruolo dell'hotel attivo che chi opera può modificare (non uno con più permessi dei suoi). */
async function ruoloModificabile(chi: UtenteSessione, ruoloId: number) {
  const ruolo = await prisma.ruolo.findFirst({ where: { id: ruoloId, hotelId: chi.hotelId } });
  if (!ruolo) throw new Error("Ruolo non trovato in questo hotel.");
  if (!chi.superAdmin && !contenutoIn(permessiEffettivi(ruolo.permessi), chi.permessi)) {
    throw new Error("Non puoi modificare un ruolo con più permessi dei tuoi.");
  }
  return ruolo;
}

function nomeValido(nome: string) {
  const n = nome.trim();
  if (!n) throw new Error("Indica il nome del ruolo.");
  return n;
}

export async function creaRuolo(chi: UtenteSessione, nome: string, permessi: Permesso[]) {
  verificaPuoConcedere(chi, permessi);
  await prisma.ruolo.create({ data: { hotelId: chi.hotelId, nome: nomeValido(nome), permessi: permessiEffettivi(permessi) } });
}

export async function rinominaRuolo(chi: UtenteSessione, ruoloId: number, nome: string) {
  await ruoloModificabile(chi, ruoloId);
  await prisma.ruolo.update({ where: { id: ruoloId }, data: { nome: nomeValido(nome) } });
}

export async function impostaPermessiRuolo(chi: UtenteSessione, ruoloId: number, permessi: Permesso[]) {
  await ruoloModificabile(chi, ruoloId);
  verificaPuoConcedere(chi, permessi);
  await conservaGestoreUtenti(chi.hotelId, (tx) =>
    tx.ruolo.update({ where: { id: ruoloId }, data: { permessi: permessiEffettivi(permessi) } }),
  );
}

export async function eliminaRuolo(chi: UtenteSessione, ruoloId: number) {
  await ruoloModificabile(chi, ruoloId);
  const inUso = await prisma.utenteHotel.count({ where: { ruoloId, utente: { superAdmin: false } } });
  if (inUso > 0) throw new Error(`Ruolo assegnato a ${inUso} ${inUso === 1 ? "utente" : "utenti"}: cambia prima il loro ruolo.`);
  // Un superadmin può avere righe di accesso ereditate (non gli servono: vede tutto comunque).
  await prisma.$transaction([
    prisma.utenteHotel.deleteMany({ where: { ruoloId } }),
    prisma.ruolo.delete({ where: { id: ruoloId } }),
  ]);
}
