"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { NYC_DAYS, type NycDay } from "@/lib/nyc";

/** Pallino numerato nel colore della giornata, come i percorsi disegnati a mano. */
function numberedIcon(n: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:26px;height:26px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-weight:800;font-size:13px;
      border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);
      font-family:system-ui,sans-serif;
    ">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

/** Riporta la vista sulle tappe del giorno scelto ogni volta che cambia. */
function FitToDay({ day }: { day: NycDay }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds(day.stops.map((s) => [s.lat, s.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
  }, [day, map]);
  return null;
}

export function NycMap() {
  const [selected, setSelected] = useState(NYC_DAYS[0].dayNumber);
  const day = useMemo(
    () => NYC_DAYS.find((d) => d.dayNumber === selected) ?? NYC_DAYS[0],
    [selected]
  );

  const percorso = day.stops.map((s) => [s.lat, s.lng] as [number, number]);

  return (
    <div className="space-y-3">
      {/* Selettore del giorno: ogni giorno ha il suo colore */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {NYC_DAYS.map((d) => {
          const on = d.dayNumber === selected;
          return (
            <button
              key={d.dayNumber}
              type="button"
              onClick={() => setSelected(d.dayNumber)}
              aria-pressed={on}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-all ${
                on ? "text-white shadow-sm" : "bg-white text-ink-500 ring-1 ring-sand-200"
              }`}
              style={on ? { backgroundColor: d.color } : undefined}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: on ? "rgba(255,255,255,.85)" : d.color }}
              />
              {d.date}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl px-4 py-3.5" style={{ backgroundColor: day.colorSoft }}>
        <p className="text-[16px] font-extrabold" style={{ color: day.color }}>
          {day.label}
        </p>
        <p className="mt-1 text-[14px] leading-snug text-ink-600">{day.base}</p>
      </div>

      <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-sand-200">
        <MapContainer
          center={[40.7596, -73.9877]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: "60vh", minHeight: 380, width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <FitToDay day={day} />

          <Polyline
            positions={percorso}
            pathOptions={{ color: day.color, weight: 4, opacity: 0.75, dashArray: "1 8", lineCap: "round" }}
          />

          {day.stops.map((s, i) => (
            <Marker key={`${s.name}-${i}`} position={[s.lat, s.lng]} icon={numberedIcon(i + 1, day.color)}>
              <Popup>
                <span className="block text-[14px] font-extrabold text-ink-900">{s.name}</span>
                {s.time && (
                  <span className="block text-[13px] font-bold" style={{ color: day.color }}>
                    {s.time}
                  </span>
                )}
                {s.note && <span className="block text-[13px] text-ink-500">{s.note}</span>}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-[13px] font-bold text-brand-700"
                >
                  Indicazioni su Google Maps →
                </a>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Elenco ordinato delle tappe: si legge anche senza toccare la mappa */}
      <ol className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sand-200">
        {day.stops.map((s, i) => (
          <li key={`${s.name}-lista-${i}`} className="flex gap-3 border-b border-sand-100 p-3.5 last:border-0">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white"
              style={{ backgroundColor: day.color }}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold leading-snug text-ink-900">{s.name}</span>
              {s.note && <span className="block text-[13px] leading-snug text-ink-500">{s.note}</span>}
            </span>
            {s.time && (
              <span className="shrink-0 text-[13px] font-extrabold tabular-nums" style={{ color: day.color }}>
                {s.time}
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="px-1 text-[13px] leading-snug text-ink-400">
        Aprite questa pagina <strong>mentre siete sotto il wi-fi dell&apos;hotel</strong>: la mappa
        resta salvata sul telefono e il giorno dopo non consuma dati.
      </p>
    </div>
  );
}
