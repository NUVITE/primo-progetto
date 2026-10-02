/**
 * Moduli opzionali attivabili per hotel dal superadmin (Hotel.moduli). Il nucleo (planning,
 * prenotazioni, camere, servizi, utenti) è sempre attivo e non compare qui.
 * Un modulo spento nasconde le sue voci di menu e i suoi permessi (che smettono di valere).
 * "disponibile" = già sviluppato: gli altri si vedono ma non si possono ancora attivare.
 */
export const MODULI = {
  SALE: "sale",
  RISTORAZIONE: "ristorazione",
  PULIZIE: "pulizie",
  MANUTENZIONI: "manutenzioni",
  MAGAZZINO: "magazzino",
  FATTURAZIONE: "fatturazione",
  SCHEDINA_PS: "schedina_ps",
  ROSS1000: "ross1000",
  REPORT: "report",
} as const;

export type Modulo = (typeof MODULI)[keyof typeof MODULI];

export const CATALOGO_MODULI: { modulo: Modulo; nome: string; descrizione: string; disponibile: boolean }[] = [
  { modulo: MODULI.SALE, nome: "Sale ed eventi", descrizione: "Prenotazione sale a fasce o a ore, allestimenti, clienti esterni", disponibile: true },
  {
    modulo: MODULI.RISTORAZIONE,
    nome: "Ristorazione",
    descrizione: "Note alimentari degli ospiti (allergie, intolleranze), pasti del giorno, menu e room service",
    disponibile: true,
  },
  { modulo: MODULI.PULIZIE, nome: "Pulizie e riassetto", descrizione: "Stato camere, riassetto, approvvigionamenti ai piani", disponibile: false },
  { modulo: MODULI.MANUTENZIONI, nome: "Manutenzioni", descrizione: "Segnalazioni guasti e richieste degli ospiti", disponibile: false },
  { modulo: MODULI.MAGAZZINO, nome: "Magazzino", descrizione: "Prodotti, movimenti di carico e scarico, giacenze", disponibile: false },
  { modulo: MODULI.FATTURAZIONE, nome: "Fatturazione", descrizione: "Fatture elettroniche (XML SDI) e documenti non fiscali", disponibile: false },
  { modulo: MODULI.SCHEDINA_PS, nome: "Schedina PS", descrizione: "Invio ad Alloggiati Web della Polizia di Stato", disponibile: false },
  { modulo: MODULI.ROSS1000, nome: "Ross1000", descrizione: "Movimentazione turistica per l'ISTAT regionale", disponibile: false },
  { modulo: MODULI.REPORT, nome: "Report e stampe", descrizione: "Statistiche e stampe personalizzate", disponibile: false },
];

const NOTI = new Set<string>(Object.values(MODULI));

/** Normalizza il valore salvato su DB (Json, può essere null o contenere codici non più validi). */
export function moduliAttivi(salvati: unknown): Modulo[] {
  return Array.isArray(salvati) ? salvati.filter((m): m is Modulo => typeof m === "string" && NOTI.has(m)) : [];
}
