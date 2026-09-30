"use client";

import { Baby, Minus, Plus, X } from "lucide-react";
import { Pulsante, Select } from "@/components/ui";
import type { Composizione } from "@/lib/pricing";

/**
 * Persone in una camera: adulti + età dei bambini all'arrivo. È la base del prezzo (listini a
 * persona, supplementi trattamento, riduzioni). Unico componente per nuova prenotazione,
 * prenotazione veloce, dettaglio e check-in.
 */
export function CampoComposizione({ valore, onChange }: { valore: Composizione; onChange: (c: Composizione) => void; compatto?: boolean }) {
  const contatore = "inline-flex h-8 items-center rounded-md border border-stone-300 bg-white pointer-coarse:h-10";
  const passo = "flex h-full w-7 items-center justify-center text-stone-600 hover:bg-stone-100 disabled:opacity-30 pointer-coarse:w-10";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-stone-700">Adulti</span>
      <span className={contatore}>
        <button type="button" className={passo} aria-label="Un adulto in meno" disabled={valore.adulti <= 0} onClick={() => onChange({ ...valore, adulti: valore.adulti - 1 })}>
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-semibold text-stone-900">{valore.adulti}</span>
        <button type="button" className={passo} aria-label="Un adulto in più" onClick={() => onChange({ ...valore, adulti: valore.adulti + 1 })}>
          <Plus className="h-3.5 w-3.5" />
        </button>
      </span>
      {valore.etaBambini.map((eta, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 py-0.5 pl-2 pr-1">
          <Baby className="h-3.5 w-3.5 text-sky-700" aria-hidden />
          <Select
            aria-label={`Età bambino ${i + 1}`}
            className="h-7 w-24 pointer-coarse:h-9"
            value={eta}
            onChange={(e) => onChange({ ...valore, etaBambini: valore.etaBambini.map((x, j) => (j === i ? Number(e.target.value) : x)) })}
          >
            {Array.from({ length: 18 }, (_, n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "anno" : "anni"}
              </option>
            ))}
          </Select>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded text-stone-500 hover:bg-red-50 hover:text-red-700"
            aria-label={`Togli bambino ${i + 1}`}
            title="Togli"
            onClick={() => onChange({ ...valore, etaBambini: valore.etaBambini.filter((_, j) => j !== i) })}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <Pulsante dimensione="piccolo" icona={Plus} onClick={() => onChange({ ...valore, etaBambini: [...valore.etaBambini, 5] })}>
        Bambino
      </Pulsante>
    </div>
  );
}
