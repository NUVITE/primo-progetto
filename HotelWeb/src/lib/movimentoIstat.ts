import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { cifra, decifra } from "@/lib/cifratura";
import { CODICE_ITALIA } from "@/lib/codiciPolizia";
import { LISTE_ISTAT, sistemaIstatValido, type SistemaIstat } from "@/lib/istat";

/**
 * Movimento turistico per l'ISTAT, un giorno alla volta (vedi ALLOGGIATI_ROSS1000_SPECIFICHE.md):
 * - Ross1000 (es. Lazio): un movimento per giorno inviato con il servizio web; correggere = rinviare
 *   il giorno (gli ospiti tolti si eliminano con una rettifica). Termine: entro il mese successivo.
 * - SPOT (Puglia): file XML da caricare sul portale, giorni consecutivi, il primo preceduto
 *   dall'"avvio" con gli ospiti già presenti. Termine: il 10 del mese successivo.
 * L'invio lo lancia sempre l'operatore; l'app ricorda i giorni rimasti indietro.
 * Per ogni giorno comunicato si conserva un'impronta: se dopo l'invio i dati cambiano, il giorno
 * torna "da rinviare".
 */

const GIORNO = 24 * 60 * 60 * 1000;
const PRODOTTO = "HotelWeb";
export const INDIRIZZO_ROSS1000_LAZIO = "https://lazioturismo.ross1000.it/ws/checkinV2";

// ---------------- Date (giorni come "aaaa-mm-gg", mezzanotte UTC come nel database) ----------------

const iso = (d: Date) => d.toISOString().slice(0, 10);
const data = (g: string) => new Date(`${g}T00:00:00.000Z`);
const piu = (g: string, n: number) => iso(new Date(data(g).getTime() + n * GIORNO));
const compatta = (g: string) => g.replaceAll("-", "");

/** Oggi in Italia (i giorni comunicati sono quelli già conclusi, fino a ieri). */
export function oggiItalia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

function giorniTra(dal: string, al: string) {
  const r: string[] = [];
  for (let g = dal; g <= al; g = piu(g, 1)) r.push(g);
  return r;
}

const eta = (nascita: Date, al: string) => {
  const a = data(al);
  let e = a.getUTCFullYear() - nascita.getUTCFullYear();
  if (a.getUTCMonth() < nascita.getUTCMonth() || (a.getUTCMonth() === nascita.getUTCMonth() && a.getUTCDate() < nascita.getUTCDate())) e--;
  return Math.max(0, e);
};

// ---------------- Soggiorni delle persone ----------------

/**
 * Il soggiorno di UNA persona: le sue presenze collegate dai cambi camera formano una catena, che
 * per l'ISTAT è un solo arrivo e una sola partenza. idswh = id della prima presenza (non cambia
 * più e non contiene dati anagrafici, come chiedono entrambi i sistemi).
 */
export type Soggiorno = {
  idswh: string;
  prenotazioneId: number;
  ospiteId: number;
  nome: string;
  tipo: number | null;
  capoOspiteId: number | null;
  arrivo: string;
  partenza: string;
  partito: boolean;
  // notte -> segmento (camera) occupato quella notte
  notti: Map<string, number>;
  sesso: string | null;
  dataNascita: Date | null;
  cittadinanza: string | null;
  statoNascita: string | null;
  comuneNascita: string | null;
  residenzaStato: string | null;
  residenzaComune: string | null;
  cognome: string;
  nomeProprio: string;
  motivo: string | null;
  mezzoArrivo: string | null;
  mezzoMovimento: string | null;
  postoLetto: boolean;
  // Provenienza della prenotazione (canale e mezzo): per il canale di prenotazione ISTAT.
  canale: string;
  mezzoPrenotazione: string | null;
};

async function soggiorniDelPeriodo(hotelId: number, dal: string, al: string) {
  // Prenotazioni con almeno una camera nel periodo; poi tutte le loro presenze arrivate, così le
  // catene di cambio camera restano intere anche se iniziano prima del periodo.
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: { prenotazione: { hotelId }, stato: { not: "ANNULLATO" }, dataInizio: { lte: data(al) }, dataFine: { gte: data(dal) } },
    select: { prenotazioneId: true },
    distinct: ["prenotazioneId"],
  });
  const presenze = await prisma.presenza.findMany({
    where: { segmento: { prenotazioneId: { in: segmenti.map((s) => s.prenotazioneId) }, stato: { not: "ANNULLATO" } } },
    include: { ospite: true, segmento: { include: { prenotazione: { select: { canale: true, mezzo: true } } } } },
    orderBy: { id: "asc" },
  });

  const arrivate = presenze.filter((p) => p.stato !== "attesa");
  const perSegmentoOspite = new Map(arrivate.map((p) => [`${p.segmentoId}:${p.ospiteId}`, p]));
  const seguente = new Map<number, (typeof arrivate)[number]>();
  for (const p of arrivate) {
    const prec = p.segmento.segmentoPrecedenteId && perSegmentoOspite.get(`${p.segmento.segmentoPrecedenteId}:${p.ospiteId}`);
    if (prec) seguente.set(prec.id, p);
  }
  const conPrecedente = new Set([...seguente.values()].map((p) => p.id));

  const soggiorni: Soggiorno[] = [];
  for (const primo of arrivate.filter((p) => !conPrecedente.has(p.id))) {
    const catena = [primo];
    for (let p = seguente.get(primo.id); p; p = seguente.get(p.id)) catena.push(p);
    const ultimo = catena[catena.length - 1];
    const notti = new Map<string, number>();
    for (const p of catena) {
      const inizio = iso(p.dal ?? p.segmento.dataInizio);
      const fine = iso(p.al ?? p.segmento.dataFine);
      for (let g = inizio; g < fine; g = piu(g, 1)) notti.set(g, p.segmentoId);
    }
    const o = primo.ospite;
    soggiorni.push({
      idswh: String(primo.id),
      prenotazioneId: primo.segmento.prenotazioneId,
      ospiteId: o.id,
      nome: `${o.cognome} ${o.nome}`.trim(),
      tipo: primo.tipoAlloggiato,
      capoOspiteId: primo.capoOspiteId,
      arrivo: iso(primo.dal ?? primo.segmento.dataInizio),
      partenza: iso(ultimo.al ?? ultimo.segmento.dataFine),
      partito: ultimo.stato === "partito",
      notti,
      sesso: o.sesso,
      dataNascita: o.dataNascita,
      cittadinanza: o.cittadinanzaCodice,
      statoNascita: o.statoNascitaCodice,
      comuneNascita: o.comuneNascitaCodice,
      residenzaStato: o.residenzaStatoCodice,
      residenzaComune: o.residenzaComuneCodice,
      cognome: o.cognome,
      nomeProprio: o.nome,
      motivo: primo.motivoViaggio,
      mezzoArrivo: primo.mezzoArrivo,
      mezzoMovimento: primo.mezzoMovimento,
      postoLetto: primo.occupaPostoLetto,
      canale: primo.segmento.prenotazione.canale,
      mezzoPrenotazione: primo.segmento.prenotazione.mezzo,
    });
  }

  // Chi doveva arrivare ma non risulta arrivato (check-in non registrato o mancato arrivo).
  const nonArrivati = presenze
    .filter((p) => p.stato === "attesa" && !p.segmento.segmentoPrecedenteId)
    .map((p) => ({ nome: `${p.ospite.cognome} ${p.ospite.nome}`.trim(), arrivo: iso(p.dal ?? p.segmento.dataInizio), prenotazioneId: p.segmento.prenotazioneId }));
  return { soggiorni, nonArrivati };
}

/** Il capo (famiglia o gruppo) di un familiare/membro: stessa prenotazione, ospite indicato al check-in. */
function capoDi(s: Soggiorno, tutti: Soggiorno[]) {
  if (s.tipo !== 19 && s.tipo !== 20) return null;
  return tutti.find((c) => c.prenotazioneId === s.prenotazioneId && c.ospiteId === s.capoOspiteId && c.tipo !== 19 && c.tipo !== 20) ?? null;
}

/** Dati che mancano per comunicare la persona all'ISTAT (si completano dal check-in). */
function mancantiIstat(s: Soggiorno, tutti: Soggiorno[], sistema: SistemaIstat) {
  const m: string[] = [];
  if (!s.tipo) m.push("tipo di alloggiato");
  else if ((s.tipo === 19 || s.tipo === 20) && !capoDi(s, tutti)) m.push("capofamiglia/capogruppo");
  if (s.sesso !== "M" && s.sesso !== "F") m.push("sesso");
  if (!s.dataNascita) m.push("data di nascita");
  if (!s.cittadinanza) m.push("cittadinanza");
  if (!s.residenzaStato) m.push("stato di residenza");
  else if (s.residenzaStato === CODICE_ITALIA && !s.residenzaComune) m.push("comune di residenza");
  if (sistema === "ROSS1000" && s.statoNascita === CODICE_ITALIA && !s.comuneNascita) m.push("comune di nascita");
  return m;
}

// ---------------- Il giorno ----------------

export type GiornoIstat = {
  giorno: string;
  aperto: boolean;
  camereDisponibili: number;
  lettiDisponibili: number;
  camereOccupate: number;
  presenti: number;
  arrivi: Soggiorno[];
  partenze: Soggiorno[];
  /** Persone con dati incompleti: il giorno non si può comunicare finché non si completano. */
  incompleti: { nome: string; mancanti: string[]; prenotazioneId: number }[];
  /** Cose da controllare che non bloccano l'invio. */
  avvisi: string[];
};

async function datiStruttura(hotelId: number, dal: string, al: string) {
  const [camere, fuoriServizio, chiusure] = await Promise.all([
    prisma.camera.findMany({ where: { hotelId, attivo: true }, select: { id: true, capienzaAdulti: true, capienzaBambini: true } }),
    prisma.cameraIndisponibilita.findMany({ where: { camera: { hotelId, attivo: true }, dal: { lte: data(al) }, al: { gt: data(dal) } } }),
    prisma.periodoChiusura.findMany({ where: { hotelId, dal: { lte: data(al) }, al: { gte: data(dal) } } }),
  ]);
  return (g: string) => {
    const d = data(g);
    const chiuso = chiusure.some((c) => c.dal <= d && c.al >= d);
    // Fuori servizio come nel planning: dal incluso, al escluso.
    const ferme = new Set(fuoriServizio.filter((f) => f.dal <= d && f.al > d).map((f) => f.cameraId));
    const vendibili = camere.filter((c) => !ferme.has(c.id));
    return {
      aperto: !chiuso,
      camere: chiuso ? 0 : vendibili.length,
      letti: chiuso ? 0 : vendibili.reduce((t, c) => t + c.capienzaAdulti + c.capienzaBambini, 0),
    };
  };
}

/** I giorni [dal, al] con struttura, arrivi, partenze e quello che manca. */
export async function giorniIstat(hotelId: number, sistema: SistemaIstat, dal: string, al: string) {
  const [{ soggiorni, nonArrivati }, struttura] = await Promise.all([soggiorniDelPeriodo(hotelId, dal, al), datiStruttura(hotelId, dal, al)]);
  const oggi = oggiItalia();
  return {
    soggiorni,
    giorni: giorniTra(dal, al).map((g): GiornoIstat => {
      const s = struttura(g);
      const arrivi = soggiorni.filter((x) => x.arrivo === g);
      const partenze = soggiorni.filter((x) => x.partenza === g);
      const stanotte = soggiorni.filter((x) => x.notti.has(g));
      const camereOccupate = new Set(stanotte.map((x) => x.notti.get(g))).size;
      const avvisi: string[] = [];
      for (const p of partenze.filter((x) => !x.partito && g < oggi)) avvisi.push(`${p.nome}: partenza prevista ma check-out non registrato.`);
      for (const n of nonArrivati.filter((x) => x.arrivo === g && g < oggi)) avvisi.push(`${n.nome} (prenotazione ${n.prenotazioneId}): arrivo previsto ma check-in non registrato.`);
      if (!s.aperto && (stanotte.length || arrivi.length)) avvisi.push("Il giorno è nel calendario di chiusura ma ci sono ospiti: controlla le chiusure.");
      if (s.aperto && camereOccupate > s.camere) avvisi.push(`Camere occupate (${camereOccupate}) più di quelle disponibili (${s.camere}).`);
      return {
        giorno: g,
        aperto: s.aperto,
        camereDisponibili: s.camere,
        lettiDisponibili: s.letti,
        // Struttura chiusa: entrambi i sistemi vogliono tutto a zero.
        camereOccupate: s.aperto ? Math.min(camereOccupate, s.camere) : 0,
        presenti: stanotte.length,
        arrivi,
        partenze,
        // Chi è intestatario di più camere comparirebbe più volte: una riga per persona.
        incompleti: [
          ...new Map(
            arrivi
              .map((a) => ({ nome: a.nome, mancanti: mancantiIstat(a, soggiorni, sistema), prenotazioneId: a.prenotazioneId }))
              .filter((x) => x.mancanti.length)
              .map((x) => [`${x.prenotazioneId}|${x.nome}`, x]),
          ).values(),
        ],
        avvisi: [...new Set(avvisi)],
      };
    }),
  };
}

// ---------------- XML ----------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const el = (nome: string, v: string | number | null | undefined) => `<${nome}>${esc(v == null ? "" : String(v))}</${nome}>`;
const impronta = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 32);

/** Ross1000: valore della lista in maiuscolo come negli esempi ufficiali; "Non specificato" se manca. */
const testoRoss = (v: string | null, lista: { valore: string }[], nonSpecificato: string) =>
  (v && lista.some((x) => x.valore === v) ? v : nonSpecificato).toUpperCase();

/**
 * Canale di prenotazione Ross1000 dalla provenienza: diretta o indiretta (azienda, agenzia, portale),
 * tradizionale o web. Vuoto se la diretta non ha il mezzo (campo facoltativo).
 */
export function canaleRoss1000(s: Pick<Soggiorno, "canale" | "mezzoPrenotazione">) {
  const web = s.mezzoPrenotazione === "web";
  if (s.canale === "altro") return "ALTRO CANALE";
  if (s.canale === "portale") return "INDIRETTA WEB";
  if (s.canale === "diretta") return !s.mezzoPrenotazione || s.mezzoPrenotazione === "altro" ? "" : web ? "DIRETTA WEB" : "DIRETTA TRADIZIONALE";
  return web ? "INDIRETTA WEB" : "INDIRETTA TRADIZIONALE";
}

/** SPOT: caratteristica del viaggio dalla provenienza (null = non si indica, è facoltativa). */
export function caratteristicaSpot(s: Pick<Soggiorno, "canale" | "mezzoPrenotazione">) {
  if (s.canale === "agenzia") return "AGENZIA";
  if (s.canale === "portale") return "DIRETTAALLOGGIOINTERNET";
  if (s.canale === "diretta" && s.mezzoPrenotazione) return s.mezzoPrenotazione === "web" ? "DIRETTAALLOGGIOINTERNET" : "DIRETTAALLOGGIOSR";
  return null;
}

export function movimentoRoss1000(g: GiornoIstat, tutti: Soggiorno[], eliminati: { idswh: string; tipo: number; arrivo: string }[] = []) {
  const L = LISTE_ISTAT.ROSS1000;
  // Il capo prima dei suoi familiari o membri del gruppo (idcapo deve essere già trasmesso).
  const ordinati = [...g.arrivi].sort((x, y) => Number(x.tipo === 19 || x.tipo === 20) - Number(y.tipo === 19 || y.tipo === 20));
  const arrivi = ordinati.map((s) => {
    const capo = capoDi(s, tutti);
    const italiaRes = s.residenzaStato === CODICE_ITALIA;
    const italiaNas = s.statoNascita === CODICE_ITALIA;
    return (
      "<arrivo>" +
      el("idswh", s.idswh) +
      el("tipoalloggiato", s.tipo) +
      el("idcapo", capo?.idswh ?? "") +
      el("cognome", s.cognome.trim().slice(0, 50)) +
      el("nome", s.nomeProprio.trim().slice(0, 30)) +
      el("sesso", s.sesso) +
      el("cittadinanza", s.cittadinanza) +
      el("statoresidenza", s.residenzaStato) +
      el("luogoresidenza", italiaRes ? s.residenzaComune : "") +
      el("datanascita", s.dataNascita ? compatta(iso(s.dataNascita)) : "") +
      el("statonascita", s.statoNascita) +
      el("comunenascita", italiaNas ? s.comuneNascita : "") +
      // Familiari e membri del gruppo: se non indicati, motivo e mezzo del capo.
      el("tipoturismo", testoRoss(s.motivo ?? capo?.motivo ?? null, L.motivo, "Non specificato")) +
      el("mezzotrasporto", testoRoss(s.mezzoArrivo ?? capo?.mezzoArrivo ?? null, L.mezzoArrivo, "Non Specificato")) +
      el("canaleprenotazione", canaleRoss1000(s)) +
      el("titolostudio", "") +
      el("professione", "") +
      el("esenzioneimposta", "") +
      "</arrivo>"
    );
  });
  const partenze = g.partenze.map((s) => "<partenza>" + el("idswh", s.idswh) + el("tipoalloggiato", s.tipo) + el("arrivo", compatta(s.arrivo)) + "</partenza>");
  const corpo =
    el("data", compatta(g.giorno)) +
    "<struttura>" +
    el("apertura", g.aperto ? "SI" : "NO") +
    el("camereoccupate", g.camereOccupate) +
    el("cameredisponibili", g.camereDisponibili) +
    el("lettidisponibili", g.lettiDisponibili) +
    "</struttura>" +
    (arrivi.length ? `<arrivi>${arrivi.join("")}</arrivi>` : "") +
    (partenze.length ? `<partenze>${partenze.join("")}</partenze>` : "");
  const rettifiche = eliminati.map((e) => "<eliminazione>" + el("idswh", e.idswh) + el("tipoalloggiato", e.tipo) + el("arrivo", compatta(e.arrivo)) + "</eliminazione>");
  return {
    xml: `<movimento>${corpo}${rettifiche.length ? `<rettifiche>${rettifiche.join("")}</rettifiche>` : ""}</movimento>`,
    impronta: impronta(corpo),
  };
}

/**
 * SPOT: solo ospiti singoli, capifamiglia e capigruppo (16/17/18) con i loro componenti annidati.
 * Un familiare/membro si annida sotto il capo solo se arriva e parte con lui; altrimenti si comunica
 * come ospite singolo, perché SPOT fa partire i componenti insieme al capo.
 */
function annidatoSotto(s: Soggiorno, tutti: Soggiorno[]) {
  const capo = capoDi(s, tutti);
  return capo && capo.arrivo === s.arrivo && capo.partenza === s.partenza ? capo : null;
}

function residenzaSpot(s: Soggiorno) {
  return s.residenzaStato === CODICE_ITALIA ? el("comuneresidenza", s.residenzaComune) : el("paeseresidenza", s.residenzaStato);
}

function arrivoSpot(s: Soggiorno, tutti: Soggiorno[], dataArrivo: string) {
  const L = LISTE_ISTAT.SPOT;
  const valido = (v: string | null, lista: { valore: string }[] | null) => (v && lista?.some((x) => x.valore === v) ? v : null);
  const componenti = tutti.filter((c) => c !== s && annidatoSotto(c, tutti) === s);
  const tipo = s.tipo === 17 || s.tipo === 18 ? (componenti.length ? s.tipo : 16) : 16;
  const mezzoA = valido(s.mezzoArrivo, L.mezzoArrivo);
  const mezzoM = valido(s.mezzoMovimento, L.mezzoMovimento);
  const motivo = valido(s.motivo, L.motivo);
  const caratteristica = caratteristicaSpot(s);
  return (
    "<arrivo>" +
    el("codiceclientesr", s.idswh) +
    el("sesso", s.sesso) +
    el("cittadinanza", s.cittadinanza) +
    residenzaSpot(s) +
    el("occupazionepostoletto", s.postoLetto ? "si" : "no") +
    (caratteristica ? `<caratteristicheviaggio>${el("caratteristica", caratteristica)}</caratteristicheviaggio>` : "") +
    (mezzoA ? el("mezzotrasportoarrivo", mezzoA) : "") +
    (mezzoM ? el("mezzotrasportomovimento", mezzoM) : "") +
    (motivo ? el("motivazioniviaggio", motivo) : "") +
    el("dayuse", "no") +
    el("tipologiaalloggiato", tipo) +
    el("eta", s.dataNascita ? eta(s.dataNascita, dataArrivo) : "") +
    (tipo !== 16
      ? "<componenti>" +
        componenti
          .map(
            (c) =>
              "<componente>" +
              el("codiceclientesr", c.idswh) +
              el("sesso", c.sesso) +
              el("cittadinanza", c.cittadinanza) +
              residenzaSpot(c) +
              el("occupazionepostoletto", c.postoLetto ? "si" : "no") +
              el("eta", c.dataNascita ? eta(c.dataNascita, dataArrivo) : "") +
              "</componente>",
          )
          .join("") +
        "</componenti>"
      : "") +
    "</arrivo>"
  );
}

export function movimentoSpot(g: GiornoIstat, tutti: Soggiorno[]) {
  const principali = (l: Soggiorno[]) => l.filter((s) => !annidatoSotto(s, tutti));
  const arrivi = principali(g.arrivi).map((s) => arrivoSpot(s, tutti, s.arrivo));
  const partenze = principali(g.partenze).map((s) => el("codiceclientesr", s.idswh));
  const tipo = !g.aperto ? "EC" : arrivi.length || partenze.length ? "MP" : "NM";
  const corpo =
    (arrivi.length ? `<arrivi>${arrivi.join("")}</arrivi>` : "") +
    (partenze.length ? `<partenze>${partenze.join("")}</partenze>` : "") +
    "<datistruttura>" +
    el("cameredisponibili", g.camereDisponibili) +
    el("postilettodisponibili", g.lettiDisponibili) +
    el("camereoccupate", g.camereOccupate) +
    "</datistruttura>";
  const xml = `<movimento type="${tipo}" data="${g.giorno}">${corpo}</movimento>`;
  return { xml, impronta: impronta(xml) };
}

/** Avvio SPOT: il giorno prima del primo comunicato, come "arrivi" tutti gli ospiti presenti quella notte. */
export function avvioSpot(giorno: string, tutti: Soggiorno[]) {
  const presenti = tutti.filter((s) => s.notti.has(giorno));
  const principali = presenti.filter((s) => {
    const capo = annidatoSotto(s, tutti);
    return !capo || !presenti.includes(capo);
  });
  const arrivi = principali.map((s) => arrivoSpot(s, presenti, s.arrivo));
  return `<movimento type="MP" data="${giorno}">${arrivi.length ? `<arrivi>${arrivi.join("")}</arrivi>` : ""}</movimento>`;
}

// ---------------- Configurazione e stato ----------------

export async function configIstat(hotelId: number) {
  const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  return {
    sistema: sistemaIstatValido(h.sistemaIstat),
    primoGiorno: h.istatPrimoGiorno ? iso(h.istatPrimoGiorno) : null,
    ross1000: {
      codice: h.ross1000Codice ?? "",
      utente: h.ross1000Utente ?? "",
      passwordImpostata: !!h.ross1000Password,
      indirizzo: h.ross1000Indirizzo ?? "",
    },
  };
}

export async function salvaConfigIstat(
  hotelId: number,
  d: { primoGiorno: string; codice: string; utente: string; password: string; indirizzo: string },
) {
  const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  const sistema = sistemaIstatValido(h.sistemaIstat);
  if (!sistema) throw new Error("Il sistema ISTAT della regione non è attivo: lo imposta il gestore della piattaforma.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.primoGiorno)) throw new Error("Indica il primo giorno da comunicare.");
  const dati: Record<string, unknown> = { istatPrimoGiorno: data(d.primoGiorno) };
  if (sistema === "ROSS1000") {
    const indirizzo = (d.indirizzo.trim() || INDIRIZZO_ROSS1000_LAZIO).replace(/\?wsdl$/i, "");
    if (!/^https:\/\/[^\s]+$/.test(indirizzo)) throw new Error("L'indirizzo del servizio deve iniziare con https://");
    if (!d.codice.trim() || !d.utente.trim()) throw new Error("Codice struttura e utente sono obbligatori.");
    if (!d.password && !h.ross1000Password) throw new Error("Inserisci la password di trasmissione.");
    Object.assign(dati, {
      ross1000Codice: d.codice.trim(),
      ross1000Utente: d.utente.trim(),
      ross1000Indirizzo: indirizzo,
      ...(d.password ? { ross1000Password: cifra(d.password) } : {}),
    });
  }
  await prisma.hotel.update({ where: { id: hotelId }, data: dati });
  return configIstat(hotelId);
}

type EsitoSalvato = { arrivi?: { idswh: string; tipo: number; arrivo: string }[]; scarti?: { idswh: string; errore: string }[]; errore?: string };
const leggiEsito = (s: string | null): EsitoSalvato => {
  try {
    return s ? (JSON.parse(s) as EsitoSalvato) : {};
  } catch {
    return {};
  }
};

export type StatoGiorno = "da_inviare" | "inviato" | "da_rinviare" | "errore";

/**
 * Situazione dei giorni [dal, al] (al massimo fino a ieri): stato di ogni giorno rispetto a quanto
 * comunicato e cosa manca. È la base della pagina ISTAT, degli invii e degli avvisi.
 */
export async function situazioneIstat(hotelId: number, dal: string, al: string) {
  const cfg = await configIstat(hotelId);
  if (!cfg.sistema || !cfg.primoGiorno) return { cfg, giorni: [], soggiorni: [] as Soggiorno[] };
  const ieri = piu(oggiItalia(), -1);
  const da = dal < cfg.primoGiorno ? cfg.primoGiorno : dal;
  const a = al > ieri ? ieri : al;
  if (da > a) return { cfg, giorni: [], soggiorni: [] as Soggiorno[] };
  const sistema = cfg.sistema;
  const primo = cfg.primoGiorno;
  const [{ giorni: calcolati, soggiorni }, invii] = await Promise.all([
    giorniIstat(hotelId, sistema, da, a),
    prisma.invioIstat.findMany({ where: { hotelId, giorno: { gte: data(da), lte: data(a) } } }),
  ]);
  const perGiorno = new Map(invii.map((i) => [iso(i.giorno), i]));
  // Ross1000 non ha l'avvio: chi è arrivato prima del primo giorno l'ha comunicato il vecchio
  // programma (con un altro codice), quindi la sua partenza la Regione la rifiuterebbe. Si lascia
  // fuori e si avvisa di chiuderla dove è stato registrato l'arrivo. (SPOT invece ha l'avvio.)
  const giorni =
    sistema === "ROSS1000"
      ? calcolati.map((g) => {
          const prima = g.partenze.filter((p) => p.arrivo < primo);
          if (!prima.length) return g;
          return {
            ...g,
            partenze: g.partenze.filter((p) => p.arrivo >= primo),
            avvisi: [
              ...g.avvisi,
              ...prima.map((p) => `${p.nome}: arrivato prima del ${primo.split("-").reverse().join("/")}, la partenza va registrata con il vecchio programma o sul portale Ross1000.`),
            ],
          };
        })
      : calcolati;
  return {
    cfg,
    soggiorni,
    giorni: giorni.map((g) => {
      const inv = perGiorno.get(g.giorno);
      const { impronta: attuale } = sistema === "ROSS1000" ? movimentoRoss1000(g, soggiorni) : movimentoSpot(g, soggiorni);
      const esito = leggiEsito(inv?.esito ?? null);
      const stato: StatoGiorno = !inv ? "da_inviare" : inv.stato === "errore" ? "errore" : inv.impronta !== attuale ? "da_rinviare" : "inviato";
      return {
        ...g,
        stato,
        // Termine: Ross1000 entro la fine del mese successivo, SPOT entro il 10 del mese successivo.
        scadenza: scadenzaGiorno(sistema, g.giorno),
        inviatoIl: inv?.il.toISOString() ?? null,
        inviatoDa: inv?.da ?? null,
        scarti: esito.scarti ?? [],
        erroreInvio: esito.errore ?? null,
      };
    }),
  };
}

export function scadenzaGiorno(sistema: SistemaIstat, giorno: string) {
  const [y, m] = giorno.split("-").map(Number);
  return sistema === "ROSS1000" ? iso(new Date(Date.UTC(y, m + 1, 0))) : iso(new Date(Date.UTC(y, m, 10)));
}

/** Giorni non ancora comunicati (o cambiati dopo l'invio), dal primo giorno a ieri. */
export async function giorniPendenti(hotelId: number) {
  const cfg = await configIstat(hotelId);
  if (!cfg.sistema || !cfg.primoGiorno) return { cfg, pendenti: [] as Awaited<ReturnType<typeof situazioneIstat>>["giorni"], soggiorni: [] as Soggiorno[] };
  const ieri = piu(oggiItalia(), -1);
  // Si guarda indietro al massimo 13 mesi: oltre, i termini sono comunque passati da tempo.
  const limite = piu(ieri, -400);
  const dal = cfg.primoGiorno > limite ? cfg.primoGiorno : limite;
  const s = await situazioneIstat(hotelId, dal, ieri);
  // SPOT: un giorno già caricato non si ricarica (il portale rifiuta gli ospiti già presenti); se è
  // cambiato dopo il caricamento si corregge a mano sul portale, qui resta solo segnalato.
  const pendenti = s.giorni.filter((g) => (cfg.sistema === "SPOT" ? g.stato === "da_inviare" : g.stato !== "inviato"));
  return { cfg, pendenti, soggiorni: s.soggiorni };
}

/** Per la barra degli avvisi: giorni rimasti indietro e termine più vicino. */
export async function avvisoIstat(hotelId: number) {
  const { cfg, pendenti } = await giorniPendenti(hotelId);
  if (!cfg.sistema || pendenti.length === 0) return null;
  const oggi = oggiItalia();
  const primaScadenza = pendenti.reduce((m, g) => (g.scadenza < m ? g.scadenza : m), pendenti[0].scadenza);
  const scaduti = pendenti.filter((g) => g.scadenza < oggi).length;
  const giorniAllaScadenza = Math.round((data(primaScadenza).getTime() - data(oggi).getTime()) / GIORNO);
  const piuVecchio = pendenti[0].giorno;
  if (!scaduti) {
    if (cfg.sistema === "SPOT") {
      // SPOT si carica una volta al mese: si avvisa dal 1° del mese dopo per i giorni rimasti indietro.
      if (piuVecchio >= `${oggi.slice(0, 7)}-01`) return null;
    } else {
      // Ross1000: l'invio quotidiano non è obbligatorio, dimenticarsene sì. Si avvisa se un giorno è
      // indietro da una settimana o se il termine è vicino.
      const indietro = Math.round((data(oggi).getTime() - data(piuVecchio).getTime()) / GIORNO);
      if (indietro < 7 && giorniAllaScadenza > 10) return null;
    }
  }
  return { sistema: cfg.sistema, giorni: pendenti.length, scaduti, primaScadenza, dal: piuVecchio };
}

// ---------------- Ross1000: invio con il servizio web ----------------

const tag = (corpo: string, nome: string) => [...corpo.matchAll(new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nome}>`, "g"))].map((m) => m[1]);
const testo = (s: string | undefined) => (s ?? "").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

async function chiamaRoss1000(indirizzo: string, utente: string, password: string, codice: string, movimento: string) {
  const busta =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/"><S:Body>` +
    `<ns2:inviaMovimentazione xmlns:ns2="http://checkin.ws.service.turismo5.gies.it/"><movimentazione>` +
    el("codice", codice) +
    el("prodotto", PRODOTTO) +
    movimento +
    `</movimentazione></ns2:inviaMovimentazione></S:Body></S:Envelope>`;
  let r: Response;
  try {
    r = await fetch(indirizzo, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '""',
        Authorization: "Basic " + Buffer.from(`${utente}:${password}`).toString("base64"),
      },
      body: busta,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    throw new Error(`Il servizio della Regione non risponde (${e instanceof Error ? e.message : String(e)}). Riprova più tardi.`);
  }
  const corpo = await r.text();
  if (r.status === 401 || r.status === 403) throw new Error("La Regione ha rifiutato le credenziali: controlla utente e password di trasmissione in Impostazioni > Adempimenti.");
  const fault = tag(corpo, "faultstring")[0];
  if (fault) throw new Error(`Errore dalla Regione: ${testo(fault)}`);
  if (!r.ok) throw new Error(`Il servizio della Regione ha risposto con errore ${r.status}.`);
  // Esito per ospite: arrivi e partenze scartati, con il motivo.
  const scarti = [...tag(corpo, "arrivo"), ...tag(corpo, "partenza"), ...tag(corpo, "eliminazione")]
    .map((x) => ({ idswh: testo(tag(x, "idswh")[0]), successo: testo(tag(x, "successo")[0]), errore: testo(tag(x, "errore")[0]) }))
    .filter((x) => x.successo === "false" || (x.errore && x.successo !== "true"))
    .map((x) => ({ idswh: x.idswh, errore: x.errore || "Scartato senza motivo indicato." }));
  return scarti;
}

/**
 * Invia alla Regione i giorni pendenti pronti (dal più vecchio, fino a ieri). Un giorno con persone
 * dai dati incompleti si salta: si invia dopo averle completate al check-in. Ci si ferma al primo
 * errore di collegamento o di credenziali.
 */
export async function inviaGiorniRoss1000(hotelId: number, utente: string, soloGiorni?: string[]) {
  const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  if (sistemaIstatValido(h.sistemaIstat) !== "ROSS1000") throw new Error("L'hotel non usa Ross1000.");
  if (!h.ross1000Codice || !h.ross1000Utente || !h.ross1000Password) {
    throw new Error("Credenziali Ross1000 mancanti: le inserisce chi configura l'hotel in Impostazioni > Adempimenti.");
  }
  const password = decifra(h.ross1000Password);
  const indirizzo = h.ross1000Indirizzo || INDIRIZZO_ROSS1000_LAZIO;
  const { pendenti, soggiorni } = await giorniPendenti(hotelId);
  const daInviare = pendenti.filter((g) => !g.incompleti.length && (!soloGiorni || soloGiorni.includes(g.giorno)));
  const precedenti = new Map(
    (await prisma.invioIstat.findMany({ where: { hotelId, giorno: { in: daInviare.map((g) => data(g.giorno)) } } })).map((i) => [iso(i.giorno), leggiEsito(i.esito)]),
  );

  const risultati: { giorno: string; ok: boolean; scarti: { idswh: string; nome: string; errore: string }[]; errore?: string }[] = [];
  for (const g of daInviare) {
    // Gli ospiti comunicati in precedenza per quel giorno e ora non più presenti si eliminano.
    const ora = new Set(g.arrivi.map((a) => a.idswh));
    const eliminati = (precedenti.get(g.giorno)?.arrivi ?? []).filter((a) => !ora.has(a.idswh));
    const { xml, impronta: imp } = movimentoRoss1000(g, soggiorni, eliminati);
    try {
      const scarti = await chiamaRoss1000(indirizzo, h.ross1000Utente, password, h.ross1000Codice, xml);
      const esito: EsitoSalvato = { arrivi: g.arrivi.map((a) => ({ idswh: a.idswh, tipo: a.tipo ?? 16, arrivo: a.arrivo })), scarti };
      const stato = scarti.length ? "errore" : "inviato";
      await prisma.invioIstat.upsert({
        where: { hotelId_giorno: { hotelId, giorno: data(g.giorno) } },
        update: { sistema: "ROSS1000", stato, impronta: imp, esito: JSON.stringify(esito), il: new Date(), da: utente },
        create: { hotelId, sistema: "ROSS1000", giorno: data(g.giorno), stato, impronta: imp, esito: JSON.stringify(esito), da: utente },
      });
      const nomi = new Map(soggiorni.map((s) => [s.idswh, s.nome]));
      risultati.push({ giorno: g.giorno, ok: !scarti.length, scarti: scarti.map((s) => ({ ...s, nome: nomi.get(s.idswh) ?? s.idswh })) });
    } catch (e) {
      risultati.push({ giorno: g.giorno, ok: false, scarti: [], errore: e instanceof Error ? e.message : String(e) });
      break;
    }
  }
  return { risultati, saltati: pendenti.filter((g) => g.incompleti.length).map((g) => g.giorno) };
}

// ---------------- SPOT: file da caricare ----------------

/**
 * File SPOT dei giorni pendenti consecutivi dal più vecchio (SPOT si ferma al primo giorno
 * mancante, quindi ci si ferma prima di un giorno con dati incompleti). Se nessun giorno è ancora
 * stato caricato, in testa va l'avvio con gli ospiti presenti la notte prima del primo giorno.
 */
export async function fileSpot(hotelId: number) {
  const { cfg, pendenti, soggiorni } = await giorniPendenti(hotelId);
  if (cfg.sistema !== "SPOT" || !cfg.primoGiorno) throw new Error("L'hotel non usa SPOT o manca il primo giorno da comunicare.");
  if (!pendenti.length) throw new Error("Non ci sono giorni da comunicare.");
  const giorni: typeof pendenti = [];
  for (const g of pendenti) {
    if (g.incompleti.length) break;
    if (giorni.length && g.giorno !== piu(giorni[giorni.length - 1].giorno, 1)) break;
    giorni.push(g);
  }
  if (!giorni.length) throw new Error(`Il ${pendenti[0].giorno.split("-").reverse().join("/")} ha ospiti con dati incompleti: completali al check-in.`);
  const giaCaricati = await prisma.invioIstat.count({ where: { hotelId, sistema: "SPOT", stato: "caricato" } });
  const conAvvio = giaCaricati === 0 && giorni[0].giorno === cfg.primoGiorno;
  let avvio = "";
  if (conAvvio) {
    const vigilia = piu(cfg.primoGiorno, -1);
    const { soggiorni: prima } = await giorniIstat(hotelId, "SPOT", vigilia, vigilia);
    avvio = avvioSpot(vigilia, prima);
  }
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<movimenti vendor="${PRODOTTO}">` +
    avvio +
    giorni.map((g) => movimentoSpot(g, soggiorni).xml).join("") +
    `</movimenti>\n`;
  return { xml, giorni: giorni.map((g) => g.giorno), conAvvio, nome: `spot_${giorni[0].giorno}_${giorni[giorni.length - 1].giorno}.xml` };
}

/** Dopo aver caricato il file sul portale SPOT: i giorni risultano comunicati (con l'impronta attuale). */
export async function segnaCaricatiSpot(hotelId: number, giorni: string[], utente: string) {
  if (!giorni.length) throw new Error("Nessun giorno da segnare.");
  const dal = giorni.reduce((m, g) => (g < m ? g : m));
  const al = giorni.reduce((m, g) => (g > m ? g : m));
  const s = await situazioneIstat(hotelId, dal, al);
  if (s.cfg.sistema !== "SPOT") throw new Error("L'hotel non usa SPOT.");
  const scelti = s.giorni.filter((g) => giorni.includes(g.giorno));
  await prisma.$transaction(
    scelti.map((g) => {
      const { impronta: imp } = movimentoSpot(g, s.soggiorni);
      return prisma.invioIstat.upsert({
        where: { hotelId_giorno: { hotelId, giorno: data(g.giorno) } },
        update: { sistema: "SPOT", stato: "caricato", impronta: imp, esito: null, il: new Date(), da: utente },
        create: { hotelId, sistema: "SPOT", giorno: data(g.giorno), stato: "caricato", impronta: imp, da: utente },
      });
    }),
  );
  return scelti.length;
}
