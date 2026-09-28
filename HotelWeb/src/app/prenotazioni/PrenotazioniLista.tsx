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
      azioneCercaPrenotazioni(query).then((r) => {
        setRisultati(r);
        setCercando(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const righe = risultati ?? iniziale;

  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-sm">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-600">Cerca prenotazione</label>
        <input
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
          placeholder="Nome o cognome (passate e future)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
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
