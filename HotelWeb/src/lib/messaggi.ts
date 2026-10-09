/**
 * Portineria: messaggi, lettere e pacchi per gli ospiti (il "blocco comunicazioni"). Si registrano,
 * restano "da consegnare" (in evidenza nella prenotazione e al check-out) e si consegnano a mano,
 * per email dalla casella dell'hotel o si segnano rispediti.
 */
import { prisma } from "@/lib/prisma";
import { inviaEmail, type Trasporto } from "@/lib/email";
import { EMAIL_VALIDA, linguaPerOspite } from "@/lib/emailRegole";
import { CODICE_ITALIA } from "@/lib/codiciPolizia";
import { MODI_CONSEGNA, testoEmailMessaggio, validaMessaggio, type MessaggioInput, type ModoConsegna } from "@/lib/messaggiRegole";

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const giorno = (d: Date) => d.toISOString().slice(0, 10);
const traGiorni = (g: string, n: number) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 86400000);

type SegmentoSoggiorno = { dataInizio: Date; dataFine: Date; stato: string; camera: { codice: string } | null; tipoCamera: { descrizione: string }; presenze: { stato: string }[] };

/** Dove si trova la prenotazione rispetto a oggi: in arrivo, in casa o partita. */
function situazione(segmenti: SegmentoSoggiorno[]) {
  const oggi = oggiItalia();
  const validi = segmenti.filter((s) => s.stato !== "ANNULLATO");
  if (!validi.length) return "annullata";
  const tuttiPartiti = validi.every((s) => s.presenze.length > 0 && s.presenze.every((p) => p.stato === "partito"));
  const fine = validi.map((s) => giorno(s.dataFine)).sort().at(-1)!;
  if (tuttiPartiti || fine < oggi) return "partito";
  if (validi.some((s) => s.presenze.some((p) => p.stato === "arrivato"))) return "in casa";
  return "in arrivo";
}
const camereDi = (segmenti: SegmentoSoggiorno[]) =>
  [...new Set(segmenti.filter((s) => s.stato !== "ANNULLATO").map((s) => (s.camera ? s.camera.codice : `${s.tipoCamera.descrizione} da assegnare`)))].join(", ");

const INCLUDI_PRENOTAZIONE = {
  ospitePrenotante: { select: { id: true, nome: true, cognome: true } },
  segmenti: {
    select: {
      ospiteId: true,
      dataInizio: true,
      dataFine: true,
      stato: true,
      camera: { select: { codice: true } },
      tipoCamera: { select: { descrizione: true } },
      ospite: { select: { id: true, nome: true, cognome: true } },
      presenze: { select: { stato: true, ospite: { select: { id: true, nome: true, cognome: true } } } },
    },
  },
} as const;

/** Persone a cui si può lasciare un messaggio: in casa, in arrivo nei prossimi 7 giorni o partite da ieri. */
export async function ospitiPerMessaggi(hotelId: number) {
  const oggi = oggiItalia();
  const prenotazioni = await prisma.prenotazione.findMany({
    where: {
      hotelId,
      stato: { not: "ANNULLATA" },
      segmenti: { some: { stato: { not: "ANNULLATO" }, dataInizio: { lte: traGiorni(oggi, 7) }, dataFine: { gte: traGiorni(oggi, -1) } } },
    },
    include: INCLUDI_PRENOTAZIONE,
  });
  return prenotazioni
    .flatMap((p) => {
      const persone = new Map<number, string>([[p.ospitePrenotante.id, `${p.ospitePrenotante.cognome} ${p.ospitePrenotante.nome}`]]);
      for (const s of p.segmenti.filter((x) => x.stato !== "ANNULLATO")) {
        persone.set(s.ospite.id, `${s.ospite.cognome} ${s.ospite.nome}`);
        for (const x of s.presenze) persone.set(x.ospite.id, `${x.ospite.cognome} ${x.ospite.nome}`);
      }
      const camere = camereDi(p.segmenti);
      const dove = situazione(p.segmenti);
      return [...persone].map(([ospiteId, nome]) => ({ prenotazioneId: p.id, ospiteId, nome, camere, situazione: dove }));
    })
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

/** La persona deve far parte della prenotazione (chi ha prenotato, intestatario o persona in camera). */
async function personaDellaPrenotazione(hotelId: number, prenotazioneId: number, ospiteId: number | null) {
  const p = await prisma.prenotazione.findFirst({ where: { id: prenotazioneId, hotelId }, include: INCLUDI_PRENOTAZIONE });
  if (!p) throw new Error("Prenotazione non trovata.");
  if (p.stato === "ANNULLATA") throw new Error("La prenotazione è annullata.");
  const persone = [p.ospitePrenotante, ...p.segmenti.flatMap((s) => [s.ospite, ...s.presenze.map((x) => x.ospite)])];
  const persona = ospiteId === null ? p.ospitePrenotante : persone.find((x) => x.id === ospiteId);
  if (!persona) throw new Error("Questa persona non fa parte della prenotazione.");
  return persona;
}

export async function registraMessaggio(hotelId: number, d: MessaggioInput, utente: string) {
  validaMessaggio(d);
  let ospiteId: number | null = null;
  let destinatario = d.destinatario.trim();
  if (d.prenotazioneId) {
    const persona = await personaDellaPrenotazione(hotelId, d.prenotazioneId, d.ospiteId);
    ospiteId = persona.id;
    destinatario ||= `${persona.nome} ${persona.cognome}`;
  }
  const m = await prisma.messaggioOspite.create({
    data: {
      hotelId,
      prenotazioneId: d.prenotazioneId,
      ospiteId,
      destinatario,
      tipo: d.tipo,
      daChi: d.daChi.trim() || null,
      modo: d.modo || null,
      recapito: d.recapito.trim() || null,
      testo: d.testo.trim() || null,
      urgente: d.urgente,
      doveRiposto: d.doveRiposto.trim() || null,
      ricevutoDa: utente,
    },
  });
  return m.id;
}

function serializza(
  m: Awaited<ReturnType<typeof prisma.messaggioOspite.findMany<{ include: { ospite: { select: { email: true } }; prenotazione: { include: typeof INCLUDI_PRENOTAZIONE } } }>>>[number],
) {
  return {
    id: m.id,
    prenotazioneId: m.prenotazioneId,
    ospiteId: m.ospiteId,
    destinatario: m.destinatario,
    tipo: m.tipo,
    daChi: m.daChi,
    modo: m.modo,
    recapito: m.recapito,
    testo: m.testo,
    urgente: m.urgente,
    doveRiposto: m.doveRiposto,
    ricevutoIl: m.ricevutoIl.toISOString(),
    ricevutoDa: m.ricevutoDa,
    consegnatoIl: m.consegnatoIl?.toISOString() ?? null,
    consegnatoDa: m.consegnatoDa,
    consegnaModo: m.consegnaModo,
    consegnaNota: m.consegnaNota,
    camere: m.prenotazione ? camereDi(m.prenotazione.segmenti) : null,
    situazione: m.prenotazione ? situazione(m.prenotazione.segmenti) : null,
    puoEmail: !!(m.ospite?.email && EMAIL_VALIDA.test(m.ospite.email)),
  };
}

const INCLUDI = { ospite: { select: { email: true } }, prenotazione: { include: INCLUDI_PRENOTAZIONE } } as const;

/** Da consegnare (prima gli urgenti, poi i più vecchi) e consegnati negli ultimi 7 giorni. */
export async function elencoMessaggi(hotelId: number) {
  const [aperti, consegnati] = await Promise.all([
    prisma.messaggioOspite.findMany({ where: { hotelId, consegnatoIl: null }, include: INCLUDI, orderBy: [{ urgente: "desc" }, { ricevutoIl: "asc" }] }),
    prisma.messaggioOspite.findMany({ where: { hotelId, consegnatoIl: { gte: traGiorni(oggiItalia(), -7) } }, include: INCLUDI, orderBy: { consegnatoIl: "desc" } }),
  ]);
  return { daConsegnare: aperti.map(serializza), consegnati: consegnati.map(serializza) };
}

/** Da consegnare per una prenotazione (avviso nella prenotazione e al check-out). */
export async function messaggiDaConsegnare(hotelId: number, prenotazioneId: number) {
  const r = await prisma.messaggioOspite.findMany({ where: { hotelId, prenotazioneId, consegnatoIl: null }, include: INCLUDI, orderBy: [{ urgente: "desc" }, { ricevutoIl: "asc" }] });
  return r.map(serializza);
}

/**
 * Consegna: a mano, per email all'ospite (dalla casella dell'hotel, nella sua lingua) o rispedito.
 * Per email risulta consegnato solo se l'invio riesce.
 */
export async function consegnaMessaggio(hotelId: number, id: number, modo: ModoConsegna, nota: string, utente: string, trasportoProva?: Trasporto) {
  if (!(modo in MODI_CONSEGNA)) throw new Error("Modo di consegna non previsto.");
  const m = await prisma.messaggioOspite.findFirst({ where: { id, hotelId }, include: { ospite: true, hotel: { select: { nome: true } } } });
  if (!m) throw new Error("Messaggio non trovato.");
  if (m.consegnatoIl) throw new Error("Già consegnato.");
  if (modo === "email") {
    if (!m.ospite?.email || !EMAIL_VALIDA.test(m.ospite.email)) throw new Error("L'ospite non ha un indirizzo email valido.");
    const lingua = linguaPerOspite(m.ospite.lingua, m.ospite.cittadinanzaCodice, CODICE_ITALIA);
    const t = testoEmailMessaggio(lingua, m, m.hotel.nome);
    await inviaEmail(hotelId, { prenotazioneId: m.prenotazioneId, ospiteId: m.ospiteId, richiestaId: null }, { destinatario: m.ospite.email, oggetto: t.oggetto, corpo: t.corpo, lingua, modello: null }, utente, trasportoProva);
  }
  // updateMany con consegnatoIl null: due operatori che consegnano insieme non si sovrascrivono.
  const n = await prisma.messaggioOspite.updateMany({
    where: { id, consegnatoIl: null },
    data: { consegnatoIl: new Date(), consegnatoDa: utente, consegnaModo: modo, consegnaNota: nota.trim() || null },
  });
  if (n.count === 0) throw new Error("Già consegnato.");
}

/** Solo un messaggio registrato per errore e non ancora consegnato. */
export async function eliminaMessaggio(hotelId: number, id: number) {
  const n = await prisma.messaggioOspite.deleteMany({ where: { id, hotelId, consegnatoIl: null } });
  if (n.count === 0) throw new Error("Si può eliminare solo un messaggio non ancora consegnato.");
}
