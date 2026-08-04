"use client";

import { useState } from "react";
import {
  Clapperboard,
  ExternalLink,
  Eye,
  LayoutGrid,
  MapPin,
  ShoppingCart,
  TriangleAlert,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { googleMapsUrl, formatItalianDate } from "@/lib/trip";
import type { Suggestion, TripDay } from "@/app/generated/prisma/client";

export type IdeaConGiorno = Suggestion & {
  tripDay: Pick<TripDay, "dayNumber" | "date" | "location">;
};

const FILTRI = [
  { id: "tutte", label: "Tutte", Icon: LayoutGrid },
  { id: "mangiare", label: "Mangiare", Icon: UtensilsCrossed },
  { id: "pratico", label: "Pratiche", Icon: ShoppingCart },
  { id: "vedere", label: "Da vedere", Icon: Eye },
  { id: "film", label: "Film", Icon: Clapperboard },
  { id: "ragazzi", label: "Ragazzi", Icon: Users },
];

export function ElencoIdee({ idee }: { idee: IdeaConGiorno[] }) {
  const [filtro, setFiltro] = useState("tutte");

  const visibili = filtro === "tutte" ? idee : idee.filter((i) => i.category === filtro);

  return (
    <div className="space-y-3">
      {/* Filtri per categoria */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTRI.map((f) => {
          const attivo = f.id === filtro;
          const quante = f.id === "tutte" ? idee.length : idee.filter((i) => i.category === f.id).length;
          if (quante === 0) return null;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              aria-pressed={attivo}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-colors ${
                attivo
                  ? "bg-clay-600 text-white shadow-sm"
                  : "bg-white text-ink-500 ring-1 ring-sand-200"
              }`}
            >
              <f.Icon size={15} strokeWidth={2.4} />
              {f.label}
              <span className={attivo ? "text-white/70" : "text-ink-400"}>{quante}</span>
            </button>
          );
        })}
      </div>

      <ul className="space-y-2.5">
        {visibili.map((i) => (
          <li key={i.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sand-200">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-brand-800 px-2 py-0.5 text-[11px] font-extrabold text-white">
                Giorno {i.tripDay.dayNumber}
              </span>
              <span className="text-[12px] font-bold capitalize text-ink-400">
                {formatItalianDate(i.tripDay.date)} · {i.tripDay.location}
              </span>
            </div>

            <div className="mt-1.5 flex items-start justify-between gap-2.5">
              <p className="text-[16px] font-bold leading-snug text-ink-900">{i.title}</p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${
                  i.isFree ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {i.isFree ? "Gratis" : "A pagamento"}
              </span>
            </div>

            {i.costDetail && (
              <p className="mt-1 text-[13px] font-bold text-ink-500">{i.costDetail}</p>
            )}

            <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-ink-600">
              {i.description}
            </p>

            {i.warning && (
              <p className="mt-2 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-800">
                <TriangleAlert size={15} strokeWidth={2.4} className="mt-0.5 shrink-0" />
                {i.warning}
              </p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {(i.mapsQuery || i.address) && (
                <a
                  href={googleMapsUrl(i.mapsQuery ?? i.address ?? i.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-clay-600 px-3 py-1.5 text-[13px] font-bold text-white"
                >
                  <MapPin size={14} strokeWidth={2.4} />
                  Apri in Maps
                </a>
              )}
              {i.sourceUrl && (
                <a
                  href={i.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-400 underline"
                >
                  <ExternalLink size={12} strokeWidth={2.4} />
                  {i.sourceName ?? "fonte"}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
