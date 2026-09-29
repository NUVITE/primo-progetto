import { ConciergeBell, Contact, Settings, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Modulo } from "@/lib/moduli";
import { PERMESSI, type Permesso } from "@/lib/permessi";

/**
 * Struttura del menu laterale: unica fonte per desktop e telefono. Una voce compare solo se
 * l'utente ha il permesso (o è superadmin per il gruppo Piattaforma); un gruppo senza voci
 * visibili sparisce. Le funzioni non ancora sviluppate NON si elencano (niente pagine vuote).
 * Il vero controllo d'accesso resta comunque lato server, in ogni pagina/azione.
 */
export type VoceMenu = { href: string; label: string; permesso?: Permesso; modulo?: Modulo };
export type GruppoMenu = { id: string; label: string; icona: LucideIcon; voci: VoceMenu[]; soloSuperAdmin?: boolean };

export const MENU: GruppoMenu[] = [
  {
    id: "ricevimento",
    label: "Ricevimento",
    icona: ConciergeBell,
    voci: [
      { href: "/", label: "Planning camere", permesso: PERMESSI.PRENOTAZIONI_VEDI },
      { href: "/prenotazioni", label: "Prenotazioni", permesso: PERMESSI.PRENOTAZIONI_VEDI },
      { href: "/tassa-soggiorno", label: "Regole tassa di soggiorno", permesso: PERMESSI.PRENOTAZIONI_VEDI },
    ],
  },
  {
    id: "anagrafiche",
    label: "Anagrafiche",
    icona: Contact,
    voci: [{ href: "/servizi", label: "Servizi", permesso: PERMESSI.LISTINI_GESTISCI }],
  },
  {
    id: "impostazioni",
    label: "Impostazioni",
    icona: Settings,
    voci: [
      { href: "/impostazioni/struttura", label: "Struttura", permesso: PERMESSI.HOTEL_CONFIGURA },
      { href: "/camere/gestione", label: "Camere", permesso: PERMESSI.CAMERE_GESTISCI },
      { href: "/impostazioni/listini", label: "Listini e tariffe", permesso: PERMESSI.LISTINI_GESTISCI },
      { href: "/impostazioni/trattamenti", label: "Trattamenti", permesso: PERMESSI.HOTEL_CONFIGURA },
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
      voci: g.voci.filter((v) => (!v.permesso || permessi.includes(v.permesso)) && (!v.modulo || moduli.includes(v.modulo))),
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
