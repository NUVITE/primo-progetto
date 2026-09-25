import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Motore unico di calcolo prezzo per notte. Va richiamato da ogni punto che
 * deve conoscere un prezzo (creazione segmento, estensione, report) — mai
 * ricalcolato con una copia locale della logica (era il problema del
 * sistema legacy: calcola_listino duplicata in 3 punti diversi).
 */
export async function trovaPrezzoNotte(
  db: Db,
  listinoId: number,
  tipoCameraId: number,
  data: Date
): Promise<{ prezzo: number } | null> {
  const periodo = await db.periodoTariffario.findFirst({
    where: {
      listinoId,
      tipoCameraId,
      dal: { lte: data },
      al: { gte: data },
    },
  });

  if (!periodo) return null;
  return { prezzo: Number(periodo.prezzoNotte) };
}

/** Tutte le date da [inizio, fine) — la data di fine è il giorno di check-out, non una notte. */
export function nottiTraDate(dataInizio: Date, dataFine: Date): Date[] {
  const notti: Date[] = [];
  const cursore = new Date(dataInizio);
  while (cursore < dataFine) {
    notti.push(new Date(cursore));
    cursore.setDate(cursore.getDate() + 1);
  }
  return notti;
}
