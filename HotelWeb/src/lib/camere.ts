import { prisma } from "@/lib/prisma";

// MVP: un solo hotel. Quando si aggiunge multi-hotel, l'hotelId va preso dalla sessione utente.
const HOTEL_ID = 1;

export async function datiGestioneCamere() {
  const [tipiCamera, camere, indisponibilita] = await Promise.all([
    prisma.tipoCamera.findMany({ where: { hotelId: HOTEL_ID }, orderBy: { descrizione: "asc" } }),
    prisma.camera.findMany({
      where: { hotelId: HOTEL_ID },
      include: { tipoCamera: true },
      orderBy: [{ piano: "asc" }, { codice: "asc" }],
    }),
    // Nota: nessun filtro sulla data "oggi reale" — questa build usa una data di riferimento
    // fittizia (luglio 2026) per i dati demo, non la data di sistema.
    prisma.cameraIndisponibilita.findMany({
      where: { camera: { hotelId: HOTEL_ID } },
      include: { camera: true },
      orderBy: { dal: "asc" },
    }),
  ]);
  return { tipiCamera, camere, indisponibilita };
}

export async function creaTipoCamera(codice: string, descrizione: string) {
  return prisma.tipoCamera.create({ data: { hotelId: HOTEL_ID, codice, descrizione } });
}

export async function creaCamera(input: {
  codice: string;
  tipoCameraId: number;
  piano?: string;
  capienzaAdulti: number;
  capienzaBambini: number;
}) {
  return prisma.camera.create({ data: { hotelId: HOTEL_ID, ...input } });
}

/** Cambia il tipo di una camera (es. una singola a cui si aggiunge un letto diventa doppia).
 * Le prenotazioni passate/esistenti mantengono il proprio tipoCameraId storico, non vengono toccate. */
export async function cambiaTipoCamera(cameraId: number, nuovoTipoCameraId: number) {
  return prisma.camera.update({ where: { id: cameraId }, data: { tipoCameraId: nuovoTipoCameraId } });
}

export async function impostaCameraAttiva(cameraId: number, attivo: boolean) {
  return prisma.camera.update({ where: { id: cameraId }, data: { attivo } });
}

export async function creaIndisponibilita(input: { cameraId: number; dal: string; al: string; motivo: string }) {
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

export async function eliminaIndisponibilita(id: number) {
  return prisma.cameraIndisponibilita.delete({ where: { id } });
}
