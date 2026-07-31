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
