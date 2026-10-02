/**
 * Collaudo del motore tassa di soggiorno su casi reali dei regolamenti (Roma, Bisceglie).
 * Lavora dentro una transazione che viene SEMPRE annullata: non lascia dati nel database.
 *   npx tsx scripts/collaudo-tassa.ts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
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

class Annulla extends Error {}
let falliti = 0;

function verifica(nome: string, ottenuto: unknown, atteso: unknown) {
  const ok = JSON.stringify(ottenuto) === JSON.stringify(atteso);
  if (!ok) falliti += 1;
  console.log(`${ok ? "OK  " : "NO  "} ${nome}: ${JSON.stringify(ottenuto)}${ok ? "" : `  (atteso ${JSON.stringify(atteso)})`}`);
}

const d = (s: string) => new Date(s);

async function soggiorno(tx: Prisma.TransactionClient, hotelId: number, ospite: { nome: string; dataNascita?: string }, dal: string, al: string) {
  const tipo = await tx.tipoCamera.findFirstOrThrow({ where: { hotelId } });
  const listino = await tx.listino.findFirstOrThrow({ where: { hotelId } });
  const o = await tx.ospite.create({
    data: { hotelId, nome: ospite.nome, cognome: "Collaudo", dataNascita: ospite.dataNascita ? d(ospite.dataNascita) : null },
  });
  const p = await tx.prenotazione.create({ data: { hotelId, ospitePrenotanteId: o.id } });
  const s = await tx.segmentoSoggiorno.create({
    data: { prenotazioneId: p.id, tipoCameraId: tipo.id, ospiteId: o.id, trattamento: "B&B", listinoId: listino.id, dataInizio: d(dal), dataFine: d(al) },
  });
  for (let t = d(dal).getTime(); t < d(al).getTime(); t += 86400000) {
    await tx.notteSoggiorno.create({ data: { segmentoId: s.id, data: new Date(t), prezzo: 0, motivoPrezzo: "base" } });
  }
  await tx.presenza.create({ data: { segmentoId: s.id, ospiteId: o.id } });
  await ricalcolaTassaPosizione(tx, p.id, o.id);
  return { prenotazioneId: p.id, ospiteId: o.id, segmentoId: s.id };
}

async function esiti(tx: Prisma.TransactionClient, pos: { prenotazioneId: number; ospiteId: number }) {
  const t = await tx.tassaNotte.findMany({
    where: { presenza: { ospiteId: pos.ospiteId, segmento: { prenotazioneId: pos.prenotazioneId } } },
    include: { notte: true },
    orderBy: { notte: { data: "asc" } },
  });
  const conta: Record<string, number> = {};
  for (const r of t) conta[r.esito] = (conta[r.esito] ?? 0) + 1;
  return { conta, totale: t.reduce((s, r) => s + Number(r.importo), 0), righe: t };
}

async function dichiara(tx: Prisma.TransactionClient, pos: { prenotazioneId: number; ospiteId: number }, codice: string, periodo?: { dal: string; al: string }) {
  const p = await tx.posizioneTassa.findUniqueOrThrow({ where: { prenotazioneId_ospiteId: { prenotazioneId: pos.prenotazioneId, ospiteId: pos.ospiteId } } });
  const pren = await tx.prenotazione.findUniqueOrThrow({ where: { id: pos.prenotazioneId }, include: { hotel: true } });
  const regola = await tx.regolaTassa.findFirstOrThrow({ where: { codice, regolamento: { comuneId: pren.hotel.comuneId } } });
  await tx.dichiarazioneTassa.create({
    data: { posizioneId: p.id, regolaId: regola.id, consegnataIl: new Date(), dal: periodo ? d(periodo.dal) : null, al: periodo ? d(periodo.al) : null },
  });
  await ricalcolaTassaPosizione(tx, pos.prenotazioneId, pos.ospiteId);
}

async function main() {
  const roma = await prisma.hotel.findFirstOrThrow({ where: { comune: { codiceIstat: "058091" } } });
  const bisceglie = await prisma.hotel.findFirstOrThrow({ where: { comune: { codiceIstat: "110003" } } });

  await prisma
    .$transaction(
      async (tx) => {
        // Roma, case per ferie 6 €, tetto 10 notti consecutive
        const a = await soggiorno(tx, roma.id, { nome: "Adulto12notti", dataNascita: "1980-01-01" }, "2026-11-01", "2026-11-13");
        const ea = await esiti(tx, a);
        verifica("Roma 12 notti: 10 tassate + 2 oltre tetto", ea.conta, { tassata: 10, oltre_tetto: 2 });
        verifica("Roma 12 notti: totale 60 €", ea.totale, 60);

        // Bambino che compie 10 anni il 2026-11-04: esente le notti 1-3, tassato dal compleanno
        const b = await soggiorno(tx, roma.id, { nome: "Bambino", dataNascita: "2016-11-04" }, "2026-11-01", "2026-11-06");
        const eb = await esiti(tx, b);
        verifica("Roma bambino: 3 esenti + 2 tassate (compleanno durante il soggiorno)", eb.conta, { esente: 3, tassata: 2 });

        // Lavoratore con 8 notti già pagate nell'anno + dichiarazione: tassate solo 2 notti su 5
        const c = await soggiorno(tx, roma.id, { nome: "Lavoratore", dataNascita: "1975-05-05" }, "2026-11-01", "2026-11-06");
        await tx.posizioneTassa.update({ where: { prenotazioneId_ospiteId: { prenotazioneId: c.prenotazioneId, ospiteId: c.ospiteId } }, data: { nottiAnnoDichiarate: 8 } });
        await dichiara(tx, c, "STUDENTI_LAVORATORI");
        verifica("Roma lavoratore (8 notti già nell'anno): 2 tassate + 3 oltre tetto annuo", (await esiti(tx, c)).conta, {
          tassata: 2,
          oltre_tetto_annuo: 3,
        });

        // Accompagnatore di un ricoverato solo per le prime 3 notti: poi torna tassabile
        const e = await soggiorno(tx, roma.id, { nome: "Accompagnatore", dataNascita: "1970-02-02" }, "2026-11-01", "2026-11-06");
        await dichiara(tx, e, "CURE", { dal: "2026-11-01", al: "2026-11-04" });
        verifica("Roma cure limitate al periodo: 3 esenti + 2 tassate", (await esiti(tx, e)).conta, { esente: 3, tassata: 2 });

        // Residente a Roma: fuori campo
        const r = await soggiorno(tx, roma.id, { nome: "Residente", dataNascita: "1990-03-03" }, "2026-11-01", "2026-11-03");
        await tx.posizioneTassa.update({ where: { prenotazioneId_ospiteId: { prenotazioneId: r.prenotazioneId, ospiteId: r.ospiteId } }, data: { residente: true } });
        await ricalcolaTassaPosizione(tx, r.prenotazioneId, r.ospiteId);
        verifica("Roma residente: fuori campo", (await esiti(tx, r)).conta, { residente: 2 });

        // Bisceglie 1 €: gruppo scolastico ridotto del 50%
        const s = await soggiorno(tx, bisceglie.id, { nome: "Studente15", dataNascita: "2010-06-06" }, "2026-11-01", "2026-11-04");
        await dichiara(tx, s, "SCUOLE");
        const es = await esiti(tx, s);
        verifica("Bisceglie scuola: 3 notti ridotte a 0,50 €", { conta: es.conta, totale: es.totale }, { conta: { ridotta: 3 }, totale: 1.5 });

        // Bisceglie: tetto 7 consecutive anche tra strutture, 5 notti già pagate altrove
        const x = await soggiorno(tx, bisceglie.id, { nome: "DaAltroHotel", dataNascita: "1985-07-07" }, "2026-11-01", "2026-11-05");
        await tx.posizioneTassa.update({ where: { prenotazioneId_ospiteId: { prenotazioneId: x.prenotazioneId, ospiteId: x.ospiteId } }, data: { nottiPrecedentiAltrove: 5 } });
        await ricalcolaTassaPosizione(tx, x.prenotazioneId, x.ospiteId);
        verifica("Bisceglie 5 notti già pagate altrove: 2 tassate + 2 oltre tetto", (await esiti(tx, x)).conta, { tassata: 2, oltre_tetto: 2 });

        // Bisceglie: minore di 14 anni esente
        const m = await soggiorno(tx, bisceglie.id, { nome: "Minore13", dataNascita: "2013-01-01" }, "2026-11-01", "2026-11-03");
        verifica("Bisceglie minore di 14 anni: esente", (await esiti(tx, m)).conta, { esente: 2 });

        // Due persone nella stessa camera: ciascuna paga la sua tassa (prezzo per camera, tassa per persona)
        const coppia = await soggiorno(tx, roma.id, { nome: "Titolare", dataNascita: "1980-01-01" }, "2026-11-01", "2026-11-04");
        const compagna = await tx.ospite.create({ data: { hotelId: roma.id, nome: "Compagna", cognome: "Collaudo", dataNascita: d("1982-02-02") } });
        // ... che parte un giorno prima
        await tx.presenza.create({ data: { segmentoId: coppia.segmentoId, ospiteId: compagna.id, al: d("2026-11-03") } });
        await ricalcolaTassaPosizione(tx, coppia.prenotazioneId, compagna.id);
        verifica("Roma coppia: titolare 3 notti tassate", (await esiti(tx, coppia)).conta, { tassata: 3 });
        verifica("Roma coppia: compagna partita prima, 2 notti tassate", (await esiti(tx, { prenotazioneId: coppia.prenotazioneId, ospiteId: compagna.id })).conta, {
          tassata: 2,
        });

        throw new Annulla();
      },
      { timeout: 60000 },
    )
    .catch((e) => {
      if (!(e instanceof Annulla)) throw e;
    });

  console.log(falliti === 0 ? "\nTutti i casi superati (dati di prova annullati)." : `\n${falliti} casi NON superati.`);
  if (falliti) process.exitCode = 1;
}

main().finally(() => prisma.$disconnect());
