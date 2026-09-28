import { prisma } from "@/lib/prisma";

/** Catalogo servizi extra dell'hotel (sala conferenze, pranzo aggiuntivo, colazione extra...). */
export async function elencoServiziCatalogo(hotelId: number) {
  return prisma.servizioCatalogo.findMany({ where: { hotelId }, orderBy: { nome: "asc" } });
}

export async function creaServizioCatalogo(hotelId: number, input: { nome: string; prezzo: number }) {
  return prisma.servizioCatalogo.create({ data: { hotelId, nome: input.nome, prezzo: input.prezzo } });
}

export async function impostaAttivoServizioCatalogo(hotelId: number, id: number, attivo: boolean) {
  await prisma.servizioCatalogo.findFirstOrThrow({ where: { id, hotelId } });
  return prisma.servizioCatalogo.update({ where: { id }, data: { attivo } });
}

export type AggiungiServizioInput = {
  // Un servizio a catalogo (prezzoUnitario suggerito dal listino, modificabile) oppure
  // a prezzo libero (servizioCatalogoId assente, descrizione obbligatoria).
  servizioCatalogoId?: number;
  descrizione?: string;
  prezzoUnitario: number;
  quantita: number;
  data?: string;
  note?: string;
  // Assente/vuoto = si applica a tutta la prenotazione; altrimenti solo ai segmenti indicati
  // (uno o alcuni componenti del gruppo, non necessariamente tutti).
  segmentoIds?: number[];
};

/** Aggiunge un servizio extra a una prenotazione, verificando che prenotazione/servizio/segmenti appartengano all'hotel. */
export async function aggiungiServizioAPrenotazione(hotelId: number, prenotazioneId: number, input: AggiungiServizioInput) {
  await prisma.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId } });

  if (input.servizioCatalogoId) {
    await prisma.servizioCatalogo.findFirstOrThrow({ where: { id: input.servizioCatalogoId, hotelId } });
  } else if (!input.descrizione?.trim()) {
    throw new Error("Indicare una descrizione per un servizio a prezzo libero.");
  }

  if (input.segmentoIds?.length) {
    const trovati = await prisma.segmentoSoggiorno.count({
      where: { id: { in: input.segmentoIds }, prenotazioneId },
    });
    if (trovati !== input.segmentoIds.length) {
      throw new Error("Uno o più segmenti indicati non appartengono a questa prenotazione.");
    }
  }

  await prisma.servizioAggiunto.create({
    data: {
      prenotazioneId,
      servizioCatalogoId: input.servizioCatalogoId,
      descrizione: input.descrizione,
      prezzoUnitario: input.prezzoUnitario,
      quantita: input.quantita,
      data: input.data ? new Date(input.data) : undefined,
      note: input.note,
      segmenti: input.segmentoIds?.length
        ? { create: input.segmentoIds.map((segmentoId) => ({ segmentoId })) }
        : undefined,
    },
  });
}

export type ModificaServizioInput = {
  descrizione?: string;
  prezzoUnitario: number;
  quantita: number;
  note?: string;
  segmentoIds?: number[];
};

/** Modifica un servizio gia' aggiunto (prezzo, quantita', note, ambito) — il collegamento a un
 * eventuale servizio a catalogo resta invariato, solo il prezzo/descrizione applicati possono cambiare. */
export async function modificaServizio(hotelId: number, servizioAggiuntoId: number, input: ModificaServizioInput) {
  const servizio = await prisma.servizioAggiunto.findFirstOrThrow({
    where: { id: servizioAggiuntoId, prenotazione: { hotelId } },
  });

  if (!servizio.servizioCatalogoId && !input.descrizione?.trim()) {
    throw new Error("Indicare una descrizione per un servizio a prezzo libero.");
  }

  if (input.segmentoIds?.length) {
    const trovati = await prisma.segmentoSoggiorno.count({
      where: { id: { in: input.segmentoIds }, prenotazioneId: servizio.prenotazioneId },
    });
    if (trovati !== input.segmentoIds.length) {
      throw new Error("Uno o più segmenti indicati non appartengono a questa prenotazione.");
    }
  }

  await prisma.$transaction([
    prisma.servizioAggiunto.update({
      where: { id: servizioAggiuntoId },
      data: {
        descrizione: servizio.servizioCatalogoId ? undefined : input.descrizione,
        prezzoUnitario: input.prezzoUnitario,
        quantita: input.quantita,
        note: input.note,
      },
    }),
    prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiuntoId } }),
    ...(input.segmentoIds?.length
      ? [
          prisma.servizioAggiuntoSegmento.createMany({
            data: input.segmentoIds.map((segmentoId) => ({ servizioAggiuntoId, segmentoId })),
          }),
        ]
      : []),
  ]);
}

export async function rimuoviServizioDaPrenotazione(hotelId: number, servizioAggiuntoId: number) {
  const servizio = await prisma.servizioAggiunto.findFirstOrThrow({
    where: { id: servizioAggiuntoId, prenotazione: { hotelId } },
  });
  await prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiuntoId } });
  await prisma.servizioAggiunto.delete({ where: { id: servizio.id } });
}
