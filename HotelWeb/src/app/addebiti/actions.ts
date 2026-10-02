"use server";

import { richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { camereInCasa, elencoReparti, registraAddebito, stornaAddebito } from "@/lib/conto";

const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/**
 * Addebiti dei reparti (bar, frigobar, lavanderia…): camere con ospiti in casa e addebiti di oggi.
 * Mostra solo camera e cognome: chi segna i consumi non vede il resto della prenotazione.
 */
export async function datiAddebiti() {
  const u = await richiediPermesso(PERMESSI.ADDEBITI_REGISTRA);
  const giorno = oggi();
  const [camere, reparti, diOggi] = await Promise.all([
    camereInCasa(u.hotelId, giorno),
    elencoReparti(u.hotelId, true),
    prisma.addebitoConto.findMany({
      where: { prenotazione: { hotelId: u.hotelId }, data: new Date(`${giorno}T00:00:00.000Z`), tipo: { not: "abbuono" } },
      include: { segmento: { include: { camera: true } }, reparto: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    giorno,
    camere,
    reparti: reparti.filter((r) => !r.esborso),
    oggi: diOggi.map((a) => ({
      id: a.id,
      camera: a.segmento?.camera?.codice ?? "—",
      reparto: a.reparto?.nome ?? "",
      descrizione: a.descrizione,
      quantita: a.quantita,
      importo: Number(a.prezzoUnitario) * a.quantita,
      buono: a.buono,
      registratoDa: a.registratoDa,
      ora: a.createdAt.toISOString(),
      stornato: !!a.stornatoIl,
    })),
  };
}

export async function azioneAddebitoCamera(segmentoId: number, d: { repartoId: number; descrizione: string; quantita: number; prezzoUnitario: number; buono: string }) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADDEBITI_REGISTRA);
    // Solo camere con ospiti in casa oggi.
    const inCasa = (await camereInCasa(u.hotelId, oggi())).find((c) => c.segmentoId === segmentoId);
    if (!inCasa) throw new Error("La camera non ha ospiti in casa oggi.");
    await registraAddebito(u.hotelId, inCasa.prenotazioneId, { tipo: "extra", segmentoId, repartoId: d.repartoId, data: oggi(), descrizione: d.descrizione, quantita: d.quantita, prezzoUnitario: d.prezzoUnitario, buono: d.buono, nota: "" }, u.nome);
    return datiAddebiti();
  });
}

export async function azioneStornaDiOggi(addebitoId: number, motivo: string) {
  return conEsito(async () => {
    const u = await richiediPermesso(PERMESSI.ADDEBITI_REGISTRA);
    await stornaAddebito(u.hotelId, addebitoId, motivo, u.nome);
    return datiAddebiti();
  });
}
