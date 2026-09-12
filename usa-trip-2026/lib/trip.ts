export const TRIP_START = new Date("2026-08-09T00:00:00");
export const TRIP_END = new Date("2026-08-23T00:00:00");
export const TOTAL_DAYS = 15;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Numero di giorno del viaggio (1-15) corrispondente a "oggi", o null se il viaggio non è in corso. */
export function currentTripDayNumber(now: Date = new Date()): number | null {
  const today = startOfDay(now);
  const start = startOfDay(TRIP_START);
  const diffDays = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  const dayNumber = diffDays + 1;
  if (dayNumber < 1 || dayNumber > TOTAL_DAYS) return null;
  return dayNumber;
}

export function daysUntilTrip(now: Date = new Date()): number {
  const today = startOfDay(now);
  const start = startOfDay(TRIP_START);
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

const WEEKDAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MONTHS = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

export function formatItalianDate(d: Date): string {
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function googleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Fuso orario di ogni giornata. Si usano i nomi IANA e non l'offset fisso,
 * cosi' l'ora legale la calcola il telefono: l'Arizona per esempio non la fa,
 * mentre lo Utah e la Nazione Navajo si'.
 */
export const DAY_TIMEZONE: Record<number, { zone: string; place: string }> = {
  1: { zone: "America/Los_Angeles", place: "Los Angeles" },
  2: { zone: "America/Los_Angeles", place: "Los Angeles" },
  3: { zone: "America/Los_Angeles", place: "Los Angeles" },
  4: { zone: "America/Los_Angeles", place: "Las Vegas" },
  5: { zone: "America/Phoenix", place: "Grand Canyon" },
  6: { zone: "America/Phoenix", place: "Page" },
  7: { zone: "America/Denver", place: "Bryce Canyon" },
  8: { zone: "America/Los_Angeles", place: "Las Vegas" },
  9: { zone: "America/Los_Angeles", place: "Las Vegas" },
  10: { zone: "America/New_York", place: "New York" },
  11: { zone: "America/New_York", place: "New York" },
  12: { zone: "America/New_York", place: "New York" },
  13: { zone: "America/New_York", place: "New York" },
  14: { zone: "America/New_York", place: "New York" },
  15: { zone: "Europe/Rome", place: "Bari" },
};

export const ITALY_ZONE = "Europe/Rome";
