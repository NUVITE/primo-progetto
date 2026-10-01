import { prisma } from "@/lib/prisma";
import { ETICHETTA_ESITO, type EsitoTassa } from "@/lib/tassaSoggiorno";

/**
 * Rendiconto della tassa di soggiorno al Comune per un periodo (trimestre, semestre o anno), con:
 * - i numeri da comunicare (ospiti e pernottamenti INCLUSI esenti e residenti, notti tassate e
 *   importo, esenzioni per motivo, rifiuti di pagamento);
 * - l'elenco per ospite;
 * - la riconciliazione con le schedine di Polizia: giorni dichiarati all'arrivo, notti effettive,
 *   notti tassate, con la causa di ogni differenza (i Comuni incrociano i dati della Questura,
 *   art. 13-quater DL 34/2019: le differenze vanno sapute spiegare).
 * Contano solo le persone arrivate (check-in confermato) in camere non annullate.
 */

const GIORNO = 24 * 60 * 60 * 1000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const data = (g: string) => new Date(`${g}T00:00:00.000Z`);
const it = (g: string) => g.split("-").reverse().join("/");
const euro = (n: number) => Math.round(n * 100) / 100;

// ---------------- Periodi e scadenze ----------------

export type Periodo = { codice: string; nome: string; dal: string; al: string; scadenza: string | null; versamento: string | null };

/** Giorno g del mese successivo alla fine del periodo (31 = ultimo giorno del mese). */
function giornoDopo(al: string, g: number) {
  const [y, m] = al.split("-").map(Number); // m = mese di fine (1-12); il successivo ha indice m
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(y, m, Math.min(g, ultimo))));
}

export function periodiAnno(anno: number, cfg: { rendicontoPeriodo: string; rendicontoGiorno: number; versamentoGiorno: number | null }): Periodo[] {
  const fineMese = (m: number) => iso(new Date(Date.UTC(anno, m, 0)));
  const blocchi =
    cfg.rendicontoPeriodo === "semestrale"
      ? [
          { codice: "S1", nome: "1° semestre (gennaio-giugno)", da: 1, a: 6 },
          { codice: "S2", nome: "2° semestre (luglio-dicembre)", da: 7, a: 12 },
        ]
      : [1, 2, 3, 4].map((t) => ({ codice: `T${t}`, nome: `${t}° trimestre (${["gennaio-marzo", "aprile-giugno", "luglio-settembre", "ottobre-dicembre"][t - 1]})`, da: t * 3 - 2, a: t * 3 }));
  const periodi: Periodo[] = blocchi.map((b) => {
    const al = fineMese(b.a);
    const scadenza = giornoDopo(al, cfg.rendicontoGiorno);
    return {
      codice: `${anno}-${b.codice}`,
      nome: `${b.nome} ${anno}`,
      dal: `${anno}-${String(b.da).padStart(2, "0")}-01`,
      al,
      scadenza,
      versamento: cfg.versamentoGiorno ? giornoDopo(al, cfg.versamentoGiorno) : scadenza,
    };
  });
  // Dichiarazione annuale (D.M. 29/04/2022): entro il 30 giugno dell'anno dopo.
  periodi.push({ codice: `${anno}-A`, nome: `Anno ${anno} (dichiarazione annuale)`, dal: `${anno}-01-01`, al: `${anno}-12-31`, scadenza: `${anno + 1}-06-30`, versamento: null });
  return periodi;
}

/** Regole di rendiconto del Comune dell'hotel (dal regolamento più recente). */
export async function configRendiconto(hotelId: number) {
  const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, include: { comune: true } });
  const reg = await prisma.regolamentoTassa.findFirst({ where: { comuneId: h.comuneId }, orderBy: { validoDal: "desc" } });
  return {
    comune: h.comune.nome,
    regolamento: !!reg,
    rendicontoPeriodo: reg?.rendicontoPeriodo ?? "trimestrale",
    rendicontoGiorno: reg?.rendicontoGiorno ?? 16,
    versamentoGiorno: reg?.versamentoGiorno ?? null,
    nota: reg?.rendicontoNota ?? null,
  };
}

// ---------------- Rendiconto ----------------

type Voce = { persone: number; notti: number; importo: number };
const vuota = (): Voce => ({ persone: 0, notti: 0, importo: 0 });

export type OspiteRendiconto = {
  chiave: string;
  prenotazioneId: number;
  nome: string;
  arrivo: string;
  partenza: string;
  /** Notti nel periodo, per esito. */
  notti: number;
  tassate: number;
  importo: number;
  esenzioni: string[];
  residente: boolean;
  rifiuto: boolean;
  nonCalcolate: number;
};

export type RigaRiconciliazione = {
  chiave: string;
  prenotazioneId: number;
  nome: string;
  arrivo: string;
  partenza: string;
  giorniPolizia: number | null;
  schedina: "inviata" | "non_inviata" | "giorni_non_registrati";
  nottiEffettive: number;
  nottiTassate: number;
  cause: string[];
};

export async function rendicontoTassa(hotelId: number, dal: string, al: string) {
  // Tutte le presenze arrivate con almeno una notte nel periodo, con le notti dell'intero soggiorno
  // (servono alla riconciliazione, che guarda il soggiorno completo).
  const presenze = await prisma.presenza.findMany({
    where: {
      stato: { not: "attesa" },
      segmento: {
        stato: { not: "ANNULLATO" },
        prenotazione: { hotelId },
        dataInizio: { lte: data(al) },
        dataFine: { gt: data(dal) },
      },
    },
    include: {
      ospite: true,
      segmento: { include: { notti: { select: { id: true, data: true } } } },
      tasse: { include: { notte: { select: { data: true } }, regola: true } },
    },
  });
  // Le presenze degli stessi soggiorni fuori dal periodo (es. cambio camera prima del periodo).
  const chiavi = new Set(presenze.map((p) => `${p.segmento.prenotazioneId}|${p.ospiteId}`));
  const altre = await prisma.presenza.findMany({
    where: {
      id: { notIn: presenze.map((p) => p.id) },
      stato: { not: "attesa" },
      ospiteId: { in: [...new Set(presenze.map((p) => p.ospiteId))] },
      segmento: { stato: { not: "ANNULLATO" }, prenotazioneId: { in: [...new Set(presenze.map((p) => p.segmento.prenotazioneId))] } },
    },
    include: {
      ospite: true,
      segmento: { include: { notti: { select: { id: true, data: true } } } },
      tasse: { include: { notte: { select: { data: true } }, regola: true } },
    },
  });
  const tutte = [...presenze, ...altre.filter((p) => chiavi.has(`${p.segmento.prenotazioneId}|${p.ospiteId}`))];
  const posizioni = await prisma.posizioneTassa.findMany({
    where: { OR: [...chiavi].map((k) => ({ prenotazioneId: Number(k.split("|")[0]), ospiteId: Number(k.split("|")[1]) })) },
  });
  const posizione = new Map(posizioni.map((p) => [`${p.prenotazioneId}|${p.ospiteId}`, p]));

  // Raggruppa per soggiorno (stessa persona nella stessa prenotazione, anche su più camere).
  const soggiorni = new Map<string, typeof tutte>();
  for (const p of tutte) {
    const k = `${p.segmento.prenotazioneId}|${p.ospiteId}`;
    soggiorni.set(k, [...(soggiorni.get(k) ?? []), p]);
  }

  const totali = {
    ospiti: 0,
    arrivi: 0,
    pernottamenti: 0,
    tassate: vuota(),
    ridotte: vuota(),
    esenti: new Map<string, Voce & { articolo: string | null }>(),
    altri: new Map<string, Voce>(),
    rifiuti: vuota(),
    nonCalcolate: 0,
  };
  const ospiti: OspiteRendiconto[] = [];
  const riconciliazione: RigaRiconciliazione[] = [];
  const contaPersona = (v: Voce, gia: Set<Voce>) => {
    if (!gia.has(v)) {
      v.persone += 1;
      gia.add(v);
    }
  };

  for (const [chiave, lista] of soggiorni) {
    const o = lista[0].ospite;
    const nome = `${o.cognome} ${o.nome}`.trim();
    const prenotazioneId = lista[0].segmento.prenotazioneId;
    const pos = posizione.get(chiave);

    // Notti effettive del soggiorno (date distinte) e notti nel periodo.
    const nottiDi = (p: (typeof lista)[number]) =>
      p.segmento.notti.filter((n) => (!p.dal || n.data >= p.dal) && (!p.al || n.data < p.al)).map((n) => iso(n.data));
    const tutteLeNotti = [...new Set(lista.flatMap(nottiDi))].sort();
    if (!tutteLeNotti.length) continue;
    const nelPeriodo = tutteLeNotti.filter((g) => g >= dal && g <= al);
    const arrivo = tutteLeNotti[0];
    const partenza = iso(new Date(data(tutteLeNotti[tutteLeNotti.length - 1]).getTime() + GIORNO));
    const tasse = lista.flatMap((p) => p.tasse);
    const tasseIn = tasse.filter((t) => {
      const g = iso(t.notte.data);
      return g >= dal && g <= al;
    });

    // ---- Numeri del periodo ----
    if (nelPeriodo.length) {
      const gia = new Set<Voce>();
      totali.ospiti += 1;
      if (arrivo >= dal && arrivo <= al) totali.arrivi += 1;
      totali.pernottamenti += nelPeriodo.length;
      const esenzioni = new Set<string>();
      let tassate = 0;
      let importo = 0;
      for (const t of tasseIn) {
        const imp = Number(t.importo);
        const esito = t.esito as EsitoTassa;
        if (esito === "tassata" || esito === "ridotta") {
          const v = esito === "tassata" ? totali.tassate : totali.ridotte;
          v.notti += 1;
          v.importo += imp;
          contaPersona(v, gia);
          tassate += 1;
          importo += imp;
          if (esito === "ridotta" && t.regola) esenzioni.add(`Riduzione: ${t.regola.descrizione}`);
        } else if (esito === "esente") {
          const motivo = t.regola?.descrizione ?? "Esenzione";
          const v = totali.esenti.get(motivo) ?? { ...vuota(), articolo: t.regola?.articolo ?? null };
          totali.esenti.set(motivo, v);
          v.notti += 1;
          contaPersona(v, gia);
          esenzioni.add(motivo);
        } else {
          const v = totali.altri.get(esito) ?? vuota();
          totali.altri.set(esito, v);
          v.notti += 1;
          contaPersona(v, gia);
          if (esito !== "residente") esenzioni.add(ETICHETTA_ESITO[esito] ?? esito);
        }
      }
      const nonCalcolate = Math.max(0, nelPeriodo.length - tasseIn.length);
      totali.nonCalcolate += nonCalcolate;
      if (pos?.rifiutoPagamento && importo > 0) {
        totali.rifiuti.persone += 1;
        totali.rifiuti.notti += tassate;
        totali.rifiuti.importo += importo;
      }
      ospiti.push({
        chiave,
        prenotazioneId,
        nome,
        arrivo,
        partenza,
        notti: nelPeriodo.length,
        tassate,
        importo: euro(importo),
        esenzioni: [...esenzioni],
        residente: !!pos?.residente || tasseIn.some((t) => t.esito === "residente"),
        rifiuto: !!pos?.rifiutoPagamento,
        nonCalcolate,
      });
    }

    // ---- Riconciliazione con la Polizia: soggiorni ARRIVATI nel periodo, interi ----
    if (arrivo >= dal && arrivo <= al) {
      // Le schedine sono una per persona e camera di arrivo: in un cambio camera la presenza nuova
      // eredita i dati della schedina (non è una seconda schedina).
      const segmenti = new Set(lista.map((p) => p.segmentoId));
      const teste = lista.filter((p) => !p.segmento.segmentoPrecedenteId || !segmenti.has(p.segmento.segmentoPrecedenteId));
      const inviate = teste.filter((p) => p.schedinaInviataIl);
      const giorniPolizia = inviate.length && inviate.every((p) => p.schedinaGiorni != null) ? inviate.reduce((t, p) => t + (p.schedinaGiorni ?? 0), 0) : null;
      const schedina: RigaRiconciliazione["schedina"] = !inviate.length ? "non_inviata" : giorniPolizia == null ? "giorni_non_registrati" : "inviata";
      const effettive = tutteLeNotti.length;
      const nottiTassate = tasse.filter((t) => t.esito === "tassata" || t.esito === "ridotta").length;
      const cause: string[] = [];
      if (schedina === "non_inviata") cause.push("Schedina di Polizia non risulta inviata.");
      if (schedina === "giorni_non_registrati") cause.push("Schedina inviata prima che HotelWeb registrasse i giorni dichiarati.");
      if (giorniPolizia != null && giorniPolizia > effettive) {
        cause.push(`Partenza anticipata: alla Polizia ${giorniPolizia} giorni dichiarati all'arrivo, poi ${effettive} notti effettive (la schedina non si corregge).`);
      }
      if (giorniPolizia != null && giorniPolizia < effettive) {
        cause.push(
          effettive > 30 && giorniPolizia >= 30
            ? `Soggiorno di ${effettive} notti: la schedina ne dichiara al massimo 30.`
            : `Soggiorno prolungato dopo l'invio: alla Polizia ${giorniPolizia} giorni, effettive ${effettive}.`,
        );
      }
      if (nottiTassate < effettive) {
        const perEsito = new Map<string, number>();
        for (const t of tasse.filter((t) => t.esito !== "tassata" && t.esito !== "ridotta")) {
          const motivo = t.esito === "esente" ? `per esenzione (${t.regola?.descrizione ?? "motivo non indicato"})` : (ETICHETTA_ESITO[t.esito as EsitoTassa] ?? t.esito).toLowerCase();
          perEsito.set(motivo, (perEsito.get(motivo) ?? 0) + 1);
        }
        const senza = effettive - tasse.length;
        if (senza > 0) perEsito.set("tassa non calcolata", senza);
        cause.push(`Notti non tassate: ${[...perEsito].map(([m, n]) => `${n} ${m}`).join(", ")}.`);
      }
      if (pos?.rifiutoPagamento) cause.push("L'ospite ha rifiutato di pagare la tassa.");
      riconciliazione.push({ chiave, prenotazioneId, nome, arrivo, partenza, giorniPolizia, schedina, nottiEffettive: effettive, nottiTassate, cause });
    }
  }

  ospiti.sort((a, b) => a.arrivo.localeCompare(b.arrivo) || a.nome.localeCompare(b.nome));
  riconciliazione.sort((a, b) => a.arrivo.localeCompare(b.arrivo) || a.nome.localeCompare(b.nome));
  const dovuto = euro(totali.tassate.importo + totali.ridotte.importo);
  return {
    dal,
    al,
    numeri: {
      ospiti: totali.ospiti,
      arrivi: totali.arrivi,
      pernottamenti: totali.pernottamenti,
      tassate: { ...totali.tassate, importo: euro(totali.tassate.importo) },
      ridotte: { ...totali.ridotte, importo: euro(totali.ridotte.importo) },
      esenti: [...totali.esenti].map(([motivo, v]) => ({ motivo, ...v })).sort((a, b) => b.notti - a.notti),
      altri: [...totali.altri].map(([esito, v]) => ({ esito, etichetta: ETICHETTA_ESITO[esito as EsitoTassa] ?? esito, ...v })),
      rifiuti: { ...totali.rifiuti, importo: euro(totali.rifiuti.importo) },
      nonCalcolate: totali.nonCalcolate,
      dovuto,
      daVersare: euro(dovuto - totali.rifiuti.importo),
    },
    ospiti,
    riconciliazione: {
      righe: riconciliazione,
      giorniPolizia: riconciliazione.reduce((t, r) => t + (r.giorniPolizia ?? 0), 0),
      nottiEffettive: riconciliazione.reduce((t, r) => t + r.nottiEffettive, 0),
      nottiTassate: riconciliazione.reduce((t, r) => t + r.nottiTassate, 0),
      senzaGiorni: riconciliazione.filter((r) => r.giorniPolizia == null).length,
    },
  };
}

/** Elenco per ospite in CSV (separatore ; per Excel in italiano). */
export function csvOspiti(r: Awaited<ReturnType<typeof rendicontoTassa>>) {
  const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const righe = [
    ["Ospite", "Prenotazione", "Arrivo", "Partenza", "Notti nel periodo", "Notti tassate", "Importo", "Esenzioni / note", "Residente", "Rifiuta di pagare"],
    ...r.ospiti.map((o) => [
      o.nome,
      o.prenotazioneId,
      it(o.arrivo),
      it(o.partenza),
      o.notti,
      o.tassate,
      o.importo.toFixed(2).replace(".", ","),
      o.esenzioni.join("; "),
      o.residente ? "sì" : "",
      o.rifiuto ? "sì" : "",
    ]),
  ];
  return "﻿" + righe.map((x) => x.map(q).join(";")).join("\r\n");
}
