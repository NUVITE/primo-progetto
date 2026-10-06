import { BellRing, ConciergeBell, Contact, Settings, ShieldCheck, Sparkles, Utensils, type LucideIcon } from "lucide-react";
import type { Modulo } from "@/lib/moduli";
import { PERMESSI, type Permesso } from "@/lib/permessi";

/**
 * Struttura del menu laterale: unica fonte per desktop e telefono. Una voce compare solo se
 * l'utente ha il permesso (o è superadmin per il gruppo Piattaforma); un gruppo senza voci
 * visibili sparisce. Le funzioni non ancora sviluppate NON si elencano (niente pagine vuote).
 * Il vero controllo d'accesso resta comunque lato server, in ogni pagina/azione.
 */
// permesso: uno solo o un elenco (basta averne uno).
export type VoceMenu = { href: string; label: string; permesso?: Permesso | Permesso[]; modulo?: Modulo };
export type GruppoMenu = { id: string; label: string; icona: LucideIcon; voci: VoceMenu[]; soloSuperAdmin?: boolean };

export const MENU: GruppoMenu[] = [
  {
    id: "ricevimento",
    label: "Ricevimento",
    icona: ConciergeBell,
    voci: [
      { href: "/", label: "Planning camere", permesso: PERMESSI.PRENOTAZIONI_VEDI },
      { href: "/prenotazioni", label: "Prenotazioni", permesso: PERMESSI.PRENOTAZIONI_VEDI },
      { href: "/preventivi", label: "Richieste e preventivi", permesso: PERMESSI.PRENOTAZIONI_GESTISCI },
      { href: "/questionari", label: "Questionari e ringraziamenti", permesso: PERMESSI.QUESTIONARI_VEDI },
      { href: "/addebiti", label: "Addebiti dei reparti", permesso: PERMESSI.ADDEBITI_REGISTRA },
      { href: "/conti", label: "Conti aperti e sospesi", permesso: PERMESSI.PAGAMENTI_REGISTRA },
      { href: "/cassa", label: "Cassa e chiusura del giorno", permesso: PERMESSI.CASSA_CHIUDI },
      { href: "/giornale", label: "Giornale d'albergo", permesso: [PERMESSI.CASSA_CHIUDI, PERMESSI.PAGAMENTI_REGISTRA] },
      { href: "/schedine", label: "Schedine Polizia", permesso: PERMESSI.ADEMPIMENTI_INVIA },
      { href: "/istat", label: "ISTAT movimento turistico", permesso: PERMESSI.ADEMPIMENTI_INVIA },
      { href: "/rendiconto-tassa", label: "Rendiconto tassa di soggiorno", permesso: PERMESSI.ADEMPIMENTI_INVIA },
      { href: "/sale/planning", label: "Planning sale", permesso: PERMESSI.SALE_VEDI, modulo: "sale" },
      { href: "/sale/prenotazioni", label: "Prenotazioni sale", permesso: PERMESSI.SALE_VEDI, modulo: "sale" },
      { href: "/tassa-soggiorno", label: "Regole tassa di soggiorno", permesso: PERMESSI.PRENOTAZIONI_VEDI },
    ],
  },
  {
    id: "portineria",
    label: "Portineria",
    icona: BellRing,
    voci: [
      { href: "/portineria/agenda", label: "Agenda e sveglie", permesso: PERMESSI.PORTINERIA, modulo: "portineria" },
      { href: "/portineria/messaggi", label: "Messaggi e posta", permesso: PERMESSI.PORTINERIA, modulo: "portineria" },
      { href: "/portineria/custodia", label: "Bagagli, valori e chiavi", permesso: PERMESSI.PORTINERIA, modulo: "portineria" },
      { href: "/portineria/consegne", label: "Consegne fra turni", permesso: PERMESSI.PORTINERIA, modulo: "portineria" },
      { href: "/portineria/reclami", label: "Reclami", permesso: PERMESSI.RECLAMI, modulo: "portineria" },
    ],
  },
  {
    id: "piani",
    label: "Piani e manutenzioni",
    icona: Sparkles,
    voci: [
      { href: "/pulizie", label: "Stato camere", permesso: PERMESSI.CAMERE_STATO_VEDI, modulo: "pulizie" },
      { href: "/pulizie/foglio", label: "Foglio dei piani", permesso: PERMESSI.PULIZIE_GESTISCI, modulo: "pulizie" },
      { href: "/pulizie/mie", label: "Le mie camere", permesso: PERMESSI.PULIZIE_MIE, modulo: "pulizie" },
      { href: "/manutenzioni", label: "Manutenzioni", permesso: PERMESSI.GUASTI_SEGNALA, modulo: "manutenzioni" },
      { href: "/richieste", label: "Richieste degli ospiti", permesso: PERMESSI.CAMERE_STATO_VEDI, modulo: "pulizie" },
      { href: "/oggetti-smarriti", label: "Oggetti smarriti", permesso: PERMESSI.OGGETTI_SMARRITI, modulo: "pulizie" },
    ],
  },
  {
    id: "ristorazione",
    label: "Ristorazione",
    icona: Utensils,
    voci: [
      { href: "/ristorazione/foglio", label: "Foglio del giorno", permesso: PERMESSI.FOGLIO_PASTI, modulo: "ristorazione" },
      { href: "/ristorazione/ordini", label: "Room service", permesso: PERMESSI.ROOM_SERVICE, modulo: "ristorazione" },
      { href: "/ristorazione/menu", label: "Menu", permesso: PERMESSI.MENU_GESTISCI, modulo: "ristorazione" },
      { href: "/ristorazione/piatti", label: "Piatti e allergeni", permesso: PERMESSI.MENU_GESTISCI, modulo: "ristorazione" },
    ],
  },
  {
    id: "anagrafiche",
    label: "Anagrafiche",
    icona: Contact,
    voci: [
      { href: "/ospiti", label: "Ospiti", permesso: PERMESSI.PRENOTAZIONI_GESTISCI },
      { href: "/clienti", label: "Clienti e aziende", permesso: [PERMESSI.PRENOTAZIONI_GESTISCI, PERMESSI.SALE_GESTISCI] },
      { href: "/agenzie", label: "Agenzie e allotment", permesso: [PERMESSI.LISTINI_GESTISCI, PERMESSI.PAGAMENTI_REGISTRA] },
      { href: "/servizi", label: "Servizi", permesso: PERMESSI.LISTINI_GESTISCI },
    ],
  },
  {
    id: "impostazioni",
    label: "Impostazioni",
    icona: Settings,
    voci: [
      { href: "/impostazioni/struttura", label: "Struttura", permesso: PERMESSI.HOTEL_CONFIGURA },
      { href: "/camere/gestione", label: "Camere", permesso: PERMESSI.CAMERE_GESTISCI },
      { href: "/impostazioni/listini", label: "Listini e tariffe", permesso: PERMESSI.LISTINI_GESTISCI },
      { href: "/impostazioni/politiche", label: "Politiche di cancellazione", permesso: PERMESSI.LISTINI_GESTISCI },
      { href: "/impostazioni/reparti", label: "Reparti e IVA", permesso: PERMESSI.HOTEL_CONFIGURA },
      { href: "/impostazioni/email", label: "Email e modelli", permesso: PERMESSI.HOTEL_CONFIGURA },
      { href: "/impostazioni/trattamenti", label: "Trattamenti", permesso: PERMESSI.HOTEL_CONFIGURA },
      { href: "/impostazioni/adempimenti", label: "Adempimenti (Polizia, ISTAT)", permesso: PERMESSI.HOTEL_CONFIGURA },
      { href: "/impostazioni/sale", label: "Sale e fasce orarie", permesso: PERMESSI.SALE_CONFIGURA, modulo: "sale" },
      { href: "/utenti", label: "Utenti", permesso: PERMESSI.UTENTI_GESTISCI },
      { href: "/ruoli", label: "Ruoli", permesso: PERMESSI.RUOLI_GESTISCI },
    ],
  },
  {
    id: "piattaforma",
    label: "Piattaforma",
    icona: ShieldCheck,
    soloSuperAdmin: true,
    voci: [
      { href: "/piattaforma/hotel", label: "Hotel" },
      { href: "/piattaforma/tassa", label: "Tassa di soggiorno" },
      { href: "/piattaforma/tabelle-polizia", label: "Tabelle Polizia" },
    ],
  },
];

export function menuVisibile(permessi: Permesso[], superAdmin: boolean, moduli: Modulo[]): GruppoMenu[] {
  return MENU.filter((g) => !g.soloSuperAdmin || superAdmin)
    .map((g) => ({
      ...g,
      voci: g.voci.filter((v) => (!v.permesso || [v.permesso].flat().some((p) => permessi.includes(p))) && (!v.modulo || moduli.includes(v.modulo))),
    }))
    .filter((g) => g.voci.length > 0);
}

export function voceAttiva(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** Preferenze della barra, salvate in cookie così il server rende già la versione giusta. */
export type PreferenzeBarra = { tema: "scuro" | "chiaro"; compatta: boolean; chiusi: string[] };
export const COOKIE_BARRA = "hotelweb_barra";

export function leggiPreferenzeBarra(valore: string | undefined): PreferenzeBarra {
  const predefinite: PreferenzeBarra = { tema: "scuro", compatta: false, chiusi: [] };
  if (!valore) return predefinite;
  try {
    const p = JSON.parse(valore);
    return {
      tema: p.tema === "chiaro" ? "chiaro" : "scuro",
      compatta: p.compatta === true,
      chiusi: Array.isArray(p.chiusi) ? p.chiusi.filter((x: unknown) => typeof x === "string") : [],
    };
  } catch {
    return predefinite;
  }
}
