"use client";

import { Lightbulb, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Spiegazione di una schermata o sezione ("come si usa"): deve vedersi bene, perché è ciò che
 * evita all'utente di dover chiamare l'assistenza. Chi l'ha già letta può chiuderla; la scelta
 * resta sul browser di chi l'ha chiusa (chiave = id) e si riapre con "Come funziona?".
 */
export function Suggerimento({ id, titolo = "Come funziona", children }: { id: string; titolo?: string; children: ReactNode }) {
  const chiave = `hotelweb:suggerimento:${id}`;
  const [chiuso, setChiuso] = useState(false);

  useEffect(() => {
    try {
      // Letto dopo il montaggio: sul server non esiste localStorage (evita differenze di idratazione).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChiuso(localStorage.getItem(chiave) === "chiuso");
    } catch {
      // Archiviazione non disponibile (navigazione privata): il suggerimento resta visibile.
    }
  }, [chiave]);

  function cambia(valore: boolean) {
    setChiuso(valore);
    try {
      if (valore) localStorage.setItem(chiave, "chiuso");
      else localStorage.removeItem(chiave);
    } catch {
      // Nessuna memoria: vale solo per questa visita.
    }
  }

  if (chiuso) {
    return (
      <button
        type="button"
        onClick={() => cambia(false)}
        className="inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-sm font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:py-2"
      >
        <Lightbulb className="h-4 w-4" aria-hidden />
        Come funziona?
      </button>
    );
  }

  return (
    <aside className="flex gap-3 rounded-lg border border-teal-200 border-l-4 border-l-teal-600 bg-teal-50 px-4 py-3 text-sm text-stone-800">
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5 leading-relaxed">
        <p className="font-bold text-teal-900">{titolo}</p>
        {children}
      </div>
      <button
        type="button"
        onClick={() => cambia(true)}
        title="Nascondi (si riapre con «Come funziona?»)"
        aria-label="Nascondi il suggerimento"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-teal-800 hover:bg-teal-100"
      >
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
