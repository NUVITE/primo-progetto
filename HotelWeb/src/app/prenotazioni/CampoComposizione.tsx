"use client";

import type { Composizione } from "@/lib/pricing";

/**
 * Persone in una camera: adulti + età dei bambini all'arrivo. È la base del prezzo (listini a
 * persona, supplementi trattamento, riduzioni). Unico componente per nuova prenotazione,
 * prenotazione veloce, dettaglio e check-in.
 */
export function CampoComposizione({ valore, onChange, compatto = false }: { valore: Composizione; onChange: (c: Composizione) => void; compatto?: boolean }) {
  const input = "rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900";
  return (
    <div className={`flex flex-wrap items-end gap-2 ${compatto ? "" : "text-sm"}`}>
      <label className="flex flex-col gap-1 text-xs text-stone-600">
        Adulti
        <input
          type="number"
          min={0}
          className={`${input} w-16`}
          value={valore.adulti}
          onChange={(e) => onChange({ ...valore, adulti: Math.max(0, Number(e.target.value || 0)) })}
        />
      </label>
      {valore.etaBambini.map((eta, i) => (
        <label key={i} className="flex flex-col gap-1 text-xs text-stone-600">
          <span>
            Bambino {i + 1}{" "}
            <button
              type="button"
              className="font-bold text-red-600"
              title="Togli"
              onClick={() => onChange({ ...valore, etaBambini: valore.etaBambini.filter((_, j) => j !== i) })}
            >
              ×
            </button>
          </span>
          <select
            className={`${input} w-20`}
            value={eta}
            onChange={(e) => onChange({ ...valore, etaBambini: valore.etaBambini.map((x, j) => (j === i ? Number(e.target.value) : x)) })}
          >
            {Array.from({ length: 18 }, (_, n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "anno" : "anni"}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button type="button" className="pb-1.5 text-xs font-semibold text-teal-700" onClick={() => onChange({ ...valore, etaBambini: [...valore.etaBambini, 5] })}>
        + Bambino
      </button>
    </div>
  );
}
