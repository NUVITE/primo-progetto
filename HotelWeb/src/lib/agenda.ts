/**
 * Agenda del portiere: libro sveglie (le sveglie sono richieste degli ospiti di tipo "sveglia", dal QR
 * o prese al banco) e servizi prenotati per gli ospiti (taxi, transfer, ristoranti, biglietti…), con
 * l'esborso sul conto quando il portiere anticipa la spesa e la nota degli esborsi da stampare.
 */
import { prisma } from "@/lib/prisma";
import { istanteItalia } from "@/lib/politicheRegole";
import { creaRichiesta } from "@/lib/richieste";
import { registraAddebito } from "@/lib/conto";
import { PASSAGGI, STATI_SERVIZIO, TIPI_SERVIZIO, validaServizio, type EsitoSveglia, type ServizioInput, type StatoServizio, type TipoServizio } from "@/lib/agendaRegole";

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const oraDi = (d: Date) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
const giornoDi = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
const dopo = (g: string, n: number) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const arrotonda = (n: number) => Math.round(n * 100) / 100;

const SEGMENTI = {
  where: { stato: { not: "ANNULLATO" as const } },
  select: { camera: { select: { codice: true } }, tipoCamera: { select: { descrizione: true } } },
};
const camereDi = (segmenti: { camera: { codice: string } | null; tipoCamera: { descrizione: string } }[]) =>
  [...new Set(segmenti.map((s) => s.camera?.codice ?? `${s.tipoCamera.descrizione} da assegnare`))].join(", ");

/** Il giorno dell'agenda: sveglie e servizi in ordine di ora, più i servizi ancora da confermare (anche di altri giorni). */
export async function agendaDelGiorno(hotelId: number, giorno: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno)) throw new Error("Giorno non valido.");
  const dal = istanteItalia(giorno, "00:00");
  const al = istanteItalia(dopo(giorno, 1), "00:00");
  const [sveglie, servizi, daConfermare] = await Promise.all([
    prisma.richiestaOspite.findMany({
      where: { hotelId, tipo: "sveglia", stato: { not: "annullata" }, perQuando: { gte: dal, lt: al } },
      include: { camera: { select: { codice: true } }, segmento: { select: { prenotazioneId: true, ospite: { select: { nome: true, cognome: true } } } } },
      orderBy: { perQuando: "asc" },
    }),
    prisma.servizioPortineria.findMany({
      where: { hotelId, quando: { gte: dal, lt: al } },
      include: { prenotazione: { select: { segmenti: SEGMENTI } }, addebito: true },
      orderBy: { quando: "asc" },
    }),
    prisma.servizioPortineria.findMany({
      where: { hotelId, stato: "da_confermare", quando: { gte: istanteItalia(oggiItalia(), "00:00") } },
      orderBy: { quando: "asc" },
      take: 50,
    }),
  ]);
  return {
    giorno,
    sveglie: sveglie.map((s) => ({
      id: s.id,
      ora: oraDi(s.perQuando!),
      camera: s.camera?.codice ?? null,
      ospite: s.segmento ? `${s.segmento.ospite.nome} ${s.segmento.ospite.cognome}` : null,
      prenotazioneId: s.segmento?.prenotazioneId ?? null,
      dettaglio: s.dettaglio,
      origine: s.origine,
      stato: s.stato,
      nota: s.nota,
      chiusaDa: s.chiusaDa,
    })),
    servizi: servizi.map((x) => ({
      id: x.id,
      ora: oraDi(x.quando),
      tipo: x.tipo as TipoServizio,
      prenotazioneId: x.prenotazioneId,
      destinatario: x.destinatario,
      camere: x.prenotazione ? camereDi(x.prenotazione.segmenti) : null,
      persone: x.persone,
      dettagli: x.dettagli,
      fornitore: x.fornitore,
      riferimento: x.riferimento,
      stato: x.stato as StatoServizio,
      nota: x.nota,
      creatoDa: x.creatoDa,
      esborso: x.addebito && !x.addebito.stornatoIl ? arrotonda(Number(x.addebito.prezzoUnitario) * x.addebito.quantita) : null,
    })),
    daConfermare: daConfermare
      .filter((x) => giornoDi(x.quando) !== giorno)
      .map((x) => ({ id: x.id, giorno: giornoDi(x.quando), ora: oraDi(x.quando), tipo: x.tipo as TipoServizio, destinatario: x.destinatario })),
  };
}

// ---------------- Sveglie ----------------

/** Sveglia presa al banco: è una richiesta "sveglia" per la camera (la vedono anche le altre liste delle richieste). */
export async function creaSveglia(hotelId: number, cameraId: number, giorno: string, ora: string, dettaglio: string, autore: string) {
  await creaRichiesta(hotelId, cameraId, { tipo: "sveglia", dettaglio, perQuando: `${giorno}T${ora}` }, autore);
}

/** Fatta (chiusa) o "non risponde": resta da rifare con la nota dell'ora del tentativo. */
export async function esitoSveglia(hotelId: number, id: number, esito: EsitoSveglia, utente: string) {
  const s = await prisma.richiestaOspite.findFirst({ where: { id, hotelId, tipo: "sveglia" } });
  if (!s) throw new Error("Sveglia non trovata.");
  if (s.stato !== "aperta") throw new Error("La sveglia è già chiusa.");
  if (esito === "fatta") {
    await prisma.richiestaOspite.update({ where: { id }, data: { stato: "fatta", chiusaIl: new Date(), chiusaDa: utente } });
    return;
  }
  const tentativo = `Non risponde alle ${oraDi(new Date())} (${utente})`;
  await prisma.richiestaOspite.update({ where: { id }, data: { nota: s.nota ? `${s.nota}; ${tentativo}` : tentativo } });
}

// ---------------- Servizi ----------------

async function prenotazioneValida(hotelId: number, prenotazioneId: number) {
  const p = await prisma.prenotazione.findFirst({ where: { id: prenotazioneId, hotelId }, include: { ospitePrenotante: { select: { nome: true, cognome: true } } } });
  if (!p) throw new Error("Prenotazione non trovata.");
  if (p.stato === "ANNULLATA") throw new Error("La prenotazione è annullata.");
  return p;
}

export async function creaServizio(hotelId: number, d: ServizioInput, utente: string) {
  validaServizio(d);
  const quando = istanteItalia(d.giorno, d.ora);
  if (Math.abs(quando.getTime() - Date.now()) > 366 * 86400000) throw new Error("La data è troppo lontana.");
  let destinatario = d.destinatario.trim();
  if (d.prenotazioneId) {
    const p = await prenotazioneValida(hotelId, d.prenotazioneId);
    destinatario ||= `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`;
  }
  const s = await prisma.servizioPortineria.create({
    data: {
      hotelId,
      prenotazioneId: d.prenotazioneId,
      destinatario,
      tipo: d.tipo,
      quando,
      persone: d.persone,
      dettagli: d.dettagli.trim() || null,
      fornitore: d.fornitore.trim() || null,
      riferimento: d.riferimento.trim() || null,
      creatoDa: utente,
    },
  });
  return s.id;
}

/** Cambio di stato (confermato con il numero di conferma, fatto, annullato con il motivo). */
export async function cambiaStatoServizio(hotelId: number, id: number, stato: StatoServizio, riferimento: string, nota: string, utente: string) {
  if (!(stato in STATI_SERVIZIO)) throw new Error("Stato non previsto.");
  const s = await prisma.servizioPortineria.findFirst({ where: { id, hotelId } });
  if (!s) throw new Error("Servizio non trovato.");
  if (!PASSAGGI[s.stato as StatoServizio]?.includes(stato)) throw new Error(`Da "${STATI_SERVIZIO[s.stato as StatoServizio]}" non si passa a "${STATI_SERVIZIO[stato]}".`);
  if (stato === "annullato" && !nota.trim()) throw new Error("Scrivi perché si annulla.");
  const n = await prisma.servizioPortineria.updateMany({
    where: { id, stato: s.stato },
    data: {
      stato,
      riferimento: riferimento.trim() || s.riferimento,
      nota: nota.trim() ? (s.nota ? `${s.nota}; ${nota.trim()}` : nota.trim()) : s.nota,
      aggiornatoDa: utente,
    },
  });
  if (n.count === 0) throw new Error("Il servizio è stato appena modificato da un altro operatore: ricarica.");
}

/**
 * Esborso: il portiere ha anticipato la spesa (taxi, biglietti, fiori…). Va sul conto della
 * prenotazione come esborso (fuori campo IVA) e resta legato al servizio. Uno per servizio.
 */
export async function addebitaEsborso(hotelId: number, id: number, importo: number, descrizione: string, utente: string) {
  const s = await prisma.servizioPortineria.findFirst({ where: { id, hotelId }, include: { addebito: true } });
  if (!s) throw new Error("Servizio non trovato.");
  if (!s.prenotazioneId) throw new Error("Il servizio non è legato a una prenotazione: non c'è un conto su cui addebitare.");
  if (s.addebito && !s.addebito.stornatoIl) throw new Error("L'esborso di questo servizio è già sul conto.");
  if (s.stato === "annullato") throw new Error("Il servizio è annullato.");
  if (!(importo > 0 && importo <= 10000)) throw new Error("Indica l'importo anticipato.");
  const dettaglio = [TIPI_SERVIZIO[s.tipo as TipoServizio] ?? s.tipo, s.dettagli].filter(Boolean).join(" - ");
  const a = await registraAddebito(
    hotelId,
    s.prenotazioneId,
    { tipo: "esborso", segmentoId: null, repartoId: null, data: oggiItalia(), descrizione: (descrizione.trim() || dettaglio).slice(0, 190), quantita: 1, prezzoUnitario: importo, buono: "", nota: `Agenda del portiere n. ${s.id}` },
    utente,
  );
  await prisma.servizioPortineria.update({ where: { id }, data: { addebitoId: a.id, aggiornatoDa: utente } });
}

/** Nota degli esborsi del portiere per una prenotazione (da stampare e far firmare). */
export async function notaEsborsi(hotelId: number, prenotazioneId: number) {
  const p = await prisma.prenotazione.findFirst({
    where: { id: prenotazioneId, hotelId },
    include: {
      hotel: { select: { nome: true } },
      ospitePrenotante: { select: { nome: true, cognome: true } },
      segmenti: SEGMENTI,
      addebiti: { where: { tipo: "esborso", stornatoIl: null }, orderBy: [{ data: "asc" }, { id: "asc" }] },
    },
  });
  if (!p) throw new Error("Prenotazione non trovata.");
  const righe = p.addebiti.map((a) => ({ id: a.id, data: a.data.toISOString().slice(0, 10), descrizione: a.descrizione, importo: arrotonda(Number(a.prezzoUnitario) * a.quantita), registratoDa: a.registratoDa }));
  return {
    hotel: p.hotel.nome,
    prenotazioneId: p.id,
    ospite: `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`,
    camere: camereDi(p.segmenti),
    righe,
    totale: arrotonda(righe.reduce((t, r) => t + r.importo, 0)),
  };
}

/** Camere occupate oggi o in arrivo domani (per la sveglia presa al banco). */
export async function camerePerSveglia(hotelId: number) {
  const oggi = oggiItalia();
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: {
      stato: { not: "ANNULLATO" },
      cameraId: { not: null },
      prenotazione: { hotelId, stato: { not: "ANNULLATA" } },
      dataInizio: { lte: new Date(dopo(oggi, 1)) },
      dataFine: { gte: new Date(oggi) },
    },
    include: { camera: { select: { id: true, codice: true } }, ospite: { select: { nome: true, cognome: true } } },
    orderBy: { camera: { codice: "asc" } },
  });
  return segmenti.map((s) => ({ cameraId: s.camera!.id, camera: s.camera!.codice, ospite: `${s.ospite.cognome} ${s.ospite.nome}`, prenotazioneId: s.prenotazioneId }));
}
