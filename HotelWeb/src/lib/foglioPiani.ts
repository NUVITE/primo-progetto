import { prisma } from "@/lib/prisma";
import { registraAddebito } from "@/lib/conto";
import { permessiAccesso, PERMESSI } from "@/lib/permessi";
import { impostaNonDisturbare, impostaStatoPulizia, quadroCamere } from "@/lib/pulizie";
import { biancheria, proponiDivisione, PESO_LAVORO, type Lavoro } from "@/lib/pulizieRegole";

/**
 * Foglio di lavoro dei piani: le camere da fare oggi (partenze e fermate) con la biancheria da
 * cambiare, divise fra le cameriere; la pagina «Le mie camere» di ognuna; i consumi del frigobar
 * segnati in camera vanno sul conto. Regole pure in pulizieRegole.ts.
 */

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const iso = (d: Date) => d.toISOString().slice(0, 10);
const giorniFra = (da: string, a: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / 86400000);

/** Utenti dell'hotel che possono pulire le camere (permesso «Pulire le proprie camere»). */
export async function cameriere(hotelId: number) {
  const [hotel, accessi] = await Promise.all([
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { modalitaUtenti: true } }),
    prisma.utenteHotel.findMany({ where: { hotelId, utente: { attivo: true } }, include: { utente: true, ruolo: true, ruoliAggiuntivi: { include: { ruolo: true } } } }),
  ]);
  return accessi
    .filter((a) => permessiAccesso(hotel.modalitaUtenti, [a.ruolo.permessi, ...a.ruoliAggiuntivi.map((r) => r.ruolo.permessi)]).includes(PERMESSI.PULIZIE_MIE))
    .map((a) => ({ id: a.utenteId, nome: a.utente.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

/** Le camere su cui c'è (o c'è stato) lavoro oggi, con biancheria, arrivi e assegnazione. */
export async function lavoroDelGiorno(hotelId: number) {
  const oggi = oggiItalia();
  const g = new Date(oggi);
  const [quadro, hotel, segmenti, assegnazioni] = await Promise.all([
    quadroCamere(hotelId),
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { cambioLenzuolaOgni: true, cambioAsciugamaniOgni: true, couverture: true } }),
    prisma.segmentoSoggiorno.findMany({
      where: { cameraId: { not: null }, usoDiurno: false, stato: { not: "ANNULLATO" }, prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, dataInizio: { lte: g }, dataFine: { gte: g } },
      include: { prenotazione: { select: { oraArrivo: true } } },
    }),
    prisma.assegnazionePulizia.findMany({ where: { hotelId, giorno: g }, include: { utente: true } }),
  ]);
  const compiti = quadro.camere.flatMap((c) => {
    if (c.fuoriServizio) return [];
    const daFare = c.stato !== "pronta";
    const fermata = c.occupazione === "fermata";
    const assegnata = assegnazioni.find((a) => a.cameraId === c.id);
    // Camera pronta e libera senza nulla di assegnato: niente da fare oggi.
    if (!daFare && !fermata && !assegnata) return [];
    const lavoro: Lavoro = fermata ? "fermata" : "partenza";
    const inCasa = segmenti.find((s) => s.cameraId === c.id && iso(s.dataInizio) < oggi && iso(s.dataFine) > oggi);
    const arrivo = segmenti.find((s) => s.cameraId === c.id && iso(s.dataInizio) === oggi);
    const notte = inCasa ? giorniFra(iso(inCasa.dataInizio), oggi) : 0;
    const eta = arrivo && Array.isArray(arrivo.etaBambini) ? (arrivo.etaBambini as number[]) : [];
    return [
      {
        cameraId: c.id,
        codice: c.codice,
        piano: c.piano,
        tipo: c.tipo,
        stato: c.stato,
        occupazione: c.occupazione,
        lavoro,
        fatta: !daFare,
        nonDisturbare: c.nonDisturbare,
        ospite: c.ospite,
        notte,
        ...biancheria(lavoro, notte, hotel.cambioLenzuolaOgni, hotel.cambioAsciugamaniOgni),
        couverture: hotel.couverture && (fermata || !!arrivo),
        arrivoOggi: !!arrivo,
        oraArrivo: arrivo?.prenotazione.oraArrivo ?? null,
        personeInArrivo: arrivo ? { adulti: arrivo.adulti, bambini: eta.length, piccoli: eta.filter((e) => e < 3).length } : null,
        assegnata: assegnata ? { utenteId: assegnata.utenteId, nome: assegnata.utente.nome, esito: assegnata.esito, nota: assegnata.nota ?? "" } : null,
      },
    ];
  });
  // Prima le camere con un arrivo oggi, poi le partenze, poi le fermate (dentro: piano e numero).
  compiti.sort(
    (a, b) =>
      Number(b.arrivoOggi) - Number(a.arrivoOggi) ||
      (a.lavoro === b.lavoro ? 0 : a.lavoro === "partenza" ? -1 : 1) ||
      (a.piano ?? "").localeCompare(b.piano ?? "", "it", { numeric: true }) ||
      a.codice.localeCompare(b.codice, "it", { numeric: true }),
  );
  return { oggi, controlloGovernante: quadro.controlloGovernante, impostazioni: hotel, compiti };
}

/** Foglio completo per la governante: lavoro, cameriere e carico di ognuna. */
export async function foglioPiani(hotelId: number) {
  const [lavoro, persone] = await Promise.all([lavoroDelGiorno(hotelId), cameriere(hotelId)]);
  const carichi = persone.map((p) => {
    const sue = lavoro.compiti.filter((c) => c.assegnata?.utenteId === p.id);
    return { ...p, camere: sue.length, carico: sue.reduce((t, c) => t + PESO_LAVORO[c.lavoro], 0), fatte: sue.filter((c) => c.fatta || c.assegnata?.esito).length };
  });
  return { ...lavoro, cameriere: carichi };
}

/** Assegna (o toglie, utenteId null) una camera per oggi. */
export async function assegnaCamera(hotelId: number, cameraId: number, utenteId: number | null) {
  const g = new Date(oggiItalia());
  await prisma.camera.findFirstOrThrow({ where: { id: cameraId, hotelId } });
  if (utenteId === null) {
    await prisma.assegnazionePulizia.deleteMany({ where: { cameraId, giorno: g } });
    return;
  }
  if (!(await cameriere(hotelId)).some((c) => c.id === utenteId)) throw new Error("Questa persona non ha il permesso di pulire le camere.");
  await prisma.assegnazionePulizia.upsert({
    where: { cameraId_giorno: { cameraId, giorno: g } },
    update: { utenteId },
    create: { hotelId, giorno: g, cameraId, utenteId },
  });
}

/** Proposta automatica fra le cameriere scelte: riassegna le camere non ancora fatte. */
export async function proponiAssegnazioni(hotelId: number, utenteIds: number[]) {
  const ammesse = new Set((await cameriere(hotelId)).map((c) => c.id));
  const scelte = [...new Set(utenteIds)].filter((id) => ammesse.has(id));
  if (!scelte.length) throw new Error("Scegli almeno una cameriera.");
  const { compiti } = await lavoroDelGiorno(hotelId);
  const daDividere = compiti.filter((c) => !c.fatta && !c.assegnata?.esito);
  const divisione = proponiDivisione(daDividere, scelte);
  for (const [cameraId, utenteId] of divisione) await assegnaCamera(hotelId, cameraId, utenteId);
  return divisione.size;
}

// ---------------- Le mie camere ----------------

/** Le camere assegnate oggi alla persona, nell'ordine di lavoro, e gli articoli del frigobar. */
export async function mieCamere(hotelId: number, utenteId: number) {
  const { compiti, controlloGovernante, oggi } = await lavoroDelGiorno(hotelId);
  const frigobar = await prisma.articoloReparto.findMany({
    where: { hotelId, attivo: true, reparto: { attivo: true, nome: { startsWith: "Frigobar" } } },
    orderBy: [{ ordine: "asc" }, { nome: "asc" }],
  });
  return {
    oggi,
    controlloGovernante,
    camere: compiti.filter((c) => c.assegnata?.utenteId === utenteId),
    frigobar: frigobar.map((a) => ({ id: a.id, nome: a.nome, prezzo: Number(a.prezzo) })),
  };
}

async function assegnazioneDi(hotelId: number, cameraId: number, utenteId: number, anchePerGovernante: boolean) {
  const a = await prisma.assegnazionePulizia.findUnique({ where: { cameraId_giorno: { cameraId, giorno: new Date(oggiItalia()) } } });
  if (a && a.hotelId === hotelId && (a.utenteId === utenteId || anchePerGovernante)) return a;
  throw new Error("Questa camera non è tra le tue di oggi.");
}

export type AzioneCamera = "inizia" | "finita" | "dnd" | "rifiutato" | "riapri";

/** Azione della cameriera sulla sua camera (la governante può farla su tutte). */
export async function azioneSullaCamera(hotelId: number, utente: { id: number; nome: string }, cameraId: number, azione: AzioneCamera, nota: string, governante = false) {
  const a = await assegnazioneDi(hotelId, cameraId, utente.id, governante);
  switch (azione) {
    case "inizia":
      await impostaStatoPulizia(hotelId, cameraId, "in_pulizia", utente.nome);
      break;
    case "finita":
      await impostaStatoPulizia(hotelId, cameraId, "finita", utente.nome);
      await prisma.assegnazionePulizia.update({ where: { id: a.id }, data: { esito: "fatta", nota: nota.trim() || a.nota } });
      break;
    case "dnd":
      await impostaNonDisturbare(hotelId, cameraId, true);
      await prisma.assegnazionePulizia.update({ where: { id: a.id }, data: { esito: "dnd", nota: nota.trim() || null } });
      break;
    case "rifiutato":
      await prisma.assegnazionePulizia.update({ where: { id: a.id }, data: { esito: "rifiutato", nota: nota.trim() || null } });
      break;
    case "riapri":
      await impostaNonDisturbare(hotelId, cameraId, false);
      await prisma.assegnazionePulizia.update({ where: { id: a.id }, data: { esito: null } });
      break;
    default:
      throw new Error("Azione non valida.");
  }
}

/**
 * Consumi del frigobar trovati in camera: vanno sul conto del soggiorno della camera (in casa o
 * partito oggi), uno per articolo, con il buono "FRIGOBAR". La camera deve essere tra le sue.
 */
export async function segnaFrigobar(hotelId: number, utente: { id: number; nome: string }, cameraId: number, righe: { articoloId: number; quantita: number }[], governante = false) {
  await assegnazioneDi(hotelId, cameraId, utente.id, governante);
  const valide = righe.filter((r) => r.quantita > 0);
  if (!valide.length) throw new Error("Segna almeno un articolo.");
  if (valide.some((r) => !Number.isInteger(r.quantita) || r.quantita > 20)) throw new Error("Quantità non valida.");
  const oggi = oggiItalia();
  const g = new Date(oggi);
  const seg = await prisma.segmentoSoggiorno.findFirst({
    where: { cameraId, usoDiurno: false, stato: { not: "ANNULLATO" }, prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, dataInizio: { lt: g }, dataFine: { gte: g }, presenze: { some: { stato: { in: ["arrivato", "partito"] } } } },
    orderBy: { dataFine: "asc" },
  });
  if (!seg) throw new Error("Nessun ospite in questa camera da ieri a oggi: avvisa la reception.");
  const articoli = await prisma.articoloReparto.findMany({ where: { hotelId, id: { in: valide.map((r) => r.articoloId) }, attivo: true } });
  for (const r of valide) {
    const a = articoli.find((x) => x.id === r.articoloId);
    if (!a) throw new Error("Articolo non valido.");
    await registraAddebito(
      hotelId,
      seg.prenotazioneId,
      { tipo: "extra", segmentoId: seg.id, repartoId: a.repartoId, data: oggi, descrizione: a.nome, quantita: r.quantita, prezzoUnitario: Number(a.prezzo), buono: "FRIGOBAR", nota: "" },
      utente.nome,
    );
  }
  return seg.prenotazioneId;
}

// ---------------- Impostazioni e articoli ----------------

export async function impostaBiancheria(hotelId: number, d: { cambioLenzuolaOgni: number; cambioAsciugamaniOgni: number | null; couverture: boolean }) {
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= 14;
  if (!ok(d.cambioLenzuolaOgni)) throw new Error("Lenzuola: indica ogni quante notti (da 1 a 14).");
  if (d.cambioAsciugamaniOgni !== null && !ok(d.cambioAsciugamaniOgni)) throw new Error("Asciugamani: indica ogni quante notti (da 1 a 14) o «su richiesta».");
  await prisma.hotel.update({ where: { id: hotelId }, data: d });
}

export async function elencoArticoli(hotelId: number) {
  const a = await prisma.articoloReparto.findMany({ where: { hotelId }, orderBy: [{ repartoId: "asc" }, { ordine: "asc" }, { nome: "asc" }] });
  return a.map((x) => ({ id: x.id, repartoId: x.repartoId, nome: x.nome, prezzo: Number(x.prezzo), attivo: x.attivo }));
}

export async function salvaArticolo(hotelId: number, id: number | null, d: { repartoId: number; nome: string; prezzo: number; attivo: boolean }) {
  const nome = d.nome.trim();
  if (!nome) throw new Error("Indica il nome dell'articolo.");
  if (!(d.prezzo > 0)) throw new Error("Indica il prezzo (IVA inclusa).");
  const r = await prisma.repartoAddebito.findFirst({ where: { id: d.repartoId, hotelId } });
  if (!r || r.esborso) throw new Error("Reparto non valido.");
  const dati = { repartoId: d.repartoId, nome, prezzo: d.prezzo, attivo: d.attivo };
  if (id) {
    await prisma.articoloReparto.findFirstOrThrow({ where: { id, hotelId } });
    await prisma.articoloReparto.update({ where: { id }, data: dati });
  } else {
    await prisma.articoloReparto.create({ data: { hotelId, ...dati } });
  }
}
