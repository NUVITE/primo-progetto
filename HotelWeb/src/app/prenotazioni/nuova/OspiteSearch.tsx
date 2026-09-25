"use client";

import { useEffect, useRef, useState } from "react";

export type OspiteValue =
  | { mode: "vuoto" }
  | { mode: "esistente"; id: number; label: string }
  | { mode: "nuovo"; nome: string; cognome: string };

type Risultato = { id: number; nomeCompleto: string; telefono: string | null };

export function OspiteSearch({
  value,
  onChange,
  etichetta,
}: {
  value: OspiteValue;
  onChange: (v: OspiteValue) => void;
  etichetta: string;
}) {
  const [query, setQuery] = useState("");
  const [risultati, setRisultati] = useState<Risultato[]>([]);
  const [cercato, setCercato] = useState(false);
  const [creandoNuovo, setCreandoNuovo] = useState(false);
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovoCognome, setNuovoCognome] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (query.trim().length < 2) {
      setRisultati([]);
      setCercato(false);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/ospiti/cerca?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setRisultati(data.risultati);
      setCercato(true);
    }, 250);
    return () => clearTimeout(timer.current);
  }, [query]);

  if (value.mode === "esistente" || value.mode === "nuovo") {
    const label = value.mode === "esistente" ? value.label : `${value.nome} ${value.cognome}`;
    const sottotitolo = value.mode === "esistente" ? "Cliente già in anagrafica" : "Nuovo ospite — verrà salvato al salvataggio";
    return (
      <div className="flex items-center justify-between rounded-lg border border-stone-300 bg-stone-50 px-3 py-2">
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-stone-600">{sottotitolo}</div>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-teal-700"
          onClick={() => {
            onChange({ mode: "vuoto" });
            setQuery("");
            setCreandoNuovo(false);
            setNuovoNome("");
            setNuovoCognome("");
          }}
        >
          Cambia
        </button>
      </div>
    );
  }

  if (creandoNuovo) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-stone-300 p-3">
        <div className="flex gap-2">
          <input
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            placeholder="Nome"
            value={nuovoNome}
            onChange={(e) => setNuovoNome(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            placeholder="Cognome"
            value={nuovoCognome}
            onChange={(e) => setNuovoCognome(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold"
            onClick={() => setCreandoNuovo(false)}
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={!nuovoNome.trim() || !nuovoCognome.trim()}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
            onClick={() => onChange({ mode: "nuovo", nome: nuovoNome.trim(), cognome: nuovoCognome.trim() })}
          >
            Usa questo ospite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs text-stone-600">{etichetta}</label>
      <input
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        placeholder="Nome o cognome (es. Rossi, Maria...)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {cercato && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg">
          {risultati.map((r) => (
            <button
              key={r.id}
              type="button"
              className="flex w-full items-center justify-between border-b border-stone-100 px-3 py-2 text-left text-sm hover:bg-stone-50"
              onClick={() => onChange({ mode: "esistente", id: r.id, label: r.nomeCompleto })}
            >
              <span>{r.nomeCompleto}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Cliente</span>
            </button>
          ))}
          {risultati.length === 0 && (
            <div className="px-3 py-2 text-sm text-stone-600">Nessun ospite trovato per &ldquo;{query}&rdquo;.</div>
          )}
          <button
            type="button"
            className="w-full rounded-b-lg bg-stone-50 px-3 py-2 text-left text-sm font-semibold text-teal-700"
            onClick={() => {
              const [nome, ...resto] = query.trim().split(/\s+/);
              setNuovoNome(nome ?? "");
              setNuovoCognome(resto.join(" "));
              setCreandoNuovo(true);
            }}
          >
            + Crea nuovo ospite &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
