/**
 * Stato dei backup notturni (vedi deploy/backup/): regole pure per la pagina del fornitore e per
 * l'avviso in cima alle pagine. Il backup gira alle 3; la copia sul PC la scarica l'operazione
 * pianificata di Windows quando il PC è acceso.
 */

/** Oltre quest'età l'ultimo backup riuscito è troppo vecchio (un giorno più un margine). */
export const ORE_MASSIME_BACKUP = 26;
/** Oltre questi giorni la copia sul PC è ferma (fine settimana o ferie compresi). */
export const GIORNI_MASSIMI_COPIA_PC = 3;

export type StatoFile = { quando: string; esito: string; messaggio: string; file: string; dimensione: number; tabelle: number; giornalieri: number; settimanali: number; mensili: number };

/** Scarto dell'ora italiana in quel giorno: "+01:00" d'inverno, "+02:00" con l'ora legale. */
export function offsetRoma(giorno: string) {
  const nome = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", timeZoneName: "shortOffset" }).formatToParts(new Date(`${giorno}T12:00:00Z`)).find((p) => p.type === "timeZoneName")?.value;
  return nome === "GMT+2" ? "+02:00" : "+01:00";
}

/** Data e ora dal nome di una copia: "hotelweb-20261008-0300.sql.gz" -> Date (il nome è in ora italiana). */
export function quandoDaNome(nome: string): Date | null {
  const m = /^hotelweb-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})\.sql\.gz$/.exec(nome);
  if (!m) return null;
  const giorno = `${m[1]}-${m[2]}-${m[3]}`;
  return new Date(`${giorno}T${m[4]}:${m[5]}:00${offsetRoma(giorno)}`);
}

export type Valutazione = { livello: "ok" | "avviso" | "errore" | "assente"; messaggi: string[] };

/**
 * Giudizio complessivo: errore se l'ultimo backup è fallito o è troppo vecchio, avviso se la copia sul
 * PC è ferma, assente se sul server i backup non sono installati.
 */
export function valutaBackup(stato: StatoFile | null, ultimoRiuscito: Date | null, copiaPc: Date | null, ora: Date): Valutazione {
  if (!stato && !ultimoRiuscito) return { livello: "assente", messaggi: ["I backup notturni non sono installati su questo server."] };
  const messaggi: string[] = [];
  let livello: Valutazione["livello"] = "ok";
  if (stato?.esito === "errore") {
    livello = "errore";
    messaggi.push(`L'ultimo backup è fallito: ${stato.messaggio}.`);
  }
  const ore = ultimoRiuscito ? (ora.getTime() - ultimoRiuscito.getTime()) / 3_600_000 : Infinity;
  if (ore > ORE_MASSIME_BACKUP) {
    livello = "errore";
    messaggi.push(ultimoRiuscito ? `Nessun backup riuscito da ${Math.floor(ore)} ore.` : "Nessun backup riuscito finora.");
  }
  const giorni = copiaPc ? (ora.getTime() - copiaPc.getTime()) / 86_400_000 : Infinity;
  if (giorni > GIORNI_MASSIMI_COPIA_PC) {
    if (livello === "ok") livello = "avviso";
    messaggi.push(copiaPc ? `La copia sul PC è ferma da ${Math.floor(giorni)} giorni: il PC è rimasto spento?` : "Nessuna copia scaricata sul PC finora.");
  }
  return { livello, messaggi };
}
