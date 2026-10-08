/**
 * Preparazione e pulizia dei video: sessione dell'utente dimostrativo (cookie firmato con
 * l'AUTH_SECRET locale, senza password) e cancellazione di quanto creato durante la ripresa, con
 * controllo finale che ogni tabella abbia di nuovo lo stesso numero di righe di prima.
 */
import "dotenv/config";
import { SignJWT } from "jose";
import { prisma } from "../../src/lib/prisma";

/** Cookie di sessione per l'utente (primo hotel accessibile se non indicato). */
export async function sessione(email: string, hotelId?: number) {
  const segreto = process.env.AUTH_SECRET;
  if (!segreto) throw new Error("AUTH_SECRET non impostata nel .env.");
  const utente = await prisma.utente.findUniqueOrThrow({ where: { email }, include: { accessi: true } });
  const hotel = hotelId ?? utente.accessi[0]?.hotelId ?? 1;
  return new SignJWT({ sub: String(utente.id), hotelId: hotel, v: utente.versioneSessione })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(new TextEncoder().encode(segreto));
}

/** Numero di righe di ogni tabella del database. */
export async function contaTabelle() {
  const tabelle = await prisma.$queryRawUnsafe<{ t: string }[]>(
    "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'",
  );
  const conti: Record<string, number> = {};
  for (const { t } of tabelle) {
    const [r] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM \`${t}\``);
    conti[t] = Number(r.n);
  }
  return conti;
}

/** Ultimi id di prenotazioni e ospiti: quanto viene dopo è stato creato dalla ripresa. */
export async function segno() {
  const [p, o] = await Promise.all([
    prisma.prenotazione.aggregate({ _max: { id: true } }),
    prisma.ospite.aggregate({ _max: { id: true } }),
  ]);
  return { prenotazione: p._max.id ?? 0, ospite: o._max.id ?? 0 };
}

/** Cancella prenotazioni e ospiti creati dopo il segno, con tutto ciò che vi è collegato. */
export async function pulisci(da: Awaited<ReturnType<typeof segno>>) {
  const ids = (await prisma.prenotazione.findMany({ where: { id: { gt: da.prenotazione } }, select: { id: true } })).map((p) => p.id);
  const seg = { segmento: { prenotazioneId: { in: ids } } };
  const pre = { prenotazioneId: { in: ids } };
  await prisma.emailInviata.deleteMany({ where: pre });
  await prisma.addebitoConto.deleteMany({ where: pre });
  await prisma.pagamento.deleteMany({ where: pre });
  await prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiunto: pre } });
  await prisma.servizioAggiunto.deleteMany({ where: pre });
  await prisma.tassaNotte.deleteMany({ where: { notte: seg } });
  await prisma.notteSoggiorno.deleteMany({ where: seg });
  await prisma.presenza.deleteMany({ where: seg });
  await prisma.posizioneTassa.deleteMany({ where: pre });
  await prisma.segmentoSoggiorno.deleteMany({ where: pre });
  await prisma.prenotazione.deleteMany({ where: { id: { in: ids } } });
  await prisma.ospite.deleteMany({ where: { id: { gt: da.ospite } } });
}

/** Esegue la ripresa e poi pulisce sempre; alla fine confronta le righe di ogni tabella. */
export async function conPulizia(ripresa: () => Promise<void>) {
  const prima = await contaTabelle();
  const da = await segno();
  try {
    await ripresa();
  } finally {
    await pulisci(da);
    const dopo = await contaTabelle();
    const diverse = Object.keys({ ...prima, ...dopo }).filter((t) => prima[t] !== dopo[t]);
    if (diverse.length) {
      console.log("ATTENZIONE: righe rimaste diverse da prima in", diverse.map((t) => `${t} (${prima[t]} -> ${dopo[t]})`).join(", "));
      process.exitCode = 1;
    } else {
      console.log("Database come prima della ripresa.");
    }
    await prisma.$disconnect();
  }
}
