/**
 * Colori per zona di New York, sullo stesso principio della mappa cartacea che
 * l'agenzia ha mostrato dal vivo: ogni giornata ha un colore e le zone che si
 * visitano quel giorno vengono evidenziate con quel colore.
 */

export type ZoneId = "midtown" | "lower" | "uptown" | "brooklyn" | "queens";

export const ZONES: Record<ZoneId, { label: string; description: string }> = {
  midtown: {
    label: "Midtown",
    description: "Il centro: il vostro hotel, Times Square, Empire State, Rockefeller.",
  },
  lower: {
    label: "Downtown / Lower Manhattan",
    description: "La punta sud: Wall Street, 9/11, battello per la Statua della Libertà.",
  },
  uptown: {
    label: "Uptown",
    description: "Sopra Central Park: museo di Storia Naturale, MET, Upper East Side.",
  },
  brooklyn: {
    label: "Brooklyn",
    description: "Oltre l'East River a sud-est: Dumbo, il ponte, Brooklyn Heights.",
  },
  queens: {
    label: "Queens",
    description: "Oltre l'East River a est: Long Island City, Gantry Plaza, Roosevelt Island.",
  },
};

export interface NycDay {
  dayNumber: number;
  date: string;
  color: string;
  colorSoft: string;
  label: string;
  zones: ZoneId[];
  base: string;
}

/** I 5 giorni di New York, ognuno col suo colore, come la mappa dell'agenzia. */
export const NYC_DAYS: NycDay[] = [
  {
    dayNumber: 10,
    date: "Mar 18 ago",
    color: "#d97706",
    colorSoft: "#fde9c8",
    label: "Arrivo, MoMA e Hudson Yards",
    zones: ["midtown"],
    base: "Tutto a piedi o con la linea E. Non uscite mai da Midtown/West Side.",
  },
  {
    dayNumber: 11,
    date: "Mer 19 ago",
    color: "#be123c",
    colorSoft: "#fbd9e1",
    label: "Tour dei Contrasti e Brooklyn",
    zones: ["brooklyn", "lower"],
    base: "In pullman col tour fino a Dumbo, poi a piedi sul ponte di Brooklyn verso Lower Manhattan.",
  },
  {
    dayNumber: 12,
    date: "Gio 20 ago",
    color: "#7c3aed",
    colorSoft: "#e6dcfb",
    label: "Statua della Libertà, 9/11, Top of the Rock",
    zones: ["lower", "midtown"],
    base: "Metro linea 1 fino in fondo a sud, si risale a Midtown solo la sera.",
  },
  {
    dayNumber: 13,
    date: "Ven 21 ago",
    color: "#047857",
    colorSoft: "#cfeae0",
    label: "Natural History, Central Park, Queens",
    zones: ["uptown", "queens", "midtown"],
    base: "Si sale a Uptown con la linea C, si scende a piedi nel parco, la sera linea 7 nel Queens.",
  },
  {
    dayNumber: 14,
    date: "Sab 22 ago",
    color: "#0369a1",
    colorSoft: "#cfe4f2",
    label: "Ultima mattina e partenza",
    zones: ["midtown"],
    base: "Tutto a piedi intorno all'hotel: Times Square, Bryant Park, Grand Central.",
  },
];

export function nycDay(dayNumber: number): NycDay | undefined {
  return NYC_DAYS.find((d) => d.dayNumber === dayNumber);
}

/** Estrae la zona canonica da un testo libero tipo "brooklyn/lower" o "queens". */
export function parseZone(raw: string | null | undefined): ZoneId | null {
  if (!raw) return null;
  const first = raw.toLowerCase().split(/[\/\s]/)[0].trim();
  return first in ZONES ? (first as ZoneId) : null;
}
