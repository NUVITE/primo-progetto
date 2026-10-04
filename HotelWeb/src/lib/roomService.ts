import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { registraAddebito } from "@/lib/conto";
import { noteDegliOspiti } from "@/lib/noteAlimentari";
import { piattiDaEvitare } from "@/lib/menuRegole";
import { istanteItalia } from "@/lib/politicheRegole";

/**
 * Room service. L'ospite ordina dal telefono con il QR del cartoncino: il link contiene un codice
 * segreto del soggiorno, valido solo finché qualcuno della camera è in casa (dopo la partenza non
 * funziona più, e il prossimo ospite ha un cartoncino nuovo). La reception può prendere l'ordine al
 * telefono. Alla consegna le righe con un prezzo vanno sul conto della camera.
 * La pagina dell'ospite non mostra dati personali né note alimentari: gli allergeni dell'ospite si
 * confrontano con l'ordine solo sulla schermata del personale.
 */

export const STATI_ORDINE = {
  ricevuto: "Ricevuto",
  in_preparazione: "In preparazione",
  pronto: "Pronto da portare",
  consegnato: "Consegnato",
  annullato: "Annullato",
} as const;
export type StatoOrdine = keyof typeof STATI_ORDINE;
// Si può saltare in avanti (nel B&B chi prepara è anche chi porta), mai tornare indietro.
const SEQUENZA: StatoOrdine[] = ["ricevuto", "in_preparazione", "pronto", "consegnato"];
const APERTI: StatoOrdine[] = ["ricevuto", "in_preparazione", "pronto"];
export const MAX_ORDINI_APERTI_QR = 3;

const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const oraDi = (d: Date) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
const giornoDi = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
const arrotonda = (n: number) => Math.round(n * 100) / 100;

const includeSegmento = { camera: true, ospite: true, presenze: true, prenotazione: { include: { hotel: true } } } as const;
type SegmentoCompleto = NonNullable<Awaited<ReturnType<typeof prisma.segmentoSoggiorno.findFirst<{ include: typeof includeSegmento }>>>>;

/** Qualcuno della camera è arrivato e non è ancora partito. */
function inCasa(s: SegmentoCompleto) {
  return s.stato !== "ANNULLATO" && s.prenotazione.stato !== "ANNULLATA" && s.presenze.some((p) => p.stato === "arrivato");
}

// ---------------- Cartoncino con il QR ----------------

/** Codice del soggiorno per il QR (si crea la prima volta); nuovo=true lo cambia (cartoncino perso). */
export async function codiceCartoncino(hotelId: number, segmentoId: number, nuovo = false) {
  const s = await prisma.segmentoSoggiorno.findFirst({ where: { id: segmentoId, prenotazione: { hotelId } }, include: includeSegmento });
  if (!s) throw new Error("Soggiorno non trovato.");
  if (s.stato === "ANNULLATO" || s.prenotazione.stato === "ANNULLATA") throw new Error("Il soggiorno è annullato.");
  if (s.codiceRoomService && !nuovo) return { codice: s.codiceRoomService, segmento: s };
  const codice = randomBytes(18).toString("base64url");
  await prisma.segmentoSoggiorno.update({ where: { id: s.id }, data: { codiceRoomService: codice } });
  return { codice, segmento: s };
}

// ---------------- Menu disponibili ----------------

/** Piatti dei menu room service attivi oggi, con prezzo, allergeni e orari del menu. */
async function menuRoomService(hotelId: number, giorno: string) {
  const menu = await prisma.menu.findMany({
    where: { hotelId, attivo: true, roomService: true, OR: [{ giorno: null }, { giorno: new Date(giorno) }] },
    include: { voci: { where: { disponibile: true, piatto: { attivo: true } }, include: { piatto: true }, orderBy: [{ ordine: "asc" }, { id: "asc" }] } },
    orderBy: { nome: "asc" },
  });
  return menu.map((m) => ({
    id: m.id,
    nome: m.nome,
    dalle: m.dalle,
    alle: m.alle,
    note: m.note ?? "",
    voci: m.voci.map((v) => ({
      voceId: v.id,
      piattoId: v.piattoId,
      nome: v.piatto.nome,
      descrizione: v.piatto.descrizione ?? "",
      categoria: v.piatto.categoria,
      prezzo: v.prezzo !== null ? Number(v.prezzo) : v.piatto.prezzo !== null ? Number(v.piatto.prezzo) : 0,
      allergeni: (v.piatto.allergeni as string[]) ?? [],
      regimi: (v.piatto.regimi as string[]) ?? [],
      repartoId: v.piatto.repartoId,
    })),
  }));
}

// ---------------- Pagina dell'ospite ----------------

/** Quello che vede l'ospite aprendo il link del QR (null = codice inesistente). */
export async function paginaOspite(codice: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(codice)) return null;
  const s = await prisma.segmentoSoggiorno.findUnique({ where: { codiceRoomService: codice }, include: includeSegmento });
  if (!s) return null;
  const hotel = s.prenotazione.hotel;
  const base = { hotel: hotel.nome, camera: s.camera?.codice ?? null };
  if (!inCasa(s)) return { ...base, attivo: false as const };
  const moduli = Array.isArray(hotel.moduli) ? (hotel.moduli as string[]) : [];
  if (!moduli.includes("ristorazione")) return { ...base, attivo: false as const };
  const ordini = await prisma.ordineRoomService.findMany({ where: { segmentoId: s.id, creatoIl: { gte: new Date(Date.now() - 36 * 3600000) } }, include: { righe: true }, orderBy: { creatoIl: "desc" } });
  return {
    ...base,
    attivo: true as const,
    partenza: s.dataFine.toISOString().slice(0, 10),
    oggi: oggi(),
    menu: await menuRoomService(hotel.id, oggi()),
    ordini: ordini.map((o) => ({
      id: o.id,
      stato: o.stato as StatoOrdine,
      ora: oraDi(o.creatoIl),
      perQuando: o.perQuando ? `${giornoDi(o.perQuando) === oggi() ? "oggi" : "domani"} alle ${oraDi(o.perQuando)}` : null,
      totale: Number(o.totale),
      righe: o.righe.map((r) => `${r.quantita} × ${r.descrizione}`),
    })),
  };
}

// ---------------- Creazione dell'ordine ----------------

export type OrdineInput = {
  righe: { voceId: number; quantita: number }[];
  // "aaaa-mm-ggThh:mm" ora italiana, null = appena possibile
  perQuando: string | null;
  nota: string;
};

async function creaOrdineSu(s: SegmentoCompleto, d: OrdineInput, canale: "qr" | "telefono", operatore: string | null) {
  const hotelId = s.prenotazione.hotelId;
  if (!inCasa(s)) throw new Error("Il room service si ordina solo durante il soggiorno, dopo l'arrivo.");
  if (!d.righe.length) throw new Error("Scegli almeno un piatto.");
  if (d.righe.length > 20) throw new Error("Troppe voci in un solo ordine.");
  if (d.righe.some((r) => !Number.isInteger(r.quantita) || r.quantita < 1 || r.quantita > 10)) throw new Error("Quantità non valida (da 1 a 10).");
  const nota = d.nota.trim();
  if (nota.length > 300) throw new Error("La nota è troppo lunga (massimo 300 caratteri).");

  // Quando: adesso, oppure un orario fra adesso e la fine del soggiorno (al massimo 36 ore).
  let quando: Date | null = null;
  if (d.perQuando) {
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(d.perQuando);
    if (!m) throw new Error("Orario non valido.");
    quando = istanteItalia(m[1], m[2]);
    if (quando.getTime() < Date.now() - 5 * 60000) throw new Error("L'orario richiesto è già passato.");
    if (quando.getTime() > Date.now() + 36 * 3600000) throw new Error("Si può ordinare al massimo per domani.");
    if (m[1] > s.dataFine.toISOString().slice(0, 10)) throw new Error("L'orario è dopo la partenza.");
  }
  const giorno = giornoDi(quando ?? new Date());
  const ora = oraDi(quando ?? new Date());

  if (canale === "qr") {
    const aperti = await prisma.ordineRoomService.count({ where: { segmentoId: s.id, stato: { in: APERTI } } });
    if (aperti >= MAX_ORDINI_APERTI_QR) throw new Error("Ci sono già diversi ordini in corso per la camera: per altro chiama la reception.");
  }

  const menu = await menuRoomService(hotelId, giorno);
  const reparti = await prisma.repartoAddebito.findMany({ where: { hotelId, attivo: true, esborso: false }, orderBy: { ordine: "asc" } });
  const repartoPredefinito = reparti.find((r) => r.nome.toLowerCase().startsWith("ristorante")) ?? reparti[0];
  const righe = d.righe.map((r) => {
    const m = menu.find((x) => x.voci.some((v) => v.voceId === r.voceId));
    const v = m?.voci.find((x) => x.voceId === r.voceId);
    if (!m || !v) throw new Error("Un piatto scelto non è più disponibile: ricarica il menu.");
    if (m.dalle && m.alle && (ora < m.dalle || ora > m.alle)) throw new Error(`«${v.nome}» si ordina dalle ${m.dalle} alle ${m.alle}.`);
    return {
      piattoId: v.piattoId,
      descrizione: v.nome,
      quantita: r.quantita,
      prezzoUnitario: v.prezzo,
      repartoId: v.repartoId ?? repartoPredefinito?.id ?? null,
      allergeni: v.allergeni,
    };
  });
  const totale = arrotonda(righe.reduce((t, r) => t + r.quantita * r.prezzoUnitario, 0));
  const ordine = await prisma.ordineRoomService.create({
    data: { hotelId, segmentoId: s.id, canale, perQuando: quando, nota: nota || null, totale, creatoDa: operatore, righe: { create: righe } },
  });
  return ordine.id;
}

/** Ordine dal QR: il codice identifica il soggiorno. */
export async function ordinaDaQr(codice: string, d: OrdineInput) {
  const s = /^[A-Za-z0-9_-]{20,40}$/.test(codice) ? await prisma.segmentoSoggiorno.findUnique({ where: { codiceRoomService: codice }, include: includeSegmento }) : null;
  if (!s) throw new Error("Link non valido.");
  const moduli = Array.isArray(s.prenotazione.hotel.moduli) ? (s.prenotazione.hotel.moduli as string[]) : [];
  if (!moduli.includes("ristorazione")) throw new Error("Il room service non è attivo.");
  return creaOrdineSu(s, d, "qr", null);
}

/** Ordine preso al telefono dalla reception per una camera in casa. */
export async function ordinaAlTelefono(hotelId: number, segmentoId: number, d: OrdineInput, operatore: string) {
  const s = await prisma.segmentoSoggiorno.findFirst({ where: { id: segmentoId, prenotazione: { hotelId } }, include: includeSegmento });
  if (!s) throw new Error("Soggiorno non trovato.");
  return creaOrdineSu(s, d, "telefono", operatore);
}

// ---------------- Schermata del personale ----------------

/** Ordini aperti e quelli chiusi oggi; con conNote, i piatti in conflitto con le note dell'ospite. */
export async function elencoOrdini(hotelId: number, conNote: boolean) {
  const inizioOggi = istanteItalia(oggi(), "00:00");
  const ordini = await prisma.ordineRoomService.findMany({
    where: { hotelId, OR: [{ stato: { in: APERTI } }, { aggiornatoIl: { gte: inizioOggi } }] },
    include: { righe: true, segmento: { include: { camera: true, ospite: true, presenze: { include: { ospite: true } } } } },
    orderBy: { creatoIl: "asc" },
  });
  const ospiti = [...new Set(ordini.flatMap((o) => [o.segmento.ospiteId, ...o.segmento.presenze.map((p) => p.ospiteId)]))];
  const note = conNote ? await noteDegliOspiti(hotelId, ospiti) : {};
  const [menuOggi, camere] = await Promise.all([menuRoomService(hotelId, oggi()), camereInCasaPerRoomService(hotelId)]);
  return {
    conNote,
    ordini: ordini.map((o) => {
      const persone = [o.segmento.ospite, ...o.segmento.presenze.map((p) => p.ospite)].filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
      const righe = o.righe.map((r) => ({ nome: r.descrizione, allergeni: (r.allergeni as string[]) ?? [] }));
      return {
        id: o.id,
        stato: o.stato as StatoOrdine,
        canale: o.canale,
        camera: o.segmento.camera?.codice ?? null,
        ospite: `${o.segmento.ospite.cognome} ${o.segmento.ospite.nome}`.trim(),
        prenotazioneId: o.segmento.prenotazioneId,
        creatoIl: o.creatoIl.toISOString(),
        ora: oraDi(o.creatoIl),
        perQuando: o.perQuando ? `${giornoDi(o.perQuando) === oggi() ? "oggi" : giornoDi(o.perQuando).split("-").reverse().join("/")} alle ${oraDi(o.perQuando)}` : null,
        nota: o.nota ?? "",
        totale: Number(o.totale),
        creatoDa: o.creatoDa,
        aggiornatoDa: o.aggiornatoDa,
        motivoAnnullato: o.motivoAnnullato ?? "",
        righe: o.righe.map((r) => ({ quantita: r.quantita, descrizione: r.descrizione, prezzo: Number(r.prezzoUnitario) })),
        // Allergeni dell'ospite (o di chi è in camera) presenti nei piatti ordinati.
        conflitti: persone
          .filter((p) => note[p.id])
          .flatMap((p) => piattiDaEvitare(note[p.id].voci, righe).map((x) => ({ persona: `${p.nome} ${p.cognome}`.trim(), ...x }))),
        noteCamera: persone.filter((p) => note[p.id]).map((p) => `${p.nome} ${p.cognome}: ${note[p.id].sintesi}`),
      };
    }),
    menu: menuOggi,
    camere,
  };
}

async function camereInCasaPerRoomService(hotelId: number) {
  const g = new Date(oggi());
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: { prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, stato: { not: "ANNULLATO" }, dataInizio: { lte: g }, dataFine: { gte: g }, presenze: { some: { stato: "arrivato" } } },
    include: { camera: true, ospite: true },
  });
  return segmenti
    .map((s) => ({ segmentoId: s.id, camera: s.camera?.codice ?? null, nome: `${s.ospite.cognome} ${s.ospite.nome}`.trim() }))
    .sort((a, b) => (a.camera ?? "~").localeCompare(b.camera ?? "~", "it", { numeric: true }));
}

/**
 * Fa avanzare l'ordine (ricevuto → in preparazione → pronto → consegnato) o lo annulla con il motivo.
 * Alla consegna ogni riga con un prezzo diventa un addebito sul conto della camera.
 */
export async function cambiaStatoOrdine(hotelId: number, id: number, nuovo: StatoOrdine, utente: string, motivo = "") {
  const o = await prisma.ordineRoomService.findFirst({ where: { id, hotelId }, include: { righe: true, segmento: true } });
  if (!o) throw new Error("Ordine non trovato.");
  const attuale = o.stato as StatoOrdine;
  if (nuovo === "annullato") {
    if (!APERTI.includes(attuale)) throw new Error("L'ordine è già chiuso.");
    if (!motivo.trim()) throw new Error("Scrivi il motivo dell'annullamento.");
  } else if (!APERTI.includes(attuale) || SEQUENZA.indexOf(nuovo) <= SEQUENZA.indexOf(attuale)) {
    throw new Error(`L'ordine è «${STATI_ORDINE[attuale]}»: non può passare a «${STATI_ORDINE[nuovo] ?? nuovo}».`);
  }
  if (nuovo === "consegnato") {
    const prenotazione = await prisma.prenotazione.findUniqueOrThrow({ where: { id: o.segmento.prenotazioneId } });
    if (prenotazione.stato === "ANNULLATA") throw new Error("La prenotazione è annullata: annulla l'ordine.");
    if (o.righe.some((r) => Number(r.prezzoUnitario) > 0 && !r.repartoId)) throw new Error("Manca il reparto per l'IVA di un piatto: impostalo in Piatti e allergeni.");
    // Se una consegna precedente si è fermata a metà, gli addebiti già fatti non si ripetono.
    const giaAddebitati = await prisma.addebitoConto.count({ where: { prenotazioneId: o.segmento.prenotazioneId, buono: `RS-${o.id}`, stornatoIl: null } });
    for (const r of giaAddebitati ? [] : o.righe) {
      if (!(Number(r.prezzoUnitario) > 0)) continue;
      await registraAddebito(
        hotelId,
        o.segmento.prenotazioneId,
        {
          tipo: "extra",
          segmentoId: o.segmentoId,
          repartoId: r.repartoId,
          data: oggi(),
          descrizione: `Room service: ${r.descrizione}`,
          quantita: r.quantita,
          prezzoUnitario: Number(r.prezzoUnitario),
          buono: `RS-${o.id}`,
          nota: "",
        },
        utente,
      );
    }
  }
  await prisma.ordineRoomService.update({
    where: { id },
    data: {
      stato: nuovo,
      aggiornatoDa: utente,
      ...(nuovo === "consegnato" ? { consegnatoIl: new Date() } : {}),
      ...(nuovo === "annullato" ? { motivoAnnullato: motivo.trim() } : {}),
    },
  });
}
