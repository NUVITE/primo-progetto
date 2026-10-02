"use server";

import { puo, richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { creaUsoDiurno, prezzoPropostoUsoDiurno, type UsoDiurnoInput } from "@/lib/prenotazioni";

export async function datiUsoDiurno() {
  const u = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
  const camere = await prisma.camera.findMany({ where: { hotelId: u.hotelId, attivo: true }, include: { tipoCamera: true }, orderBy: { codice: "asc" } });
  return {
    importiVisibili: puo(u, PERMESSI.IMPORTI_VEDI),
    camere: camere.map((c) => ({
      id: c.id,
      codice: c.codice,
      tipo: c.tipoCamera.descrizione,
      prezzoOra: c.tipoCamera.prezzoOraUsoDiurno === null ? null : Number(c.tipoCamera.prezzoOraUsoDiurno),
    })),
  };
}

export async function azionePrezzoProposto(cameraId: number, dalle: string, alle: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    return prezzoPropostoUsoDiurno(u.hotelId, cameraId, dalle, alle);
  });
}

export async function azioneCreaUsoDiurno(d: UsoDiurnoInput) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const p = await creaUsoDiurno(u.hotelId, d);
    return { id: p.id };
  });
}
