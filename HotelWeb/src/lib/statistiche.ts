/**
 * Statistiche per periodo (vedi statisticheRegole.ts per le definizioni): occupazione, prezzo medio,
 * ricavo per camera disponibile, presenze e permanenza, ricavi per voce, per tipo di camera, per canale
 * e intermediario, provenienza degli ospiti, confronto con l'anno prima e prenotato per i prossimi mesi.
 * Senza il permesso di vedere gli importi, gli importi non lasciano il server (null).
 *
 * Approssimazioni dichiarate: le camere disponibili sono quelle attive oggi (non c'è lo storico delle
 * camere); la provenienza è quella dell'intestatario della camera, contata per le persone della camera.
 */
import { prisma } from "@/lib/prisma";
import { CANALI } from "@/lib/prenotazioni";
import { CODICE_ITALIA } from "@/lib/codiciPolizia";
import { descriviLuoghi } from "@/lib/tabellePolizia";
import { annoPrima, controllaPeriodo, giorni, indicatori, nomeLeggibile } from "@/lib/statisticheRegole";

const data = (g: string) => new Date(`${g}T00:00:00.000Z`);
const giorno = (d: Date) => d.toISOString().slice(0, 10);
const arrotonda = (n: number) => Math.round(n * 100) / 100;
const persone = (s: { adulti: number; etaBambini: unknown }) => s.adulti + (Array.isArray(s.etaBambini) ? s.etaBambini.length : 0);
const VALIDO = (hotelId: number) => ({ stato: { not: "ANNULLATO" as const }, usoDiurno: false, prenotazione: { hotelId, stato: { not: "ANNULLATA" as const } } });

/** Camere disponibili notte per notte (attive meno fuori servizio), in totale e per tipo. */
async function disponibilita(hotelId: number, elenco: string[]) {
  const [camere, fuori] = await Promise.all([
    prisma.camera.findMany({ where: { hotelId, attivo: true }, select: { id: true, tipoCameraId: true } }),
    prisma.cameraIndisponibilita.findMany({
      where: { camera: { hotelId, attivo: true }, dal: { lte: data(elenco[elenco.length - 1]) }, al: { gt: data(elenco[0]) } },
      select: { dal: true, al: true, camera: { select: { tipoCameraId: true } } },
    }),
  ]);
  const perGiorno = new Map(elenco.map((g) => [g, camere.length]));
  const perTipo = new Map<number, number>();
  for (const c of camere) perTipo.set(c.tipoCameraId, (perTipo.get(c.tipoCameraId) ?? 0) + elenco.length);
  for (const f of fuori)
    for (const g of elenco)
      if (giorno(f.dal) <= g && g < giorno(f.al)) {
        perGiorno.set(g, perGiorno.get(g)! - 1);
        perTipo.set(f.camera.tipoCameraId, (perTipo.get(f.camera.tipoCameraId) ?? 0) - 1);
      }
  return { camere: camere.length, perGiorno, perTipo, totale: [...perGiorno.values()].reduce((t, v) => t + v, 0) };
}

/** Numeri di un periodo (dal..al compresi). */
async function periodo(hotelId: number, dal: string, al: string, conImporti: boolean) {
  const elenco = giorni(dal, al);
  const soldi = (n: number) => (conImporti ? arrotonda(n) : null);
  const [disp, notti, arrivi, addebiti, servizi] = await Promise.all([
    disponibilita(hotelId, elenco),
    prisma.notteSoggiorno.findMany({
      where: { data: { gte: data(dal), lte: data(al) }, segmento: VALIDO(hotelId) },
      select: {
        data: true,
        prezzo: true,
        segmento: {
          select: {
            adulti: true,
            etaBambini: true,
            tipoCameraId: true,
            tipoCamera: { select: { descrizione: true } },
            ospite: { select: { cittadinanzaCodice: true, residenzaStatoCodice: true, residenzaComuneCodice: true } },
            prenotazione: { select: { id: true, canale: true, intermediario: { select: { denominazione: true } } } },
          },
        },
      },
    }),
    prisma.segmentoSoggiorno.findMany({ where: { ...VALIDO(hotelId), segmentoPrecedenteId: null, dataInizio: { gte: data(dal), lte: data(al) } }, select: { adulti: true, etaBambini: true } }),
    conImporti
      ? prisma.addebitoConto.findMany({
          where: { data: { gte: data(dal), lte: data(al) }, stornatoIl: null, prenotazione: { hotelId, stato: { not: "ANNULLATA" } } },
          select: { tipo: true, prezzoUnitario: true, quantita: true, reparto: { select: { nome: true, esborso: true } } },
        })
      : Promise.resolve([]),
    // Servizi aggiunti: contano nel giorno del servizio o, se non c'è, all'arrivo della prima camera.
    conImporti
      ? prisma.servizioAggiunto.findMany({
          where: { prenotazione: { hotelId, stato: { not: "ANNULLATA" } }, OR: [{ data: { gte: data(dal), lte: data(al) } }, { data: null, prenotazione: { segmenti: { some: { dataInizio: { lte: data(al) }, dataFine: { gte: data(dal) } } } } }] },
          select: {
            data: true,
            prezzoUnitario: true,
            quantita: true,
            segmenti: { select: { segmento: { select: { stato: true } } } },
            prenotazione: { select: { segmenti: { where: { stato: { not: "ANNULLATO" } }, select: { dataInizio: true }, orderBy: { dataInizio: "asc" }, take: 1 } } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Notti: totali, per giorno, per tipo, per canale, per intermediario, provenienza.
  let ricavoNotti = 0;
  let presenze = 0;
  const venduteGiorno = new Map<string, number>();
  const tipi = new Map<number, { tipo: string; vendute: number; ricavo: number }>();
  const canali = new Map<string, { prenotazioni: Set<number>; vendute: number; ricavo: number }>();
  const intermediari = new Map<string, { prenotazioni: Set<number>; vendute: number; ricavo: number }>();
  const luoghi = new Map<string, { italia: boolean; presenze: number }>();
  for (const n of notti) {
    const s = n.segmento;
    const p = persone(s);
    const prezzo = Number(n.prezzo);
    ricavoNotti += prezzo;
    presenze += p;
    venduteGiorno.set(giorno(n.data), (venduteGiorno.get(giorno(n.data)) ?? 0) + 1);
    const t = tipi.get(s.tipoCameraId) ?? { tipo: s.tipoCamera.descrizione, vendute: 0, ricavo: 0 };
    t.vendute += 1;
    t.ricavo += prezzo;
    tipi.set(s.tipoCameraId, t);
    const c = canali.get(s.prenotazione.canale) ?? { prenotazioni: new Set(), vendute: 0, ricavo: 0 };
    c.prenotazioni.add(s.prenotazione.id);
    c.vendute += 1;
    c.ricavo += prezzo;
    canali.set(s.prenotazione.canale, c);
    if (s.prenotazione.intermediario) {
      const i = intermediari.get(s.prenotazione.intermediario.denominazione) ?? { prenotazioni: new Set(), vendute: 0, ricavo: 0 };
      i.prenotazioni.add(s.prenotazione.id);
      i.vendute += 1;
      i.ricavo += prezzo;
      intermediari.set(s.prenotazione.intermediario.denominazione, i);
    }
    // Italiani per comune di residenza (poi provincia), stranieri per stato di residenza o cittadinanza.
    const o = s.ospite;
    const italiano = (o.residenzaStatoCodice ?? o.cittadinanzaCodice ?? CODICE_ITALIA) === CODICE_ITALIA;
    const chiave = italiano ? (o.residenzaComuneCodice ?? "italia") : (o.residenzaStatoCodice ?? o.cittadinanzaCodice ?? "estero");
    const l = luoghi.get(chiave) ?? { italia: italiano, presenze: 0 };
    l.presenze += p;
    luoghi.set(chiave, l);
  }
  const vendute = notti.length;
  const nomi = await descriviLuoghi([...luoghi.keys()]);
  // Comuni raggruppati per provincia ("Bari (BA)" -> "Provincia di BA").
  const provenienza = new Map<string, { italia: boolean; presenze: number }>();
  for (const [k, v] of luoghi) {
    const nome = k === "italia" ? "Italia (residenza non indicata)" : k === "estero" ? "Estero (stato non indicato)" : v.italia ? `Provincia di ${/\(([A-Z]{2})\)$/.exec(nomi[k] ?? "")?.[1] ?? "?"}` : nomeLeggibile(nomi[k] ?? k);
    const x = provenienza.get(nome) ?? { italia: v.italia, presenze: 0 };
    x.presenze += v.presenze;
    provenienza.set(nome, x);
  }
  const persArrivi = arrivi.reduce((t, s) => t + persone(s), 0);

  // Ricavi per voce: alloggio (notti), servizi aggiunti, reparti (consumi meno abbuoni; gli esborsi non sono ricavi).
  let ricavoServizi = 0;
  for (const sv of servizi) {
    const soloAnnullate = sv.segmenti.length > 0 && sv.segmenti.every((x) => x.segmento.stato === "ANNULLATO");
    const quando = sv.data ? giorno(sv.data) : sv.prenotazione.segmenti[0] ? giorno(sv.prenotazione.segmenti[0].dataInizio) : null;
    if (!soloAnnullate && quando && quando >= dal && quando <= al) ricavoServizi += Number(sv.prezzoUnitario) * sv.quantita;
  }
  const reparti = new Map<string, number>();
  for (const a of addebiti) {
    if (a.tipo === "esborso" || a.reparto?.esborso) continue;
    const voce = a.tipo === "abbuono" ? "Abbuoni e sconti" : (a.reparto?.nome ?? "Altro");
    reparti.set(voce, (reparti.get(voce) ?? 0) + (a.tipo === "abbuono" ? -1 : 1) * Number(a.prezzoUnitario) * a.quantita);
  }
  const voci = [
    { voce: "Alloggio e trattamento", importo: soldi(ricavoNotti) },
    { voce: "Servizi aggiunti", importo: soldi(ricavoServizi) },
    ...[...reparti].sort((a, b) => b[1] - a[1]).map(([voce, importo]) => ({ voce, importo: soldi(importo) })),
  ];

  const per = <T extends { vendute: number; ricavo: number }>(m: Map<string, T & { prenotazioni: Set<number> }>, nome: (k: string) => string) =>
    [...m]
      .map(([k, v]) => ({ nome: nome(k), prenotazioni: v.prenotazioni.size, vendute: v.vendute, ricavo: soldi(v.ricavo), quota: vendute ? Math.round((v.vendute / vendute) * 1000) / 10 : 0 }))
      .sort((a, b) => b.vendute - a.vendute);

  return {
    dal,
    al,
    giorni: elenco.length,
    camere: disp.camere,
    disponibili: disp.totale,
    vendute,
    presenze,
    arrivi: persArrivi,
    permanenzaMedia: persArrivi ? Math.round((presenze / persArrivi) * 10) / 10 : null,
    ricavoNotti: soldi(ricavoNotti),
    ricavoTotale: soldi(ricavoNotti + ricavoServizi + [...reparti.values()].reduce((t, v) => t + v, 0)),
    ...indicatori(vendute, disp.totale, conImporti ? ricavoNotti : null),
    voci,
    perGiorno: elenco.map((g) => {
      const v = venduteGiorno.get(g) ?? 0;
      const d = disp.perGiorno.get(g)!;
      return { giorno: g, vendute: v, disponibili: d, occupazione: d ? Math.round((v / d) * 1000) / 10 : 0 };
    }),
    perTipo: [...tipi]
      .map(([id, t]) => ({ tipo: t.tipo, vendute: t.vendute, disponibili: disp.perTipo.get(id) ?? 0, ricavo: soldi(t.ricavo), ...indicatori(t.vendute, disp.perTipo.get(id) ?? 0, conImporti ? t.ricavo : null) }))
      .sort((a, b) => b.vendute - a.vendute),
    perCanale: per(canali, (k) => CANALI[k as keyof typeof CANALI] ?? k),
    perIntermediario: per(intermediari, (k) => k).slice(0, 10),
    provenienza: [...provenienza].map(([nome, v]) => ({ nome, italia: v.italia, presenze: v.presenze })).sort((a, b) => b.presenze - a.presenze),
  };
}

/** Notti vendute in un mese: adesso, e come stavano le prenotazioni alla stessa data dell'anno prima. */
async function prenotatoMese(hotelId: number, mese: string, alla: Date | null) {
  const primo = `${mese}-01`;
  const ultimo = new Date(Date.UTC(Number(mese.slice(0, 4)), Number(mese.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const where = alla
    ? // Allora: prenotazioni già fatte e non ancora annullate a quella data.
      // L'annullamento segna annullate anche le camere: quelle di prenotazioni annullate dopo quella data allora valevano.
      // (Una singola camera annullata non ha la data: resta esclusa.)
      {
        data: { gte: data(primo), lte: data(ultimo) },
        segmento: {
          usoDiurno: false,
          prenotazione: { hotelId, createdAt: { lte: alla }, OR: [{ annullataIl: null }, { annullataIl: { gt: alla } }] },
          OR: [{ stato: { not: "ANNULLATO" as const } }, { prenotazione: { annullataIl: { gt: alla } } }],
        },
      }
    : { data: { gte: data(primo), lte: data(ultimo) }, segmento: VALIDO(hotelId) };
  return prisma.notteSoggiorno.count({ where });
}

export async function statistiche(hotelId: number, dal: string, al: string, conImporti: boolean, oggi: string) {
  controllaPeriodo(dal, al);
  const [ora, prima] = await Promise.all([periodo(hotelId, dal, al, conImporti), periodo(hotelId, annoPrima(dal), annoPrima(al), conImporti)]);

  // Prenotato: questo mese e i 5 seguenti, confrontati con un anno fa alla stessa data e con com'è finita.
  const unAnnoFa = data(annoPrima(oggi));
  const mesi = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(Number(oggi.slice(0, 4)), Number(oggi.slice(5, 7)) - 1 + i, 1));
    return d.toISOString().slice(0, 7);
  });
  const camere = await prisma.camera.count({ where: { hotelId, attivo: true } });
  const prenotato = await Promise.all(
    mesi.map(async (m) => {
      const mesePrima = `${Number(m.slice(0, 4)) - 1}${m.slice(4)}`;
      const giorniMese = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
      const [adesso, allora, finale] = await Promise.all([prenotatoMese(hotelId, m, null), prenotatoMese(hotelId, mesePrima, unAnnoFa), prenotatoMese(hotelId, mesePrima, null)]);
      const disponibili = camere * giorniMese;
      return { mese: m, disponibili, adesso, occupazione: disponibili ? Math.round((adesso / disponibili) * 1000) / 10 : 0, unAnnoFa: allora, finaleAnnoPrima: finale };
    }),
  );
  return { ora, prima, prenotato, conImporti };
}
