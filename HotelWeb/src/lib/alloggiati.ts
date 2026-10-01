import { prisma } from "@/lib/prisma";
import { cifra, decifra } from "@/lib/cifratura";
import { datiMancanti } from "@/lib/checkin";
import { CODICE_ITALIA, TIPI_ALLOGGIATO } from "@/lib/codiciPolizia";

/**
 * Schedina di Polizia (Alloggiati Web, art. 109 TULPS). Tracciato ufficiale a 168 caratteri, uguale
 * a quello del vecchio gestionale (vedi ALLOGGIATI_ROSS1000_SPECIFICHE.md); invio con il servizio web
 * SOAP 1.2 ufficiale (GenerateToken -> Send, ricevuta PDF il giorno dopo) oppure file da caricare a
 * mano sul portale. L'invio lo lancia sempre l'operatore; l'app avvisa delle scadenze (24 ore
 * dall'arrivo, 6 se il soggiorno non supera le 24 ore).
 */

const ENDPOINT = "https://alloggiatiweb.poliziadistato.it/service/Service.asmx";
const ORA = 60 * 60 * 1000;

// ---------------- Tracciato ----------------

const a = (v: string | null | undefined, n: number) => (v ?? "").slice(0, n).padEnd(n, " ");
const dataIt = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

export type DatiRiga = {
  tipoAlloggiato: number;
  arrivo: Date;
  giorni: number;
  cognome: string;
  nome: string;
  sesso: string; // "M" | "F"
  dataNascita: Date;
  comuneNascita: string | null; // codice 9 cifre, solo se nato in Italia
  provinciaNascita: string | null;
  statoNascita: string;
  cittadinanza: string;
  documentoTipo: string | null;
  documentoNumero: string | null;
  documentoRilascio: string | null;
};

/** Una riga del file (168 caratteri). I campi del documento solo per 16/17/18, altrimenti 34 spazi. */
export function rigaSchedina(d: DatiRiga) {
  const conDocumento = TIPI_ALLOGGIATO.find((t) => t.codice === d.tipoAlloggiato)?.documento ?? false;
  const natoInItalia = d.statoNascita === CODICE_ITALIA;
  const riga =
    String(d.tipoAlloggiato).padStart(2, "0") +
    dataIt(d.arrivo) +
    // Come il vecchio gestionale (accettato dal portale): allineato a destra con spazi, massimo 30.
    String(Math.min(30, Math.max(1, d.giorni))).padStart(2, " ") +
    a(d.cognome.trim(), 50) +
    a(d.nome.trim(), 30) +
    (d.sesso === "F" ? "2" : "1") +
    dataIt(d.dataNascita) +
    a(natoInItalia ? d.comuneNascita : "", 9) +
    a(natoInItalia ? d.provinciaNascita : "", 2) +
    a(d.statoNascita, 9) +
    a(d.cittadinanza, 9) +
    (conDocumento ? a(d.documentoTipo, 5) + a(d.documentoNumero, 20) + a(d.documentoRilascio, 9) : " ".repeat(34));
  if (riga.length !== 168) throw new Error(`Riga della schedina di ${riga.length} caratteri invece di 168.`);
  return riga;
}

// ---------------- Schedine da inviare ----------------

/** Persone arrivate la cui schedina non è ancora stata comunicata, con riga pronta o dati mancanti. */
export async function schedineDaInviare(hotelId: number) {
  const presenze = await prisma.presenza.findMany({
    where: {
      stato: { not: "attesa" },
      schedinaInviataIl: null,
      segmento: { stato: { not: "ANNULLATO" }, prenotazione: { hotelId } },
    },
    include: { ospite: true, segmento: { include: { camera: true } } },
    orderBy: [{ arrivoIl: "asc" }, { id: "asc" }],
  });
  const codici = presenze.map((p) => p.ospite.comuneNascitaCodice).filter((c): c is string => !!c);
  const comuni = new Map((await prisma.luogoPolizia.findMany({ where: { codice: { in: codici } } })).map((l) => [l.codice, l]));
  const ora = Date.now();

  const righe = presenze.map((p) => {
    const o = p.ospite;
    const arrivo = p.dal ?? p.segmento.dataInizio;
    const partenza = p.al ?? p.segmento.dataFine;
    const notti = Math.round((partenza.getTime() - arrivo.getTime()) / (24 * ORA));
    // Termine: 24 ore dall'arrivo, 6 ore se il soggiorno non supera le 24 ore (una notte).
    const arrivatoIl = p.arrivoIl ?? arrivo;
    const scadenza = new Date(arrivatoIl.getTime() + (notti <= 1 ? 6 : 24) * ORA);
    const mancanti = datiMancanti(o, p, null);
    let riga: string | null = null;
    let errore: string | null = null;
    if (mancanti.length === 0) {
      try {
        riga = rigaSchedina({
          tipoAlloggiato: p.tipoAlloggiato!,
          arrivo,
          giorni: notti,
          cognome: o.cognome,
          nome: o.nome,
          sesso: o.sesso!,
          dataNascita: o.dataNascita!,
          comuneNascita: o.comuneNascitaCodice,
          provinciaNascita: o.comuneNascitaCodice ? (comuni.get(o.comuneNascitaCodice)?.provincia ?? null) : null,
          statoNascita: o.statoNascitaCodice!,
          cittadinanza: o.cittadinanzaCodice!,
          documentoTipo: o.documentoTipoCodice,
          documentoNumero: o.documentoNumero,
          documentoRilascio: o.documentoRilascioCodice,
        });
      } catch (e) {
        errore = e instanceof Error ? e.message : String(e);
      }
    }
    return {
      presenzaId: p.id,
      ospiteId: o.id,
      capoOspiteId: p.capoOspiteId,
      tipoAlloggiato: p.tipoAlloggiato,
      prenotazioneId: p.segmento.prenotazioneId,
      segmentoId: p.segmentoId,
      nome: `${o.cognome} ${o.nome}`.trim(),
      camera: p.segmento.camera?.codice ?? null,
      arrivo: arrivo.toISOString().slice(0, 10),
      notti,
      scadenza: scadenza.toISOString(),
      scaduta: scadenza.getTime() < ora,
      mancanti,
      ultimoScarto: p.schedinaErrore,
      riga,
      errore,
    };
  });
  // Ordine richiesto dalla Polizia: familiari e membri del gruppo subito dopo il loro capo.
  const capi = righe.filter((r) => r.tipoAlloggiato !== 19 && r.tipoAlloggiato !== 20);
  const ordinate: typeof righe = [];
  for (const c of capi) {
    ordinate.push(c);
    ordinate.push(...righe.filter((r) => (r.tipoAlloggiato === 19 || r.tipoAlloggiato === 20) && r.capoOspiteId === c.ospiteId && r.prenotazioneId === c.prenotazioneId));
  }
  ordinate.push(...righe.filter((r) => !ordinate.includes(r)));
  return ordinate;
}

/** Per l'avviso in cima all'app: quante schedine aspettano e quando scade la prima. */
export async function avvisoSchedine(hotelId: number) {
  const r = await schedineDaInviare(hotelId);
  if (r.length === 0) return null;
  const prima = r.reduce((m, x) => (x.scadenza < m ? x.scadenza : m), r[0].scadenza);
  return { quante: r.length, scadute: r.filter((x) => x.scaduta).length, primaScadenza: prima };
}

/** File da caricare a mano sul portale: righe pronte separate da CR LF, l'ultima senza. */
export async function fileSchedine(hotelId: number) {
  const pronte = (await schedineDaInviare(hotelId)).filter((r) => r.riga);
  if (pronte.length === 0) throw new Error("Nessuna schedina pronta: completa prima i dati mancanti al check-in.");
  if (pronte.length > 1000) throw new Error("Il portale accetta al massimo 1000 righe per file.");
  return { testo: pronte.map((r) => r.riga).join("\r\n"), presenzaIds: pronte.map((r) => r.presenzaId) };
}

/** Dopo aver caricato il file sul portale: segna come comunicate le schedine contenute. */
export async function segnaInviateDaFile(hotelId: number, presenzaIds: number[], utente: string) {
  const valide = await prisma.presenza.findMany({
    where: { id: { in: presenzaIds }, schedinaInviataIl: null, segmento: { prenotazione: { hotelId } } },
    include: { ospite: true },
  });
  if (valide.length === 0) throw new Error("Nessuna schedina da segnare.");
  const invio = await prisma.invioAlloggiati.create({
    data: {
      hotelId,
      da: utente,
      modalita: "file",
      righe: valide.length,
      accettate: valide.length,
      dettaglio: valide.map((p) => ({ presenzaId: p.id, nome: `${p.ospite.cognome} ${p.ospite.nome}`, esito: true, errore: null })),
    },
  });
  await prisma.presenza.updateMany({ where: { id: { in: valide.map((p) => p.id) } }, data: { schedinaInviataIl: new Date(), schedinaInvioId: invio.id, schedinaErrore: null } });
  return invio.id;
}

// ---------------- Servizio web (SOAP 1.2) ----------------

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tag = (corpo: string, nome: string) => corpo.match(new RegExp(`<(?:\\w+:)?${nome}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nome}>`))?.[1] ?? null;
const testo = (s: string | null) => (s ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

async function chiama(operazione: string, corpo: string) {
  const busta =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
    `<soap12:Body><${operazione} xmlns="AlloggiatiService">${corpo}</${operazione}></soap12:Body></soap12:Envelope>`;
  let risposta: Response;
  try {
    risposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": `application/soap+xml; charset=utf-8; action="AlloggiatiService/${operazione}"` },
      body: busta,
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new Error("Il servizio della Polizia non risponde. Riprova tra poco oppure usa «Scarica il file» e caricalo sul portale.");
  }
  const t = await risposta.text();
  if (!risposta.ok && !t.includes("Envelope")) throw new Error(`Il servizio della Polizia ha risposto con errore ${risposta.status}.`);
  const fault = tag(t, "Text") ?? tag(t, "faultstring");
  if (fault && t.includes("Fault")) throw new Error(`Errore dal servizio della Polizia: ${testo(fault)}`);
  return t;
}

/** Esito di un'operazione: esito=false porta il messaggio della Polizia. */
function esito(blocco: string | null) {
  const b = blocco ?? "";
  return { ok: testo(tag(b, "esito")) === "true", codice: testo(tag(b, "ErroreCod")), descrizione: testo(tag(b, "ErroreDes")), dettaglio: testo(tag(b, "ErroreDettaglio")) };
}

async function token(utente: string, password: string, wskey: string) {
  const t = await chiama("GenerateToken", `<Utente>${xml(utente)}</Utente><Password>${xml(password)}</Password><WsKey>${xml(wskey)}</WsKey>`);
  const e = esito(tag(t, "result"));
  const tk = testo(tag(tag(t, "GenerateTokenResult") ?? "", "token"));
  if (!e.ok || !tk) {
    throw new Error(
      `La Polizia non accetta le credenziali: ${e.descrizione || "accesso negato"}${e.dettaglio ? ` (${e.dettaglio})` : ""}. Se avete cambiato la password del portale, rigenerate la chiave del servizio web e aggiornatela nelle Impostazioni.`,
    );
  }
  return tk;
}

async function credenziali(hotelId: number) {
  const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  if (!h.alloggiatiUtente || !h.alloggiatiPassword || !h.alloggiatiWskey) {
    throw new Error("Credenziali di Alloggiati Web non impostate: le inserisce l'amministratore in Impostazioni > Adempimenti. Intanto puoi usare «Scarica il file».");
  }
  return { utente: h.alloggiatiUtente, password: decifra(h.alloggiatiPassword), wskey: decifra(h.alloggiatiWskey) };
}

export async function statoCredenziali(hotelId: number) {
  const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  return {
    utente: h.alloggiatiUtente ?? "",
    passwordImpostata: !!h.alloggiatiPassword,
    wskeyImpostata: !!h.alloggiatiWskey,
    verificatoIl: h.alloggiatiVerificatoIl?.toISOString() ?? null,
  };
}

/** Salva le credenziali (password e chiave vuote = invariate) e prova subito l'accesso. */
export async function salvaCredenziali(hotelId: number, d: { utente: string; password: string; wskey: string }) {
  if (!d.utente.trim()) throw new Error("Indica l'utente di Alloggiati Web.");
  await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      alloggiatiUtente: d.utente.trim(),
      ...(d.password ? { alloggiatiPassword: cifra(d.password) } : {}),
      ...(d.wskey.trim() ? { alloggiatiWskey: cifra(d.wskey.trim()) } : {}),
      alloggiatiVerificatoIl: null,
    },
  });
  return verificaCredenziali(hotelId);
}

export async function verificaCredenziali(hotelId: number) {
  const c = await credenziali(hotelId);
  const tk = await token(c.utente, c.password, c.wskey);
  const t = await chiama("Authentication_Test", `<Utente>${xml(c.utente)}</Utente><token>${xml(tk)}</token>`);
  const e = esito(tag(t, "Authentication_TestResult"));
  if (!e.ok) throw new Error(`Prova di accesso non riuscita: ${e.descrizione || "errore sconosciuto"}.`);
  await prisma.hotel.update({ where: { id: hotelId }, data: { alloggiatiVerificatoIl: new Date() } });
  return statoCredenziali(hotelId);
}

/**
 * Controlla le schedine pronte con il metodo "Test" della Polizia, che le valida SENZA trasmetterle:
 * per il primo uso con credenziali vere o per capire in anticipo cosa verrebbe scartato.
 */
export async function controllaSchedine(hotelId: number) {
  const pronte = (await schedineDaInviare(hotelId)).filter((r) => r.riga);
  if (pronte.length === 0) throw new Error("Nessuna schedina pronta da controllare.");
  const c = await credenziali(hotelId);
  const tk = await token(c.utente, c.password, c.wskey);
  const elenco = pronte.map((r) => `<string>${xml(r.riga!)}</string>`).join("");
  const t = await chiama("Test", `<Utente>${xml(c.utente)}</Utente><token>${xml(tk)}</token><ElencoSchedine>${elenco}</ElencoSchedine>`);
  const generale = esito(tag(t, "TestResult"));
  if (!generale.ok) throw new Error(`Controllo non riuscito: ${generale.descrizione || "errore sconosciuto"}${generale.dettaglio ? ` (${generale.dettaglio})` : ""}.`);
  const blocchi = [...(tag(t, "Dettaglio") ?? "").matchAll(/<(?:\w+:)?EsitoOperazioneServizio[^>]*>([\s\S]*?)<\/(?:\w+:)?EsitoOperazioneServizio>/g)].map((m) => esito(m[1]));
  const scartate = pronte
    .map((r, i) => ({ nome: r.nome, e: blocchi[i] }))
    .filter((x) => !x.e?.ok)
    .map((x) => ({ nome: x.nome, errore: x.e ? [x.e.descrizione, x.e.dettaglio].filter(Boolean).join(" — ") : "Esito non ricevuto" }));
  return { controllate: pronte.length, valide: pronte.length - scartate.length, scartate };
}

/**
 * Invia alla Polizia tutte le schedine pronte. La Polizia acquisisce solo le righe corrette: le altre
 * restano da inviare con il motivo dello scarto.
 */
export async function inviaSchedine(hotelId: number, utente: string) {
  const pronte = (await schedineDaInviare(hotelId)).filter((r) => r.riga);
  if (pronte.length === 0) throw new Error("Nessuna schedina pronta da inviare: completa prima i dati mancanti al check-in.");
  const c = await credenziali(hotelId);
  const tk = await token(c.utente, c.password, c.wskey);
  const elenco = pronte.map((r) => `<string>${xml(r.riga!)}</string>`).join("");
  const t = await chiama("Send", `<Utente>${xml(c.utente)}</Utente><token>${xml(tk)}</token><ElencoSchedine>${elenco}</ElencoSchedine>`);
  const generale = esito(tag(t, "SendResult"));
  if (!generale.ok) throw new Error(`Invio non riuscito: ${generale.descrizione || "errore sconosciuto"}${generale.dettaglio ? ` (${generale.dettaglio})` : ""}.`);
  const blocchi = [...(tag(t, "Dettaglio") ?? "").matchAll(/<(?:\w+:)?EsitoOperazioneServizio[^>]*>([\s\S]*?)<\/(?:\w+:)?EsitoOperazioneServizio>/g)].map((m) => esito(m[1]));
  const dettaglio = pronte.map((r, i) => {
    const e = blocchi[i] ?? { ok: false, codice: "", descrizione: "Esito non ricevuto", dettaglio: "" };
    return { presenzaId: r.presenzaId, nome: r.nome, esito: e.ok, errore: e.ok ? null : [e.descrizione, e.dettaglio].filter(Boolean).join(" — ") };
  });
  const accettate = dettaglio.filter((d) => d.esito);
  const invio = await prisma.invioAlloggiati.create({
    data: { hotelId, da: utente, modalita: "servizio", righe: dettaglio.length, accettate: accettate.length, dettaglio },
  });
  await prisma.$transaction([
    prisma.presenza.updateMany({ where: { id: { in: accettate.map((d) => d.presenzaId) } }, data: { schedinaInviataIl: new Date(), schedinaInvioId: invio.id, schedinaErrore: null } }),
    ...dettaglio.filter((d) => !d.esito).map((d) => prisma.presenza.update({ where: { id: d.presenzaId }, data: { schedinaErrore: d.errore } })),
  ]);
  return { inviate: dettaglio.length, accettate: accettate.length, scartate: dettaglio.filter((d) => !d.esito) };
}

/**
 * Scarica e conserva le ricevute PDF dei giorni con invii dal servizio web (disponibili per 30 giorni,
 * escluso oggi). Le ricevute vanno conservate 5 anni. Ritorna quante ne ha scaricate.
 */
export async function aggiornaRicevute(hotelId: number) {
  const oggi = new Date(new Date().toISOString().slice(0, 10));
  const da = new Date(oggi.getTime() - 30 * 24 * ORA);
  const invii = await prisma.invioAlloggiati.findMany({ where: { hotelId, modalita: "servizio", accettate: { gt: 0 }, il: { gte: da, lt: oggi } } });
  const giorni = [...new Set(invii.map((i) => i.il.toISOString().slice(0, 10)))];
  const presenti = new Set((await prisma.ricevutaAlloggiati.findMany({ where: { hotelId }, select: { data: true } })).map((r) => r.data.toISOString().slice(0, 10)));
  const mancanti = giorni.filter((g) => !presenti.has(g));
  if (mancanti.length === 0) return 0;
  const c = await credenziali(hotelId);
  const tk = await token(c.utente, c.password, c.wskey);
  let scaricate = 0;
  for (const g of mancanti) {
    const t = await chiama("Ricevuta", `<Utente>${xml(c.utente)}</Utente><token>${xml(tk)}</token><Data>${g}T00:00:00</Data>`);
    const pdf = testo(tag(t, "PDF"));
    if (!pdf) continue;
    await prisma.ricevutaAlloggiati.create({ data: { hotelId, data: new Date(g), pdf: Buffer.from(pdf, "base64") } });
    scaricate += 1;
  }
  return scaricate;
}

export async function storicoAlloggiati(hotelId: number) {
  const [invii, ricevute] = await Promise.all([
    prisma.invioAlloggiati.findMany({ where: { hotelId }, orderBy: { il: "desc" }, take: 30 }),
    prisma.ricevutaAlloggiati.findMany({ where: { hotelId }, select: { id: true, data: true }, orderBy: { data: "desc" }, take: 60 }),
  ]);
  return {
    invii: invii.map((i) => ({
      id: i.id,
      il: i.il.toISOString(),
      da: i.da,
      modalita: i.modalita,
      righe: i.righe,
      accettate: i.accettate,
      dettaglio: (i.dettaglio ?? []) as { presenzaId: number; nome: string; esito: boolean; errore: string | null }[],
    })),
    ricevute: ricevute.map((r) => ({ id: r.id, data: r.data.toISOString().slice(0, 10) })),
  };
}

export async function pdfRicevuta(hotelId: number, id: number) {
  const r = await prisma.ricevutaAlloggiati.findFirstOrThrow({ where: { id, hotelId } });
  return { nome: `ricevuta-alloggiati-${r.data.toISOString().slice(0, 10)}.pdf`, pdf: r.pdf };
}
