"use client";

import { useState } from "react";
import {
  Clapperboard,
  ExternalLink,
  Lightbulb,
  MapPin,
  Search,
  ShoppingCart,
  TriangleAlert,
  UtensilsCrossed,
  Users,
  Eye,
  ChevronDown,
} from "lucide-react";
import type { Suggestion } from "@/app/generated/prisma/client";
import { googleMapsUrl } from "@/lib/trip";

const CATEGORIES: Record<
  string,
  { label: string; Icon: React.ElementType }
> = {
  film: { label: "Film e serie", Icon: Clapperboard },
  mangiare: { label: "Mangiare e bere", Icon: UtensilsCrossed },
  pratico: { label: "Utilità pratiche", Icon: ShoppingCart },
  vedere: { label: "Da vedere, non in programma", Icon: Eye },
  ragazzi: { label: "Con i ragazzi", Icon: Users },
};

/** Ricerche per categoria da lanciare su Google Maps attorno alla posizione del giorno. */
const NEARBY_SEARCHES = [
  { label: "Supermercati", query: "supermercato" },
  { label: "Farmacie", query: "farmacia" },
  { label: "Ristoranti", query: "ristoranti" },
  { label: "Bar e caffè", query: "bar caffe" },
];

function nearbyUrl(query: string, lat: number, lng: number) {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}/@${lat},${lng},15z`;
}

export function SuggestionsPanel({
  suggestions,
  lat,
  lng,
}: {
  suggestions: Suggestion[];
  lat: number | null;
  lng: number | null;
}) {
  const [open, setOpen] = useState(false);

  if (suggestions.length === 0 && lat === null) return null;

  const grouped = suggestions.reduce<Record<string, Suggestion[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-dashed border-clay-600/35 bg-clay-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-600 text-white">
          <Lightbulb size={20} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-extrabold leading-snug text-clay-700">
            Altre idee qui intorno
          </span>
          <span className="block text-[13px] leading-snug text-clay-700/75">
            Nostra ricerca sul web — non fa parte del programma dell&apos;agenzia
          </span>
        </span>
        <ChevronDown
          size={22}
          strokeWidth={2.4}
          className={`shrink-0 text-clay-600 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 px-5 pb-5">
          {Object.entries(grouped).map(([category, items]) => {
            const cat = CATEGORIES[category] ?? CATEGORIES.vedere;
            return (
              <div key={category}>
                <h4 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-clay-700">
                  <cat.Icon size={15} strokeWidth={2.4} />
                  {cat.label}
                </h4>
                <ul className="space-y-2.5">
                  {items.map((s) => (
                    <li key={s.id} className="rounded-xl bg-white p-4 ring-1 ring-clay-100">
                      <div className="flex items-start justify-between gap-2.5">
                        <p className="text-[16px] font-bold leading-snug text-ink-900">{s.title}</p>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${
                            s.isFree
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {s.isFree ? "Gratis" : "A pagamento"}
                        </span>
                      </div>

                      {s.costDetail && (
                        <p className="mt-1 text-[13px] font-bold text-ink-500">{s.costDetail}</p>
                      )}

                      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-600">
                        {s.description}
                      </p>

                      {s.warning && (
                        <p className="mt-2 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-800">
                          <TriangleAlert size={15} strokeWidth={2.4} className="mt-0.5 shrink-0" />
                          {s.warning}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {(s.mapsQuery || s.address) && (
                          <a
                            href={googleMapsUrl(s.mapsQuery ?? s.address ?? s.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-clay-600 px-3 py-1.5 text-[13px] font-bold text-white"
                          >
                            <MapPin size={14} strokeWidth={2.4} />
                            Apri in Maps
                          </a>
                        )}
                        {s.sourceUrl && (
                          <a
                            href={s.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-400 underline"
                          >
                            <ExternalLink size={12} strokeWidth={2.4} />
                            {s.sourceName ?? "fonte"}
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Ricerca dal vivo, delegata a Google Maps: nessun dato consumato finche' non la si tocca */}
          {lat !== null && lng !== null && (
            <div className="rounded-xl bg-white p-4 ring-1 ring-clay-100">
              <h4 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-clay-700">
                <Search size={15} strokeWidth={2.4} />
                Cerca qui intorno adesso
              </h4>
              <div className="flex flex-wrap gap-2">
                {NEARBY_SEARCHES.map((n) => (
                  <a
                    key={n.query}
                    href={nearbyUrl(n.query, lat, lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-sand-100 px-3 py-2 text-[13px] font-bold text-ink-600"
                  >
                    {n.label}
                  </a>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-snug text-ink-400">
                Apre Google Maps sulla zona di oggi. Serve la connessione.
              </p>
            </div>
          )}

          <p className="text-[12px] leading-snug text-clay-700/70">
            Queste proposte non vengono dall&apos;agenzia: le ho cercate io sul web il 3 agosto 2026.
            Orari e prezzi possono cambiare, verificateli sul posto prima di attraversare mezza città.
          </p>
        </div>
      )}
    </section>
  );
}
