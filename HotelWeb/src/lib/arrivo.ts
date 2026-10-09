/**
 * Arrivo autonomo: istruzioni e codice di accesso delle unità, codice del singolo soggiorno, valori
 * per l'email "Istruzioni di arrivo" e promemoria degli arrivi vicini senza istruzioni inviate.
 * Codici e istruzioni li vede solo chi gestisce le prenotazioni (lo controllano le azioni).
 */
import { prisma } from "@/lib/prisma";
import { unitaDi } from "@/lib/tipologie";
import { maiuscola } from "@/lib/funzioniRegole";
import type { Lingua } from "@/lib/emailRegole";
import { codiceEffettivo, GIORNI_PROMEMORIA, haArrivoAutonomo, MODELLO_ARRIVO, normalizzaCodice, normalizzaIstruzioni, testiArrivo } from "@/lib/arrivoRegole";

const giorno = (d: Date) => d.toISOString().slice(0, 10);
const piuGiorni = (g: string, n: number) => {
  const d = new Date(`${g}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return giorno(d);
};
// Email delle istruzioni che contano come inviate (simulata = ambiente di prova).
const INVIATA = { modello: MODELLO_ARRIVO, esito: { in: ["inviata", "simulata"] } };

/** Istruzioni e codice fisso di un'unità (Impostazioni › Camere). */
export async function impostaArrivoCamera(hotelId: number, cameraId: number, istruzioni: string, codice: string) {
  const dati = { istruzioniArrivo: normalizzaIstruzioni(istruzioni), codiceAccesso: normalizzaCodice(codice) };
  await prisma.camera.findFirstOrThrow({ where: { id: cameraId, hotelId } });
  await prisma.camera.update({ where: { id: cameraId }, data: dati });
}

/** Codice di accesso di un soggiorno (vuoto = torna quello dell'unità). */
export async function impostaCodiceSoggiorno(hotelId: number, prenotazioneId: number, segmentoId: number, codice: string) {
  const valore = normalizzaCodice(codice);
  const s = await prisma.segmentoSoggiorno.findFirst({ where: { id: segmentoId, prenotazioneId, prenotazione: { hotelId } }, select: { id: true } });
  if (!s) throw new Error("Camera della prenotazione non trovata.");
  await prisma.segmentoSoggiorno.update({ where: { id: segmentoId }, data: { codiceAccesso: valore } });
}

/** Unità della prenotazione con una camera assegnata (non annullate, non concluse, non uso diurno). */
async function unitaPrenotazione(hotelId: number, prenotazioneId: number) {
  return prisma.segmentoSoggiorno.findMany({
    where: { prenotazioneId, prenotazione: { hotelId }, cameraId: { not: null }, usoDiurno: false, stato: { in: ["PREVISTO", "IN_CORSO"] } },
    select: { id: true, dataInizio: true, codiceAccesso: true, camera: { select: { codice: true, istruzioniArrivo: true, codiceAccesso: true } } },
    orderBy: [{ dataInizio: "asc" }, { id: "asc" }],
  });
}

/** Per il riquadro della prenotazione: unità, codici e ultima email delle istruzioni. */
export async function datiArrivo(hotelId: number, prenotazioneId: number) {
  const [unita, hotel, ultima] = await Promise.all([
    unitaPrenotazione(hotelId, prenotazioneId),
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { tipologia: true } }),
    prisma.emailInviata.findFirst({ where: { hotelId, prenotazioneId, ...INVIATA }, orderBy: { inviataIl: "desc" }, select: { inviataIl: true, inviataDa: true, destinatario: true } }),
  ]);
  return {
    nomeUnita: maiuscola(unitaDi(hotel.tipologia).singolare),
    unita: unita.map((s) => ({
      segmentoId: s.id,
      camera: s.camera!.codice,
      dal: giorno(s.dataInizio),
      istruzioni: !!s.camera!.istruzioniArrivo,
      codiceUnita: s.camera!.codiceAccesso,
      codiceSoggiorno: s.codiceAccesso,
      codice: codiceEffettivo(s.codiceAccesso, s.camera!.codiceAccesso),
    })),
    inviata: ultima ? { il: ultima.inviataIl.toISOString(), da: ultima.inviataDa, a: ultima.destinatario } : null,
  };
}

/** Valori dei segnaposto {{istruzioni_arrivo}} e {{codice_accesso}} per l'email. */
export async function valoriArrivo(hotelId: number, prenotazioneId: number, lingua: Lingua) {
  const [unita, hotel] = await Promise.all([unitaPrenotazione(hotelId, prenotazioneId), prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { tipologia: true } })]);
  const u = unitaDi(hotel.tipologia);
  const nome = lingua === "it" ? maiuscola(u.singolare) : u.femminile ? "Room" : "Apartment";
  // Una camera ripetuta (soggiorno diviso sulla stessa camera) si scrive una volta sola.
  const viste = new Set<string>();
  const elenco = unita
    .filter((s) => !viste.has(s.camera!.codice) && viste.add(s.camera!.codice))
    .map((s) => ({ nome: `${nome} ${s.camera!.codice}`, istruzioni: s.camera!.istruzioniArrivo, codice: codiceEffettivo(s.codiceAccesso, s.camera!.codiceAccesso) }));
  return testiArrivo(elenco);
}

/**
 * Promemoria: prenotazioni con arrivo da oggi ai prossimi giorni in un'unità con istruzioni o codice,
 * senza email delle istruzioni già inviata. Conta solo il primo segmento (l'arrivo vero, non i cambi camera).
 */
export async function arriviSenzaIstruzioni(hotelId: number, oggi: string) {
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: {
      prenotazione: { hotelId, stato: { not: "ANNULLATA" }, emailInviate: { none: INVIATA } },
      stato: "PREVISTO",
      usoDiurno: false,
      segmentoPrecedenteId: null,
      dataInizio: { gte: new Date(oggi), lte: new Date(piuGiorni(oggi, GIORNI_PROMEMORIA)) },
      camera: { OR: [{ istruzioniArrivo: { not: null } }, { codiceAccesso: { not: null } }] },
    },
    select: {
      dataInizio: true,
      camera: { select: { codice: true, istruzioniArrivo: true, codiceAccesso: true } },
      prenotazione: { select: { id: true, ospitePrenotante: { select: { nome: true, cognome: true, email: true } } } },
    },
    orderBy: [{ dataInizio: "asc" }, { prenotazioneId: "asc" }],
  });
  const perPrenotazione = new Map<number, { prenotazioneId: number; arrivo: string; ospite: string; email: boolean; camere: string[] }>();
  for (const s of segmenti) {
    if (!haArrivoAutonomo({ istruzioni: s.camera!.istruzioniArrivo, codice: s.camera!.codiceAccesso })) continue;
    const p = s.prenotazione;
    const r = perPrenotazione.get(p.id) ?? { prenotazioneId: p.id, arrivo: giorno(s.dataInizio), ospite: `${p.ospitePrenotante.cognome} ${p.ospitePrenotante.nome}`, email: !!p.ospitePrenotante.email, camere: [] };
    if (!r.camere.includes(s.camera!.codice)) r.camere.push(s.camera!.codice);
    perPrenotazione.set(p.id, r);
  }
  return [...perPrenotazione.values()];
}
