"use client";

import { useState } from "react";
import { NYC_DAYS, ZONES, type ZoneId } from "@/lib/nyc";

const NEUTRAL = "#e5ddd2";

/** Punti di riferimento disegnati sulla mappa, per orientarsi a colpo d'occhio. */
const LANDMARKS: { x: number; y: number; label: string; zone: ZoneId; anchor?: "start" | "end" }[] =
  [
    { x: 152, y: 272, label: "IL VOSTRO HOTEL", zone: "midtown" },
    { x: 158, y: 300, label: "Empire State", zone: "midtown" },
    { x: 133, y: 245, label: "Hudson Yards", zone: "midtown", anchor: "end" },
    { x: 139, y: 196, label: "Natural History", zone: "uptown", anchor: "end" },
    { x: 186, y: 212, label: "MET", zone: "uptown" },
    { x: 168, y: 432, label: "9/11 e Oculus", zone: "lower" },
    { x: 158, y: 462, label: "Wall Street", zone: "lower" },
    { x: 128, y: 486, label: "Battello Statua", zone: "lower", anchor: "end" },
    { x: 262, y: 408, label: "Dumbo", zone: "brooklyn" },
    { x: 288, y: 448, label: "Brooklyn Heights", zone: "brooklyn" },
    { x: 268, y: 292, label: "Gantry Plaza", zone: "queens" },
    { x: 258, y: 246, label: "Roosevelt Isl.", zone: "queens" },
  ];

export function NycMap() {
  const [selected, setSelected] = useState<number>(NYC_DAYS[0].dayNumber);
  const day = NYC_DAYS.find((d) => d.dayNumber === selected)!;
  const active = new Set<ZoneId>(day.zones);

  const fill = (zone: ZoneId) => (active.has(zone) ? day.colorSoft : NEUTRAL);
  const stroke = (zone: ZoneId) => (active.has(zone) ? day.color : "#d3c8b8");
  const labelColor = (zone: ZoneId) => (active.has(zone) ? day.color : "#8a8178");

  return (
    <div className="space-y-3">
      {/* Selettore del giorno: ogni giorno ha il suo colore, come sulla mappa dell'agenzia */}
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

      {/* Cosa si fa nella giornata selezionata */}
      <div
        className="rounded-2xl px-4 py-3.5 ring-1"
        style={{ backgroundColor: day.colorSoft, borderColor: day.color, ["--tw-ring-color" as string]: day.color }}
      >
        <p className="text-[16px] font-extrabold" style={{ color: day.color }}>
          {day.label}
        </p>
        <p className="mt-1 text-[14px] leading-snug text-ink-600">{day.base}</p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          {day.zones.map((z) => (
            <span
              key={z}
              className="rounded-full bg-white/70 px-2.5 py-1 text-[12px] font-bold"
              style={{ color: day.color }}
            >
              {ZONES[z].label}
            </span>
          ))}
        </p>
      </div>

      {/* La mappa schematica */}
      <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-sand-200">
        <svg
          viewBox="0 0 400 560"
          className="h-auto w-full"
          role="img"
          aria-label={`Mappa schematica di New York con evidenziate le zone del ${day.date}: ${day.zones
            .map((z) => ZONES[z].label)
            .join(", ")}`}
        >
          {/* acqua */}
          <rect x="0" y="0" width="400" height="560" fill="#eaf2f7" />

          {/* Queens */}
          <path
            d="M248 175 L400 168 L400 372 L250 366 Z"
            fill={fill("queens")}
            stroke={stroke("queens")}
            strokeWidth="2"
          />
          {/* Brooklyn */}
          <path
            d="M238 384 L400 390 L400 552 L232 548 Z"
            fill={fill("brooklyn")}
            stroke={stroke("brooklyn")}
            strokeWidth="2"
          />

          {/* Manhattan: Uptown */}
          <path
            d="M125 50 L185 50 L215 200 L100 200 Z"
            fill={fill("uptown")}
            stroke={stroke("uptown")}
            strokeWidth="2"
          />
          {/* Manhattan: Midtown */}
          <path
            d="M100 200 L215 200 L228 330 L105 330 Z"
            fill={fill("midtown")}
            stroke={stroke("midtown")}
            strokeWidth="2"
          />
          {/* Manhattan: Lower */}
          <path
            d="M105 330 L228 330 L195 485 L150 485 Z"
            fill={fill("lower")}
            stroke={stroke("lower")}
            strokeWidth="2"
          />

          {/* Central Park */}
          <rect
            x="142"
            y="186"
            width="42"
            height="66"
            rx="4"
            fill="#bcd9b8"
            stroke="#8fb389"
            strokeWidth="1.5"
          />
          <text x="163" y="222" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#3f5c3b">
            CENTRAL
          </text>
          <text x="163" y="232" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#3f5c3b">
            PARK
          </text>

          {/* Ponti */}
          <line x1="215" y1="418" x2="240" y2="410" stroke="#a8a096" strokeWidth="3" />
          <line x1="212" y1="398" x2="238" y2="392" stroke="#a8a096" strokeWidth="3" />
          <line x1="222" y1="268" x2="250" y2="262" stroke="#a8a096" strokeWidth="3" />

          {/* Nomi delle zone */}
          <text x="157" y="118" textAnchor="middle" fontSize="13" fontWeight="800" fill={labelColor("uptown")}>
            UPTOWN
          </text>
          <text x="150" y="345" textAnchor="middle" fontSize="13" fontWeight="800" fill={labelColor("midtown")}>
            MIDTOWN
          </text>
          <text x="172" y="392" textAnchor="middle" fontSize="13" fontWeight="800" fill={labelColor("lower")}>
            DOWNTOWN
          </text>
          <text x="325" y="270" textAnchor="middle" fontSize="13" fontWeight="800" fill={labelColor("queens")}>
            QUEENS
          </text>
          <text x="320" y="470" textAnchor="middle" fontSize="13" fontWeight="800" fill={labelColor("brooklyn")}>
            BROOKLYN
          </text>

          {/* Fiumi */}
          <text x="62" y="300" fontSize="9.5" fontWeight="600" fill="#7fa3b8" transform="rotate(-90 62 300)">
            HUDSON RIVER
          </text>
          <text x="238" y="150" fontSize="9.5" fontWeight="600" fill="#7fa3b8" transform="rotate(-90 238 150)">
            EAST RIVER
          </text>

          {/* Punti di riferimento */}
          {LANDMARKS.map((lm) => {
            const on = active.has(lm.zone);
            const isHotel = lm.label === "IL VOSTRO HOTEL";
            return (
              <g key={lm.label} opacity={on || isHotel ? 1 : 0.35}>
                <circle
                  cx={lm.x}
                  cy={lm.y}
                  r={isHotel ? 5 : 3.2}
                  fill={isHotel ? "#123b57" : on ? day.color : "#8a8178"}
                  stroke="#fff"
                  strokeWidth={isHotel ? 2 : 1.2}
                />
                <text
                  x={lm.anchor === "end" ? lm.x - 7 : lm.x + 7}
                  y={lm.y + 3.5}
                  textAnchor={lm.anchor === "end" ? "end" : "start"}
                  fontSize={isHotel ? "9.5" : "9"}
                  fontWeight={isHotel ? "800" : "600"}
                  fill={isHotel ? "#123b57" : "#4d453e"}
                >
                  {lm.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="px-1 text-[13px] leading-snug text-ink-400">
        Mappa schematica: le distanze non sono in scala, serve solo a capire in che parte della
        città vi muovete ogni giorno. Per il percorso reale usate i link a Google Maps
        nell&apos;itinerario.
      </p>
    </div>
  );
}
