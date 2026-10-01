/**
 * Catalogo dei permessi: fisso, definito qui e solo qui. Il codice controlla sempre un permesso
 * (mai il nome di un ruolo); i ruoli sono insiemi di permessi configurabili per hotel.
 * Nuovo modulo = nuovi permessi aggiunti a questo elenco (e ai ruoli predefiniti se serve).
 */
import { MODULI, type Modulo } from "@/lib/moduli";

export const PERMESSI = {
  PRENOTAZIONI_VEDI: "prenotazioni.vedi",
  PRENOTAZIONI_GESTISCI: "prenotazioni.gestisci",
  IMPORTI_VEDI: "importi.vedi",
  PAGAMENTI_REGISTRA: "pagamenti.registra",
  ADEMPIMENTI_INVIA: "adempimenti.invia",
  SOGGIORNI_RIAPRI: "soggiorni.riapri",
  CAMERE_GESTISCI: "camere.gestisci",
  HOTEL_CONFIGURA: "hotel.configura",
  LISTINI_GESTISCI: "listini.gestisci",
  SALE_VEDI: "sale.vedi",
  SALE_GESTISCI: "sale.gestisci",
  SALE_CONFIGURA: "sale.configura",
  UTENTI_GESTISCI: "utenti.gestisci",
  RUOLI_GESTISCI: "ruoli.gestisci",
} as const;

export type Permesso = (typeof PERMESSI)[keyof typeof PERMESSI];

export const TUTTI_I_PERMESSI: Permesso[] = Object.values(PERMESSI);

/** Descrizioni per la schermata Ruoli, raggruppate per area. */
export const CATALOGO_PERMESSI: { area: string; modulo?: Modulo; voci: { permesso: Permesso; nome: string; descrizione: string }[] }[] = [
  {
    area: "Prenotazioni",
    voci: [
      { permesso: PERMESSI.PRENOTAZIONI_VEDI, nome: "Vedere prenotazioni", descrizione: "Planning, elenco e dettaglio in sola lettura" },
      { permesso: PERMESSI.PRENOTAZIONI_GESTISCI, nome: "Gestire prenotazioni", descrizione: "Creare, modificare, dividere soggiorni, assegnare camere, aggiungere servizi" },
      { permesso: PERMESSI.IMPORTI_VEDI, nome: "Vedere importi", descrizione: "Prezzi, tassa di soggiorno e totali (senza, gli importi sono nascosti)" },
      { permesso: PERMESSI.ADEMPIMENTI_INVIA, nome: "Inviare schedine e ISTAT", descrizione: "Inviare le schedine alla Polizia (Alloggiati Web) e i movimenti all'ISTAT; vede gli avvisi delle scadenze" },
      { permesso: PERMESSI.PAGAMENTI_REGISTRA, nome: "Registrare pagamenti", descrizione: "Incassare acconti e saldi, registrare rimborsi e stornare un incasso sbagliato" },
      { permesso: PERMESSI.SOGGIORNI_RIAPRI, nome: "Riaprire soggiorni chiusi", descrizione: "Rettificare un soggiorno dopo il check-out (tassa definitiva): resta traccia di chi e quando" },
    ],
  },
  {
    area: "Configurazione",
    voci: [
      { permesso: PERMESSI.HOTEL_CONFIGURA, nome: "Configurare l'hotel", descrizione: "Dati della struttura, orari, trattamenti" },
      { permesso: PERMESSI.CAMERE_GESTISCI, nome: "Gestire camere", descrizione: "Tipi camera, camere, fuori servizio" },
      { permesso: PERMESSI.LISTINI_GESTISCI, nome: "Gestire listini e servizi", descrizione: "Listini e tariffe delle camere, catalogo dei servizi aggiuntivi" },
    ],
  },
  {
    area: "Sale",
    modulo: MODULI.SALE,
    voci: [
      { permesso: PERMESSI.SALE_VEDI, nome: "Vedere sale", descrizione: "Planning delle sale" },
      { permesso: PERMESSI.SALE_GESTISCI, nome: "Gestire prenotazioni sale", descrizione: "Creare e modificare prenotazioni di sale" },
      { permesso: PERMESSI.SALE_CONFIGURA, nome: "Configurare sale", descrizione: "Sale, allestimenti, tariffe" },
    ],
  },
  {
    area: "Utenti",
    voci: [
      { permesso: PERMESSI.UTENTI_GESTISCI, nome: "Gestire utenti", descrizione: "Aggiungere utenti all'hotel e assegnare i ruoli" },
      { permesso: PERMESSI.RUOLI_GESTISCI, nome: "Gestire ruoli", descrizione: "Creare ruoli e decidere i loro permessi" },
    ],
  },
];

/**
 * Chi può gestire qualcosa deve anche poterlo vedere: le implicazioni si applicano sempre al
 * calcolo dei permessi effettivi, così un ruolo configurato a metà non produce schermate rotte.
 */
const IMPLICAZIONI: Partial<Record<Permesso, Permesso[]>> = {
  [PERMESSI.PRENOTAZIONI_GESTISCI]: [PERMESSI.PRENOTAZIONI_VEDI],
  [PERMESSI.SALE_GESTISCI]: [PERMESSI.SALE_VEDI],
  [PERMESSI.SALE_CONFIGURA]: [PERMESSI.SALE_VEDI],
  [PERMESSI.SOGGIORNI_RIAPRI]: [PERMESSI.PRENOTAZIONI_GESTISCI],
  [PERMESSI.PAGAMENTI_REGISTRA]: [PERMESSI.PRENOTAZIONI_VEDI, PERMESSI.IMPORTI_VEDI],
  [PERMESSI.ADEMPIMENTI_INVIA]: [PERMESSI.PRENOTAZIONI_VEDI],
};

/** Normalizza l'elenco salvato su DB: scarta codici sconosciuti e aggiunge le implicazioni. */
export function permessiEffettivi(salvati: unknown): Permesso[] {
  const noti = new Set<string>(TUTTI_I_PERMESSI);
  const base = Array.isArray(salvati) ? salvati.filter((p): p is Permesso => typeof p === "string" && noti.has(p)) : [];
  const risultato = new Set<Permesso>(base);
  for (const p of base) for (const implicato of IMPLICAZIONI[p] ?? []) risultato.add(implicato);
  return TUTTI_I_PERMESSI.filter((p) => risultato.has(p));
}

/** Ruoli con cui nasce ogni hotel: modificabili dall'amministratore dell'hotel. */
export const RUOLI_PREDEFINITI: { nome: string; permessi: Permesso[] }[] = [
  { nome: "Amministratore", permessi: TUTTI_I_PERMESSI },
  { nome: "Direttore", permessi: TUTTI_I_PERMESSI.filter((p) => p !== PERMESSI.RUOLI_GESTISCI) },
  {
    nome: "Reception",
    permessi: [PERMESSI.PRENOTAZIONI_VEDI, PERMESSI.PRENOTAZIONI_GESTISCI, PERMESSI.IMPORTI_VEDI, PERMESSI.PAGAMENTI_REGISTRA, PERMESSI.ADEMPIMENTI_INVIA, PERMESSI.SALE_VEDI, PERMESSI.SALE_GESTISCI],
  },
  {
    nome: "Eventi / Commerciale",
    permessi: [PERMESSI.PRENOTAZIONI_VEDI, PERMESSI.IMPORTI_VEDI, PERMESSI.SALE_VEDI, PERMESSI.SALE_GESTISCI, PERMESSI.SALE_CONFIGURA],
  },
  { nome: "Governante", permessi: [PERMESSI.PRENOTAZIONI_VEDI] },
  { nome: "Cameriera ai piani", permessi: [] },
  { nome: "Manutenzione", permessi: [] },
];

/** Permessi che richiedono p (togliendo p vanno tolti anche loro, es. "vedere" regge "gestire"). */
export function permessiCheRichiedono(p: Permesso): Permesso[] {
  return TUTTI_I_PERMESSI.filter((q) => IMPLICAZIONI[q]?.includes(p));
}

/** Permessi che valgono solo se l'hotel ha attivo il modulo corrispondente. */
const MODULO_DEL_PERMESSO: Partial<Record<Permesso, Modulo>> = Object.fromEntries(
  CATALOGO_PERMESSI.flatMap((g) => (g.modulo ? g.voci.map((v) => [v.permesso, g.modulo]) : [])),
);

export function filtraPerModuli(permessi: Permesso[], moduli: Modulo[]): Permesso[] {
  return permessi.filter((p) => {
    const m = MODULO_DEL_PERMESSO[p];
    return !m || moduli.includes(m);
  });
}
