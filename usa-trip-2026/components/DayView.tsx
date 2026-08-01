import {
  BedDouble,
  Bus,
  Car,
  Footprints,
  Luggage,
  MapPin,
  Paperclip,
  Plane,
  Shirt,
  TrainFront,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { googleMapsUrl, formatItalianDate } from "@/lib/trip";
import { nycDay } from "@/lib/nyc";
import { EditActivityForm } from "@/components/EditActivityForm";
import type { Activity, MealSuggestion, TripDay } from "@/app/generated/prisma/client";

type FullDay = TripDay & { activities: Activity[]; meals: MealSuggestion[] };

/** Sceglie l'icona giusta in base al mezzo di trasporto descritto a parole. */
function transportIcon(mode: string) {
  const m = mode.toLowerCase();
  if (m.includes("piedi")) return Footprints;
  if (m.includes("metro")) return TrainFront;
  if (m.includes("uber") || m.includes("taxi") || m.includes("lyft")) return Car;
  if (m.includes("navetta") || m.includes("transfer") || m.includes("pullman")) return Bus;
  if (m.includes("volo") || m.includes("aereo")) return Plane;
  return Footprints;
}

function InfoBar({
  Icon,
  tone,
  children,
}: {
  Icon: React.ElementType;
  tone: "sand" | "clay" | "brand";
  children: React.ReactNode;
}) {
  const tones = {
    sand: "bg-sand-100 text-ink-600",
    clay: "bg-clay-50 text-clay-700",
    brand: "bg-brand-50 text-brand-800",
  };
  return (
    <div className={`mt-3 flex gap-2.5 rounded-xl px-3.5 py-3 text-[15px] ${tones[tone]}`}>
      <Icon size={18} className="mt-0.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      <p className="leading-snug">{children}</p>
    </div>
  );
}

export function DayView({ day, editable = false }: { day: FullDay; editable?: boolean }) {
  const ny = nycDay(day.dayNumber);

  return (
    <div className="space-y-3.5">
      {/* Intestazione della giornata */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sand-200">
        <div className="bg-brand-800 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[13px] font-bold tabular-nums">
              Giorno {day.dayNumber}
            </span>
            <span className="text-[13px] font-medium text-brand-100">
              {formatItalianDate(day.date)}
            </span>
          </div>
          <h2 className="mt-2 text-[21px] font-extrabold leading-tight tracking-tight">
            {day.title}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-[14px] font-medium text-brand-200">
            <MapPin size={14} strokeWidth={2.4} aria-hidden="true" />
            {day.location}
          </p>
        </div>

        <div className="px-5 pb-5 pt-4">
          {day.hotelName && (
            <a
              href={googleMapsUrl(day.hotelInfo ?? day.hotelName)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2.5 rounded-xl bg-sand-100 px-3.5 py-3"
            >
              <BedDouble size={18} className="mt-0.5 shrink-0 text-ink-500" strokeWidth={2} />
              <span className="min-w-0">
                <span className="block font-bold text-ink-900">{day.hotelName}</span>
                {day.hotelInfo && (
                  <span className="block text-[14px] leading-snug text-ink-500">
                    {day.hotelInfo}
                  </span>
                )}
              </span>
            </a>
          )}

          {day.luggageNote && (
            <InfoBar Icon={Luggage} tone="clay">
              {day.luggageNote}
            </InfoBar>
          )}

          {day.summary && (
            <p className="mt-3.5 text-[15px] leading-relaxed text-ink-600">{day.summary}</p>
          )}

          {day.dressCode && (
            <InfoBar Icon={Shirt} tone="brand">
              {day.dressCode}
            </InfoBar>
          )}

          {ny && (
            <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-dashed border-sand-300 px-3.5 py-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-4"
                style={{ backgroundColor: ny.color, ["--tw-ring-color" as string]: ny.colorSoft }}
              />
              <p className="text-[14px] leading-snug text-ink-600">
                <span className="font-bold text-ink-900">Colore di oggi sulla mappa.</span>{" "}
                {ny.base}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Timeline delle attività */}
      {day.activities.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand-200">
          <ol className="relative">
            {/* linea verticale continua della timeline */}
            <span
              className="absolute left-[7px] top-2 bottom-2 w-px bg-sand-200"
              aria-hidden="true"
            />
            {day.activities.map((a) => {
              const TransportIcon = a.transportMode ? transportIcon(a.transportMode) : null;
              return (
                <li key={a.id} className="relative pl-6 pb-6 last:pb-0">
                  <span
                    className="absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-[3px] border-white bg-brand-600 ring-1 ring-sand-300"
                    aria-hidden="true"
                  />
                  {a.time && (
                    <p className="text-[13px] font-extrabold uppercase tracking-wide text-brand-600 tabular-nums">
                      {a.time}
                    </p>
                  )}
                  <p className="mt-0.5 text-[17px] font-bold leading-snug text-ink-900">
                    {a.title}
                  </p>

                  {(a.zone || TransportIcon || a.cost) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {a.zone && (
                        <span className="rounded-full bg-sand-100 px-2.5 py-1 text-[12px] font-bold capitalize text-ink-600">
                          {a.zone}
                        </span>
                      )}
                      {TransportIcon && a.transportMode && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-bold text-brand-700">
                          <TransportIcon size={13} strokeWidth={2.4} aria-hidden="true" />
                          {a.transportMode}
                        </span>
                      )}
                      {a.cost && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-50 px-2.5 py-1 text-[12px] font-bold text-clay-700">
                          <Wallet size={13} strokeWidth={2.4} aria-hidden="true" />
                          {a.cost}
                        </span>
                      )}
                    </div>
                  )}

                  {a.requiresDocument && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-clay-50 px-2.5 py-1.5 text-[13px] font-bold text-clay-700">
                      <Paperclip size={14} strokeWidth={2.4} aria-hidden="true" />
                      {a.requiresDocument}
                    </p>
                  )}

                  {a.notes && (
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-500">{a.notes}</p>
                  )}

                  {(a.address || a.mapsQuery) && (
                    <a
                      href={googleMapsUrl(a.mapsQuery ?? a.address ?? a.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-[13px] font-bold text-white"
                    >
                      <MapPin size={14} strokeWidth={2.4} aria-hidden="true" />
                      Apri in Maps
                    </a>
                  )}

                  {editable && <EditActivityForm activity={a} />}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Dove mangiare */}
      {day.meals.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand-200">
          <h3 className="flex items-center gap-2 text-[16px] font-extrabold text-ink-900">
            <UtensilsCrossed size={18} strokeWidth={2.2} className="text-clay-600" />
            Dove mangiare
          </h3>
          <ul className="mt-3 space-y-3">
            {day.meals.map((m) => (
              <li key={m.id} className="border-l-2 border-sand-200 pl-3">
                <p className="font-bold text-ink-900">
                  {m.name}
                  {m.priceTier && (
                    <span className="ml-1.5 text-[13px] font-bold text-clay-600">
                      {m.priceTier}
                    </span>
                  )}
                </p>
                {m.address && <p className="text-[14px] text-ink-400">{m.address}</p>}
                {m.note && <p className="text-[14px] leading-snug text-ink-500">{m.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
