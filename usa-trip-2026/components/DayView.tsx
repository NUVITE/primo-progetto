import { googleMapsUrl, formatItalianDate } from "@/lib/trip";
import { EditActivityForm } from "@/components/EditActivityForm";
import type { Activity, MealSuggestion, TripDay } from "@/app/generated/prisma/client";

type FullDay = TripDay & { activities: Activity[]; meals: MealSuggestion[] };

export function DayView({ day, editable = false }: { day: FullDay; editable?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-sky-600 uppercase tracking-wide">
          Giorno {day.dayNumber} · {formatItalianDate(day.date)}
        </p>
        <h2 className="text-lg font-bold text-slate-900 mt-0.5">{day.title}</h2>
        <p className="text-sm text-slate-500">{day.location}</p>

        {day.hotelName && (
          <div className="mt-3 text-sm bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-slate-800">🏨 {day.hotelName}</p>
            {day.hotelInfo && <p className="text-slate-500 mt-0.5">{day.hotelInfo}</p>}
          </div>
        )}

        {day.luggageNote && (
          <p className="mt-3 text-sm bg-amber-50 text-amber-800 rounded-lg p-3">🧳 {day.luggageNote}</p>
        )}

        {day.summary && <p className="mt-3 text-sm text-slate-700">{day.summary}</p>}

        {day.dressCode && (
          <p className="mt-3 text-sm bg-sky-50 text-sky-800 rounded-lg p-3">👕 {day.dressCode}</p>
        )}
      </div>

      {day.activities.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {day.activities.map((a) => (
            <div key={a.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-sm font-semibold text-slate-500 w-14 shrink-0">{a.time ?? ""}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {a.zone && (
                      <span className="bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{a.zone}</span>
                    )}
                    {a.transportMode && (
                      <span className="bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                        🚶 {a.transportMode}
                      </span>
                    )}
                    {a.cost && (
                      <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">{a.cost}</span>
                    )}
                  </div>
                  {a.requiresDocument && (
                    <p className="mt-1.5 text-xs text-rose-700 bg-rose-50 rounded-lg px-2 py-1 inline-block">
                      📎 {a.requiresDocument}
                    </p>
                  )}
                  {a.notes && <p className="mt-1.5 text-sm text-slate-600">{a.notes}</p>}
                  {(a.address || a.mapsQuery) && (
                    <a
                      href={googleMapsUrl(a.mapsQuery ?? a.address ?? a.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-sky-600 font-medium"
                    >
                      📍 Apri in Google Maps
                    </a>
                  )}
                  {editable && <EditActivityForm activity={a} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {day.meals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="font-semibold text-slate-900 mb-2">🍽️ Dove mangiare</p>
          <ul className="space-y-2">
            {day.meals.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="font-medium text-slate-800">{m.name}</span>{" "}
                {m.priceTier && <span className="text-slate-400">{m.priceTier}</span>}
                {m.address && <p className="text-slate-500">{m.address}</p>}
                {m.note && <p className="text-slate-600">{m.note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
