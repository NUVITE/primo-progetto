"use client";

import { Search, UserCheck, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Campo, Etichetta, Input, Pulsante } from "@/components/ui";

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
    return (
      <Campo etichetta={etichetta}>
        <div className="flex items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            {value.mode === "esistente" ? <UserCheck className="h-4 w-4 shrink-0 text-teal-700" /> : <UserPlus className="h-4 w-4 shrink-0 text-teal-700" />}
            <span className="truncate text-sm font-semibold text-stone-900">{label}</span>
            <Etichetta tono={value.mode === "esistente" ? "verde" : "blu"}>{value.mode === "esistente" ? "in anagrafica" : "nuovo"}</Etichetta>
          </div>
          <Pulsante
            dimensione="piccolo"
            onClick={(e) => {
              e.preventDefault();
              onChange({ mode: "vuoto" });
              setQuery("");
              setCreandoNuovo(false);
              setNuovoNome("");
              setNuovoCognome("");
            }}
          >
            Cambia
          </Pulsante>
        </div>
      </Campo>
    );
  }

  if (creandoNuovo) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-teal-300 bg-teal-50/40 p-3">
        <p className="text-xs font-semibold text-stone-700">Nuovo ospite (verrà salvato in anagrafica con la prenotazione)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input autoFocus placeholder="Nome" value={nuovoNome} onChange={(e) => setNuovoNome(e.target.value)} />
          <Input placeholder="Cognome" value={nuovoCognome} onChange={(e) => setNuovoCognome(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Pulsante onClick={() => setCreandoNuovo(false)}>Annulla</Pulsante>
          <Pulsante
            variante="primario"
            disabled={!nuovoNome.trim() || !nuovoCognome.trim()}
            onClick={() => onChange({ mode: "nuovo", nome: nuovoNome.trim(), cognome: nuovoCognome.trim() })}
          >
            Usa questo ospite
          </Pulsante>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Campo etichetta={etichetta}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
          <Input className="pl-8" placeholder="Nome o cognome (es. Rossi, Maria...)" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </Campo>
      {cercato && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-stone-300 bg-white shadow-lg">
          {risultati.map((r) => (
            <button
              key={r.id}
              type="button"
              className="flex w-full items-center justify-between border-b border-stone-100 px-3 py-2 text-left text-sm text-stone-900 hover:bg-teal-50 pointer-coarse:py-3"
              onClick={() => onChange({ mode: "esistente", id: r.id, label: r.nomeCompleto })}
            >
              <span>{r.nomeCompleto}</span>
              {r.telefono && <span className="text-xs text-stone-500">{r.telefono}</span>}
            </button>
          ))}
          {risultati.length === 0 && <div className="px-3 py-2 text-sm text-stone-600">Nessun ospite trovato per &ldquo;{query}&rdquo;.</div>}
          <button
            type="button"
            className="flex w-full items-center gap-2 bg-stone-50 px-3 py-2 text-left text-sm font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:py-3"
            onClick={() => {
              const [nome, ...resto] = query.trim().split(/\s+/);
              setNuovoNome(nome ?? "");
              setNuovoCognome(resto.join(" "));
              setCreandoNuovo(true);
            }}
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Crea nuovo ospite &ldquo;{query}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
