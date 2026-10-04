import { prisma } from "../src/lib/prisma";

/**
 * Per i collaudi che fanno check-out su camere vere: fotografa lo stato di pulizia di tutte le
 * camere e restituisce la funzione che lo rimette com'era (il check-out le segna "da pulire").
 */
export async function fotografaStatoCamere() {
  const camere = await prisma.camera.findMany({ select: { id: true, statoPulizia: true, statoPuliziaIl: true, statoPuliziaDa: true, nonDisturbare: true } });
  return async () => {
    for (const { id, ...dati } of camere) await prisma.camera.update({ where: { id }, data: dati });
  };
}
