"use client";

import { useRef, useState } from "react";
import { azioneCercaLuoghi } from "./actions";

type Luogo = { codice: string; descrizione: string; provincia: string | null };

/**
 * Ricerca di un comune o di uno stato nelle tabelle ufficiali Polizia (per nome, dall'inizio).
 * validoAl: per il comune di nascita si cercano i comuni validi a quella data (anche se poi soppressi).
 */
export function LuogoSearch({
  tipo,
  codice,
  descrizione,
  validoAl,
  disabled,
  placeholder,
  onChange,
}: {
  tipo: "comune" | "stato";
  codice: string;
  descrizione: string;
  validoAl?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (codice: string, descrizione: string) => void;
}) {
  const [testo, setTesto] = useState("");
  const [risultati, setRisultati] = useState<Luogo[]>([]);
  const [modifica, setModifica] = useState(!codice);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function cerca(valore: string) {
    setTesto(valore);
    clearTimeout(timer.current);
    if (valore.trim().length < 2) {
      setRisultati([]);
      return;
    }
    timer.current = setTimeout(() => {
      azioneCercaLuoghi(valore, tipo, validoAl || null)
        .then(setRisultati)
        .catch(() => setRisultati([]));
    }, 250);
  }

  if (codice && !modifica) {
    return (
      <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-stone-300 bg-stone-50 px-2 py-1.5 text-sm text-stone-900">
        <span className="truncate">{descrizione || codice}</span>
        {!disabled && (
          <button type="button" className="text-xs font-semibold text-teal-700" onClick={() => setModifica(true)}>
            Cambia
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
        disabled={disabled}
        placeholder={placeholder ?? (tipo === "comune" ? "Scrivi il nome del comune..." : "Scrivi il nome dello stato...")}
        value={testo}
        onChange={(e) => cerca(e.target.value)}
      />
      {risultati.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-stone-200 bg-white shadow-lg">
          {risultati.map((l) => {
            const etichetta = l.provincia ? `${l.descrizione} (${l.provincia})` : l.descrizione;
            return (
              <li key={l.codice}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm text-stone-800 hover:bg-teal-50"
                  onClick={() => {
                    onChange(l.codice, etichetta);
                    setRisultati([]);
                    setTesto("");
                    setModifica(false);
                  }}
                >
                  {etichetta}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {codice && (
        <button type="button" className="mt-1 text-[11px] text-stone-500 underline" onClick={() => setModifica(false)}>
          Annulla (resta: {descrizione || codice})
        </button>
      )}
    </div>
  );
}
