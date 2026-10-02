import { prisma } from "@/lib/prisma";

export async function datiGestioneCamere(hotelId: number) {
  const [tipiCamera, camere, indisponibilita] = await Promise.all([
    prisma.tipoCamera.findMany({ where: { hotelId }, orderBy: { descrizione: "asc" } }),
    prisma.camera.findMany({
      where: { hotelId },
      include: { tipoCamera: true },
      orderBy: [{ piano: "asc" }, { codice: "asc" }],
    }),
    // Nota: nessun filtro sulla data "oggi reale" — questa build usa una data di riferimento
    // fittizia (luglio 2026) per i dati demo, non la data di sistema.
    prisma.cameraIndisponibilita.findMany({
      where: { camera: { hotelId } },
      include: { camera: true },
      orderBy: { dal: "asc" },
    }),
  ]);
  return { tipiCamera, camere, indisponibilita };
}

/** Letti aggiunti possibili oltre la capienza e animali ammessi (supplementi con effetto). */
/** Prezzo orario proposto per l'uso diurno (day use) del tipo di camera; null = da scrivere ogni volta. */
export async function impostaPrezzoUsoDiurno(hotelId: number, id: number, prezzo: number | null) {
  if (prezzo !== null && !(prezzo >= 0)) throw new Error("Prezzo orario non valido.");
  await prisma.tipoCamera.findFirstOrThrow({ where: { id, hotelId } });
  return prisma.tipoCamera.update({ where: { id }, data: { prezzoOraUsoDiurno: prezzo } });
}

export async function impostaOpzioniTipoCamera(hotelId: number, id: number, lettiAggiuntiMax: number, animaliAmmessi: boolean) {
  if (!(Number.isInteger(lettiAggiuntiMax) && lettiAggiuntiMax >= 0 && lettiAggiuntiMax <= 5)) throw new Error("Letti aggiunti: da 0 a 5.");
  await prisma.tipoCamera.findFirstOrThrow({ where: { id, hotelId } });
  return prisma.tipoCamera.update({ where: { id }, data: { lettiAggiuntiMax, animaliAmmessi } });
}

export async function creaTipoCamera(hotelId: number, codice: string, descrizione: string) {
  return prisma.tipoCamera.create({ data: { hotelId, codice, descrizione } });
}

export async function creaCamera(hotelId: number, input: {
  codice: string;
  tipoCameraId: number;
  piano?: string;
  capienzaAdulti: number;
  capienzaBambini: number;
}) {
  // Il tipo camera indicato deve appartenere a questo hotel, non a un altro.
  await prisma.tipoCamera.findFirstOrThrow({ where: { id: input.tipoCameraId, hotelId } });
  return prisma.camera.create({ data: { hotelId, ...input } });
}

/** Cambia il tipo di una camera (es. una singola a cui si aggiunge un letto diventa doppia).
 * Le prenotazioni passate/esistenti mantengono il proprio tipoCameraId storico, non vengono toccate. */
export async function cambiaTipoCamera(hotelId: number, cameraId: number, nuovoTipoCameraId: number) {
  await prisma.camera.findFirstOrThrow({ where: { id: cameraId, hotelId } });
  await prisma.tipoCamera.findFirstOrThrow({ where: { id: nuovoTipoCameraId, hotelId } });
  return prisma.camera.update({ where: { id: cameraId }, data: { tipoCameraId: nuovoTipoCameraId } });
}

export async function impostaCameraAttiva(hotelId: number, cameraId: number, attivo: boolean) {
  await prisma.camera.findFirstOrThrow({ where: { id: cameraId, hotelId } });
  return prisma.camera.update({ where: { id: cameraId }, data: { attivo } });
}

export async function creaIndisponibilita(hotelId: number, input: { cameraId: number; dal: string; al: string; motivo: string }) {
  await prisma.camera.findFirstOrThrow({ where: { id: input.cameraId, hotelId } });

  const dal = new Date(input.dal);
  const al = new Date(input.al);
  if (al <= dal) throw new Error("La data di fine manutenzione deve essere dopo la data di inizio.");

  const conflitto = await prisma.segmentoSoggiorno.findFirst({
    where: { cameraId: input.cameraId, stato: { not: "ANNULLATO" }, dataInizio: { lt: al }, dataFine: { gt: dal } },
  });
  if (conflitto) {
    throw new Error("Ci sono prenotazioni già assegnate a questa camera nel periodo indicato: spostale prima di segnarla fuori servizio.");
  }

  return prisma.cameraIndisponibilita.create({ data: { cameraId: input.cameraId, dal, al, motivo: input.motivo } });
}

export async function eliminaIndisponibilita(hotelId: number, id: number) {
  await prisma.cameraIndisponibilita.findFirstOrThrow({ where: { id, camera: { hotelId } } });
  return prisma.cameraIndisponibilita.delete({ where: { id } });
}
