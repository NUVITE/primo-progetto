import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seed: comune e regolamento tassa di soggiorno...");

  const trani = await prisma.comune.upsert({
    where: { codiceIstat: "110009" },
    update: {},
    create: { codiceIstat: "110009", nome: "Trani", provincia: "BT" },
  });

  // Regola reale verificata in HotelWeb/TASSA_SOGGIORNO_PUGLIA.md (2026-09-25):
  // 1,50 EUR per hotel/RTA/villaggi/B&B/agriturismi/case vacanza; 1,00 EUR per
  // affittacamere/campeggi/ostelli/locazioni brevi. Tetto 6 notti. Tutto l'anno.
  // In vigore dal 1 maggio 2026.
  const regolamentoEsistente = await prisma.regolamentoTassaComune.findFirst({
    where: { comuneId: trani.id, categoriaStruttura: "Hotel" },
  });
  const regolamentoTrani =
    regolamentoEsistente ??
    (await prisma.regolamentoTassaComune.create({
      data: {
        comuneId: trani.id,
        categoriaStruttura: "Hotel",
        aliquota: 1.5,
        tettoNotti: 6,
        tettoNottiTipo: "per_soggiorno",
        validoDal: new Date("2026-05-01"),
      },
    }));

  const esenzioneEsistente = await prisma.motivoEsenzioneTassa.findFirst({
    where: { regolamentoId: regolamentoTrani.id, codice: "MINORE16" },
  });
  if (!esenzioneEsistente) {
    await prisma.motivoEsenzioneTassa.create({
      data: {
        regolamentoId: regolamentoTrani.id,
        codice: "MINORE16",
        descrizione: "Minori di 16 anni",
        etaSoglia: 16,
      },
    });
  }

  console.log("Seed: hotel e camere...");

  const hotel = await prisma.hotel.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, comuneId: trani.id, nome: "Hotel Meridiana", categoria: "Hotel" },
  });

  const tipiCamera = await Promise.all(
    [
      { codice: "SNG", descrizione: "Singola" },
      { codice: "DBL", descrizione: "Doppia Standard" },
      { codice: "DBLM", descrizione: "Doppia Vista Mare" },
      { codice: "SUITE", descrizione: "Suite" },
    ].map((t) =>
      prisma.tipoCamera.upsert({
        where: { hotelId_codice: { hotelId: hotel.id, codice: t.codice } },
        update: {},
        create: { hotelId: hotel.id, ...t },
      })
    )
  );
  const tipoByCodice = Object.fromEntries(tipiCamera.map((t) => [t.codice, t]));

  const camere = [
    { codice: "11", tipo: "SNG", piano: "Piano 1" },
    { codice: "12", tipo: "DBLM", piano: "Piano 1" },
    { codice: "13", tipo: "DBL", piano: "Piano 1" },
    { codice: "14", tipo: "DBL", piano: "Piano 1" },
    { codice: "21", tipo: "SUITE", piano: "Piano 2" },
    { codice: "22", tipo: "SNG", piano: "Piano 2" },
    { codice: "23", tipo: "DBL", piano: "Piano 2" },
    { codice: "24", tipo: "DBLM", piano: "Piano 2" },
  ];
  for (const c of camere) {
    await prisma.camera.upsert({
      where: { hotelId_codice: { hotelId: hotel.id, codice: c.codice } },
      update: {},
      create: {
        hotelId: hotel.id,
        codice: c.codice,
        tipoCameraId: tipoByCodice[c.tipo].id,
        piano: c.piano,
      },
    });
  }

  console.log("Seed: listino base e prezzi per luglio 2026...");

  const listino = await prisma.listino.upsert({
    where: { hotelId_codice: { hotelId: hotel.id, codice: "BASE" } },
    update: {},
    create: { hotelId: hotel.id, codice: "BASE", descrizione: "Listino base", tipo: "base" },
  });

  const prezziPerTipo: Record<string, number> = { SNG: 65, DBL: 80, DBLM: 95, SUITE: 130 };
  const dal = new Date("2026-06-01");
  const al = new Date("2026-09-30");
  for (const t of tipiCamera) {
    const esiste = await prisma.periodoTariffario.findFirst({
      where: { listinoId: listino.id, tipoCameraId: t.id, dal, al },
    });
    if (!esiste) {
      await prisma.periodoTariffario.create({
        data: {
          listinoId: listino.id,
          tipoCameraId: t.id,
          dal,
          al,
          prezzoNotte: prezziPerTipo[t.codice],
        },
      });
    }
  }

  console.log("Seed: ospiti di esempio (per la ricerca per frammento)...");

  const ospiti = [
    { nome: "Maria", cognome: "Rossi", telefono: "347 1234567" },
    { nome: "Marco", cognome: "Rossi", telefono: "339 7654321" },
    { nome: "Marika", cognome: "Rossini", telefono: "328 1122334" },
    { nome: "Giovanni", cognome: "Bianchi", telefono: "333 9988776" },
    { nome: "Anna", cognome: "Verdi", telefono: "345 5566778", dataNascita: new Date("1990-04-12") },
    { nome: "Luca", cognome: "Rossi", telefono: "340 1112233", dataNascita: new Date("2015-06-01") }, // minorenne, esente
  ];
  for (const o of ospiti) {
    const esistente = await prisma.ospite.findFirst({
      where: { hotelId: hotel.id, nome: o.nome, cognome: o.cognome },
    });
    if (!esistente) {
      await prisma.ospite.create({ data: { hotelId: hotel.id, ...o } });
    }
  }

  console.log("Seed completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
