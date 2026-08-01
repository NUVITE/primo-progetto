import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatItalianDate, currentTripDayNumber } from "@/lib/trip";
import { nycDay } from "@/lib/nyc";

export default async function ItinerarioPage() {
  const days = await prisma.tripDay.findMany({ orderBy: { dayNumber: "asc" } });
  const today = currentTripDayNumber();

  return (
    <div className="space-y-2.5 p-4">
      <h1 className="px-1 text-[13px] font-extrabold uppercase tracking-widest text-ink-400">
        Itinerario completo · 15 giorni
      </h1>

      {days.map((day) => {
        const isToday = day.dayNumber === today;
        const ny = nycDay(day.dayNumber);
        return (
          <Link
            key={day.id}
            href={`/itinerario/${day.dayNumber}`}
            className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ${
              isToday ? "ring-2 ring-brand-600" : "ring-sand-200"
            }`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl text-white ${
                isToday ? "bg-brand-600" : "bg-brand-800"
              }`}
              style={ny ? { backgroundColor: ny.color } : undefined}
            >
              <span className="text-[15px] font-extrabold leading-none tabular-nums">
                {day.dayNumber}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold capitalize text-ink-400">
                  {formatItalianDate(day.date)}
                </span>
                {isToday && (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                    Oggi
                  </span>
                )}
              </span>
              <span className="block text-[16px] font-bold leading-snug text-ink-900">
                {day.title}
              </span>
              <span className="flex items-center gap-1 text-[13px] text-ink-400">
                <MapPin size={12} strokeWidth={2.4} />
                {day.location}
              </span>
            </span>

            <ChevronRight size={20} strokeWidth={2.4} className="shrink-0 text-sand-300" />
          </Link>
        );
      })}
    </div>
  );
}
