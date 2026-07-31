import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatItalianDate } from "@/lib/trip";

export default async function ItinerarioPage() {
  const days = await prisma.tripDay.findMany({ orderBy: { dayNumber: "asc" } });

  return (
    <div className="p-4 space-y-2">
      <p className="px-1 text-sm font-semibold text-slate-500 uppercase tracking-wide">
        Itinerario completo — 15 giorni
      </p>
      {days.map((day) => (
        <Link
          key={day.id}
          href={`/itinerario/${day.dayNumber}`}
          className="block bg-white rounded-xl border border-slate-200 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-sky-600 font-medium">
                Giorno {day.dayNumber} · {formatItalianDate(day.date)}
              </p>
              <p className="font-medium text-slate-900">{day.title}</p>
              <p className="text-sm text-slate-500">{day.location}</p>
            </div>
            <span className="text-slate-300">→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
