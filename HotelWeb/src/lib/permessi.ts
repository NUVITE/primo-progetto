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
  PREZZI_MODIFICA: "prezzi.modifica",
  ADDEBITI_REGISTRA: "addebiti.registra",
  CASSA_CHIUDI: "cassa.chiudi",
  NOTE_ALIMENTARI: "ristorazione.note",
  FOGLIO_PASTI: "ristorazione.foglio",
  MENU_GESTISCI: "ristorazione.menu",
  ROOM_SERVICE: "ristorazione.roomservice",
  CAMERE_STATO_VEDI: "pulizie.vedi",
  PULIZIE_GESTISCI: "pulizie.gestisci",
  PULIZIE_MIE: "pulizie.mie",
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
      {
        permesso: PERMESSI.ADDEBITI_REGISTRA,
        nome: "Registrare addebiti",
        descrizione: "Segnare sul conto delle camere i consumi dei reparti (bar, frigobar, lavanderia…) e stornarli se sbagliati, anche da tablet",
      },
      {
        permesso: PERMESSI.CASSA_CHIUDI,
        nome: "Chiusura di cassa",
        descrizione: "Vedere gli incassi del giorno per metodo e operatore, contare i contanti e chiudere la giornata",
      },
      { permesso: PERMESSI.PREZZI_MODIFICA, nome: "Modificare i prezzi", descrizione: "Fissare a mano il prezzo per notte di una camera prenotata (resta traccia di chi e perché)" },
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
    area: "Ristorazione",
    modulo: MODULI.RISTORAZIONE,
    voci: [
      {
        permesso: PERMESSI.NOTE_ALIMENTARI,
        nome: "Note alimentari",
        descrizione: "Vedere e registrare allergie, intolleranze e regimi alimentari degli ospiti (dati sanitari: solo con il consenso)",
      },
      {
        permesso: PERMESSI.FOGLIO_PASTI,
        nome: "Foglio del giorno",
        descrizione: "Coperti previsti per colazione, pranzo e cena, tavoli e coperti in più o in meno",
      },
      {
        permesso: PERMESSI.MENU_GESTISCI,
        nome: "Gestire menu e piatti",
        descrizione: "Piatti con allergeni e prezzi, menu della colazione, del giorno, alla carta e del room service",
      },
      {
        permesso: PERMESSI.ROOM_SERVICE,
        nome: "Room service",
        descrizione: "Vedere e far avanzare gli ordini in camera, prenderli al telefono, stampare il cartoncino con il QR; alla consegna l'ordine va sul conto",
      },
    ],
  },
  {
    area: "Pulizie",
    modulo: MODULI.PULIZIE,
    voci: [
      { permesso: PERMESSI.CAMERE_STATO_VEDI, nome: "Vedere lo stato delle camere", descrizione: "Pulite, da pulire, da rifare, non disturbare: nel planning, al check-in e nella pagina Stato camere" },
      {
        permesso: PERMESSI.PULIZIE_GESTISCI,
        nome: "Gestire le pulizie",
        descrizione: "Cambiare lo stato delle camere, controllarle come governante, assegnarle alle cameriere e compilare il rapporto",
      },
      {
        permesso: PERMESSI.PULIZIE_MIE,
        nome: "Pulire le proprie camere",
        descrizione: "La pagina «Le mie camere»: inizio e fine pulizia, non disturbare, consumi del frigobar sul conto",
      },
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
  [PERMESSI.CASSA_CHIUDI]: [PERMESSI.PRENOTAZIONI_VEDI, PERMESSI.IMPORTI_VEDI],
  [PERMESSI.PULIZIE_GESTISCI]: [PERMESSI.CAMERE_STATO_VEDI],
  [PERMESSI.PULIZIE_MIE]: [PERMESSI.CAMERE_STATO_VEDI],
  [PERMESSI.PREZZI_MODIFICA]: [PERMESSI.PRENOTAZIONI_GESTISCI, PERMESSI.PRENOTAZIONI_VEDI, PERMESSI.IMPORTI_VEDI],
};

/**
 * Permessi di un accesso all'hotel: modalità "titolare" = tutti (un solo utente che fa tutto);
 * altrimenti la somma del ruolo principale e dei ruoli in più.
 */
export function permessiAccesso(modalitaUtenti: string, ruoli: unknown[]): Permesso[] {
  if (modalitaUtenti === "titolare") return TUTTI_I_PERMESSI;
  const tutti = ruoli.flatMap((r) => (Array.isArray(r) ? r : []));
  return permessiEffettivi(tutti);
}

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
    permessi: [PERMESSI.PRENOTAZIONI_VEDI, PERMESSI.PRENOTAZIONI_GESTISCI, PERMESSI.IMPORTI_VEDI, PERMESSI.PAGAMENTI_REGISTRA, PERMESSI.ADDEBITI_REGISTRA, PERMESSI.CASSA_CHIUDI, PERMESSI.NOTE_ALIMENTARI, PERMESSI.FOGLIO_PASTI, PERMESSI.ROOM_SERVICE, PERMESSI.CAMERE_STATO_VEDI, PERMESSI.PULIZIE_GESTISCI, PERMESSI.ADEMPIMENTI_INVIA, PERMESSI.SALE_VEDI, PERMESSI.SALE_GESTISCI],
  },
  {
    nome: "Eventi / Commerciale",
    permessi: [PERMESSI.PRENOTAZIONI_VEDI, PERMESSI.IMPORTI_VEDI, PERMESSI.SALE_VEDI, PERMESSI.SALE_GESTISCI, PERMESSI.SALE_CONFIGURA],
  },
  { nome: "Cucina", permessi: [PERMESSI.FOGLIO_PASTI, PERMESSI.NOTE_ALIMENTARI, PERMESSI.MENU_GESTISCI, PERMESSI.ROOM_SERVICE] },
  { nome: "Sala", permessi: [PERMESSI.FOGLIO_PASTI, PERMESSI.NOTE_ALIMENTARI, PERMESSI.ROOM_SERVICE] },
  { nome: "Room service", permessi: [PERMESSI.ROOM_SERVICE] },
  { nome: "Governante", permessi: [PERMESSI.PRENOTAZIONI_VEDI, PERMESSI.CAMERE_STATO_VEDI, PERMESSI.PULIZIE_GESTISCI] },
  { nome: "Cameriera ai piani", permessi: [PERMESSI.CAMERE_STATO_VEDI, PERMESSI.PULIZIE_MIE] },
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
