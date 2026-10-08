/**
 * Cruscotto del giorno: i numeri da guardare appena si arriva al banco. Ogni riquadro si calcola solo
 * se chi guarda ha il permesso (e il modulo) per la pagina a cui porta: gli altri non lasciano il server.
 */
import { prisma } from "@/lib/prisma";
import type { UtenteSessione } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { oggiItaliano } from "@/lib/cassaAperta";
import { opzioniDaSeguire } from "@/lib/prenotazioni";
import { contiAperti } from "@/lib/contiSospesi";
import { cassaDelGiorno } from "@/lib/cassa";
import { quadroCamere } from "@/lib/pulizie";
import { avvisoSchedine } from "@/lib/alloggiati";
import { avvisoIstat } from "@/lib/movimentoIstat";
import { arriviSenzaIstruzioni } from "@/lib/arrivo";

const persone = (s: { adulti: number; etaBambini: unknown }) => s.adulti + (Array.isArray(s.etaBambini) ? s.etaBambini.length : 0);

/** Arrivi, partenze, ospiti in casa e occupazione di stanotte (i cambi camera non contano come arrivi o partenze). */
async function ricevimento(hotelId: number, oggi: string) {
  const g = new Date(`${oggi}T00:00:00.000Z`);
  const valido = { prenotazione: { hotelId, stato: { not: "ANNULLATA" as const } }, stato: { not: "ANNULLATO" as const }, usoDiurno: false };
  const [arrivi, partenze, stanotte, camere, fuori] = await Promise.all([
    prisma.segmentoSoggiorno.findMany({ where: { ...valido, dataInizio: g, segmentoPrecedenteId: null }, select: { stato: true, adulti: true, etaBambini: true } }),
    prisma.segmentoSoggiorno.findMany({ where: { ...valido, dataFine: g, segmentoSuccessivo: { is: null } }, select: { stato: true } }),
    prisma.segmentoSoggiorno.findMany({ where: { ...valido, dataInizio: { lte: g }, dataFine: { gt: g } }, select: { stato: true, adulti: true, etaBambini: true } }),
    prisma.camera.count({ where: { hotelId, attivo: true } }),
    prisma.cameraIndisponibilita.count({ where: { camera: { hotelId, attivo: true }, dal: { lte: g }, al: { gt: g } } }),
  ]);
  const disponibili = Math.max(0, camere - fuori);
  return {
    arrivi: { camere: arrivi.length, arrivate: arrivi.filter((s) => s.stato !== "PREVISTO").length, persone: arrivi.reduce((t, s) => t + persone(s), 0) },
    partenze: { camere: partenze.length, partite: partenze.filter((s) => s.stato === "CONCLUSO").length },
    stanotte: { camere: stanotte.length, persone: stanotte.reduce((t, s) => t + persone(s), 0), disponibili, fuoriServizio: fuori, percentuale: disponibili ? Math.round((stanotte.length / disponibili) * 100) : 0 },
  };
}

/** Acconti richiesti con scadenza passata e non ancora arrivati del tutto (prenotazioni non annullate). */
async function accontiMancanti(hotelId: number, oggi: string) {
  const p = await prisma.prenotazione.findMany({
    where: { hotelId, stato: { not: "ANNULLATA" }, accontoRichiesto: { gt: 0 }, accontoEntro: { lt: new Date(`${oggi}T00:00:00.000Z`) } },
    select: { id: true, accontoRichiesto: true, pagamenti: { where: { stornatoIl: null }, select: { importo: true } } },
  });
  return p.filter((x) => x.pagamenti.reduce((t, pg) => t + Number(pg.importo), 0) + 0.005 < Number(x.accontoRichiesto)).length;
}

export async function cruscotto(u: UtenteSessione) {
  const oggi = oggiItaliano();
  const hotelId = u.hotelId;
  const vede = (p: (typeof PERMESSI)[keyof typeof PERMESSI]) => u.permessi.includes(p);
  const importi = vede(PERMESSI.IMPORTI_VEDI);
  const gestisce = vede(PERMESSI.PRENOTAZIONI_GESTISCI);

  const [ric, opzioni, acconti, conti, cassa, pulizie, schedine, istat, arrivi] = await Promise.all([
    vede(PERMESSI.PRENOTAZIONI_VEDI) ? ricevimento(hotelId, oggi) : null,
    gestisce ? opzioniDaSeguire(hotelId).then((r) => r.length) : null,
    gestisce ? accontiMancanti(hotelId, oggi) : null,
    vede(PERMESSI.PAGAMENTI_REGISTRA) ? contiAperti(hotelId).then((r) => r.length) : null,
    vede(PERMESSI.CASSA_CHIUDI) && importi ? cassaDelGiorno(hotelId, oggi).then((c) => ({ totale: c.totale, chiusa: !!c.chiusura })) : null,
    u.moduli.includes("pulizie") && vede(PERMESSI.CAMERE_STATO_VEDI)
      ? quadroCamere(hotelId).then((q) => {
          const conta = (s: string) => q.camere.filter((c) => c.stato === s).length;
          return { daPulire: conta("da_pulire") + conta("da_rifare"), inPulizia: conta("in_pulizia"), daControllare: conta("da_controllare"), pronte: conta("pronta") };
        })
      : null,
    vede(PERMESSI.ADEMPIMENTI_INVIA) ? avvisoSchedine(hotelId) : null,
    vede(PERMESSI.ADEMPIMENTI_INVIA) ? avvisoIstat(hotelId).catch(() => null) : null,
    gestisce && vede(PERMESSI.EMAIL_INVIA) ? arriviSenzaIstruzioni(hotelId, oggi).then((r) => r.length) : null,
  ]);
  // adempimenti: il riquadro delle schedine c'è anche quando non ce ne sono da inviare (si vede "tutte inviate").
  return { oggi, ricevimento: ric, opzioni, acconti, conti, cassa, pulizie, adempimenti: vede(PERMESSI.ADEMPIMENTI_INVIA), schedine, istat, istruzioniArrivo: arrivi };
}
