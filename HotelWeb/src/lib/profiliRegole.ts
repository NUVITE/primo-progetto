/**
 * Profilo di partenza per tipologia di struttura (dati e funzioni pure): come gestire gli utenti, quali
 * moduli accendere, quali trattamenti offrire. È una proposta: si applica con un clic e poi si cambia
 * voce per voce; non cancella mai dati (un modulo spento o un trattamento disattivato si riaccende).
 * Il modulo "sale" non dipende dalla tipologia (serve a chi ha sale per eventi): il profilo non lo tocca.
 */
import { MODULI, type Modulo } from "@/lib/moduli";
import type { Tipologia } from "@/lib/tipologie";
import { FUNZIONI, type Funzione } from "@/lib/funzioniRegole";

export type Trattamento = { nome: string; colazione: boolean; pranzo: boolean; cena: boolean };

/** Trattamenti che un profilo può chiedere (quelli già presenti nell'hotel si riattivano, gli altri si creano). */
export const TRATTAMENTI_PROFILO: Record<string, Trattamento> = {
  "Solo pernottamento": { nome: "Solo pernottamento", colazione: false, pranzo: false, cena: false },
  "B&B": { nome: "B&B", colazione: true, pranzo: false, cena: false },
  "Mezza pensione": { nome: "Mezza pensione", colazione: true, pranzo: false, cena: true },
  "Pensione completa": { nome: "Pensione completa", colazione: true, pranzo: true, cena: true },
};

export type Profilo = { modalitaUtenti: "titolare" | "ruoli"; moduli: Modulo[]; trattamenti: string[]; funzioniSpente: Funzione[]; descrizione: string };

const { RISTORAZIONE, PULIZIE, MANUTENZIONI, PORTINERIA } = MODULI;

export const PROFILI: Record<Tipologia, Profilo> = {
  albergo: {
    modalitaUtenti: "ruoli",
    moduli: [RISTORAZIONE, PULIZIE, MANUTENZIONI, PORTINERIA],
    trattamenti: ["B&B", "Mezza pensione", "Pensione completa"],
    funzioniSpente: [],
    descrizione: "Più reparti e più persone con ruoli diversi; tutti i moduli operativi.",
  },
  rta: {
    modalitaUtenti: "ruoli",
    moduli: [PULIZIE, MANUTENZIONI, PORTINERIA],
    trattamenti: ["Solo pernottamento", "B&B"],
    funzioniSpente: ["gruppi", "uso_diurno"],
    descrizione: "Unità con angolo cottura: pulizie, manutenzioni e portineria, senza ristorazione.",
  },
  bb: {
    modalitaUtenti: "titolare",
    moduli: [],
    trattamenti: ["B&B"],
    funzioniSpente: ["gruppi", "agenzie", "uso_diurno"],
    descrizione: "Un solo titolare che fa tutto; pernottamento e colazione.",
  },
  affittacamere: {
    modalitaUtenti: "titolare",
    moduli: [],
    trattamenti: ["Solo pernottamento", "B&B"],
    funzioniSpente: ["gruppi", "agenzie", "uso_diurno"],
    descrizione: "Un solo titolare; camere con o senza colazione.",
  },
  casa_vacanze: {
    modalitaUtenti: "titolare",
    moduli: [PULIZIE],
    trattamenti: ["Solo pernottamento"],
    funzioniSpente: ["gruppi", "uso_diurno"],
    descrizione: "Appartamenti senza pasti; si seguono le pulizie fra un soggiorno e l'altro.",
  },
  residence: {
    modalitaUtenti: "ruoli",
    moduli: [PULIZIE, MANUTENZIONI],
    trattamenti: ["Solo pernottamento"],
    funzioniSpente: ["gruppi", "uso_diurno"],
    descrizione: "Appartamenti senza pasti, con personale per pulizie e manutenzioni.",
  },
  casa_per_ferie: {
    modalitaUtenti: "ruoli",
    moduli: [RISTORAZIONE, PULIZIE, MANUTENZIONI],
    trattamenti: ["B&B", "Mezza pensione", "Pensione completa"],
    funzioniSpente: ["uso_diurno"],
    descrizione: "Gruppi e soggiorni con pasti, personale con ruoli.",
  },
  agriturismo: {
    modalitaUtenti: "ruoli",
    moduli: [RISTORAZIONE, PULIZIE],
    trattamenti: ["B&B", "Mezza pensione", "Pensione completa"],
    funzioniSpente: ["uso_diurno"],
    descrizione: "Ospitalità con la cucina dell'azienda agricola.",
  },
};

export type StatoStruttura = { modalitaUtenti: string; moduli: string[]; utenti: number; trattamentiAttivi: string[]; funzioniSpente: string[] };

/**
 * Cosa cambierebbe applicando il profilo: moduli da accendere o spegnere (sale esclusa), modalità
 * utenti (il titolare unico solo con al massimo un utente), trattamenti da attivare o disattivare.
 */
export function differenzeProfilo(stato: StatoStruttura, profilo: Profilo) {
  const daProfilo = new Set<string>(profilo.moduli);
  const gestiti = new Set<string>([RISTORAZIONE, PULIZIE, MANUTENZIONI, PORTINERIA]);
  const moduliDaAccendere = profilo.moduli.filter((m) => !stato.moduli.includes(m));
  const moduliDaSpegnere = stato.moduli.filter((m) => gestiti.has(m) && !daProfilo.has(m));
  const titolareImpossibile = profilo.modalitaUtenti === "titolare" && stato.utenti > 1;
  const modalita = stato.modalitaUtenti !== profilo.modalitaUtenti && !titolareImpossibile ? profilo.modalitaUtenti : null;
  const trattamentiDaAttivare = profilo.trattamenti.filter((t) => !stato.trattamentiAttivi.includes(t));
  const trattamentiDaDisattivare = stato.trattamentiAttivi.filter((t) => !profilo.trattamenti.includes(t));
  const funzioniDaSpegnere = profilo.funzioniSpente.filter((f) => !stato.funzioniSpente.includes(f));
  const funzioniDaAccendere = (Object.keys(FUNZIONI) as Funzione[]).filter((f) => stato.funzioniSpente.includes(f) && !profilo.funzioniSpente.includes(f));
  return {
    moduliDaAccendere,
    moduliDaSpegnere,
    modalita,
    titolareImpossibile,
    trattamentiDaAttivare,
    trattamentiDaDisattivare,
    funzioniDaSpegnere,
    funzioniDaAccendere,
    nessunaModifica:
      !moduliDaAccendere.length &&
      !moduliDaSpegnere.length &&
      !modalita &&
      !trattamentiDaAttivare.length &&
      !trattamentiDaDisattivare.length &&
      !funzioniDaSpegnere.length &&
      !funzioniDaAccendere.length,
  };
}
