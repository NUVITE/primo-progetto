/**
 * Le giornate di New York sulla mappa, sullo stesso principio della mappa
 * cartacea che l'agenzia ha mostrato dal vivo: ogni giornata ha un colore, e il
 * percorso di quel giorno viene tracciato sulla mappa con quel colore.
 */

export interface NycStop {
  name: string;
  lat: number;
  lng: number;
  time?: string;
  note?: string;
}

export interface NycDay {
  dayNumber: number;
  date: string;
  color: string;
  colorSoft: string;
  label: string;
  base: string;
  stops: NycStop[];
}

export const HOTEL: NycStop = {
  name: "Hotel Riu Plaza Times Square",
  lat: 40.7596,
  lng: -73.9877,
  note: "305 West 46th Street — il vostro punto di riferimento",
};

export const NYC_DAYS: NycDay[] = [
  {
    dayNumber: 10,
    date: "Mar 18 ago",
    color: "#d97706",
    colorSoft: "#fde9c8",
    label: "Arrivo, MoMA e Hudson Yards",
    base: "Tutto a piedi o con la linea E, sempre nella parte centrale della città.",
    stops: [
      { name: "Hotel Riu Plaza", lat: 40.7596, lng: -73.9877, time: "08:15", note: "Deposito bagagli" },
      { name: "MoMA", lat: 40.7614, lng: -73.9776, time: "10:30", note: "11 W 53rd St — 15 min a piedi" },
      { name: "Hudson Yards / Vessel", lat: 40.7538, lng: -74.0021, time: "13:30", note: "Metro linea E" },
      { name: "The High Line", lat: 40.756, lng: -74.0043, time: "14:15", note: "Si cammina verso sud" },
      { name: "Chelsea Market", lat: 40.7424, lng: -74.0061, time: "15:00", note: "Pranzo" },
      { name: "Little Island", lat: 40.742, lng: -74.0106, time: "16:00" },
      { name: "Flatiron Building", lat: 40.7411, lng: -73.9897, time: "17:30" },
      { name: "Empire State Building", lat: 40.7484, lng: -73.9857, time: "19:30", note: "CityPASS, già prenotato" },
      { name: "230 Fifth Rooftop", lat: 40.7445, lng: -73.9877, time: "21:00" },
    ],
  },
  {
    dayNumber: 11,
    date: "Mer 19 ago",
    color: "#be123c",
    colorSoft: "#fbd9e1",
    label: "Tour dei Contrasti e Brooklyn",
    base: "In pullman col tour fino a Dumbo, poi a piedi sul ponte di Brooklyn.",
    stops: [
      { name: "Hotel Riu Plaza", lat: 40.7596, lng: -73.9877, time: "08:30" },
      { name: "Yankee Stadium (Bronx)", lat: 40.8296, lng: -73.9262, time: "09:30", note: "Col tour guidato" },
      { name: "Arthur Avenue", lat: 40.8544, lng: -73.8869, time: "10:30", note: "La vera Little Italy" },
      { name: "Astoria (Queens)", lat: 40.7644, lng: -73.923, time: "12:00" },
      { name: "Dumbo", lat: 40.7033, lng: -73.9895, time: "14:00", note: "Fine tour — da qui autonomi" },
      { name: "Granite Prospect", lat: 40.7016, lng: -73.9962, time: "14:30", note: "Brooklyn Bridge Park" },
      { name: "Brooklyn Heights Promenade", lat: 40.696, lng: -73.9967, time: "15:15" },
      { name: "Ponte di Brooklyn", lat: 40.704, lng: -73.9903, time: "16:00", note: "35 min a piedi verso Manhattan" },
      { name: "Ghostbusters HQ", lat: 40.7195, lng: -74.0067, time: "17:00", note: "14 N Moore St, Tribeca" },
      { name: "SoHo", lat: 40.724, lng: -74.002, time: "17:45" },
      { name: "Olio e Più", lat: 40.735, lng: -74.0, time: "20:00", note: "Cena — Greenwich Village" },
    ],
  },
  {
    dayNumber: 12,
    date: "Gio 20 ago",
    color: "#7c3aed",
    colorSoft: "#e6dcfb",
    label: "Statua della Libertà, 9/11, Top of the Rock",
    base: "Metro linea 1 fino in fondo a sud; si risale in centro solo la sera.",
    stops: [
      { name: "Hotel Riu Plaza", lat: 40.7596, lng: -73.9877, time: "08:15" },
      { name: "Battery Park", lat: 40.7033, lng: -74.017, time: "08:50", note: "Controlli di sicurezza" },
      { name: "Statua della Libertà", lat: 40.6892, lng: -74.0445, time: "09:45", note: "CityPASS" },
      { name: "Ellis Island", lat: 40.6995, lng: -74.0396, time: "11:30" },
      { name: "9/11 Memorial & Museum", lat: 40.7115, lng: -74.0134, time: "14:30", note: "CityPASS" },
      { name: "Oculus", lat: 40.7118, lng: -74.0104, time: "16:30" },
      { name: "Wall Street", lat: 40.7069, lng: -74.0113, time: "17:00" },
      { name: "South Street Seaport", lat: 40.7061, lng: -74.0027, time: "17:30" },
      { name: "Katz's Delicatessen", lat: 40.7223, lng: -73.9874, time: "18:00", note: "Il pastrami" },
      { name: "Top of the Rock", lat: 40.7593, lng: -73.9794, time: "20:00", note: "CityPASS, al tramonto" },
      { name: "Ellen's Stardust Diner", lat: 40.7614, lng: -73.984, time: "21:30", note: "Cena" },
    ],
  },
  {
    dayNumber: 13,
    date: "Ven 21 ago",
    color: "#047857",
    colorSoft: "#cfeae0",
    label: "Natural History, Central Park, Queens",
    base: "Si sale a nord con la linea C, si attraversa il parco a piedi, la sera linea 7 nel Queens.",
    stops: [
      { name: "Hotel Riu Plaza", lat: 40.7596, lng: -73.9877, time: "09:15" },
      { name: "Natural History Museum", lat: 40.7813, lng: -73.974, time: "10:00", note: "CityPASS" },
      { name: "Central Park", lat: 40.774, lng: -73.9709, time: "12:00", note: "Bethesda Terrace" },
      { name: "MET Museum", lat: 40.7794, lng: -73.9632, time: "14:00", note: "Non incluso, ~30$" },
      { name: "Upper East Side", lat: 40.7736, lng: -73.9639, time: "15:00", note: "Madison Avenue" },
      { name: "Gantry Plaza State Park", lat: 40.747, lng: -73.958, time: "19:00", note: "Tramonto sullo skyline" },
      { name: "Roosevelt Island", lat: 40.7497, lng: -73.959, time: "21:00", note: "Traghetto o funivia" },
      { name: "The Dickens", lat: 40.76, lng: -73.987, time: "21:30", note: "Ultima sera" },
    ],
  },
  {
    dayNumber: 14,
    date: "Sab 22 ago",
    color: "#0369a1",
    colorSoft: "#cfe4f2",
    label: "Ultima mattina e partenza",
    base: "Tutto a piedi attorno all'hotel, con calma.",
    stops: [
      { name: "Times Square", lat: 40.758, lng: -73.9855, time: "08:15", note: "Vuota di prima mattina" },
      { name: "Bryant Park", lat: 40.7536, lng: -73.9832, time: "08:45", note: "E la biblioteca pubblica" },
      { name: "Rockefeller Center", lat: 40.7587, lng: -73.9787, time: "09:30" },
      { name: "St. Patrick's Cathedral", lat: 40.7585, lng: -73.976, time: "09:50" },
      { name: "Grand Central Terminal", lat: 40.7527, lng: -73.9772, time: "10:15", note: "La galleria dei sussurri" },
      { name: "Hotel Riu Plaza", lat: 40.7596, lng: -73.9877, time: "11:00", note: "Check-out e transfer" },
    ],
  },
];

export function nycDay(dayNumber: number): NycDay | undefined {
  return NYC_DAYS.find((d) => d.dayNumber === dayNumber);
}

/** Riquadro che contiene tutte le tappe, per il precaricamento delle mappe. */
export const NYC_BOUNDS = {
  south: 40.68,
  north: 40.86,
  west: -74.05,
  east: -73.88,
};
