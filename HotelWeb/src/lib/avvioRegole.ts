/**
 * Primo avvio guidato: i passi per rendere operativa una struttura nuova, con lo stato (fatto o da
 * fare), cosa manca e dove si fa. Alcuni passi li fa il fornitore del programma (regolamento della
 * tassa, sistema ISTAT): la lista lo dice invece di mandare l'utente dove non può agire.
 * Dati e funzioni pure, usabili anche dalle pagine.
 */
import { conUnita } from "@/lib/funzioniRegole";

export type StatoAvvio = {
  unita: { singolare: string; plurale: string; femminile: boolean };
  datiMancanti: string[];
  camereAttive: number;
  tipiSenzaPrezzi: string[];
  politiche: number;
  regolamentoTassa: boolean;
  alloggiati: { utente: boolean; verificato: boolean };
  istat: { sistema: string | null; completo: boolean };
  email: { configurata: boolean; provaRiuscita: boolean };
  utenti: { titolare: boolean; quanti: number };
};

export type PassoAvvio = { id: string; titolo: string; fatto: boolean; dettaglio: string; href: string; fornitore?: boolean };

const elenco = (xs: string[]) => (xs.length <= 3 ? xs.join(", ") : `${xs.slice(0, 3).join(", ")} e altri ${xs.length - 3}`);

export function passiAvvio(s: StatoAvvio): PassoAvvio[] {
  const u = (t: string) => conUnita(t, s.unita);
  return [
    {
      id: "struttura",
      titolo: "Dati della struttura",
      fatto: s.datiMancanti.length === 0,
      dettaglio: s.datiMancanti.length ? `Mancano: ${elenco(s.datiMancanti)}.` : "Indirizzo, contatti e orari compilati.",
      href: "/impostazioni/struttura",
    },
    {
      id: "camere",
      titolo: u("{Camere} e tipi"),
      fatto: s.camereAttive > 0,
      dettaglio: s.camereAttive
        ? u(`${s.camereAttive} ${s.camereAttive === 1 ? `{camera} ${s.unita.femminile ? "attiva" : "attivo"}` : `{camere} ${s.unita.femminile ? "attive" : "attivi"}`}.`)
        : u(s.unita.femminile ? "Nessuna {camera}: inserisci i tipi e le {camere}." : "Nessun {camera}: inserisci i tipi e gli {camere}."),
      href: "/camere/gestione",
    },
    {
      id: "prezzi",
      titolo: "Listino e prezzi",
      fatto: s.camereAttive > 0 && s.tipiSenzaPrezzi.length === 0,
      dettaglio: s.camereAttive === 0 ? u("Prima servono le {camere}.") : s.tipiSenzaPrezzi.length ? `Senza prezzi da oggi in poi: ${elenco(s.tipiSenzaPrezzi)}.` : "Ogni tipo ha i suoi prezzi.",
      href: "/impostazioni/listini",
    },
    {
      id: "politiche",
      titolo: "Politica di cancellazione",
      fatto: s.politiche > 0,
      dettaglio: s.politiche ? "Almeno una politica attiva." : "Nessuna politica attiva: serve per proporre all'ospite le condizioni di cancellazione e calcolare la penale.",
      href: "/impostazioni/politiche",
    },
    {
      id: "tassa",
      titolo: "Regolamento della tassa di soggiorno",
      fatto: s.regolamentoTassa,
      dettaglio: s.regolamentoTassa ? "Il regolamento del comune è in vigore." : "Manca il regolamento del comune: lo inserisce il fornitore del programma.",
      href: "/tassa-soggiorno",
      fornitore: true,
    },
    {
      id: "alloggiati",
      titolo: "Alloggiati Web (schedine di Polizia)",
      fatto: s.alloggiati.utente && s.alloggiati.verificato,
      dettaglio: !s.alloggiati.utente ? "Inserisci le credenziali del servizio web della Questura." : s.alloggiati.verificato ? "Credenziali provate con successo." : "Credenziali inserite ma non ancora provate.",
      href: "/impostazioni/adempimenti",
    },
    {
      id: "istat",
      titolo: "Statistica ISTAT",
      fatto: !!s.istat.sistema && s.istat.completo,
      dettaglio: !s.istat.sistema
        ? "Il sistema regionale (Ross1000 o SPOT) lo attiva il fornitore del programma."
        : s.istat.completo
          ? `Configurata (${s.istat.sistema === "ROSS1000" ? "Ross1000" : "SPOT"}).`
          : s.istat.sistema === "ROSS1000"
            ? "Inserisci codice della struttura e credenziali di Ross1000."
            : "Indica da quale giorno preparare i file per SPOT.",
      href: "/impostazioni/adempimenti",
      fornitore: !s.istat.sistema,
    },
    {
      id: "email",
      titolo: "Casella email dell'hotel",
      fatto: s.email.configurata && s.email.provaRiuscita,
      dettaglio: !s.email.configurata ? "Collega la casella dell'hotel per conferme, preventivi e ringraziamenti." : s.email.provaRiuscita ? "Configurata e provata." : "Configurata ma la prova non è riuscita (o non è stata fatta).",
      href: "/impostazioni/email",
    },
    {
      id: "utenti",
      titolo: "Utenti",
      fatto: s.utenti.titolare || s.utenti.quanti > 1,
      dettaglio: s.utenti.titolare
        ? "Titolare unico: un solo utente che fa tutto."
        : s.utenti.quanti > 1
          ? `${s.utenti.quanti} utenti con i loro ruoli.`
          : "C'è solo l'amministratore: aggiungi i colleghi con i loro ruoli, oppure passa al titolare unico.",
      href: "/utenti",
    },
  ];
}

export const riepilogoAvvio = (passi: PassoAvvio[]) => ({ fatti: passi.filter((p) => p.fatto).length, totale: passi.length, completo: passi.every((p) => p.fatto) });
