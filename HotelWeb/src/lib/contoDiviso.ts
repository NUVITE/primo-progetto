import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { riepilogoIva, righeConto, scorporo, type RigaConto } from "@/lib/conto";
import { trovaPrenotazione } from "@/lib/prenotazioni";

/**
 * Conto diviso fra intestatari (l'ospite e il cliente che paga: azienda o agenzia) e dati per la
 * fattura del gestionale esterno. Ogni riga del conto va a un intestatario secondo la regola della
 * prenotazione, salvo spostamenti a mano. Le righe passate al gestionale si ricordano con l'importo
 * inviato: se poi cambiano si fattura solo la differenza (conguaglio) o si segnala la nota di credito.
 */

type Prenotazione = Awaited<ReturnType<typeof trovaPrenotazione>>;
const arrotonda = (n: number) => Math.round(n * 100) / 100;

export const REGOLE_CONTO = {
  predefinita: "Camere e trattamento al cliente, extra e tassa all'ospite",
  tutto_ospite: "Tutto all'ospite",
  tutto_cliente: "Tutto al cliente",
} as const;
export type RegolaConto = keyof typeof REGOLE_CONTO;

export type Intestatario = {
  chiave: string;
  nome: string;
  tipo: "ospite" | "cliente";
  dati: {
    denominazione: string;
    partitaIva: string | null;
    codiceFiscale: string | null;
    indirizzo: string | null;
    cap: string | null;
    comune: string | null;
    provincia: string | null;
    codiceDestinatario: string | null;
    pec: string | null;
    email: string | null;
  };
};

/** Intestatari possibili: l'ospite (pagante o chi ha prenotato) e il cliente che paga, se c'è. */
export function intestatari(p: Prenotazione): Intestatario[] {
  const o = p.ospitePagante ?? p.ospitePrenotante;
  const lista: Intestatario[] = [
    {
      chiave: "ospite",
      nome: `${o.nome} ${o.cognome}`.trim(),
      tipo: "ospite",
      dati: { denominazione: `${o.cognome} ${o.nome}`.trim(), partitaIva: null, codiceFiscale: null, indirizzo: null, cap: null, comune: null, provincia: null, codiceDestinatario: null, pec: null, email: o.email },
    },
  ];
  for (const c of [p.clientePagante, p.intermediario]) {
    if (!c || lista.some((x) => x.chiave === `cliente:${c.id}`)) continue;
    // L'intermediario conta solo se è un'agenzia o un portale (può pagare il soggiorno con il voucher).
    if (c !== p.clientePagante && c.tipo !== "agenzia" && c.tipo !== "portale") continue;
    lista.push({
      chiave: `cliente:${c.id}`,
      nome: c.denominazione,
      tipo: "cliente",
      dati: {
        denominazione: c.denominazione,
        partitaIva: c.partitaIva,
        codiceFiscale: c.codiceFiscale,
        indirizzo: c.indirizzo,
        cap: c.cap,
        comune: c.comune,
        provincia: c.provincia,
        codiceDestinatario: c.codiceDestinatario,
        pec: c.pec,
        email: c.email,
      },
    });
  }
  return lista;
}

/** Intestatario di una riga secondo la regola della prenotazione (prima degli spostamenti a mano). */
export function intestatarioPredefinito(r: RigaConto, p: Prenotazione, aliquotaAlloggio: number) {
  const cliente = p.clientePaganteId ? `cliente:${p.clientePaganteId}` : null;
  if (!cliente || p.regolaConto === "tutto_ospite") return "ospite";
  if (p.regolaConto === "tutto_cliente") return cliente;
  // Predefinita: camere, trattamento, servizi prenotati e penale al cliente; extra, esborsi e tassa
  // all'ospite; un abbuono sulle camere al cliente, uno su un reparto all'ospite.
  if (r.tipo === "camera" || r.tipo === "uso_diurno" || r.tipo === "servizio" || r.tipo === "penale") return cliente;
  if (r.tipo === "abbuono") return !r.reparto && r.aliquota === aliquotaAlloggio ? cliente : "ospite";
  return "ospite";
}

export type RigaDaFatturare = {
  chiave: string;
  descrizione: string;
  importo: number;
  aliquota: number | null;
  natura: string | null;
  imponibile: number;
  iva: number;
  conguaglio: boolean;
};

/** Divisione del conto per intestatario, con pagato, da pagare e righe ancora da fatturare. */
export async function contoDiviso(hotelId: number, id: number) {
  const [p, hotel] = await Promise.all([trovaPrenotazione(hotelId, id), prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { aliquotaAlloggio: true } })]);
  return dividiConto(p, Number(hotel.aliquotaAlloggio));
}

export function dividiConto(p: Prenotazione, aliquota: number) {
  const righe = righeConto(p, aliquota);
  const elenco = intestatari(p);
  const validi = new Set(elenco.map((x) => x.chiave));
  const spostate = new Map(p.intestazioniRighe.map((x) => [x.chiave, x.intestatario]));
  const intestatarioDi = (r: RigaConto) => {
    const a = spostate.get(r.chiave);
    return a && validi.has(a) ? a : intestatarioPredefinito(r, p, aliquota);
  };
  const conIntestatario = righe.map((r) => ({ ...r, intestatario: intestatarioDi(r), spostata: spostate.has(r.chiave) }));

  return {
    regola: p.regolaConto as RegolaConto,
    righe: conIntestatario,
    intestatari: elenco.map((it) => {
      const mie = conIntestatario.filter((r) => r.intestatario === it.chiave && !r.stornato);
      const totale = arrotonda(mie.reduce((t, r) => t + r.importo, 0));
      const pagato = arrotonda(
        p.pagamenti
          .filter((x) => !x.stornatoIl && (x.intestatario ?? "ospite") === it.chiave)
          .reduce((t, x) => t + (x.tipo === "rimborso" ? -1 : 1) * Number(x.importo), 0),
      );
      // Da fatturare: per ogni riga, importo attuale meno quanto già inviato al gestionale a questo intestatario.
      const fatturato = new Map<string, { importo: number; descrizione: string; aliquota: number | null; natura: string | null }>();
      for (const f of p.righeFatturate.filter((x) => x.intestatario === it.chiave)) {
        const v = fatturato.get(f.chiave) ?? { importo: 0, descrizione: f.descrizione, aliquota: f.aliquota === null ? null : Number(f.aliquota), natura: f.natura };
        v.importo = arrotonda(v.importo + Number(f.importo));
        fatturato.set(f.chiave, v);
      }
      const daFatturare: RigaDaFatturare[] = [];
      const chiavi = new Set([...mie.map((r) => r.chiave), ...fatturato.keys()]);
      for (const k of chiavi) {
        const r = mie.find((x) => x.chiave === k);
        const gia = fatturato.get(k);
        const residuo = arrotonda((r?.importo ?? 0) - (gia?.importo ?? 0));
        if (Math.abs(residuo) < 0.005) continue;
        const aliq = r ? r.aliquota : (gia?.aliquota ?? null);
        daFatturare.push({
          chiave: k,
          descrizione: !gia ? r!.descrizione : `${residuo < 0 ? "Storno" : "Conguaglio"}: ${r?.descrizione ?? gia.descrizione}`,
          importo: residuo,
          aliquota: aliq,
          natura: r ? r.natura : (gia?.natura ?? null),
          ...scorporo(residuo, aliq),
          conguaglio: !!gia,
        });
      }
      return {
        ...it,
        totale,
        pagato,
        daPagare: arrotonda(totale - pagato),
        riepilogoIva: riepilogoIva(mie),
        daFatturare: daFatturare.filter((x) => x.importo > 0),
        // Importi già fatturati e poi diminuiti o tolti: vanno stornati con una nota di credito.
        notaDiCredito: daFatturare.filter((x) => x.importo < 0),
        fatturato: arrotonda([...fatturato.values()].reduce((t, v) => t + v.importo, 0)),
      };
    }),
  };
}

// ---------------- Modifiche ----------------

export async function impostaRegolaConto(hotelId: number, id: number, regola: RegolaConto) {
  if (!(regola in REGOLE_CONTO)) throw new Error("Regola non valida.");
  await prisma.prenotazione.findFirstOrThrow({ where: { id, hotelId } });
  await prisma.prenotazione.update({ where: { id }, data: { regolaConto: regola } });
}

/** Sposta una riga del conto su un altro intestatario (null = torna alla regola). */
export async function spostaRiga(hotelId: number, id: number, chiave: string, intestatario: string | null) {
  const p = await trovaPrenotazione(hotelId, id);
  if (intestatario === null) {
    await prisma.intestazioneRigaConto.deleteMany({ where: { prenotazioneId: id, chiave } });
    return;
  }
  if (!intestatari(p).some((x) => x.chiave === intestatario)) throw new Error("Intestatario non valido per questa prenotazione.");
  await prisma.intestazioneRigaConto.upsert({
    where: { prenotazioneId_chiave: { prenotazioneId: id, chiave } },
    update: { intestatario },
    create: { prenotazioneId: id, chiave, intestatario },
  });
}

/**
 * Dati per il gestionale: intestatario con i dati fiscali e righe da fatturare (con IVA e natura).
 * Il collegamento automatico arriverà con le API del gestionale; intanto si scaricano.
 */
export async function datiFattura(hotelId: number, id: number, intestatario: string) {
  const [conto, hotel] = await Promise.all([contoDiviso(hotelId, id), prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, include: { comune: true } })]);
  const it = conto.intestatari.find((x) => x.chiave === intestatario);
  if (!it) throw new Error("Intestatario non trovato.");
  return {
    versione: 1,
    generatoIl: new Date().toISOString(),
    struttura: {
      denominazione: hotel.ragioneSociale || hotel.nome,
      partitaIva: hotel.partitaIva,
      codiceFiscale: hotel.codiceFiscale,
      indirizzo: hotel.indirizzo,
      cap: hotel.cap,
      comune: hotel.comune.nome,
      provincia: hotel.comune.provincia,
    },
    prenotazioneId: id,
    intestatario: { chiave: it.chiave, tipo: it.tipo, ...it.dati },
    righe: it.daFatturare,
    riepilogoIva: riepilogoIva(it.daFatturare.map((r) => ({ ...(r as unknown as RigaConto), stornato: null }))),
    totale: arrotonda(it.daFatturare.reduce((t, r) => t + r.importo, 0)),
    noteDiCredito: it.notaDiCredito,
  };
}

/** Dopo l'invio al gestionale: le righe da fatturare (e le note di credito) risultano inviate. */
export async function segnaFatturate(hotelId: number, id: number, intestatario: string, utente: string) {
  const dati = await datiFattura(hotelId, id, intestatario);
  const righe = [...dati.righe, ...dati.noteDiCredito];
  if (!righe.length) throw new Error("Non c'è niente da fatturare per questo intestatario.");
  const lotto = randomUUID();
  await prisma.rigaFatturata.createMany({
    data: righe.map((r) => ({ prenotazioneId: id, chiave: r.chiave, intestatario, descrizione: r.descrizione, importo: r.importo, aliquota: r.aliquota, natura: r.natura, lotto, da: utente })),
  });
  return righe.length;
}
