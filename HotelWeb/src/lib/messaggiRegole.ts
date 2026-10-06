/** Portineria, messaggi e posta per gli ospiti: dati e funzioni pure (usabili anche dalle pagine). */

export const TIPI_MESSAGGIO = { messaggio: "Messaggio", lettera: "Lettera", pacco: "Pacco" } as const;
export type TipoMessaggio = keyof typeof TIPI_MESSAGGIO;

/** Come è arrivato: chi ha cercato l'ospite (messaggio) o come è arrivata la posta. */
export const MODI_ARRIVO = { telefono: "Al telefono", persona: "Di persona", email: "Per email", posta: "Posta", corriere: "Corriere" } as const;
export type ModoArrivo = keyof typeof MODI_ARRIVO;

export const MODI_CONSEGNA = { mano: "Consegnato a mano", email: "Inviato per email", rispedito: "Rispedito o ritirato dal corriere" } as const;
export type ModoConsegna = keyof typeof MODI_CONSEGNA;

export type MessaggioInput = {
  prenotazioneId: number | null;
  ospiteId: number | null;
  destinatario: string;
  tipo: TipoMessaggio;
  daChi: string;
  modo: ModoArrivo | "";
  recapito: string;
  testo: string;
  urgente: boolean;
  doveRiposto: string;
};

/** Controlli che non dipendono dal database. */
export function validaMessaggio(d: MessaggioInput) {
  if (!(d.tipo in TIPI_MESSAGGIO)) throw new Error("Tipo non previsto.");
  if (d.modo && !(d.modo in MODI_ARRIVO)) throw new Error("Modo non previsto.");
  if (!d.prenotazioneId && !d.destinatario.trim()) throw new Error("Scegli l'ospite o scrivi a chi è destinato.");
  if (d.tipo === "messaggio" && !d.testo.trim()) throw new Error("Scrivi il messaggio.");
  if (d.tipo === "messaggio" && !d.daChi.trim()) throw new Error("Indica chi ha cercato l'ospite.");
  if (d.testo.length > 2000) throw new Error("Il messaggio è troppo lungo (massimo 2000 caratteri).");
}

/** Testo dell'email con cui si inoltra un messaggio all'ospite, nella sua lingua (paragrafi vuoti saltati). */
export function testoEmailMessaggio(
  lingua: "it" | "en",
  m: { destinatario: string; daChi: string | null; modo: string | null; recapito: string | null; testo: string | null; ricevutoIl: Date; tipo: string },
  hotel: string,
) {
  const quando = m.ricevutoIl.toLocaleString(lingua === "en" ? "en-GB" : "it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" });
  const paragrafi = (xs: (string | null | false)[]) => xs.filter(Boolean).join("\n\n");
  if (lingua === "en") {
    const cosa = m.tipo === "messaggio" ? "a message" : m.tipo === "lettera" ? "a letter" : "a parcel";
    return {
      oggetto: `${hotel} - there is ${cosa} for you`,
      corpo: paragrafi([
        `Dear ${m.destinatario},`,
        m.tipo === "messaggio"
          ? `${m.daChi ?? "Someone"} looked for you (${quando}).`
          : `${cosa[0].toUpperCase()}${cosa.slice(1)} has arrived for you (${quando}): you can collect it at the front desk.`,
        m.testo,
        m.recapito && `To call back: ${m.recapito}`,
        `Kind regards,\n${hotel}`,
      ]),
    };
  }
  const cosa = m.tipo === "messaggio" ? "un messaggio" : m.tipo === "lettera" ? "una lettera" : "un pacco";
  const lettera = m.tipo === "lettera";
  return {
    oggetto: `${hotel} - c'è ${cosa} per lei`,
    corpo: paragrafi([
      `Gentile ${m.destinatario},`,
      m.tipo === "messaggio"
        ? `l'ha cercata ${m.daChi ?? "una persona"} (${quando}).`
        : `${lettera ? "è arrivata" : "è arrivato"} ${cosa} per lei (${quando}): può ${lettera ? "ritirarla" : "ritirarlo"} al ricevimento.`,
      m.testo,
      m.recapito && `Da richiamare: ${m.recapito}`,
      `Cordiali saluti,\n${hotel}`,
    ]),
  };
}
