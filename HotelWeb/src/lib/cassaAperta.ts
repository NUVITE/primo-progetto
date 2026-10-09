import { prisma } from "@/lib/prisma";

type Db = Pick<typeof prisma, "chiusuraCassa">;

export const oggiItaliano = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/** La giornata è chiusa in cassa: si rifiuta un pagamento, un rimborso o uno storno che la cambierebbe. */
export async function verificaCassaAperta(db: Db, hotelId: number, giorno: string) {
  const c = await db.chiusuraCassa.findUnique({ where: { hotelId_giorno: { hotelId, giorno: new Date(giorno) } } });
  if (c) throw new Error(`La cassa del ${giorno.split("-").reverse().join("/")} è già chiusa: riaprila dalla pagina Cassa o usa un'altra data.`);
}
