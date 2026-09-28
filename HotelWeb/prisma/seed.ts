import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { RUOLI_PREDEFINITI } from "../src/lib/permessi";

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

  // Capienza per tipo: la Singola non puo' avere la stessa capienza di una Doppia,
  // altrimenti l'avviso "persone vs camere scelte" nel booking veloce non ha senso
  // (scoperto 2026-09-26: prima tutte le camere avevano la capienza di default 2/0).
  const capienzaPerTipoCodice: Record<string, { adulti: number; bambini: number }> = {
    SNG: { adulti: 1, bambini: 0 },
    DBL: { adulti: 2, bambini: 0 },
    DBLM: { adulti: 2, bambini: 0 },
    SUITE: { adulti: 2, bambini: 2 },
  };

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
    const capienza = capienzaPerTipoCodice[c.tipo];
    await prisma.camera.upsert({
      where: { hotelId_codice: { hotelId: hotel.id, codice: c.codice } },
      update: { capienzaAdulti: capienza.adulti, capienzaBambini: capienza.bambini },
      create: {
        hotelId: hotel.id,
        codice: c.codice,
        tipoCameraId: tipoByCodice[c.tipo].id,
        piano: c.piano,
        capienzaAdulti: capienza.adulti,
        capienzaBambini: capienza.bambini,
      },
    });
  }

  console.log("Seed: listino base e prezzi...");

  const listino = await prisma.listino.upsert({
    where: { hotelId_codice: { hotelId: hotel.id, codice: "BASE" } },
    update: {},
    create: { hotelId: hotel.id, codice: "BASE", descrizione: "Listino base", tipo: "base" },
  });

  const prezziPerTipo: Record<string, number> = { SNG: 65, DBL: 80, DBLM: 95, SUITE: 130 };
  // Periodo volutamente ampio (non legato a una data demo fissa): la vista di default usa
  // ormai la data reale del sistema, quindi il listino deve coprire "oggi in poi" senza
  // dover essere riesteso ogni volta che passa una stagione (vedi feedback 2026-09-26).
  const dal = new Date("2026-01-01");
  const al = new Date("2027-12-31");
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

  console.log("Seed: secondo hotel (per dimostrare l'account multi-struttura)...");

  const bisceglie = await prisma.comune.upsert({
    where: { codiceIstat: "110003" },
    update: {},
    create: { codiceIstat: "110003", nome: "Bisceglie", provincia: "BT" },
  });

  // Regola reale verificata in HotelWeb/TASSA_SOGGIORNO_PUGLIA.md: 1-2 EUR, tetto 7 notti,
  // attiva SOLO 1 maggio - 31 ottobre (non tutto l'anno, a differenza di Trani).
  const regolamentoBisceglieEsistente = await prisma.regolamentoTassaComune.findFirst({
    where: { comuneId: bisceglie.id, categoriaStruttura: "Hotel" },
  });
  const regolamentoBisceglie =
    regolamentoBisceglieEsistente ??
    (await prisma.regolamentoTassaComune.create({
      data: {
        comuneId: bisceglie.id,
        categoriaStruttura: "Hotel",
        aliquota: 1.0,
        tettoNotti: 7,
        tettoNottiTipo: "per_soggiorno",
        validoDal: new Date("2026-03-28"),
        stagionalitaDal: "05-01",
        stagionalitaAl: "10-31",
      },
    }));

  if (!(await prisma.motivoEsenzioneTassa.findFirst({ where: { regolamentoId: regolamentoBisceglie.id, codice: "MINORE12" } }))) {
    await prisma.motivoEsenzioneTassa.create({
      data: { regolamentoId: regolamentoBisceglie.id, codice: "MINORE12", descrizione: "Minori di 12 anni", etaSoglia: 12 },
    });
  }

  const hotel2 = await prisma.hotel.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, comuneId: bisceglie.id, nome: "Hotel Bisceglie Mare", categoria: "Hotel" },
  });

  const tipiCamera2 = await Promise.all(
    [
      { codice: "SNG", descrizione: "Singola" },
      { codice: "DBL", descrizione: "Doppia" },
    ].map((t) =>
      prisma.tipoCamera.upsert({
        where: { hotelId_codice: { hotelId: hotel2.id, codice: t.codice } },
        update: {},
        create: { hotelId: hotel2.id, ...t },
      })
    )
  );
  const tipoByCodice2 = Object.fromEntries(tipiCamera2.map((t) => [t.codice, t]));

  for (const c of [
    { codice: "101", tipo: "SNG", piano: "Piano 1" },
    { codice: "102", tipo: "DBL", piano: "Piano 1" },
    { codice: "103", tipo: "DBL", piano: "Piano 1" },
  ]) {
    const capienza = capienzaPerTipoCodice[c.tipo];
    await prisma.camera.upsert({
      where: { hotelId_codice: { hotelId: hotel2.id, codice: c.codice } },
      update: { capienzaAdulti: capienza.adulti, capienzaBambini: capienza.bambini },
      create: {
        hotelId: hotel2.id,
        codice: c.codice,
        tipoCameraId: tipoByCodice2[c.tipo].id,
        piano: c.piano,
        capienzaAdulti: capienza.adulti,
        capienzaBambini: capienza.bambini,
      },
    });
  }

  const listino2 = await prisma.listino.upsert({
    where: { hotelId_codice: { hotelId: hotel2.id, codice: "BASE" } },
    update: {},
    create: { hotelId: hotel2.id, codice: "BASE", descrizione: "Listino base", tipo: "base" },
  });

  const prezzi2: Record<string, number> = { SNG: 55, DBL: 75 };
  for (const t of tipiCamera2) {
    if (!(await prisma.periodoTariffario.findFirst({ where: { listinoId: listino2.id, tipoCameraId: t.id, dal, al } }))) {
      await prisma.periodoTariffario.create({
        data: { listinoId: listino2.id, tipoCameraId: t.id, dal, al, prezzoNotte: prezzi2[t.codice] },
      });
    }
  }

  console.log("Seed: Casa per ferie Maria Domenica Barbantini (Roma)...");

  // Cliente reale (2026-09-26): Via Ausano Labadini 20, Roma (La Storta) — gestita dalla
  // Congregazione delle Suore Ministre degli Infermi di San Camillo. Numero camere/prezzi non
  // pubblicati: inventati in modo plausibile (richiesta esplicita dell'utente) partendo dal dato
  // reale "tariffe a partire da 20 EUR a persona" trovato sul sito ufficiale.
  const roma = await prisma.comune.upsert({
    where: { codiceIstat: "058091" },
    update: {},
    create: { codiceIstat: "058091", nome: "Roma", provincia: "RM" },
  });

  // Tassa di soggiorno di Roma Capitale: tariffa differenziata per categoria di struttura.
  // "Case per ferie" = 6 EUR/persona/notte (corretto dall'utente 2026-09-26: la ricerca web aveva
  // inizialmente trovato 3,50 EUR da una fonte che si e' rivelata sbagliata/obsoleta — l'utente
  // segue clienti reali in questo settore e conferma che e' 6 EUR da oltre un anno), tetto 10
  // notti consecutive, minori di 10 anni esenti.
  const regolamentoRomaEsistente = await prisma.regolamentoTassaComune.findFirst({
    where: { comuneId: roma.id, categoriaStruttura: "Casa per ferie" },
  });
  const regolamentoRoma =
    regolamentoRomaEsistente ??
    (await prisma.regolamentoTassaComune.create({
      data: {
        comuneId: roma.id,
        categoriaStruttura: "Casa per ferie",
        aliquota: 6.0,
        tettoNotti: 10,
        tettoNottiTipo: "per_soggiorno",
        validoDal: new Date("2026-01-01"),
      },
    }));

  if (!(await prisma.motivoEsenzioneTassa.findFirst({ where: { regolamentoId: regolamentoRoma.id, codice: "MINORE10" } }))) {
    await prisma.motivoEsenzioneTassa.create({
      data: { regolamentoId: regolamentoRoma.id, codice: "MINORE10", descrizione: "Minori di 10 anni", etaSoglia: 10 },
    });
  }

  const hotel3 = await prisma.hotel.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, comuneId: roma.id, nome: "Casa per ferie Maria Domenica Barbantini", categoria: "Casa per ferie" },
  });

  const tipiCamera3 = await Promise.all(
    [
      { codice: "SNG", descrizione: "Singola" },
      { codice: "DBL", descrizione: "Doppia" },
      { codice: "SPEC", descrizione: "Camera attrezzata (esigenze speciali)" },
    ].map((t) =>
      prisma.tipoCamera.upsert({
        where: { hotelId_codice: { hotelId: hotel3.id, codice: t.codice } },
        update: {},
        create: { hotelId: hotel3.id, ...t },
      })
    )
  );
  const tipoByCodice3 = Object.fromEntries(tipiCamera3.map((t) => [t.codice, t]));

  const capienzaPerTipoCodice3: Record<string, { adulti: number; bambini: number }> = {
    ...capienzaPerTipoCodice,
    SPEC: { adulti: 2, bambini: 0 },
  };

  const camere3 = [
    { codice: "S1", tipo: "SNG", piano: "Piano 1" },
    { codice: "S2", tipo: "SNG", piano: "Piano 1" },
    { codice: "S3", tipo: "SNG", piano: "Piano 1" },
    { codice: "S4", tipo: "SNG", piano: "Piano 1" },
    { codice: "S5", tipo: "SNG", piano: "Piano 1" },
    { codice: "S6", tipo: "SNG", piano: "Piano 2" },
    { codice: "D1", tipo: "DBL", piano: "Piano 1" },
    { codice: "D2", tipo: "DBL", piano: "Piano 1" },
    { codice: "D3", tipo: "DBL", piano: "Piano 2" },
    { codice: "D4", tipo: "DBL", piano: "Piano 2" },
    { codice: "D5", tipo: "DBL", piano: "Piano 2" },
    { codice: "D6", tipo: "DBL", piano: "Piano 2" },
    { codice: "D7", tipo: "DBL", piano: "Piano 3" },
    { codice: "D8", tipo: "DBL", piano: "Piano 3" },
    { codice: "SP1", tipo: "SPEC", piano: "Piano 1" },
  ];
  for (const c of camere3) {
    const capienza = capienzaPerTipoCodice3[c.tipo];
    await prisma.camera.upsert({
      where: { hotelId_codice: { hotelId: hotel3.id, codice: c.codice } },
      update: { capienzaAdulti: capienza.adulti, capienzaBambini: capienza.bambini },
      create: {
        hotelId: hotel3.id,
        codice: c.codice,
        tipoCameraId: tipoByCodice3[c.tipo].id,
        piano: c.piano,
        capienzaAdulti: capienza.adulti,
        capienzaBambini: capienza.bambini,
      },
    });
  }

  const listino3 = await prisma.listino.upsert({
    where: { hotelId_codice: { hotelId: hotel3.id, codice: "BASE" } },
    update: {},
    create: { hotelId: hotel3.id, codice: "BASE", descrizione: "Listino base", tipo: "base" },
  });

  // Inventati partendo dal dato reale "tariffe a partire da 20 EUR a persona" del sito ufficiale.
  const prezzi3: Record<string, number> = { SNG: 25, DBL: 40, SPEC: 35 };
  for (const t of tipiCamera3) {
    if (!(await prisma.periodoTariffario.findFirst({ where: { listinoId: listino3.id, tipoCameraId: t.id, dal, al } }))) {
      await prisma.periodoTariffario.create({
        data: { listinoId: listino3.id, tipoCameraId: t.id, dal, al, prezzoNotte: prezzi3[t.codice] },
      });
    }
  }

  console.log("Seed: ruoli e utenti...");

  // Ruoli predefiniti per ogni hotel: creati solo se mancano (update vuoto), così un reseed non
  // sovrascrive i permessi che l'amministratore dell'hotel ha personalizzato.
  const ruoloDi: Record<number, Record<string, number>> = {};
  for (const h of [hotel, hotel2, hotel3]) {
    ruoloDi[h.id] = {};
    for (const r of RUOLI_PREDEFINITI) {
      const ruolo = await prisma.ruolo.upsert({
        where: { hotelId_nome: { hotelId: h.id, nome: r.nome } },
        update: {},
        create: { hotelId: h.id, nome: r.nome, permessi: r.permessi },
      });
      ruoloDi[h.id][r.nome] = ruolo.id;
    }
  }

  async function utenteDemo(email: string, nome: string, password: string, accessi: { hotelId: number; ruolo: string }[], superAdmin = false) {
    const passwordHash = await bcrypt.hash(password, 10);
    const utente = await prisma.utente.upsert({
      where: { email },
      update: { superAdmin },
      create: { nome, email, passwordHash, superAdmin },
    });
    for (const a of accessi) {
      await prisma.utenteHotel.upsert({
        where: { utenteId_hotelId: { utenteId: utente.id, hotelId: a.hotelId } },
        update: {},
        create: { utenteId: utente.id, hotelId: a.hotelId, ruoloId: ruoloDi[a.hotelId][a.ruolo] },
      });
    }
  }

  // Gestore della piattaforma: superadmin, vede tutti gli hotel (anche futuri) senza accessi espliciti.
  await utenteDemo("admin@nuvite.it", "Amministratore", "admin1234", [], true);
  // Reception: un solo hotel, nessun selettore, nessun accesso a gestione camere/utenti.
  await utenteDemo("reception@hotelmeridiana.it", "Reception Meridiana", "reception1234", [{ hotelId: hotel.id, ruolo: "Reception" }]);
  // Utente dedicato del cliente reale Casa Barbantini: amministratore solo del suo hotel.
  await utenteDemo("info@casaperferiemdbarbantini.it", "Casa Barbantini", "barbantini1234", [{ hotelId: hotel3.id, ruolo: "Amministratore" }]);

  console.log("Seed completato.");
  console.log("Credenziali di prova:");
  console.log("  admin@nuvite.it / admin1234              (superadmin, vede tutti gli hotel)");
  console.log("  reception@hotelmeridiana.it / reception1234  (Reception, solo Hotel Meridiana)");
  console.log("  info@casaperferiemdbarbantini.it / barbantini1234  (ADMIN, solo Casa Barbantini)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
