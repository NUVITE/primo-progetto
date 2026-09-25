"use server";

import { prisma } from "@/lib/prisma";
import { calcolaTotaliPrenotazione, creaPrenotazione, type CreaPrenotazioneInput } from "@/lib/prenotazioni";
import { nottiTraDate, trovaPrezzoNotte } from "@/lib/pricing";
import { trovaRegolamentoAttivo } from "@/lib/tassaSoggiorno";

const HOTEL_ID = 1;

export async function datiIniziali() {
  const [camere, tipiCamera, listini] = await Promise.all([
    prisma.camera.findMany({ where: { hotelId: HOTEL_ID, attivo: true }, include: { tipoCamera: true }, orderBy: { codice: "asc" } }),
    prisma.tipoCamera.findMany({ where: { hotelId: HOTEL_ID } }),
    prisma.listino.findMany({ where: { hotelId: HOTEL_ID } }),
  ]);

  return {
    camere: camere.map((c) => ({ id: c.id, codice: c.codice, tipoCameraId: c.tipoCameraId, tipoCameraNome: c.tipoCamera.descrizione })),
    tipiCamera: tipiCamera.map((t) => ({ id: t.id, descrizione: t.descrizione })),
    listini: listini.map((l) => ({ id: l.id, descrizione: l.descrizione, tipo: l.tipo })),
  };
}

/**
 * Stima prezzo e tassa per un segmento PRIMA di salvare, per dare un riepilogo
 * a video mentre l'operatore compila. La stima della tassa ignora le esenzioni
 * (non sappiamo ancora chi è l'ospite in ogni riga): il calcolo definitivo,
 * esenzioni comprese, avviene sempre e solo in creaPrenotazione al salvataggio.
 */
export async function anteprimaSegmento(input: {
  cameraId: number;
  listinoId: number;
  dataInizio: string;
  dataFine: string;
}) {
  const camera = await prisma.camera.findUniqueOrThrow({
    where: { id: input.cameraId },
    include: { hotel: { include: { comune: true } } },
  });

  const dataInizio = new Date(input.dataInizio);
  const dataFine = new Date(input.dataFine);
  if (dataFine <= dataInizio) return null;

  const notti = nottiTraDate(dataInizio, dataFine);
  let subtotale = 0;
  for (const notte of notti) {
    const p = await trovaPrezzoNotte(prisma, input.listinoId, camera.tipoCameraId, notte);
    if (p) subtotale += p.prezzo;
  }

  const regolamento = await trovaRegolamentoAttivo(prisma, camera.hotel.comuneId, dataInizio, camera.hotel.categoria);
  const nottiTassabili = regolamento ? Math.min(notti.length, regolamento.tettoNotti) : 0;
  const tassaStimata = regolamento ? nottiTassabili * Number(regolamento.aliquota) : 0;

  return {
    notti: notti.length,
    subtotale,
    tassaStimata,
    regolamento: regolamento
      ? { comune: camera.hotel.comune.nome, aliquota: Number(regolamento.aliquota), tettoNotti: regolamento.tettoNotti }
      : null,
  };
}

export async function salvaPrenotazione(input: CreaPrenotazioneInput) {
  const prenotazione = await creaPrenotazione(input);
  return {
    id: prenotazione.id,
    ospitePrenotante: `${prenotazione.ospitePrenotante.nome} ${prenotazione.ospitePrenotante.cognome}`,
    ...calcolaTotaliPrenotazione(prenotazione),
  };
}
