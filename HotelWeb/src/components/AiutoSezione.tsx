"use client";

import { Info } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/**
 * Aiuto di sezione (livello 2 dei tre concordati il 2026-09-30):
 * 1. pagina: <Suggerimento> verde petrolio, uno per schermata, spiega il flusso;
 * 2. sezione: una frase breve sempre visibile + "Cosa significa?" che apre il dettaglio con
 *    un esempio concreto, su fondo bianco (niente colore: il colore resta a pagina e avvisi);
 * 3. campo: aiuto piccolo sotto il campo (prop `aiuto` di <Campo>).
 */
export function AiutoSezione({ breve, children }: { breve: ReactNode; children?: ReactNode }) {
  const [aperto, setAperto] = useState(false);
  const id = useId();
  return (
    <div className="text-sm text-stone-700">
      <p>
        {breve}{" "}
        {children && (
          <button
            type="button"
            aria-expanded={aperto}
            aria-controls={id}
            onClick={() => setAperto((v) => !v)}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded px-1 font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2 hover:bg-teal-50 pointer-coarse:py-1"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
            {aperto ? "Chiudi" : "Cosa significa?"}
          </button>
        )}
      </p>
      {children && aperto && (
        <div id={id} className="mt-2 space-y-1.5 rounded-md border border-stone-200 bg-white px-3 py-2 leading-relaxed text-stone-800 shadow-sm">
          {children}
        </div>
      )}
    </div>
  );
}

/** Riga "Esempio" dentro l'aiuto di sezione. */
export function Esempio({ children }: { children: ReactNode }) {
  return (
    <p className="rounded bg-stone-50 px-2 py-1 text-stone-700">
      <span className="font-semibold text-stone-900">Esempio: </span>
      {children}
    </p>
  );
}
