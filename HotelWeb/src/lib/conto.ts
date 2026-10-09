import { prisma } from "@/lib/prisma";
import { calcolaTotaliPrenotazione, trovaPrenotazione } from "@/lib/prenotazioni";

/**
 * Conto della prenotazione: tutte le righe che compongono il dovuto, con l'IVA per voce.
 * - righe AUTOMATICHE, ricavate dalla prenotazione (camere, uso diurno, servizi, tassa, penale);
 * - righe A MANO (AddebitoConto): consumi dei reparti, esborsi anticipati, abbuoni.
 * Prezzi IVA inclusa: imponibile e imposta si ricavano per scorporo. Il totale coincide sempre con
 * quello della prenotazione (calcolaTotaliPrenotazione), che comprende anche gli addebiti.
 * La fattura la emette il gestionale esterno: qui si preparano righe, aliquote e nature.
 */

/** Reparti con cui nasce ogni hotel: aliquote di partenza DA VERIFICARE con il commercialista. */
export const REPARTI_PREDEFINITI: { nome: string; aliquotaIva: number | null; esborso: boolean }[] = [
  { nome: "Bar", aliquotaIva: 10, esborso: false },
  { nome: "Ristorante", aliquotaIva: 10, esborso: false },
  { nome: "Frigobar", aliquotaIva: 10, esborso: false },
  { nome: "Lavanderia", aliquotaIva: 22, esborso: false },
  { nome: "Garage", aliquotaIva: 22, esborso: false },
  { nome: "Telefono", aliquotaIva: 22, esborso: false },
  { nome: "Esborsi (spese anticipate)", aliquotaIva: null, esborso: true },
];

export const TIPI_ADDEBITO = { extra: "Consumo", esborso: "Esborso (spesa anticipata)", abbuono: "Abbuono / sconto" } as const;
export type TipoAddebito = keyof typeof TIPI_ADDEBITO;

const arrotonda = (n: number) => Math.round(n * 100) / 100;
const it = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

/** Scorporo dell'IVA da un importo IVA inclusa; senza aliquota (fuori campo) l'imponibile è l'importo. */
export function scorporo(importo: number, aliquota: number | null) {
  if (aliquota === null) return { imponibile: arrotonda(importo), iva: 0 };
  const imponibile = arrotonda(importo / (1 + aliquota / 100));
  return { imponibile, iva: arrotonda(importo - imponibile) };
}

export type RigaConto = {
  chiave: string;
  tipo: "camera" | "uso_diurno" | "servizio" | "tassa" | "penale" | TipoAddebito;
  data: string | null;
  descrizione: string;
  camera: string | null;
  quantita: number;
  prezzoUnitario: number;
  importo: number;
  // null = fuori campo IVA (con il motivo in "natura")
  aliquota: number | null;
  natura: string | null;
  imponibile: number;
  iva: number;
  addebitoId: number | null;
  reparto: string | null;
  buono: string | null;
  registratoDa: string | null;
  stornato: { il: string; da: string; motivo: string } | null;
};

type Prenotazione = Awaited<ReturnType<typeof trovaPrenotazione>>;

function riga(r: Omit<RigaConto, "imponibile" | "iva" | "addebitoId" | "reparto" | "buono" | "registratoDa" | "stornato"> & Partial<RigaConto>): RigaConto {
  const { imponibile, iva } = scorporo(r.importo, r.aliquota);
  return { addebitoId: null, reparto: null, buono: null, registratoDa: null, stornato: null, ...r, imponibile, iva };
}

/** Righe del conto di una prenotazione (già caricata con trovaPrenotazione). */
export function righeConto(p: Prenotazione, aliquotaAlloggio: number): RigaConto[] {
  const righe: RigaConto[] = [];
  if (p.stato === "ANNULLATA") {
    if (p.penale !== null && Number(p.penale) > 0) {
      righe.push(
        riga({ chiave: "penale", tipo: "penale", data: p.annullataIl ? p.annullataIl.toISOString().slice(0, 10) : null, descrizione: "Penale per annullamento", camera: null, quantita: 1, prezzoUnitario: Number(p.penale), importo: Number(p.penale), aliquota: null, natura: "Fuori campo IVA (penale)" }),
      );
    }
  } else {
    const attivi = p.segmenti.filter((s) => s.stato !== "ANNULLATO");
    for (const s of attivi) {
      const camera = s.camera?.codice ?? null;
      if (s.usoDiurno) {
        const importo = Number(s.prezzoUsoDiurno ?? 0);
        righe.push(
          riga({ chiave: `uso-${s.id}`, tipo: "uso_diurno", data: s.dataInizio.toISOString().slice(0, 10), descrizione: `Uso diurno ${s.oraDal}–${s.oraAl}`, camera, quantita: 1, prezzoUnitario: importo, importo, aliquota: aliquotaAlloggio, natura: null }),
        );
        continue;
      }
      const notti = s.notti.length;
      const importo = arrotonda(s.notti.reduce((t, n) => t + Number(n.prezzo), 0));
      righe.push(
        riga({
          chiave: `camera-${s.id}`,
          tipo: "camera",
          data: s.dataInizio.toISOString().slice(0, 10),
          descrizione: `${camera ? `Camera ${camera}` : s.tipoCamera.descrizione} · ${notti} ${notti === 1 ? "notte" : "notti"} dal ${it(s.dataInizio)} · ${s.trattamento}`,
          camera,
          quantita: notti,
          prezzoUnitario: notti ? arrotonda(importo / notti) : 0,
          importo,
          aliquota: aliquotaAlloggio,
          natura: null,
        }),
      );
    }
    // Servizi aggiunti (un servizio legato solo a camere annullate non si addebita più).
    const idAttivi = new Set(attivi.map((s) => s.id));
    for (const sv of p.serviziAggiunti) {
      if (sv.segmenti.length && !sv.segmenti.some((x) => idAttivi.has(x.segmentoId))) continue;
      const importo = arrotonda(Number(sv.prezzoUnitario) * sv.quantita);
      const aliquota = sv.aliquotaIva !== null ? Number(sv.aliquotaIva) : sv.servizioCatalogo?.aliquotaIva != null ? Number(sv.servizioCatalogo.aliquotaIva) : aliquotaAlloggio;
      righe.push(
        riga({
          chiave: `servizio-${sv.id}`,
          tipo: "servizio",
          data: sv.data ? sv.data.toISOString().slice(0, 10) : null,
          descrizione: sv.servizioCatalogo?.nome ?? sv.descrizione ?? "Servizio",
          camera: sv.segmenti.map((x) => x.segmento.camera?.codice).filter(Boolean).join(", ") || null,
          quantita: sv.quantita,
          prezzoUnitario: Number(sv.prezzoUnitario),
          importo,
          aliquota,
          natura: null,
        }),
      );
    }
    const tassa = arrotonda(attivi.reduce((t, s) => t + s.notti.reduce((u, n) => u + n.tasse.reduce((v, x) => v + Number(x.importo), 0), 0), 0));
    if (tassa > 0) {
      righe.push(
        riga({ chiave: "tassa", tipo: "tassa", data: null, descrizione: "Imposta di soggiorno", camera: null, quantita: 1, prezzoUnitario: tassa, importo: tassa, aliquota: null, natura: "Fuori campo IVA (art. 15 DPR 633/72)" }),
      );
    }
    // Persone prenotate non ancora registrate: la loro imposta è stimata finché non si registrano.
    const stimata = arrotonda(attivi.reduce((t, s) => t + s.tassaStimata.importo, 0));
    const persone = attivi.reduce((t, s) => t + s.tassaStimata.persone, 0);
    if (stimata > 0) {
      righe.push(
        riga({
          chiave: "tassa-stimata",
          tipo: "tassa",
          data: null,
          descrizione: `Imposta di soggiorno stimata (${persone} ${persone === 1 ? "persona non ancora registrata" : "persone non ancora registrate"})`,
          camera: null,
          quantita: 1,
          prezzoUnitario: stimata,
          importo: stimata,
          aliquota: null,
          natura: "Fuori campo IVA (art. 15 DPR 633/72)",
        }),
      );
    }
  }
  // Righe a mano: consumi dei reparti, esborsi, abbuoni (anche gli stornati, che restano visibili).
  for (const a of p.addebiti) {
    const segno = a.tipo === "abbuono" ? -1 : 1;
    const importo = arrotonda(segno * Number(a.prezzoUnitario) * a.quantita);
    const aliquota = a.aliquotaIva === null ? null : Number(a.aliquotaIva);
    righe.push(
      riga({
        chiave: `addebito-${a.id}`,
        tipo: a.tipo as TipoAddebito,
        data: a.data.toISOString().slice(0, 10),
        descrizione: a.descrizione,
        camera: a.segmento?.camera?.codice ?? null,
        quantita: a.quantita,
        prezzoUnitario: segno * Number(a.prezzoUnitario),
        importo,
        aliquota,
        natura: aliquota === null ? (a.tipo === "esborso" ? "Fuori campo IVA (esborso art. 15)" : "Fuori campo IVA") : null,
        addebitoId: a.id,
        reparto: a.reparto?.nome ?? null,
        buono: a.buono,
        registratoDa: a.registratoDa,
        stornato: a.stornatoIl ? { il: a.stornatoIl.toISOString(), da: a.stornatoDa ?? "", motivo: a.motivoStorno ?? "" } : null,
      }),
    );
  }
  return righe;
}

/**
 * Riepilogo per aliquota (e per natura dei fuori campo) delle righe non stornate. Imponibile e imposta
 * si calcolano sul totale di ogni aliquota, come nel riepilogo di una fattura.
 */
export function riepilogoIva(righe: RigaConto[]) {
  const perAliquota = new Map<string, { aliquota: number | null; natura: string | null; totale: number }>();
  for (const r of righe.filter((x) => !x.stornato)) {
    const k = r.aliquota === null ? `n:${r.natura}` : `a:${r.aliquota}`;
    const v = perAliquota.get(k) ?? { aliquota: r.aliquota, natura: r.aliquota === null ? r.natura : null, totale: 0 };
    v.totale = arrotonda(v.totale + r.importo);
    perAliquota.set(k, v);
  }
  return [...perAliquota.values()].map((v) => ({ ...v, ...scorporo(v.totale, v.aliquota) })).sort((a, b) => (b.aliquota ?? -1) - (a.aliquota ?? -1));
}

/** Conto completo: righe, riepilogo per aliquota, totale, pagato e da pagare. */
export async function contoPrenotazione(hotelId: number, id: number) {
  const [p, hotel] = await Promise.all([trovaPrenotazione(hotelId, id), prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { aliquotaAlloggio: true } })]);
  const righe = righeConto(p, Number(hotel.aliquotaAlloggio));
  const valide = righe.filter((r) => !r.stornato);
  const t = calcolaTotaliPrenotazione(p);
  return {
    righe,
    riepilogoIva: riepilogoIva(righe),
    totale: arrotonda(valide.reduce((s, r) => s + r.importo, 0)),
    pagato: t.pagato,
    daPagare: t.daPagare,
    // Controllo di coerenza con il motore della prenotazione (devono sempre coincidere).
    totalePrenotazione: t.totale,
  };
}

// ---------------- Addebiti a mano ----------------

export type AddebitoInput = {
  tipo: TipoAddebito;
  segmentoId: number | null;
  repartoId: number | null;
  data: string;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  buono: string;
  nota: string;
};

/**
 * Registra un consumo, un esborso o un abbuono sul conto. L'IVA è quella del reparto (esborsi e abbuoni
 * senza reparto: fuori campo; un abbuono con reparto riduce quella aliquota).
 */
export async function registraAddebito(hotelId: number, prenotazioneId: number, d: AddebitoInput, operatore: string) {
  if (!(d.tipo in TIPI_ADDEBITO)) throw new Error("Tipo di addebito non valido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.data)) throw new Error("Indica la data.");
  if (!(Number.isInteger(d.quantita) && d.quantita > 0)) throw new Error("La quantità è un numero intero maggiore di zero.");
  if (!(d.prezzoUnitario > 0)) throw new Error("Indica l'importo.");
  const p = await prisma.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId } });
  if (p.stato === "ANNULLATA") throw new Error("La prenotazione è annullata: non si addebita più nulla.");
  if (d.segmentoId) await prisma.segmentoSoggiorno.findFirstOrThrow({ where: { id: d.segmentoId, prenotazioneId } });
  const reparto = d.repartoId ? await prisma.repartoAddebito.findFirstOrThrow({ where: { id: d.repartoId, hotelId } }) : null;
  if (d.tipo === "extra" && !reparto) throw new Error("Scegli il reparto del consumo.");
  if (d.tipo === "abbuono" && !d.nota.trim()) throw new Error("Scrivi il motivo dell'abbuono.");
  const esborso = d.tipo === "esborso" || !!reparto?.esborso;
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { aliquotaAlloggio: true } });
  const descrizione = d.descrizione.trim() || reparto?.nome || TIPI_ADDEBITO[d.tipo];
  return prisma.addebitoConto.create({
    data: {
      prenotazioneId,
      segmentoId: d.segmentoId,
      repartoId: reparto?.id ?? null,
      tipo: esborso && d.tipo === "extra" ? "esborso" : d.tipo,
      data: new Date(`${d.data}T00:00:00.000Z`),
      descrizione,
      quantita: d.quantita,
      prezzoUnitario: arrotonda(d.prezzoUnitario),
      aliquotaIva: esborso ? null : reparto ? reparto.aliquotaIva : d.tipo === "abbuono" ? hotel.aliquotaAlloggio : null,
      buono: d.buono.trim() || null,
      nota: d.nota.trim() || null,
      registratoDa: operatore,
    },
  });
}

/** Un addebito sbagliato non si cancella: si storna con il motivo e resta visibile. */
export async function stornaAddebito(hotelId: number, addebitoId: number, motivo: string, operatore: string) {
  if (!motivo.trim()) throw new Error("Scrivi il motivo dello storno.");
  const a = await prisma.addebitoConto.findFirstOrThrow({ where: { id: addebitoId, prenotazione: { hotelId } } });
  if (a.stornatoIl) throw new Error("L'addebito è già stornato.");
  await prisma.addebitoConto.update({ where: { id: a.id }, data: { stornatoIl: new Date(), stornatoDa: operatore, motivoStorno: motivo.trim() } });
  return a.prenotazioneId;
}

// ---------------- Reparti ----------------

export async function elencoReparti(hotelId: number, soloAttivi = false) {
  const r = await prisma.repartoAddebito.findMany({ where: { hotelId, ...(soloAttivi ? { attivo: true } : {}) }, orderBy: [{ ordine: "asc" }, { nome: "asc" }] });
  return r.map((x) => ({ id: x.id, nome: x.nome, aliquotaIva: x.aliquotaIva === null ? null : Number(x.aliquotaIva), esborso: x.esborso, attivo: x.attivo }));
}

export async function salvaReparto(hotelId: number, id: number | null, d: { nome: string; aliquotaIva: number | null; esborso: boolean; attivo: boolean }) {
  const nome = d.nome.trim();
  if (!nome) throw new Error("Indica il nome del reparto.");
  if (!d.esborso && d.aliquotaIva !== null && !(d.aliquotaIva >= 0 && d.aliquotaIva <= 100)) throw new Error("Aliquota IVA non valida.");
  const doppio = await prisma.repartoAddebito.findFirst({ where: { hotelId, nome, id: id ? { not: id } : undefined } });
  if (doppio) throw new Error(`Esiste già un reparto "${nome}".`);
  const dati = { nome, aliquotaIva: d.esborso ? null : d.aliquotaIva, esborso: d.esborso, attivo: d.attivo };
  if (id) {
    await prisma.repartoAddebito.findFirstOrThrow({ where: { id, hotelId } });
    await prisma.repartoAddebito.update({ where: { id }, data: dati });
  } else {
    const ultimo = await prisma.repartoAddebito.aggregate({ where: { hotelId }, _max: { ordine: true } });
    await prisma.repartoAddebito.create({ data: { ...dati, hotelId, ordine: (ultimo._max.ordine ?? 0) + 1 } });
  }
  return elencoReparti(hotelId);
}

/** Per la pagina Addebiti dei reparti: camere con ospiti in casa oggi (arrivati e non partiti). */
export async function camereInCasa(hotelId: number, giorno: string) {
  const d = new Date(`${giorno}T00:00:00.000Z`);
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: {
      prenotazione: { hotelId, stato: { not: "ANNULLATA" } },
      stato: { not: "ANNULLATO" },
      usoDiurno: false,
      dataInizio: { lte: d },
      dataFine: { gte: d },
      presenze: { some: { stato: "arrivato" } },
    },
    include: { camera: true, ospite: true },
    orderBy: { camera: { codice: "asc" } },
  });
  return segmenti.map((s) => ({ segmentoId: s.id, prenotazioneId: s.prenotazioneId, camera: s.camera?.codice ?? "—", ospite: `${s.ospite.cognome} ${s.ospite.nome}`.trim() }));
}
