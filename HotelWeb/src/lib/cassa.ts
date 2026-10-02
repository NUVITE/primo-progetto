import { prisma } from "@/lib/prisma";
import { METODI_PAGAMENTO, TIPI_PAGAMENTO } from "@/lib/prenotazioni";

/**
 * Cassa della giornata: incassi e rimborsi registrati con quella data (camere ed eventi in sala),
 * storni fatti quel giorno come movimento contrario, totali per metodo e per operatore, addebiti dei
 * reparti. La chiusura fotografa i totali; con la giornata chiusa non si registrano più pagamenti con
 * quella data. Fondo cassa e conteggio dei contanti sono facoltativi.
 */

const arrotonda = (n: number) => Math.round(n * 100) / 100;
const giornoItalia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
export const oggiCassa = () => giornoItalia(new Date());
const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
const spostaGiorni = (g: string, n: number) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 86400000);

export type MovimentoCassa = {
  chiave: string;
  pagamentoId: number;
  ora: string | null;
  tipo: string;
  tipoTesto: string;
  metodo: string;
  metodoTesto: string;
  importo: number;
  descrizione: string;
  link: string | null;
  operatore: string;
  nota: string;
  stornato: boolean;
};

export async function movimentiCassa(hotelId: number, giorno: string) {
  if (!GIORNO.test(giorno)) throw new Error("Giorno non valido.");
  const include = { prenotazione: { include: { ospitePrenotante: true } }, prenotazioneSala: true } as const;
  const [delGiorno, stornatiForse] = await Promise.all([
    prisma.pagamento.findMany({ where: { hotelId, data: new Date(giorno) }, include, orderBy: { createdAt: "asc" } }),
    // Storni fatti quel giorno (ora italiana) di pagamenti di altri giorni: movimento contrario.
    prisma.pagamento.findMany({
      where: { hotelId, stornatoIl: { gte: spostaGiorni(giorno, -1), lt: spostaGiorni(giorno, 2) }, NOT: { data: new Date(giorno) } },
      include,
    }),
  ]);
  type Pag = (typeof delGiorno)[number];
  const descr = (x: Pag) =>
    x.prenotazione
      ? { descrizione: `Prenotazione n. ${x.prenotazione.id} · ${x.prenotazione.ospitePrenotante.cognome} ${x.prenotazione.ospitePrenotante.nome}`.trim(), link: `/prenotazioni/${x.prenotazione.id}` }
      : x.prenotazioneSala
        ? { descrizione: `Evento: ${x.prenotazioneSala.titolo}`, link: `/sale/prenotazioni/${x.prenotazioneSala.id}` }
        : { descrizione: "—", link: null };
  const segno = (x: Pag) => (x.tipo === "rimborso" ? -1 : 1);
  const movimenti: MovimentoCassa[] = [];
  for (const x of delGiorno) {
    // Stornato lo stesso giorno: resta visibile ma non conta.
    const stornatoOggi = !!x.stornatoIl && giornoItalia(x.stornatoIl) === giorno;
    movimenti.push({
      chiave: `p-${x.id}`,
      pagamentoId: x.id,
      ora: giornoItalia(x.createdAt) === giorno ? x.createdAt.toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }) : null,
      tipo: x.tipo,
      tipoTesto: TIPI_PAGAMENTO[x.tipo as keyof typeof TIPI_PAGAMENTO] ?? x.tipo,
      metodo: x.metodo,
      metodoTesto: METODI_PAGAMENTO[x.metodo as keyof typeof METODI_PAGAMENTO] ?? x.metodo,
      importo: segno(x) * Number(x.importo),
      ...descr(x),
      operatore: x.registratoDa,
      nota: x.nota ?? (x.stornatoIl ? `stornato: ${x.motivoStorno ?? ""}` : ""),
      stornato: stornatoOggi,
    });
  }
  for (const x of stornatiForse) {
    if (!x.stornatoIl || giornoItalia(x.stornatoIl) !== giorno) continue;
    movimenti.push({
      chiave: `s-${x.id}`,
      pagamentoId: x.id,
      ora: x.stornatoIl.toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" }),
      tipo: "storno",
      tipoTesto: `Storno del ${giornoItalia(x.data).split("-").reverse().join("/")}`,
      metodo: x.metodo,
      metodoTesto: METODI_PAGAMENTO[x.metodo as keyof typeof METODI_PAGAMENTO] ?? x.metodo,
      importo: -segno(x) * Number(x.importo),
      ...descr(x),
      operatore: x.stornatoDa ?? "",
      nota: x.motivoStorno ?? "",
      stornato: false,
    });
  }
  return movimenti;
}

function somma(movimenti: MovimentoCassa[], per: (m: MovimentoCassa) => string) {
  const m = new Map<string, number>();
  for (const x of movimenti) if (!x.stornato) m.set(per(x), arrotonda((m.get(per(x)) ?? 0) + x.importo));
  return m;
}

/** Tutto quello che serve alla pagina Cassa per un giorno. */
export async function cassaDelGiorno(hotelId: number, giorno: string) {
  const movimenti = await movimentiCassa(hotelId, giorno);
  const perMetodo = somma(movimenti, (m) => m.metodo);
  const totale = arrotonda([...perMetodo.values()].reduce((t, v) => t + v, 0));
  const [chiusura, precedente, addebiti] = await Promise.all([
    prisma.chiusuraCassa.findUnique({ where: { hotelId_giorno: { hotelId, giorno: new Date(giorno) } } }),
    prisma.chiusuraCassa.findFirst({ where: { hotelId, giorno: { lt: new Date(giorno) } }, orderBy: { giorno: "desc" } }),
    prisma.addebitoConto.findMany({ where: { prenotazione: { hotelId }, data: new Date(giorno), stornatoIl: null }, include: { reparto: true } }),
  ]);

  // Addebiti dei reparti del giorno: non sono incassi, finiscono sul conto delle camere.
  const reparti = new Map<string, { quantita: number; importo: number }>();
  for (const a of addebiti) {
    const nome = a.tipo === "abbuono" ? "Abbuoni" : (a.reparto?.nome ?? "Senza reparto");
    const v = reparti.get(nome) ?? { quantita: 0, importo: 0 };
    v.quantita += 1;
    v.importo = arrotonda(v.importo + (a.tipo === "abbuono" ? -1 : 1) * a.quantita * Number(a.prezzoUnitario));
    reparti.set(nome, v);
  }

  const totaliChiusura = chiusura ? (chiusura.totali as Record<string, number>) : null;
  // Differenze fra la fotografia della chiusura e la situazione di adesso (non dovrebbero esserci).
  const differenze = totaliChiusura
    ? [...new Set([...Object.keys(totaliChiusura), ...perMetodo.keys()])]
        .map((k) => ({ metodo: METODI_PAGAMENTO[k as keyof typeof METODI_PAGAMENTO] ?? k, chiusura: totaliChiusura[k] ?? 0, adesso: perMetodo.get(k) ?? 0 }))
        .filter((d) => Math.abs(d.chiusura - d.adesso) > 0.005)
    : [];
  const contanti = perMetodo.get("contanti") ?? 0;
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

  return {
    giorno,
    oggi: oggiCassa(),
    movimenti,
    perMetodo: Object.keys(METODI_PAGAMENTO)
      .filter((k) => perMetodo.has(k))
      .map((k) => ({ metodo: k, testo: METODI_PAGAMENTO[k as keyof typeof METODI_PAGAMENTO], importo: perMetodo.get(k)! })),
    perOperatore: [...somma(movimenti, (m) => m.operatore)].map(([operatore, importo]) => ({ operatore, importo })),
    totale,
    contanti,
    reparti: [...reparti].map(([nome, v]) => ({ nome, ...v })),
    fondoProposto: n(precedente?.fondoLasciato),
    chiusura: chiusura
      ? {
          chiusaDa: chiusura.chiusaDa,
          chiusaIl: chiusura.chiusaIl.toISOString(),
          totale: Number(chiusura.totale),
          fondoIniziale: n(chiusura.fondoIniziale),
          contantiContati: n(chiusura.contantiContati),
          fondoLasciato: n(chiusura.fondoLasciato),
          // Contanti attesi = fondo all'apertura + contanti netti del giorno.
          attesi: chiusura.fondoIniziale === null ? null : arrotonda(Number(chiusura.fondoIniziale) + (totaliChiusura?.contanti ?? 0)),
          nota: chiusura.nota ?? "",
        }
      : null,
    differenze,
  };
}

export type DatiChiusura = { fondoIniziale: number | null; contantiContati: number | null; fondoLasciato: number | null; nota: string };

/** Chiude la giornata: fotografia dei totali e, se usato, conteggio dei contanti. */
export async function chiudiGiornata(hotelId: number, giorno: string, d: DatiChiusura, utente: string) {
  if (!GIORNO.test(giorno)) throw new Error("Giorno non valido.");
  if (giorno > oggiCassa()) throw new Error("Non si chiude una giornata che non è ancora iniziata.");
  for (const v of [d.fondoIniziale, d.contantiContati, d.fondoLasciato]) if (v !== null && !(v >= 0)) throw new Error("Gli importi del fondo cassa non possono essere negativi.");
  if (d.contantiContati !== null && d.fondoIniziale === null) throw new Error("Per confrontare i contanti contati serve il fondo all'apertura (anche 0).");
  const c = await cassaDelGiorno(hotelId, giorno);
  if (c.chiusura) throw new Error("Questa giornata è già chiusa.");
  const attesi = d.fondoIniziale === null ? null : arrotonda(d.fondoIniziale + c.contanti);
  if (attesi !== null && d.contantiContati !== null && Math.abs(attesi - d.contantiContati) > 0.005 && !d.nota.trim()) {
    throw new Error(`I contanti contati (€ ${d.contantiContati.toFixed(2)}) non tornano con quelli attesi (€ ${attesi.toFixed(2)}): scrivi una nota.`);
  }
  await prisma.chiusuraCassa.create({
    data: {
      hotelId,
      giorno: new Date(giorno),
      totali: Object.fromEntries(c.perMetodo.map((m) => [m.metodo, m.importo])),
      totale: c.totale,
      fondoIniziale: d.fondoIniziale,
      contantiContati: d.contantiContati,
      fondoLasciato: d.fondoLasciato,
      nota: d.nota.trim() || null,
      chiusaDa: utente,
    },
  });
}

/** Riapre una giornata chiusa (per correggere un pagamento con quella data). */
export async function riapriGiornata(hotelId: number, giorno: string) {
  const n = await prisma.chiusuraCassa.deleteMany({ where: { hotelId, giorno: new Date(giorno) } });
  if (!n.count) throw new Error("La giornata non è chiusa.");
}

/** Ultime giornate chiuse, per l'elenco della pagina Cassa. */
export async function ultimeChiusure(hotelId: number) {
  const r = await prisma.chiusuraCassa.findMany({ where: { hotelId }, orderBy: { giorno: "desc" }, take: 14 });
  return r.map((c) => {
    const contanti = (c.totali as Record<string, number>).contanti ?? 0;
    const attesi = c.fondoIniziale === null ? null : arrotonda(Number(c.fondoIniziale) + contanti);
    return {
      giorno: c.giorno.toISOString().slice(0, 10),
      totale: Number(c.totale),
      chiusaDa: c.chiusaDa,
      differenzaContanti: attesi === null || c.contantiContati === null ? null : arrotonda(Number(c.contantiContati) - attesi),
    };
  });
}
