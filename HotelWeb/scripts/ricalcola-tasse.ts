/**
 * Ricalcola la tassa di soggiorno di tutte le posizioni NON definitive (ospite in una prenotazione).
 * Idempotente. Si lancia dopo una migrazione che cambia regole o motore:
 *   npx tsx scripts/ricalcola-tasse.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { ricalcolaTassaPosizione } from "../src/lib/tassaSoggiorno";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5,
  }),
});

async function main() {
  const coppie = await prisma.segmentoSoggiorno.findMany({
    select: { prenotazioneId: true, ospiteId: true },
    distinct: ["prenotazioneId", "ospiteId"],
  });
  let ricalcolate = 0;
  for (const { prenotazioneId, ospiteId } of coppie) {
    await prisma.$transaction((tx) => ricalcolaTassaPosizione(tx, prenotazioneId, ospiteId));
    ricalcolate += 1;
  }
  console.log(`Tassa di soggiorno ricalcolata per ${ricalcolate} posizioni (quelle definitive restano invariate).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
