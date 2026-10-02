import type { cercaPrenotazioni } from "@/lib/prenotazioni";

/** Giorno e ora correnti in Italia ("aaaa-mm-gg", "hh:mm"). */
export function adessoItalia() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return { giorno: `${p.year}-${p.month}-${p.day}`, ora: `${p.hour}:${p.minute}` };
}

/**
 * Righe dell'elenco prenotazioni (pagina e ricerca), con lo stato dell'opzione già calcolato.
 * orarioLimite: per gli arrivi di oggi, le prenotazioni senza garanzia non ancora arrivate oltre
 * quell'ora sono "possibile no-show".
 */
export function righeElenco(prenotazioni: Awaited<ReturnType<typeof cercaPrenotazioni>>, orarioLimite = "18:00") {
  const adesso = adessoItalia();
  const oggi = adesso.giorno;
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
      garanzia: p.garanzia,
      oraArrivo: p.oraArrivo,
      arrivoOggi: arrivoOggi(p, oggi, adesso.ora, orarioLimite),
    };
  });
}
export type RigaElenco = ReturnType<typeof righeElenco>[number];

/** Arrivo di oggi: quante camere arrivano, quante sono già arrivate, se è un possibile no-show. */
function arrivoOggi(p: Awaited<ReturnType<typeof cercaPrenotazioni>>[number], oggi: string, ora: string, limite: string) {
  if (p.stato === "ANNULLATA") return null;
  const diOggi = p.segmenti.filter((s) => s.stato !== "ANNULLATO" && s.dataInizio.toISOString().slice(0, 10) === oggi);
  // Uso diurno: niente check-in né no-show, si mostra la fascia oraria.
  const diurno = diOggi.find((s) => s.usoDiurno);
  const camere = diOggi.filter((s) => !s.usoDiurno);
  if (!camere.length) return diurno ? { camere: 0, arrivate: 0, possibileNoShow: false, usoDiurno: `${diurno.oraDal}–${diurno.oraAl}` } : null;
  const arrivate = camere.filter((s) => s.presenze.some((x) => x.stato !== "attesa")).length;
  return { camere: camere.length, arrivate, possibileNoShow: arrivate === 0 && p.garanzia === "nessuna" && ora >= limite, usoDiurno: null as string | null };
}
