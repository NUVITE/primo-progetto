/**
 * Scheda ospite (la persona, non l'azienda): anagrafica essenziale, preferenze, ospite di riguardo,
 * consenso al marketing, storico dei soggiorni e unione delle schede doppie.
 */
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { EMAIL_VALIDA, LINGUE } from "@/lib/emailRegole";
import { MODI_CONSENSO, SOGGIORNI_ABITUALE, trovaDoppioni, unisciTesti, type FiltroOspiti, type ModoConsenso } from "@/lib/ospitiRegole";

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const giorno = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Soggiorni passati (prenotazioni non annullate con almeno una camera già partita) per ospite: conta
 * chi ha prenotato, l'intestatario della camera e chi c'era (presenze). escludi = prenotazione da
 * non contare (quella che si sta guardando).
 */
export async function soggiorniPassati(hotelId: number, ospiteIds?: number[], escludi?: number) {
  if (ospiteIds && ospiteIds.length === 0) return new Map<number, { soggiorni: number; ultimo: string }>();
  const oggi = oggiItalia();
  const base = Prisma.sql`p.hotelId = ${hotelId} AND p.stato <> 'ANNULLATA' AND s.stato <> 'ANNULLATO' AND s.dataFine <= ${oggi} AND p.id <> ${escludi ?? 0}`;
  const filtro = ospiteIds ? Prisma.sql`WHERE t.ospiteId IN (${Prisma.join(ospiteIds)})` : Prisma.empty;
  const righe = await prisma.$queryRaw<{ ospiteId: number; soggiorni: bigint; ultimo: Date }[]>`
    SELECT t.ospiteId, COUNT(DISTINCT t.prenotazioneId) AS soggiorni, MAX(t.fine) AS ultimo FROM (
      SELECT p.ospitePrenotanteId AS ospiteId, p.id AS prenotazioneId, s.dataFine AS fine
        FROM \`Prenotazione\` p JOIN \`SegmentoSoggiorno\` s ON s.prenotazioneId = p.id WHERE ${base}
      UNION ALL
      SELECT s.ospiteId, p.id, s.dataFine
        FROM \`Prenotazione\` p JOIN \`SegmentoSoggiorno\` s ON s.prenotazioneId = p.id WHERE ${base}
      UNION ALL
      SELECT pr.ospiteId, p.id, s.dataFine
        FROM \`Presenza\` pr JOIN \`SegmentoSoggiorno\` s ON s.id = pr.segmentoId JOIN \`Prenotazione\` p ON p.id = s.prenotazioneId WHERE ${base}
    ) t ${filtro} GROUP BY t.ospiteId`;
  return new Map(righe.map((r) => [Number(r.ospiteId), { soggiorni: Number(r.soggiorni), ultimo: giorno(new Date(r.ultimo))! }]));
}

// ---------------- Elenco e doppioni ----------------

const CAMPI_DOPPIONI = { id: true, nome: true, cognome: true, dataNascita: true, email: true, telefono: true, documentoNumero: true } as const;

async function coppieDoppie(hotelId: number) {
  const tutti = await prisma.ospite.findMany({ where: { hotelId }, select: CAMPI_DOPPIONI });
  return trovaDoppioni(tutti.map((o) => ({ ...o, dataNascita: giorno(o.dataNascita) })));
}

export async function elencoOspiti(hotelId: number, q: string, filtro: FiltroOspiti) {
  const parole = q.trim().split(/\s+/).filter(Boolean);
  const cerca: Prisma.OspiteWhereInput = parole.length
    ? { AND: parole.map((t) => ({ OR: [{ nome: { contains: t } }, { cognome: { contains: t } }, { email: { contains: t } }, { telefono: { contains: t } }] })) }
    : {};
  let ids: number[] | undefined;
  let motivi = new Map<number, string>();
  if (filtro === "abituali") {
    const s = await soggiorniPassati(hotelId);
    ids = [...s].filter(([, v]) => v.soggiorni >= SOGGIORNI_ABITUALE).map(([id]) => id);
  } else if (filtro === "doppioni") {
    const coppie = await coppieDoppie(hotelId);
    ids = [...new Set(coppie.flatMap((c) => [c.a, c.b]))];
    motivi = new Map(coppie.flatMap((c) => [[c.a, c.motivi.join(", ")], [c.b, c.motivi.join(", ")]] as const));
  }
  const where: Prisma.OspiteWhereInput = {
    hotelId,
    ...cerca,
    ...(ids ? { id: { in: ids } } : {}),
    ...(filtro === "riguardo" ? { riguardo: true } : {}),
    ...(filtro === "marketing" ? { consensoMarketing: true } : {}),
  };
  const [totale, ospiti] = await Promise.all([
    prisma.ospite.count({ where }),
    prisma.ospite.findMany({
      where,
      // Senza ricerca: prima gli ultimi toccati; con una ricerca o un filtro, in ordine alfabetico.
      orderBy: parole.length || filtro !== "tutti" ? [{ cognome: "asc" }, { nome: "asc" }] : [{ updatedAt: "desc" }],
      take: 200,
      select: { id: true, nome: true, cognome: true, email: true, telefono: true, dataNascita: true, riguardo: true, consensoMarketing: true, preferenze: true },
    }),
  ]);
  const soggiorni = await soggiorniPassati(hotelId, ospiti.map((o) => o.id));
  return {
    totale,
    ospiti: ospiti.map((o) => ({
      ...o,
      dataNascita: giorno(o.dataNascita),
      soggiorni: soggiorni.get(o.id)?.soggiorni ?? 0,
      ultimo: soggiorni.get(o.id)?.ultimo ?? null,
      doppione: motivi.get(o.id) ?? null,
    })),
  };
}

/** Possibili doppioni di un ospite (per la scheda). */
export async function doppioniDi(hotelId: number, ospiteId: number) {
  const coppie = (await coppieDoppie(hotelId)).filter((c) => c.a === ospiteId || c.b === ospiteId);
  const altri = await prisma.ospite.findMany({ where: { hotelId, id: { in: coppie.map((c) => (c.a === ospiteId ? c.b : c.a)) } }, select: { ...CAMPI_DOPPIONI } });
  const soggiorni = await soggiorniPassati(hotelId, altri.map((o) => o.id));
  return altri.map((o) => ({
    id: o.id,
    nome: o.nome,
    cognome: o.cognome,
    dataNascita: giorno(o.dataNascita),
    email: o.email,
    telefono: o.telefono,
    soggiorni: soggiorni.get(o.id)?.soggiorni ?? 0,
    motivi: coppie.find((c) => c.a === o.id || c.b === o.id)!.motivi,
  }));
}

// ---------------- Scheda ----------------

export async function schedaOspite(hotelId: number, id: number) {
  const o = await prisma.ospite.findFirst({ where: { id, hotelId }, include: { notaAlimentare: { select: { id: true } } } });
  if (!o) throw new Error("Ospite non trovato.");
  // Tutte le prenotazioni in cui compare: come chi ha prenotato, intestatario di una camera o persona in camera.
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hotelId,
      OR: [{ ospitePrenotanteId: id }, { segmenti: { some: { ospiteId: id } } }, { segmenti: { some: { presenze: { some: { ospiteId: id } } } } }],
    },
    orderBy: { id: "desc" },
    include: {
      intermediario: { select: { denominazione: true } },
      segmenti: { include: { camera: { select: { codice: true } }, tipoCamera: { select: { descrizione: true } }, presenze: { select: { ospiteId: true } } } },
    },
  });
  const oggi = oggiItalia();
  const storico = prenotazioni
    .map((p) => {
      const validi = p.segmenti.filter((s) => s.stato !== "ANNULLATO");
      const segmenti = validi.length ? validi : p.segmenti;
      const dal = segmenti.map((s) => giorno(s.dataInizio)!).sort()[0] ?? null;
      const al = segmenti.map((s) => giorno(s.dataFine)!).sort().at(-1) ?? null;
      const ruoli = [
        p.ospitePrenotanteId === id ? "ha prenotato" : null,
        p.segmenti.some((s) => s.ospiteId === id || s.presenze.some((x) => x.ospiteId === id)) ? "ospite" : null,
      ].filter(Boolean);
      const annullata = p.stato === "ANNULLATA";
      return {
        id: p.id,
        stato: p.stato,
        dal,
        al,
        notti: dal && al ? Math.round((Date.parse(al) - Date.parse(dal)) / 86400000) : 0,
        camere: [...new Set(segmenti.map((s) => (s.camera ? s.camera.codice : s.tipoCamera.descrizione)))].join(", "),
        canale: p.canale,
        agenzia: p.intermediario?.denominazione ?? null,
        ruolo: ruoli.join(" e "),
        quando: annullata ? "annullata" : al && al <= oggi ? "passato" : dal && dal > oggi ? "futuro" : "in corso",
      };
    })
    .sort((a, b) => (b.dal ?? "").localeCompare(a.dal ?? ""));
  const passati = storico.filter((s) => s.quando === "passato");
  const email = await prisma.emailInviata.findMany({
    where: { hotelId, OR: [{ ospiteId: id }, { prenotazione: { ospitePrenotanteId: id } }] },
    orderBy: { inviataIl: "desc" },
    take: 20,
    select: { id: true, oggetto: true, destinatario: true, esito: true, inviataIl: true, prenotazioneId: true },
  });
  const unioni = await prisma.ospiteUnito.findMany({ where: { hotelId, ospiteTenutoId: id }, orderBy: { unitoIl: "desc" } });
  return {
    ospite: {
      id: o.id,
      nome: o.nome,
      cognome: o.cognome,
      telefono: o.telefono ?? "",
      email: o.email ?? "",
      dataNascita: giorno(o.dataNascita) ?? "",
      lingua: o.lingua ?? "",
      note: o.note ?? "",
      preferenze: o.preferenze ?? "",
      riguardo: o.riguardo,
      consensoMarketing: o.consensoMarketing,
      consensoMarketingIl: o.consensoMarketingIl?.toISOString() ?? null,
      consensoMarketingModo: o.consensoMarketingModo,
      consensoMarketingDa: o.consensoMarketingDa,
      haNotaAlimentare: !!o.notaAlimentare,
      // Dati per la schedina: si compilano al check-in, qui si dice solo se ci sono.
      datiSchedina: !!(o.sesso && o.cittadinanzaCodice && (o.comuneNascitaCodice || o.statoNascitaCodice) && o.dataNascita),
    },
    riepilogo: {
      soggiorni: passati.length,
      notti: passati.reduce((t, s) => t + s.notti, 0),
      ultimo: passati[0]?.al ?? null,
      prossimo: storico.filter((s) => s.quando === "futuro" || s.quando === "in corso").at(-1)?.dal ?? null,
      annullate: storico.filter((s) => s.quando === "annullata").length,
    },
    storico,
    email: email.map((e) => ({ ...e, inviataIl: e.inviataIl.toISOString() })),
    unioni: unioni.map((u) => {
      const d = u.datiEliminato as { nome?: string; cognome?: string };
      return { id: u.id, nome: `${d.nome ?? ""} ${d.cognome ?? ""}`.trim(), unitoDa: u.unitoDa, unitoIl: u.unitoIl.toISOString() };
    }),
  };
}

export type DatiOspite = {
  nome: string;
  cognome: string;
  telefono: string;
  email: string;
  dataNascita: string;
  lingua: string;
  note: string;
  preferenze: string;
  riguardo: boolean;
};

export async function salvaOspite(hotelId: number, id: number, d: DatiOspite) {
  await prisma.ospite.findFirstOrThrow({ where: { id, hotelId }, select: { id: true } });
  const nome = d.nome.trim();
  const cognome = d.cognome.trim();
  if (!nome || !cognome) throw new Error("Nome e cognome sono obbligatori.");
  const email = d.email.trim();
  if (email && !EMAIL_VALIDA.test(email)) throw new Error("L'indirizzo email non è valido.");
  if (d.lingua && !(d.lingua in LINGUE)) throw new Error("Lingua non prevista.");
  if (d.dataNascita && (!/^\d{4}-\d{2}-\d{2}$/.test(d.dataNascita) || d.dataNascita > oggiItalia())) throw new Error("La data di nascita non è valida.");
  await prisma.ospite.update({
    where: { id },
    data: {
      nome,
      cognome,
      telefono: d.telefono.trim() || null,
      email: email || null,
      dataNascita: d.dataNascita ? new Date(d.dataNascita) : null,
      lingua: d.lingua || null,
      note: d.note.trim() || null,
      preferenze: d.preferenze.trim() || null,
      riguardo: d.riguardo,
    },
  });
}

/** Dà o revoca il consenso al marketing: resta quando, come e chi. */
export async function impostaConsensoMarketing(hotelId: number, id: number, consenso: boolean, modo: ModoConsenso | null, utente: string) {
  const o = await prisma.ospite.findFirstOrThrow({ where: { id, hotelId }, select: { consensoMarketing: true } });
  if (consenso && (!modo || !(modo in MODI_CONSENSO))) throw new Error("Indica come è stato raccolto il consenso.");
  if (!consenso && !o.consensoMarketing) throw new Error("Il consenso non era stato dato.");
  await prisma.ospite.update({
    where: { id },
    data: { consensoMarketing: consenso, consensoMarketingIl: new Date(), consensoMarketingModo: consenso ? modo : null, consensoMarketingDa: utente },
  });
}

// ---------------- Unione dei doppioni ----------------

/**
 * Unisce la scheda "eliminato" in "tenuto": prenotazioni, camere, presenze, tassa ed email passano
 * a chi resta; i campi vuoti di chi resta si completano con quelli dell'altro, note e preferenze si
 * sommano. Rifiuta se le due schede sono nella stessa camera o nella stessa prenotazione come
 * persone diverse, o se le date di nascita sono diverse.
 */
export async function unisciOspiti(hotelId: number, tenutoId: number, eliminatoId: number, utente: string) {
  if (tenutoId === eliminatoId) throw new Error("Scegli due ospiti diversi.");
  const [t, e] = await Promise.all([
    prisma.ospite.findFirst({ where: { id: tenutoId, hotelId }, include: { notaAlimentare: true } }),
    prisma.ospite.findFirst({ where: { id: eliminatoId, hotelId }, include: { notaAlimentare: true } }),
  ]);
  if (!t || !e) throw new Error("Ospite non trovato.");
  if (t.dataNascita && e.dataNascita && giorno(t.dataNascita) !== giorno(e.dataNascita))
    throw new Error("Le date di nascita sono diverse: sono due persone diverse oppure una data è sbagliata (correggila prima di unire).");
  const segmentiT = new Set((await prisma.presenza.findMany({ where: { ospiteId: tenutoId }, select: { segmentoId: true } })).map((p) => p.segmentoId));
  if ((await prisma.presenza.findMany({ where: { ospiteId: eliminatoId }, select: { segmentoId: true } })).some((p) => segmentiT.has(p.segmentoId)))
    throw new Error("I due ospiti dormono nella stessa camera: sono due persone diverse.");
  const tassaT = new Set((await prisma.posizioneTassa.findMany({ where: { ospiteId: tenutoId }, select: { prenotazioneId: true } })).map((p) => p.prenotazioneId));
  if ((await prisma.posizioneTassa.findMany({ where: { ospiteId: eliminatoId }, select: { prenotazioneId: true } })).some((p) => tassaT.has(p.prenotazioneId)))
    throw new Error("I due ospiti sono nella stessa prenotazione come persone diverse: non si possono unire.");

  // Consenso marketing: vale quello registrato più di recente.
  const consenso =
    (e.consensoMarketingIl?.getTime() ?? 0) > (t.consensoMarketingIl?.getTime() ?? 0)
      ? { consensoMarketing: e.consensoMarketing, consensoMarketingIl: e.consensoMarketingIl, consensoMarketingModo: e.consensoMarketingModo, consensoMarketingDa: e.consensoMarketingDa }
      : {};
  const vuoto = <K extends keyof typeof t>(k: K) => (t[k] === null || t[k] === "" ? { [k]: e[k] } : {});
  const { notaAlimentare: notaE, ...datiEliminato } = e;

  await prisma.$transaction(async (tx) => {
    await tx.segmentoSoggiorno.updateMany({ where: { ospiteId: eliminatoId }, data: { ospiteId: tenutoId } });
    await tx.presenza.updateMany({ where: { ospiteId: eliminatoId }, data: { ospiteId: tenutoId } });
    await tx.presenza.updateMany({ where: { capoOspiteId: eliminatoId }, data: { capoOspiteId: tenutoId } });
    await tx.prenotazione.updateMany({ where: { ospitePrenotanteId: eliminatoId }, data: { ospitePrenotanteId: tenutoId } });
    await tx.prenotazione.updateMany({ where: { ospitePaganteId: eliminatoId }, data: { ospitePaganteId: tenutoId } });
    await tx.posizioneTassa.updateMany({ where: { ospiteId: eliminatoId }, data: { ospiteId: tenutoId } });
    await tx.emailInviata.updateMany({ where: { ospiteId: eliminatoId }, data: { ospiteId: tenutoId } });
    await tx.questionario.updateMany({ where: { ospiteId: eliminatoId }, data: { ospiteId: tenutoId } });
    await tx.messaggioOspite.updateMany({ where: { ospiteId: eliminatoId }, data: { ospiteId: tenutoId } });
    await tx.reclamo.updateMany({ where: { ospiteId: eliminatoId }, data: { ospiteId: tenutoId } });
    // Nota alimentare: se chi resta ne ha già una si tiene la sua, altrimenti passa quella dell'altro.
    if (notaE && !t.notaAlimentare) await tx.notaAlimentare.update({ where: { id: notaE.id }, data: { ospiteId: tenutoId } });
    await tx.ospite.update({
      where: { id: tenutoId },
      data: {
        ...vuoto("telefono"),
        ...vuoto("email"),
        ...vuoto("dataNascita"),
        ...vuoto("sesso"),
        ...vuoto("statoNascitaCodice"),
        ...vuoto("comuneNascitaCodice"),
        ...vuoto("cittadinanzaCodice"),
        ...vuoto("residenzaStatoCodice"),
        ...vuoto("residenzaComuneCodice"),
        ...vuoto("lingua"),
        // Il documento si prende tutto insieme (tipo, numero, rilascio), mai mescolato.
        ...(t.documentoNumero ? {} : { documentoTipoCodice: e.documentoTipoCodice, documentoNumero: e.documentoNumero, documentoRilascioCodice: e.documentoRilascioCodice }),
        note: unisciTesti(t.note, e.note),
        preferenze: unisciTesti(t.preferenze, e.preferenze),
        riguardo: t.riguardo || e.riguardo,
        ...consenso,
      },
    });
    await tx.ospiteUnito.create({ data: { hotelId, ospiteTenutoId: tenutoId, eliminatoId, datiEliminato: JSON.parse(JSON.stringify(datiEliminato)), unitoDa: utente } });
    await tx.ospite.delete({ where: { id: eliminatoId } });
  });
  return { notaScartata: !!(notaE && t.notaAlimentare) };
}

// ---------------- Nella prenotazione ----------------

/** Ospiti della prenotazione da conoscere: di riguardo, con preferenze o già stati da noi. */
export async function ospitiDaConoscere(hotelId: number, prenotazioneId: number) {
  const p = await prisma.prenotazione.findFirstOrThrow({
    where: { id: prenotazioneId, hotelId },
    select: { ospitePrenotanteId: true, segmenti: { select: { ospiteId: true, presenze: { select: { ospiteId: true } } } } },
  });
  const ids = [...new Set([p.ospitePrenotanteId, ...p.segmenti.flatMap((s) => [s.ospiteId, ...s.presenze.map((x) => x.ospiteId)])])];
  const [ospiti, soggiorni] = await Promise.all([
    prisma.ospite.findMany({ where: { id: { in: ids } }, select: { id: true, nome: true, cognome: true, riguardo: true, preferenze: true } }),
    soggiorniPassati(hotelId, ids, prenotazioneId),
  ]);
  return ospiti
    .map((o) => ({ id: o.id, nome: `${o.nome} ${o.cognome}`, riguardo: o.riguardo, preferenze: o.preferenze, soggiorni: soggiorni.get(o.id)?.soggiorni ?? 0, ultimo: soggiorni.get(o.id)?.ultimo ?? null }))
    .filter((o) => o.riguardo || o.preferenze || o.soggiorni > 0)
    .sort((a, b) => Number(b.riguardo) - Number(a.riguardo) || b.soggiorni - a.soggiorni);
}
