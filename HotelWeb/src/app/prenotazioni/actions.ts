"use server";

import { cercaPrenotazioni } from "@/lib/prenotazioni";
import { richiediUtente } from "@/lib/auth";

function isoGiorno(d: Date) {
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
}

function serializza(prenotazioni: Awaited<ReturnType<typeof cercaPrenotazioni>>) {
  return prenotazioni.map((p) => {
    const dal = p.segmenti.length ? new Date(Math.min(...p.segmenti.map((s) => s.dataInizio.getTime()))) : null;
    const al = p.segmenti.length ? new Date(Math.max(...p.segmenti.map((s) => s.dataFine.getTime()))) : null;
    return {
      id: p.id,
      ospitePrenotante: `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`,
      gruppoNome: p.gruppo?.nome ?? null,
      camere: p.segmenti.map((s) => s.camera?.codice ?? `${s.tipoCamera.descrizione} (da assegnare)`).join(", ") || null,
      periodo: dal && al ? `${isoGiorno(dal)} – ${isoGiorno(al)}` : null,
      stato: p.stato,
    };
  });
}

export async function azioneCercaPrenotazioni(query: string) {
  const { hotelId } = await richiediUtente();
  return serializza(await cercaPrenotazioni(hotelId, query));
}
