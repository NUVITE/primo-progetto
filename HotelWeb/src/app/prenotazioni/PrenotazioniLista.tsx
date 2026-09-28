"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { azioneCercaPrenotazioni } from "./actions";

type Riga = Awaited<ReturnType<typeof azioneCercaPrenotazioni>>[number];

export function PrenotazioniLista({ iniziale }: { iniziale: Riga[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [risultati, setRisultati] = useState<Riga[] | null>(null);
  const [cercando, setCercando] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setRisultati(null);
      return;
    }
    setCercando(true);
    const timer = setTimeout(() => {
      azioneCercaPrenotazioni(query)
        .then(setRisultati)
        .catch(() => setRisultati([]))
        .finally(() => setCercando(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const righe = risultati ?? iniziale;

  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-sm">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-600">Cerca prenotazione</label>
        <input
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900"
          placeholder="Nome o cognome (passate e future)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Telefono: una scheda per prenotazione al posto della tabella a 6 colonne. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {righe.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => router.push(`/prenotazioni/${p.id}`)}
              className="flex w-full flex-col gap-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-sm active:bg-teal-50"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-bold text-stone-900">{p.ospitePrenotante}</span>
                <span className="text-xs font-semibold text-teal-700">#{p.id}</span>
              </span>
              {p.periodo && <span className="font-mono text-xs text-stone-700">{p.periodo}</span>}
              {p.camere && <span className="text-xs text-stone-600">{p.camere}</span>}
              <span className="text-[11px] uppercase tracking-wide text-stone-500">
                {p.stato}
                {p.gruppoNome ? ` · ${p.gruppoNome}` : ""}
              </span>
            </button>
          </li>
        ))}
        {righe.length === 0 && (
          <li className="rounded-xl border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-600">
            {cercando ? "Ricerca in corso..." : query.trim().length >= 2 ? "Nessuna prenotazione trovata." : "Nessuna prenotazione ancora."}
          </li>
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Ospite prenotante</th>
              <th className="px-4 py-2">Gruppo</th>
              <th className="px-4 py-2">Camere</th>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((p) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/prenotazioni/${p.id}`)}
                className="cursor-pointer border-b border-stone-100 last:border-0 hover:bg-teal-50"
              >
                <td className="px-4 py-2 font-semibold text-teal-700">#{p.id}</td>
                <td className="px-4 py-2">{p.ospitePrenotante}</td>
                <td className="px-4 py-2">{p.gruppoNome ?? "—"}</td>
                <td className="px-4 py-2">{p.camere ?? "—"}</td>
                <td className="px-4 py-2">{p.periodo ?? "—"}</td>
                <td className="px-4 py-2">{p.stato}</td>
              </tr>
            ))}
            {righe.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-600">
                  {cercando ? "Ricerca in corso..." : query.trim().length >= 2 ? "Nessuna prenotazione trovata." : "Nessuna prenotazione ancora."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
