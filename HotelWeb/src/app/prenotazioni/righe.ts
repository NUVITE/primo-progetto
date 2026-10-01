import type { cercaPrenotazioni } from "@/lib/prenotazioni";

/** Righe dell'elenco prenotazioni (pagina e ricerca), con lo stato dell'opzione già calcolato. */
export function righeElenco(prenotazioni: Awaited<ReturnType<typeof cercaPrenotazioni>>) {
  const oggi = new Date().toISOString().slice(0, 10);
  const fra2 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const it = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");
  return prenotazioni.map((p) => {
    const dal = p.segmenti.length ? new Date(Math.min(...p.segmenti.map((s) => s.dataInizio.getTime()))) : null;
    const al = p.segmenti.length ? new Date(Math.max(...p.segmenti.map((s) => s.dataFine.getTime()))) : null;
    const scadenza = p.stato === "OPZIONE" && p.scadenzaOpzione ? p.scadenzaOpzione.toISOString().slice(0, 10) : null;
    return {
      id: p.id,
      ospitePrenotante: `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`,
      gruppoNome: p.gruppo?.nome ?? null,
      camere: p.segmenti.map((s) => s.camera?.codice ?? `${s.tipoCamera.descrizione} (da assegnare)`).join(", ") || null,
      periodo: dal && al ? `${it(dal)} – ${it(al)}` : null,
      stato: p.stato,
      // Opzione: "scaduta" (prima di oggi) o "in_scadenza" (entro 2 giorni), con la data.
      opzione: scadenza ? { data: scadenza.split("-").reverse().join("/"), stato: scadenza < oggi ? "scaduta" : scadenza <= fra2 ? "in_scadenza" : "valida" } : null,
    };
  });
}
export type RigaElenco = ReturnType<typeof righeElenco>[number];
