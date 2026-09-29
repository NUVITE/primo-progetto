import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Modulo Sale ed eventi (approvato il 2026-09-30). Orari in ORA LOCALE salvata come UTC
 * (08:00 = 08:00Z): nessuna conversione di fuso, coerente con le date del resto dell'app.
 * Motore unico per disponibilità e prezzo delle sale: le schermate non ricalcolano nulla.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export const FASCE_PREDEFINITE = [
  { nome: "Mattina", inizio: "08:00", fine: "13:00", mostraNelPlanning: true },
  { nome: "Pomeriggio", inizio: "14:00", fine: "19:00", mostraNelPlanning: true },
  { nome: "Sera", inizio: "19:00", fine: "24:00", mostraNelPlanning: true },
  { nome: "Giornata intera", inizio: "08:00", fine: "19:00", mostraNelPlanning: false },
];

export const STATI_PRENOTAZIONE_SALA = ["opzione", "confermata", "annullata"] as const;

const ORA = /^([01]\d|2[0-4]):[0-5]\d$/;
const MINUTO = 60 * 1000;

/** "2026-10-05" + "08:00" -> istante; "24:00" = mezzanotte del giorno dopo. */
export function istante(giorno: string, ora: string) {
  if (!ORA.test(ora) || (ora.startsWith("24") && ora !== "24:00")) throw new Error(`Orario non valido: ${ora}.`);
  const [h, m] = ora.split(":").map(Number);
  return new Date(new Date(`${giorno}T00:00:00Z`).getTime() + (h * 60 + m) * MINUTO);
}

export const giornoDi = (d: Date) => d.toISOString().slice(0, 10);
export function oraDi(d: Date, giornoRiferimento?: string) {
  // La fine alle 24:00 si mostra come "24:00" del giorno di inizio, non "00:00" del giorno dopo.
  if (giornoRiferimento && giornoDi(d) > giornoRiferimento && d.toISOString().slice(11, 16) === "00:00") return "24:00";
  return d.toISOString().slice(11, 16);
}

// ---------------- Configurazione ----------------

export async function configurazioneSale(hotelId: number, soloAttive = false) {
  const [sale, fasce] = await Promise.all([
    prisma.sala.findMany({
      where: { hotelId, ...(soloAttive ? { attiva: true } : {}) },
      include: { allestimenti: { orderBy: { nome: "asc" } }, prezzi: true },
      orderBy: [{ ordine: "asc" }, { nome: "asc" }],
    }),
    prisma.fasciaOraria.findMany({ where: { hotelId }, orderBy: { ordine: "asc" } }),
  ]);
  return {
    fasce: fasce.map((f) => ({ id: f.id, nome: f.nome, inizio: f.inizio, fine: f.fine, mostraNelPlanning: f.mostraNelPlanning })),
    sale: sale.map((s) => ({
      id: s.id,
      nome: s.nome,
      descrizione: s.descrizione ?? "",
      capienzaMax: s.capienzaMax,
      riassettoMinuti: s.riassettoMinuti,
      prezzoOrario: s.prezzoOrario === null ? null : Number(s.prezzoOrario),
      attiva: s.attiva,
      allestimenti: s.allestimenti.map((a) => ({ id: a.id, nome: a.nome, capienza: a.capienza, costo: Number(a.costo), attivo: a.attivo })),
      prezziFascia: Object.fromEntries(s.prezzi.map((p) => [p.fasciaId, Number(p.prezzo)])) as Record<number, number>,
    })),
  };
}

export type DatiSala = {
  nome: string;
  descrizione: string;
  capienzaMax: number | null;
  riassettoMinuti: number;
  prezzoOrario: number | null;
  attiva: boolean;
  prezziFascia: Record<number, number | null>;
};

export async function salvaSala(hotelId: number, id: number | null, d: DatiSala) {
  if (!d.nome.trim()) throw new Error("Indica il nome della sala.");
  if (d.capienzaMax !== null && !(d.capienzaMax > 0)) throw new Error("Capienza non valida.");
  if (!(Number.isInteger(d.riassettoMinuti) && d.riassettoMinuti >= 0 && d.riassettoMinuti <= 480)) throw new Error("Riassetto tra 0 e 480 minuti.");
  if (d.prezzoOrario !== null && !(d.prezzoOrario >= 0)) throw new Error("Prezzo orario non valido.");
  const fasce = await prisma.fasciaOraria.findMany({ where: { hotelId } });
  const dati = {
    nome: d.nome.trim(),
    descrizione: d.descrizione.trim() || null,
    capienzaMax: d.capienzaMax,
    riassettoMinuti: d.riassettoMinuti,
    prezzoOrario: d.prezzoOrario,
    attiva: d.attiva,
  };
  await prisma.$transaction(async (tx) => {
    const sala = id ? await tx.sala.update({ where: { id, hotelId }, data: dati }) : await tx.sala.create({ data: { ...dati, hotelId } });
    for (const f of fasce) {
      const prezzo = d.prezziFascia[f.id];
      if (prezzo === null || prezzo === undefined || Number.isNaN(prezzo)) {
        await tx.prezzoFasciaSala.deleteMany({ where: { salaId: sala.id, fasciaId: f.id } });
      } else {
        if (!(prezzo >= 0)) throw new Error(`Prezzo non valido per la fascia ${f.nome}.`);
        await tx.prezzoFasciaSala.upsert({
          where: { salaId_fasciaId: { salaId: sala.id, fasciaId: f.id } },
          update: { prezzo },
          create: { salaId: sala.id, fasciaId: f.id, prezzo },
        });
      }
    }
  });
}

export async function salvaAllestimento(hotelId: number, salaId: number, id: number | null, d: { nome: string; capienza: number; costo: number; attivo: boolean }) {
  await prisma.sala.findFirstOrThrow({ where: { id: salaId, hotelId } });
  if (!d.nome.trim()) throw new Error("Indica il nome dell'allestimento (es. Platea).");
  if (!(Number.isInteger(d.capienza) && d.capienza > 0)) throw new Error("Capienza dell'allestimento non valida.");
  if (!(d.costo >= 0)) throw new Error("Costo non valido.");
  const dati = { nome: d.nome.trim(), capienza: d.capienza, costo: d.costo, attivo: d.attivo };
  if (id) await prisma.allestimentoSala.update({ where: { id, salaId }, data: dati });
  else await prisma.allestimentoSala.create({ data: { ...dati, salaId } });
}

export async function salvaFascia(hotelId: number, id: number | null, d: { nome: string; inizio: string; fine: string; mostraNelPlanning: boolean }) {
  if (!d.nome.trim()) throw new Error("Indica il nome della fascia.");
  if (!ORA.test(d.inizio) || !ORA.test(d.fine) || d.fine <= d.inizio) throw new Error("Orari della fascia nel formato HH:MM, con la fine dopo l'inizio.");
  const dati = { nome: d.nome.trim(), inizio: d.inizio, fine: d.fine, mostraNelPlanning: d.mostraNelPlanning };
  if (id) await prisma.fasciaOraria.update({ where: { id, hotelId }, data: dati });
  else {
    const ultimo = await prisma.fasciaOraria.aggregate({ where: { hotelId }, _max: { ordine: true } });
    await prisma.fasciaOraria.create({ data: { ...dati, hotelId, ordine: (ultimo._max.ordine ?? 0) + 1 } });
  }
}

export async function eliminaFascia(hotelId: number, id: number) {
  // Le occupazioni già prenotate restano (con i loro orari e prezzi): perdono solo il riferimento alla fascia.
  await prisma.fasciaOraria.delete({ where: { id, hotelId } });
}

// ---------------- Disponibilità e prezzo ----------------

/**
 * Occupazioni che impediscono di usare la sala in [inizio, fine): le prenotazioni annullate non
 * contano; il riassetto della sala va rispettato prima e dopo ogni evento.
 */
export async function conflittiSala(db: Db, salaId: number, inizio: Date, fine: Date, escludiOccupazioneId?: number) {
  const sala = await db.sala.findUniqueOrThrow({ where: { id: salaId } });
  const margine = sala.riassettoMinuti * MINUTO;
  return db.occupazioneSala.findMany({
    where: {
      salaId,
      id: escludiOccupazioneId ? { not: escludiOccupazioneId } : undefined,
      prenotazioneSala: { stato: { not: "annullata" } },
      inizio: { lt: new Date(fine.getTime() + margine) },
      fine: { gt: new Date(inizio.getTime() - margine) },
    },
    include: { prenotazioneSala: true },
  });
}

/** Prezzo della sala: fascia se l'orario coincide con una fascia prezzata, altrimenti ore × prezzo orario. */
export async function calcolaPrezzoSala(db: Db, salaId: number, inizio: Date, fine: Date) {
  const sala = await db.sala.findUniqueOrThrow({ where: { id: salaId }, include: { prezzi: { include: { fascia: true } } } });
  const giorno = giornoDi(inizio);
  const oraInizio = oraDi(inizio);
  const oraFine = oraDi(fine, giorno);
  const fascia = sala.prezzi.find((p) => p.fascia.inizio === oraInizio && p.fascia.fine === oraFine);
  if (fascia) return { prezzo: Number(fascia.prezzo), fasciaId: fascia.fasciaId, spiegazione: `Fascia ${fascia.fascia.nome}` };
  if (sala.prezzoOrario === null) {
    throw new Error(`La sala ${sala.nome} non ha un prezzo per l'orario ${oraInizio}-${oraFine} (né fascia corrispondente né prezzo orario).`);
  }
  const ore = (fine.getTime() - inizio.getTime()) / (60 * MINUTO);
  return {
    prezzo: Math.round(ore * Number(sala.prezzoOrario) * 100) / 100,
    fasciaId: null,
    spiegazione: `${ore.toLocaleString("it-IT")} ore × ${Number(sala.prezzoOrario).toFixed(2)} €`,
  };
}

// ---------------- Prenotazioni di sala ----------------

export type OccupazioneInput = {
  salaId: number;
  giorno: string;
  // Fascia oppure orario libero (inizio/fine "HH:MM").
  fasciaId: number | null;
  inizio: string;
  fine: string;
  allestimentoId: number | null;
  partecipanti: number | null;
};

async function intervallo(db: Db, hotelId: number, o: OccupazioneInput) {
  if (!o.giorno) throw new Error("Indica il giorno.");
  let da = o.inizio;
  let a = o.fine;
  if (o.fasciaId) {
    const f = await db.fasciaOraria.findFirstOrThrow({ where: { id: o.fasciaId, hotelId } });
    da = f.inizio;
    a = f.fine;
  }
  const inizio = istante(o.giorno, da);
  const fine = istante(o.giorno, a);
  if (fine <= inizio) throw new Error("L'orario di fine deve essere dopo l'inizio.");
  return { inizio, fine };
}

/** Crea o aggiorna un'occupazione verificando sala, allestimento, disponibilità; calcola il prezzo. */
async function scriviOccupazione(db: Db, hotelId: number, prenotazioneSalaId: number, o: OccupazioneInput, id?: number) {
  const sala = await db.sala.findFirstOrThrow({ where: { id: o.salaId, hotelId } });
  const allestimento = o.allestimentoId ? await db.allestimentoSala.findFirstOrThrow({ where: { id: o.allestimentoId, salaId: sala.id } }) : null;
  const { inizio, fine } = await intervallo(db, hotelId, o);
  const conflitti = await conflittiSala(db, sala.id, inizio, fine, id);
  if (conflitti.length) {
    const c = conflitti[0];
    const riassetto = sala.riassettoMinuti ? ` (compresi ${sala.riassettoMinuti} minuti di riassetto)` : "";
    throw new Error(
      `${sala.nome} non è libera: "${c.prenotazioneSala.titolo}" (${c.prenotazioneSala.stato}) ${giornoDi(c.inizio).split("-").reverse().join("/")} ${oraDi(c.inizio)}-${oraDi(c.fine, giornoDi(c.inizio))}${riassetto}.`,
    );
  }
  const { prezzo, fasciaId } = await calcolaPrezzoSala(db, sala.id, inizio, fine);
  const dati = {
    salaId: sala.id,
    inizio,
    fine,
    fasciaId: o.fasciaId ?? fasciaId,
    allestimentoId: allestimento?.id ?? null,
    partecipanti: o.partecipanti,
    prezzo,
    prezzoManuale: false,
    costoAllestimento: allestimento ? Number(allestimento.costo) : 0,
  };
  if (id) await db.occupazioneSala.update({ where: { id, prenotazioneSalaId }, data: dati });
  else await db.occupazioneSala.create({ data: { ...dati, prenotazioneSalaId } });
}

export type TestataInput = {
  titolo: string;
  clienteId: number | null;
  prenotazioneId: number | null;
  stato: string;
  scadenzaOpzione: string;
  partecipanti: number | null;
  note: string;
};

async function valoriTestata(db: Db, hotelId: number, t: TestataInput) {
  if (!t.titolo.trim()) throw new Error("Indica il titolo dell'evento.");
  if (!t.clienteId && !t.prenotazioneId) throw new Error("Indica il cliente oppure collega una prenotazione di camere.");
  if (t.clienteId) await db.cliente.findFirstOrThrow({ where: { id: t.clienteId, hotelId } });
  if (t.prenotazioneId) await db.prenotazione.findFirstOrThrow({ where: { id: t.prenotazioneId, hotelId } });
  if (!(STATI_PRENOTAZIONE_SALA as readonly string[]).includes(t.stato)) throw new Error("Stato non valido.");
  return {
    titolo: t.titolo.trim(),
    clienteId: t.clienteId,
    prenotazioneId: t.prenotazioneId,
    stato: t.stato,
    scadenzaOpzione: t.stato === "opzione" && t.scadenzaOpzione ? new Date(t.scadenzaOpzione) : null,
    partecipanti: t.partecipanti,
    note: t.note.trim() || null,
  };
}

export async function creaPrenotazioneSala(hotelId: number, t: TestataInput, occupazioni: OccupazioneInput[]) {
  if (!occupazioni.length) throw new Error("Indica almeno una sala e un orario.");
  return prisma.$transaction(async (tx) => {
    const p = await tx.prenotazioneSala.create({ data: { ...(await valoriTestata(tx, hotelId, t)), hotelId } });
    for (const o of occupazioni) await scriviOccupazione(tx, hotelId, p.id, o);
    return p.id;
  });
}

async function prenotazioneSalaDelHotel(db: Db, hotelId: number, id: number) {
  return db.prenotazioneSala.findFirstOrThrow({ where: { id, hotelId } });
}

export async function aggiornaTestata(hotelId: number, id: number, t: TestataInput) {
  const attuale = await prenotazioneSalaDelHotel(prisma, hotelId, id);
  await prisma.$transaction(async (tx) => {
    const valori = await valoriTestata(tx, hotelId, t);
    // Riattivare un evento annullato: le sale devono essere ancora libere.
    if (attuale.stato === "annullata" && valori.stato !== "annullata") {
      const occ = await tx.occupazioneSala.findMany({ where: { prenotazioneSalaId: id }, include: { sala: true } });
      for (const o of occ) {
        if ((await conflittiSala(tx, o.salaId, o.inizio, o.fine, o.id)).length) {
          throw new Error(`Non si può riattivare: ${o.sala.nome} il ${giornoDi(o.inizio).split("-").reverse().join("/")} è stata occupata da un altro evento.`);
        }
      }
    }
    await tx.prenotazioneSala.update({ where: { id }, data: valori });
  });
}

export async function aggiungiOccupazione(hotelId: number, prenotazioneSalaId: number, o: OccupazioneInput) {
  await prenotazioneSalaDelHotel(prisma, hotelId, prenotazioneSalaId);
  await prisma.$transaction((tx) => scriviOccupazione(tx, hotelId, prenotazioneSalaId, o));
}

export async function modificaOccupazione(hotelId: number, prenotazioneSalaId: number, occupazioneId: number, o: OccupazioneInput) {
  await prenotazioneSalaDelHotel(prisma, hotelId, prenotazioneSalaId);
  await prisma.$transaction((tx) => scriviOccupazione(tx, hotelId, prenotazioneSalaId, o, occupazioneId));
}

/** Prezzo della sala corretto a mano (sconto, accordo commerciale): resta finché non si cambia l'occupazione. */
export async function impostaPrezzoOccupazione(hotelId: number, prenotazioneSalaId: number, occupazioneId: number, prezzo: number) {
  await prenotazioneSalaDelHotel(prisma, hotelId, prenotazioneSalaId);
  if (!(prezzo >= 0)) throw new Error("Prezzo non valido.");
  await prisma.occupazioneSala.update({ where: { id: occupazioneId, prenotazioneSalaId }, data: { prezzo, prezzoManuale: true } });
}

export async function rimuoviOccupazione(hotelId: number, prenotazioneSalaId: number, occupazioneId: number) {
  await prenotazioneSalaDelHotel(prisma, hotelId, prenotazioneSalaId);
  const n = await prisma.occupazioneSala.count({ where: { prenotazioneSalaId } });
  if (n <= 1) throw new Error("È l'unica sala dell'evento: per liberarla annulla la prenotazione.");
  await prisma.occupazioneSala.delete({ where: { id: occupazioneId, prenotazioneSalaId } });
}

export async function aggiungiServizioSala(
  hotelId: number,
  prenotazioneSalaId: number,
  d: { servizioCatalogoId: number | null; descrizione: string; prezzoUnitario: number; quantita: number; data: string; note: string },
) {
  await prenotazioneSalaDelHotel(prisma, hotelId, prenotazioneSalaId);
  if (d.servizioCatalogoId) await prisma.servizioCatalogo.findFirstOrThrow({ where: { id: d.servizioCatalogoId, hotelId } });
  else if (!d.descrizione.trim()) throw new Error("Indica la descrizione del servizio.");
  if (!(d.prezzoUnitario >= 0) || !(Number.isInteger(d.quantita) && d.quantita > 0)) throw new Error("Prezzo o quantità non validi.");
  await prisma.servizioSala.create({
    data: {
      prenotazioneSalaId,
      servizioCatalogoId: d.servizioCatalogoId,
      descrizione: d.servizioCatalogoId ? null : d.descrizione.trim(),
      prezzoUnitario: d.prezzoUnitario,
      quantita: d.quantita,
      data: d.data ? new Date(d.data) : null,
      note: d.note.trim() || null,
    },
  });
}

export async function rimuoviServizioSala(hotelId: number, prenotazioneSalaId: number, servizioId: number) {
  await prenotazioneSalaDelHotel(prisma, hotelId, prenotazioneSalaId);
  await prisma.servizioSala.delete({ where: { id: servizioId, prenotazioneSalaId } });
}

/** Dettaglio con totali e avvisi (capienza, opzione scaduta). */
export async function dettaglioPrenotazioneSala(hotelId: number, id: number) {
  const p = await prisma.prenotazioneSala.findFirstOrThrow({
    where: { id, hotelId },
    include: {
      cliente: true,
      prenotazione: { include: { ospitePrenotante: true } },
      occupazioni: { include: { sala: true, fascia: true, allestimento: true }, orderBy: { inizio: "asc" } },
      servizi: { include: { servizioCatalogo: true }, orderBy: { createdAt: "asc" } },
    },
  });
  const avvisi: string[] = [];
  const oggi = giornoDi(new Date());
  if (p.stato === "opzione" && p.scadenzaOpzione && giornoDi(p.scadenzaOpzione) < oggi) {
    avvisi.push(`Opzione scaduta il ${giornoDi(p.scadenzaOpzione).split("-").reverse().join("/")}: confermala o annullala per liberare le sale.`);
  }
  const occupazioni = p.occupazioni.map((o) => {
    const persone = o.partecipanti ?? p.partecipanti;
    const capienza = o.allestimento?.capienza ?? o.sala.capienzaMax;
    if (persone && capienza && persone > capienza) {
      avvisi.push(`${o.sala.nome} ${giornoDi(o.inizio).split("-").reverse().join("/")}: ${persone} partecipanti, capienza ${capienza}${o.allestimento ? ` (${o.allestimento.nome})` : ""}.`);
    }
    return {
      id: o.id,
      salaId: o.salaId,
      sala: o.sala.nome,
      giorno: giornoDi(o.inizio),
      inizio: oraDi(o.inizio),
      fine: oraDi(o.fine, giornoDi(o.inizio)),
      fasciaId: o.fasciaId,
      fascia: o.fascia?.nome ?? null,
      allestimentoId: o.allestimentoId,
      allestimento: o.allestimento?.nome ?? null,
      partecipanti: o.partecipanti,
      prezzo: Number(o.prezzo),
      prezzoManuale: o.prezzoManuale,
      costoAllestimento: Number(o.costoAllestimento),
    };
  });
  const servizi = p.servizi.map((s) => ({
    id: s.id,
    nome: s.servizioCatalogo?.nome ?? s.descrizione ?? "Servizio",
    prezzoUnitario: Number(s.prezzoUnitario),
    quantita: s.quantita,
    totale: Number(s.prezzoUnitario) * s.quantita,
    data: s.data ? giornoDi(s.data) : null,
    note: s.note,
  }));
  const totaleSale = occupazioni.reduce((t, o) => t + o.prezzo + o.costoAllestimento, 0);
  const totaleServizi = servizi.reduce((t, s) => t + s.totale, 0);
  return {
    id: p.id,
    titolo: p.titolo,
    stato: p.stato,
    scadenzaOpzione: p.scadenzaOpzione ? giornoDi(p.scadenzaOpzione) : "",
    partecipanti: p.partecipanti,
    note: p.note ?? "",
    cliente: p.cliente ? { id: p.cliente.id, denominazione: p.cliente.denominazione } : null,
    prenotazione: p.prenotazione
      ? { id: p.prenotazione.id, intestatario: `${p.prenotazione.ospitePrenotante.nome} ${p.prenotazione.ospitePrenotante.cognome}` }
      : null,
    occupazioni,
    servizi,
    totali: { sale: totaleSale, servizi: totaleServizi, totale: totaleSale + totaleServizi },
    avvisi,
  };
}

export async function elencoPrenotazioniSala(hotelId: number) {
  const p = await prisma.prenotazioneSala.findMany({
    where: { hotelId },
    include: { cliente: true, prenotazione: { include: { ospitePrenotante: true } }, occupazioni: { include: { sala: true }, orderBy: { inizio: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return p.map((x) => ({
    id: x.id,
    titolo: x.titolo,
    stato: x.stato,
    per: x.cliente?.denominazione ?? (x.prenotazione ? `${x.prenotazione.ospitePrenotante.nome} ${x.prenotazione.ospitePrenotante.cognome} (prenotazione #${x.prenotazione.id})` : "—"),
    dal: x.occupazioni[0] ? giornoDi(x.occupazioni[0].inizio) : null,
    al: x.occupazioni.length ? giornoDi(x.occupazioni[x.occupazioni.length - 1].inizio) : null,
    sale: [...new Set(x.occupazioni.map((o) => o.sala.nome))].join(", "),
  }));
}

/**
 * Planning: per ogni sala attiva, giorno e fascia visibile, l'evento che la occupa (se c'è).
 * Una fascia è occupata se un'occupazione ne interseca l'orario; conferma prevale su opzione.
 */
export async function planningSale(hotelId: number, dal: string, giorni: number) {
  const { sale, fasce } = await configurazioneSale(hotelId, true);
  const visibili = fasce.filter((f) => f.mostraNelPlanning);
  const inizio = istante(dal, "00:00");
  const fine = new Date(inizio.getTime() + giorni * 24 * 60 * MINUTO);
  const occupazioni = await prisma.occupazioneSala.findMany({
    where: { sala: { hotelId }, prenotazioneSala: { stato: { not: "annullata" } }, inizio: { lt: fine }, fine: { gt: inizio } },
    include: { prenotazioneSala: true },
  });
  const elencoGiorni = Array.from({ length: giorni }, (_, i) => giornoDi(new Date(inizio.getTime() + i * 24 * 60 * MINUTO)));
  return {
    giorni: elencoGiorni,
    fasce: visibili,
    sale: sale.map((s) => ({
      id: s.id,
      nome: s.nome,
      celle: Object.fromEntries(
        elencoGiorni.map((g) => [
          g,
          visibili.map((f) => {
            const a = istante(g, f.inizio);
            const b = istante(g, f.fine);
            const qui = occupazioni
              .filter((o) => o.salaId === s.id && o.inizio < b && o.fine > a)
              .sort((x, y) => (x.prenotazioneSala.stato === "confermata" ? -1 : 0) - (y.prenotazioneSala.stato === "confermata" ? -1 : 0));
            const o = qui[0];
            return o ? { fasciaId: f.id, stato: o.prenotazioneSala.stato, prenotazioneSalaId: o.prenotazioneSalaId, titolo: o.prenotazioneSala.titolo } : { fasciaId: f.id, stato: "libera" };
          }),
        ]),
      ),
    })),
  };
}

/** Anteprima per i moduli: prezzo e disponibilità di un'occupazione, senza salvare. */
export async function anteprimaOccupazione(hotelId: number, o: OccupazioneInput, escludiOccupazioneId?: number) {
  const sala = await prisma.sala.findFirstOrThrow({ where: { id: o.salaId, hotelId } });
  const { inizio, fine } = await intervallo(prisma, hotelId, o);
  const conflitti = await conflittiSala(prisma, sala.id, inizio, fine, escludiOccupazioneId);
  const allestimento = o.allestimentoId ? await prisma.allestimentoSala.findFirst({ where: { id: o.allestimentoId, salaId: sala.id } }) : null;
  let prezzo: { prezzo: number; spiegazione: string } | null = null;
  let errorePrezzo: string | null = null;
  try {
    prezzo = await calcolaPrezzoSala(prisma, sala.id, inizio, fine);
  } catch (e) {
    errorePrezzo = e instanceof Error ? e.message : String(e);
  }
  return {
    libera: conflitti.length === 0,
    conflitto: conflitti[0]
      ? `Occupata da "${conflitti[0].prenotazioneSala.titolo}" (${conflitti[0].prenotazioneSala.stato}) ${oraDi(conflitti[0].inizio)}-${oraDi(conflitti[0].fine, giornoDi(conflitti[0].inizio))}${sala.riassettoMinuti ? `, riassetto ${sala.riassettoMinuti} min` : ""}`
      : null,
    prezzo: prezzo?.prezzo ?? null,
    spiegazione: prezzo?.spiegazione ?? errorePrezzo,
    costoAllestimento: allestimento ? Number(allestimento.costo) : 0,
  };
}

/** Dati di contorno per creare/modificare un evento: sale, clienti, servizi, prenotazioni di camere collegabili. */
export async function contestoPrenotazioneSala(hotelId: number) {
  const trentaGiorniFa = new Date(Date.now() - 30 * 24 * 60 * MINUTO);
  const [config, clienti, servizi, prenotazioni] = await Promise.all([
    configurazioneSale(hotelId, true),
    prisma.cliente.findMany({ where: { hotelId, attivo: true }, orderBy: { denominazione: "asc" }, select: { id: true, denominazione: true } }),
    prisma.servizioCatalogo.findMany({ where: { hotelId, attivo: true }, orderBy: { nome: "asc" } }),
    prisma.prenotazione.findMany({
      where: { hotelId, stato: { not: "ANNULLATA" }, segmenti: { some: { dataFine: { gte: trentaGiorniFa } } } },
      include: { ospitePrenotante: true, segmenti: { select: { dataInizio: true, dataFine: true } } },
      orderBy: { id: "desc" },
      take: 300,
    }),
  ]);
  const it = (d: Date) => giornoDi(d).split("-").reverse().join("/");
  return {
    sale: config.sale.map((s) => ({ ...s, allestimenti: s.allestimenti.filter((a) => a.attivo) })),
    fasce: config.fasce,
    clienti,
    servizi: servizi.map((s) => ({ id: s.id, nome: s.nome, prezzo: Number(s.prezzo) })),
    prenotazioni: prenotazioni.map((p) => {
      const dal = new Date(Math.min(...p.segmenti.map((s) => s.dataInizio.getTime())));
      const al = new Date(Math.max(...p.segmenti.map((s) => s.dataFine.getTime())));
      return { id: p.id, etichetta: `#${p.id} ${p.ospitePrenotante.cognome} ${p.ospitePrenotante.nome} · ${it(dal)}–${it(al)}` };
    }),
  };
}
