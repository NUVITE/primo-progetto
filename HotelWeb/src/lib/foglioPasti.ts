import { prisma } from "@/lib/prisma";
import { noteDegliOspiti, type NotaOspite } from "@/lib/noteAlimentari";
import { piattiDelServizio } from "@/lib/menu";
import { piattiDaEvitare } from "@/lib/menuRegole";
import { ELENCO_PASTI, PASTI, pastiEffettivi, pastoCompreso, pastoScambiabile, type Pasto, type PastiTrattamento } from "@/lib/pastiRegole";

/**
 * Foglio del giorno della ristorazione: per colazione, pranzo e cena i coperti previsti camera per
 * camera (dai trattamenti, con i coperti in più o in meno segnati a mano), tavolo e note alimentari.
 * Persone = composizione prenotata (adulti e bambini); i bambini sotto i 3 anni si contano a parte
 * perché di solito serve il seggiolone.
 */

const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const NESSUN_PASTO: PastiTrattamento = { colazione: false, pranzo: false, cena: false };

export type RigaFoglio = {
  segmentoId: number;
  prenotazioneId: number;
  camera: string | null;
  nome: string;
  trattamento: string;
  adulti: number;
  bambini: number;
  piccoli: number;
  base: number;
  delta: number;
  coperti: number;
  notaVariazione: string;
  arrivo: boolean;
  partenza: boolean;
  opzione: boolean;
  tavolo: string;
  note: {
    nome: string;
    sintesi: string;
    allergie: boolean;
    voci: NotaOspite["voci"];
    regimi: string[];
    esigenze: string;
    // Piatti dei menu di quel servizio che contengono i suoi allergeni.
    daEvitare: ReturnType<typeof piattiDaEvitare>;
  }[];
};

export async function foglioDelGiorno(hotelId: number, giorno: string, conNote: boolean) {
  if (!GIORNO.test(giorno)) throw new Error("Giorno non valido.");
  const data = new Date(giorno);
  const [segmenti, trattamenti] = await Promise.all([
    prisma.segmentoSoggiorno.findMany({
      where: {
        prenotazione: { hotelId, stato: { not: "ANNULLATA" } },
        stato: { not: "ANNULLATO" },
        usoDiurno: false,
        dataInizio: { lte: data },
        dataFine: { gte: data },
      },
      include: {
        camera: true,
        ospite: true,
        presenze: { include: { ospite: true } },
        prenotazione: { select: { id: true, stato: true } },
        variazioniPasti: { where: { giorno: data } },
      },
    }),
    prisma.trattamento.findMany({ where: { hotelId } }),
  ]);
  const perNome = new Map(trattamenti.map((t) => [t.nome, { colazione: t.colazione, pranzo: t.pranzo, cena: t.cena }]));
  const sconosciuti = new Set<string>();

  const ospiti = [...new Set(segmenti.flatMap((s) => [s.ospiteId, ...s.presenze.map((p) => p.ospiteId)]))];
  const note = conNote ? await noteDegliOspiti(hotelId, ospiti) : {};
  const menuDelServizio = Object.fromEntries(
    await Promise.all(ELENCO_PASTI.map(async (p) => [p, conNote ? await piattiDelServizio(hotelId, giorno, p) : []] as const)),
  ) as Record<Pasto, { nome: string; allergeni: string[] }[]>;

  const servizi = Object.fromEntries(ELENCO_PASTI.map((p) => [p, { coperti: 0, adulti: 0, bambini: 0, piccoli: 0, righe: [] as RigaFoglio[] }])) as Record<
    Pasto,
    { coperti: number; adulti: number; bambini: number; piccoli: number; righe: RigaFoglio[] }
  >;

  for (const s of segmenti) {
    const t = perNome.get(s.trattamento);
    if (!t) sconosciuti.add(s.trattamento);
    const pasti = pastiEffettivi(t ?? NESSUN_PASTO, s.pastoPrincipale);
    const eta = Array.isArray(s.etaBambini) ? (s.etaBambini as number[]) : [];
    const persone = s.adulti + eta.length;
    const arrivo = iso(s.dataInizio);
    const partenza = iso(s.dataFine);
    const personeNote = [s.ospite, ...s.presenze.map((p) => p.ospite)].filter((o, i, a) => a.findIndex((x) => x.id === o.id) === i);
    for (const pasto of ELENCO_PASTI) {
      const base = pastoCompreso(pasto, giorno, arrivo, partenza, pasti) ? persone : 0;
      const v = s.variazioniPasti.find((x) => x.pasto === pasto);
      const delta = v?.delta ?? 0;
      const coperti = Math.max(0, base + delta);
      if (!coperti && !v) continue;
      // Variazione in meno su tutta la camera: i coperti si tolgono prima dagli adulti.
      const bambini = Math.min(eta.length, coperti);
      const riga: RigaFoglio = {
        segmentoId: s.id,
        prenotazioneId: s.prenotazioneId,
        camera: s.camera?.codice ?? null,
        nome: `${s.ospite.cognome} ${s.ospite.nome}`.trim(),
        trattamento: s.trattamento,
        adulti: coperti - bambini,
        bambini,
        piccoli: Math.min(eta.filter((e) => e < 3).length, bambini),
        base,
        delta,
        coperti,
        notaVariazione: v?.nota ?? "",
        arrivo: arrivo === giorno,
        partenza: partenza === giorno,
        opzione: s.prenotazione.stato === "OPZIONE",
        tavolo: s.tavolo ?? "",
        note: personeNote
          .filter((o) => note[o.id])
          .map((o) => ({ nome: `${o.nome} ${o.cognome}`.trim(), sintesi: note[o.id].sintesi, allergie: note[o.id].allergie, voci: note[o.id].voci, regimi: note[o.id].regimi, esigenze: note[o.id].esigenze, daEvitare: piattiDaEvitare(note[o.id].voci, menuDelServizio[pasto]) })),
      };
      const sv = servizi[pasto];
      sv.righe.push(riga);
      sv.coperti += riga.coperti;
      sv.adulti += riga.adulti;
      sv.bambini += riga.bambini;
      sv.piccoli += riga.piccoli;
    }
  }
  const ordine = (a: RigaFoglio, b: RigaFoglio) => (a.camera ?? "~").localeCompare(b.camera ?? "~", "it", { numeric: true }) || a.nome.localeCompare(b.nome);
  for (const p of ELENCO_PASTI) servizi[p].righe.sort(ordine);

  return {
    giorno,
    servizi,
    // Camere occupate quel giorno, per aggiungere coperti a chi non ha il pasto nel trattamento.
    camere: segmenti
      .map((s) => ({ segmentoId: s.id, camera: s.camera?.codice ?? null, nome: `${s.ospite.cognome} ${s.ospite.nome}`.trim(), trattamento: s.trattamento }))
      .sort((a, b) => (a.camera ?? "~").localeCompare(b.camera ?? "~", "it", { numeric: true })),
    trattamentiSconosciuti: [...sconosciuti],
    conNote,
  };
}

async function segmentoDelHotel(hotelId: number, segmentoId: number) {
  const s = await prisma.segmentoSoggiorno.findFirst({ where: { id: segmentoId, prenotazione: { hotelId } } });
  if (!s) throw new Error("Soggiorno non trovato.");
  return s;
}

/** Coperti in più (delta > 0) o in meno (delta < 0) rispetto al trattamento; 0 = come da trattamento. */
export async function impostaVariazionePasto(hotelId: number, segmentoId: number, giorno: string, pasto: Pasto, delta: number, nota: string, utente: string) {
  if (!GIORNO.test(giorno)) throw new Error("Giorno non valido.");
  if (!(pasto in PASTI)) throw new Error("Pasto non valido.");
  if (!Number.isInteger(delta) || Math.abs(delta) > 30) throw new Error("Numero di coperti non valido.");
  const s = await segmentoDelHotel(hotelId, segmentoId);
  if (s.stato === "ANNULLATO" || s.usoDiurno) throw new Error("Questo soggiorno non ha pasti.");
  if (giorno < iso(s.dataInizio) || giorno > iso(s.dataFine)) throw new Error("Il giorno è fuori dal soggiorno.");
  const where = { segmentoId_giorno_pasto: { segmentoId, giorno: new Date(giorno), pasto } };
  if (delta === 0) {
    await prisma.variazionePasto.deleteMany({ where: { segmentoId, giorno: new Date(giorno), pasto } });
    return;
  }
  const t = await prisma.trattamento.findFirst({ where: { hotelId, nome: s.trattamento } });
  const eta = Array.isArray(s.etaBambini) ? (s.etaBambini as number[]) : [];
  const base = pastoCompreso(pasto, giorno, iso(s.dataInizio), iso(s.dataFine), pastiEffettivi(t ?? NESSUN_PASTO, s.pastoPrincipale)) ? s.adulti + eta.length : 0;
  if (base + delta < 0) throw new Error(`Non si possono togliere più dei ${base} coperti previsti.`);
  const dati = { delta, nota: nota.trim() || null, da: utente };
  await prisma.variazionePasto.upsert({ where, update: dati, create: { segmentoId, giorno: new Date(giorno), pasto, ...dati } });
}

export async function impostaTavolo(hotelId: number, segmentoId: number, tavolo: string) {
  const t = tavolo.trim();
  if (t.length > 20) throw new Error("Il tavolo si indica con un numero o un nome breve.");
  await segmentoDelHotel(hotelId, segmentoId);
  await prisma.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { tavolo: t || null } });
}

/** Mezza pensione: pranzo al posto della cena (o viceversa); null = come da trattamento. */
export async function impostaPastoPrincipale(hotelId: number, segmentoId: number, valore: "pranzo" | "cena" | null) {
  if (valore !== null && valore !== "pranzo" && valore !== "cena") throw new Error("Scegli pranzo o cena.");
  const s = await segmentoDelHotel(hotelId, segmentoId);
  const t = await prisma.trattamento.findFirst({ where: { hotelId, nome: s.trattamento } });
  if (valore && (!t || !pastoScambiabile(t))) throw new Error("Il trattamento di questa camera non prevede la scelta fra pranzo e cena.");
  await prisma.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { pastoPrincipale: valore } });
}
