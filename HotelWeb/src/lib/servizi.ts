import { prisma } from "@/lib/prisma";
import { composizioneDi } from "@/lib/pricing";

export const ADDEBITI = ["una_tantum", "per_notte", "per_persona_notte"] as const;
export type Addebito = (typeof ADDEBITI)[number];
export const EFFETTI = ["letto_aggiunto", "animale"] as const;
export type Effetto = (typeof EFFETTI)[number];
export type DatiServizioCatalogo = { nome: string; prezzo: number; addebito: Addebito; effetto: Effetto | null };

function verificaCatalogo(input: DatiServizioCatalogo) {
  if (!input.nome.trim()) throw new Error("Il nome del servizio è obbligatorio.");
  if (!(input.prezzo >= 0)) throw new Error("Prezzo non valido.");
  if (!ADDEBITI.includes(input.addebito)) throw new Error("Modo di addebito non valido.");
  if (input.effetto !== null && !EFFETTI.includes(input.effetto)) throw new Error("Effetto non valido.");
  return { nome: input.nome.trim(), prezzo: input.prezzo, addebito: input.addebito, effetto: input.effetto };
}

/** Catalogo servizi extra dell'hotel (sala conferenze, pranzo aggiuntivo, colazione extra...). */
export async function elencoServiziCatalogo(hotelId: number) {
  return prisma.servizioCatalogo.findMany({ where: { hotelId }, orderBy: { nome: "asc" } });
}

export async function creaServizioCatalogo(hotelId: number, input: DatiServizioCatalogo) {
  return prisma.servizioCatalogo.create({ data: { hotelId, ...verificaCatalogo(input) } });
}

export async function impostaAttivoServizioCatalogo(hotelId: number, id: number, attivo: boolean) {
  await prisma.servizioCatalogo.findFirstOrThrow({ where: { id, hotelId } });
  return prisma.servizioCatalogo.update({ where: { id }, data: { attivo } });
}

/** Il nuovo prezzo vale solo per gli addebiti futuri: quelli gia' fatti hanno il proprio prezzoUnitario. */
export async function modificaServizioCatalogo(hotelId: number, id: number, input: DatiServizioCatalogo) {
  const dati = verificaCatalogo(input);
  await prisma.servizioCatalogo.findFirstOrThrow({ where: { id, hotelId } });
  return prisma.servizioCatalogo.update({ where: { id }, data: dati });
}

/** Eliminabile solo se mai usato: altrimenti si perderebbe lo storico degli addebiti (si disattiva). */
export async function eliminaServizioCatalogo(hotelId: number, id: number) {
  await prisma.servizioCatalogo.findFirstOrThrow({ where: { id, hotelId } });
  const usi =
    (await prisma.servizioAggiunto.count({ where: { servizioCatalogoId: id } })) + (await prisma.servizioSala.count({ where: { servizioCatalogoId: id } }));
  if (usi > 0) {
    throw new Error(
      `Servizio già usato in ${usi} ${usi === 1 ? "addebito" : "addebiti"} su prenotazioni o eventi: non si può eliminare, disattivalo.`,
    );
  }
  await prisma.servizioCatalogo.delete({ where: { id } });
}

export type AggiungiServizioInput = {
  // Un servizio a catalogo (prezzoUnitario suggerito dal listino, modificabile) oppure
  // a prezzo libero (servizioCatalogoId assente, descrizione obbligatoria).
  servizioCatalogoId?: number;
  descrizione?: string;
  prezzoUnitario: number;
  // Unità richieste (es. 1 letto aggiunto, 2 colazioni): la quantità addebitata si ricava
  // moltiplicando per notti o persone x notti secondo l'addebito del servizio.
  quantita: number;
  // Solo per i servizi a prezzo libero (quelli a catalogo usano il proprio).
  addebito?: Addebito;
  data?: string;
  note?: string;
  // Assente/vuoto = si applica a tutta la prenotazione; altrimenti solo ai segmenti indicati
  // (uno o alcuni componenti del gruppo, non necessariamente tutti).
  segmentoIds?: number[];
};

/**
 * Quantità addebitata = unità x moltiplicatore: 1 (una tantum), notti delle camere interessate
 * (per notte) o persone x notti (per persona per notte), sulle camere indicate o su tutte.
 * Calcolata all'inserimento: se poi il soggiorno cambia, la si aggiorna modificando il servizio.
 */
async function moltiplicatore(prenotazioneId: number, addebito: string, segmentoIds: number[]) {
  if (addebito === "una_tantum") return 1;
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: { prenotazioneId, stato: { not: "ANNULLATO" }, ...(segmentoIds.length ? { id: { in: segmentoIds } } : {}) },
    include: { _count: { select: { notti: true } } },
  });
  return segmenti.reduce((t, sg) => {
    const c = composizioneDi(sg);
    return t + sg._count.notti * (addebito === "per_persona_notte" ? c.adulti + c.etaBambini.length : 1);
  }, 0);
}

/** Letti aggiunti già addebitati su una camera (servizi con effetto "letto_aggiunto" collegati a lei). */
export async function lettiAggiuntiSegmento(segmentoId: number, escludiServizioId?: number) {
  const righe = await prisma.servizioAggiunto.findMany({
    where: { servizioCatalogo: { effetto: "letto_aggiunto" }, segmenti: { some: { segmentoId } }, id: escludiServizioId ? { not: escludiServizioId } : undefined },
  });
  return righe.reduce((t, r) => t + r.unita, 0);
}

/** Regole dei supplementi con effetto: il letto aggiunto va su camere precise e nei limiti del tipo; gli animali solo dove ammessi. */
async function verificaEffetto(effetto: string | null, prenotazioneId: number, segmentoIds: number[], unita: number, escludiServizioId?: number) {
  if (!effetto) return;
  const segmenti = await prisma.segmentoSoggiorno.findMany({
    where: { prenotazioneId, ...(segmentoIds.length ? { id: { in: segmentoIds } } : {}) },
    include: { tipoCamera: true, camera: true },
  });
  if (effetto === "animale") {
    const vietato = segmenti.find((sg) => !sg.tipoCamera.animaliAmmessi);
    if (vietato) throw new Error(`Animali non ammessi nelle camere "${vietato.tipoCamera.descrizione}" (Impostazioni > Camere).`);
  }
  if (effetto === "letto_aggiunto") {
    if (!segmentoIds.length) throw new Error("Il letto aggiunto va assegnato a una camera precisa: scegli la camera.");
    for (const sg of segmenti) {
      const totale = (await lettiAggiuntiSegmento(sg.id, escludiServizioId)) + unita;
      if (totale > sg.tipoCamera.lettiAggiuntiMax) {
        throw new Error(
          `${sg.camera?.codice ?? sg.tipoCamera.descrizione}: al massimo ${sg.tipoCamera.lettiAggiuntiMax} ${sg.tipoCamera.lettiAggiuntiMax === 1 ? "letto aggiunto" : "letti aggiunti"} per il tipo "${sg.tipoCamera.descrizione}".`,
        );
      }
    }
  }
}

/** Aggiunge un servizio extra a una prenotazione, verificando che prenotazione/servizio/segmenti appartengano all'hotel. */
export async function aggiungiServizioAPrenotazione(hotelId: number, prenotazioneId: number, input: AggiungiServizioInput) {
  await prisma.prenotazione.findFirstOrThrow({ where: { id: prenotazioneId, hotelId } });

  const catalogo = input.servizioCatalogoId
    ? await prisma.servizioCatalogo.findFirstOrThrow({ where: { id: input.servizioCatalogoId, hotelId } })
    : null;
  if (!catalogo && !input.descrizione?.trim()) {
    throw new Error("Indicare una descrizione per un servizio a prezzo libero.");
  }
  if (!(Number.isInteger(input.quantita) && input.quantita > 0)) throw new Error("Quantità non valida.");
  const addebito = catalogo?.addebito ?? (input.addebito && ADDEBITI.includes(input.addebito) ? input.addebito : "una_tantum");

  if (input.segmentoIds?.length) {
    const trovati = await prisma.segmentoSoggiorno.count({
      where: { id: { in: input.segmentoIds }, prenotazioneId },
    });
    if (trovati !== input.segmentoIds.length) {
      throw new Error("Uno o più segmenti indicati non appartengono a questa prenotazione.");
    }
  }
  await verificaEffetto(catalogo?.effetto ?? null, prenotazioneId, input.segmentoIds ?? [], input.quantita);
  const molt = await moltiplicatore(prenotazioneId, addebito, input.segmentoIds ?? []);
  if (molt === 0) throw new Error("Nessuna notte su cui addebitare il servizio.");

  await prisma.servizioAggiunto.create({
    data: {
      prenotazioneId,
      servizioCatalogoId: input.servizioCatalogoId,
      descrizione: input.descrizione,
      prezzoUnitario: input.prezzoUnitario,
      addebito,
      unita: input.quantita,
      quantita: input.quantita * molt,
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
    include: { servizioCatalogo: true },
  });
  if (!(Number.isInteger(input.quantita) && input.quantita > 0)) throw new Error("Quantità non valida.");

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
  await verificaEffetto(servizio.servizioCatalogo?.effetto ?? null, servizio.prenotazioneId, input.segmentoIds ?? [], input.quantita, servizio.id);
  // La quantità si ricalcola su notti/persone attuali (così si aggiorna anche dopo un cambio di date).
  const molt = await moltiplicatore(servizio.prenotazioneId, servizio.addebito, input.segmentoIds ?? []);
  if (molt === 0) throw new Error("Nessuna notte su cui addebitare il servizio.");

  await prisma.$transaction([
    prisma.servizioAggiunto.update({
      where: { id: servizioAggiuntoId },
      data: {
        descrizione: servizio.servizioCatalogoId ? undefined : input.descrizione,
        prezzoUnitario: input.prezzoUnitario,
        unita: input.quantita,
        quantita: input.quantita * molt,
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
