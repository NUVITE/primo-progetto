/**
 * Registro dei reclami degli ospiti: cosa è successo, cosa si è fatto, il gesto di cortesia (abbuono
 * sul conto o servizio offerto) e l'analisi della causa; riepilogo per categoria per la direzione.
 */
import { prisma } from "@/lib/prisma";
import { registraAddebito } from "@/lib/conto";
import { istanteItalia } from "@/lib/politicheRegole";
import { CATEGORIE_RECLAMO, riepilogoReclami, validaTesto, type CategoriaReclamo } from "@/lib/reclamiRegole";

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const giornoItalia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
const dopo = (g: string) => new Date(Date.parse(`${g}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
const SEGMENTI = {
  where: { stato: { not: "ANNULLATO" as const } },
  select: { camera: { select: { codice: true } }, tipoCamera: { select: { descrizione: true } }, ospite: { select: { id: true } }, presenze: { select: { ospiteId: true } } },
};

export type ReclamoInput = { prenotazioneId: number | null; ospiteId: number | null; nome: string; categoria: CategoriaReclamo; descrizione: string };

export async function registraReclamo(hotelId: number, d: ReclamoInput, utente: string) {
  if (!(d.categoria in CATEGORIE_RECLAMO)) throw new Error("Scegli la categoria.");
  validaTesto(d.descrizione, "che cosa lamenta l'ospite");
  let nome = d.nome.trim();
  let camera: string | null = null;
  let ospiteId: number | null = null;
  if (d.prenotazioneId) {
    const p = await prisma.prenotazione.findFirst({ where: { id: d.prenotazioneId, hotelId }, include: { ospitePrenotante: true, segmenti: SEGMENTI } });
    if (!p) throw new Error("Prenotazione non trovata.");
    const persone = new Set([p.ospitePrenotanteId, ...p.segmenti.flatMap((s) => [s.ospite.id, ...s.presenze.map((x) => x.ospiteId)])]);
    ospiteId = d.ospiteId ?? p.ospitePrenotanteId;
    if (!persone.has(ospiteId)) throw new Error("Questa persona non fa parte della prenotazione.");
    if (!nome) {
      const o = await prisma.ospite.findUniqueOrThrow({ where: { id: ospiteId }, select: { nome: true, cognome: true } });
      nome = `${o.nome} ${o.cognome}`;
    }
    camera = [...new Set(p.segmenti.map((s) => s.camera?.codice ?? `${s.tipoCamera.descrizione} da assegnare`))].join(", ") || null;
  }
  if (!nome) throw new Error("Scegli l'ospite o scrivi il nome.");
  const r = await prisma.reclamo.create({
    data: { hotelId, prenotazioneId: d.prenotazioneId, ospiteId, nome, camera, categoria: d.categoria, descrizione: d.descrizione.trim(), creatoDa: utente },
  });
  return r.id;
}

/** Risolto: cosa si è fatto (obbligatorio) e l'eventuale servizio offerto come gesto di cortesia. */
export async function risolviReclamo(hotelId: number, id: number, soluzione: string, gesto: string, utente: string) {
  validaTesto(soluzione, "cosa si è fatto per risolvere");
  const n = await prisma.reclamo.updateMany({
    where: { id, hotelId, stato: "aperto" },
    data: { stato: "risolto", soluzione: soluzione.trim(), gesto: gesto.trim() || null, risoltoIl: new Date(), risoltoDa: utente },
  });
  if (n.count === 0) throw new Error("Reclamo non trovato o già risolto.");
}

/** Analisi della causa e di come evitarla (di solito la direzione, anche dopo la soluzione). */
export async function analisiReclamo(hotelId: number, id: number, analisi: string) {
  validaTesto(analisi, "l'analisi", 4000);
  const n = await prisma.reclamo.updateMany({ where: { id, hotelId }, data: { analisi: analisi.trim() } });
  if (n.count === 0) throw new Error("Reclamo non trovato.");
}

/** Abbuono sul conto come gesto di cortesia (uno per reclamo; dopo uno storno se ne può fare un altro). */
export async function abbuonoReclamo(hotelId: number, id: number, importo: number, utente: string) {
  const r = await prisma.reclamo.findFirst({ where: { id, hotelId }, include: { abbuono: true } });
  if (!r) throw new Error("Reclamo non trovato.");
  if (!r.prenotazioneId) throw new Error("Il reclamo non è legato a una prenotazione: non c'è un conto su cui fare l'abbuono.");
  if (r.abbuono && !r.abbuono.stornatoIl) throw new Error("L'abbuono per questo reclamo è già sul conto.");
  if (!(importo > 0 && importo <= 100000)) throw new Error("Indica l'importo dell'abbuono.");
  const a = await registraAddebito(
    hotelId,
    r.prenotazioneId,
    {
      tipo: "abbuono",
      segmentoId: null,
      repartoId: null,
      data: oggiItalia(),
      descrizione: "Abbuono per reclamo",
      quantita: 1,
      prezzoUnitario: importo,
      buono: "",
      nota: `Reclamo n. ${r.id} (${CATEGORIE_RECLAMO[r.categoria as CategoriaReclamo] ?? r.categoria})`,
    },
    utente,
  );
  await prisma.reclamo.update({ where: { id }, data: { abbuonoId: a.id } });
}

const importoAbbuono = (a: { stornatoIl: Date | null; prezzoUnitario: unknown; quantita: number } | null) =>
  a && !a.stornatoIl ? Math.round(Number(a.prezzoUnitario) * a.quantita * 100) / 100 : null;

export async function elencoReclami(hotelId: number, dal: string, al: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dal) || !/^\d{4}-\d{2}-\d{2}$/.test(al) || dal > al) throw new Error("Periodo non valido.");
  const r = await prisma.reclamo.findMany({
    where: { hotelId, OR: [{ stato: "aperto" }, { creatoIl: { gte: istanteItalia(dal, "00:00"), lt: istanteItalia(dopo(al), "00:00") } }] },
    include: { abbuono: true },
    orderBy: [{ creatoIl: "desc" }],
  });
  const righe = r.map((x) => ({
    id: x.id,
    prenotazioneId: x.prenotazioneId,
    ospiteId: x.ospiteId,
    nome: x.nome,
    camera: x.camera,
    categoria: x.categoria as CategoriaReclamo,
    descrizione: x.descrizione,
    stato: x.stato,
    soluzione: x.soluzione,
    gesto: x.gesto,
    analisi: x.analisi,
    abbuono: importoAbbuono(x.abbuono),
    creatoIl: x.creatoIl.toISOString(),
    creatoDa: x.creatoDa,
    risoltoIl: x.risoltoIl?.toISOString() ?? null,
    risoltoDa: x.risoltoDa,
  }));
  // Riepilogo sul periodo scelto (gli aperti di prima del periodo restano in elenco ma non nei conti).
  const nelPeriodo = r.filter((x) => giornoItalia(x.creatoIl) >= dal && giornoItalia(x.creatoIl) <= al);
  return { dal, al, righe, riepilogo: riepilogoReclami(nelPeriodo.map((x) => ({ categoria: x.categoria, stato: x.stato, creatoIl: x.creatoIl, risoltoIl: x.risoltoIl, abbuono: importoAbbuono(x.abbuono) }))) };
}

/** Reclami di un ospite (per la sua scheda). */
export async function reclamiOspite(hotelId: number, ospiteId: number) {
  const r = await prisma.reclamo.findMany({ where: { hotelId, ospiteId }, orderBy: { creatoIl: "desc" }, take: 20 });
  return r.map((x) => ({ id: x.id, prenotazioneId: x.prenotazioneId, categoria: x.categoria as CategoriaReclamo, descrizione: x.descrizione, stato: x.stato, creatoIl: x.creatoIl.toISOString() }));
}
