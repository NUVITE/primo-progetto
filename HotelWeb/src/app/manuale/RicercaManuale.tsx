"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui";

type Voce = { slug: string; titolo: string; fornitore: boolean; testo: string };

// Confronto senza maiuscole e senza accenti ("attività" trova anche "attivita").
const semplice = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

/** Indice del manuale con la ricerca nel testo di tutti i capitoli (mostra un pezzo di testo intorno alla parola). */
export function RicercaManuale({ voci, base }: { voci: Voce[]; base: string }) {
  const [q, setQ] = useState("");
  const parole = semplice(q).split(/\s+/).filter((p) => p.length >= 2);
  const trovati = parole.length
    ? voci
        .map((v) => {
          const t = semplice(v.testo);
          if (!parole.every((p) => t.includes(p) || semplice(v.titolo).includes(p))) return null;
          const i = t.indexOf(parole[0]);
          const estratto = i >= 0 ? `${i > 60 ? "…" : ""}${v.testo.slice(Math.max(0, i - 60), i + 140)}…` : v.testo.slice(0, 160);
          return { ...v, estratto };
        })
        .filter((v): v is Voce & { estratto: string } => !!v)
    : null;

  return (
    <div className="flex flex-col gap-3">
      <label className="relative block max-w-xl">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
        <Input className="w-full pl-8" placeholder="Cerca nel manuale (es. acconto, schedina, cauzione)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca nel manuale" />
      </label>
      {trovati ? (
        <ul className="flex flex-col gap-2">
          {trovati.map((v) => (
            <li key={v.slug} className="rounded-lg border border-stone-200 bg-white p-3">
              <Link href={`${base}/${v.slug}`} className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2">
                {v.titolo}
              </Link>
              <p className="mt-1 text-sm text-stone-600">{v.estratto}</p>
            </li>
          ))}
          {trovati.length === 0 && <li className="text-sm text-stone-600">Nessun capitolo contiene queste parole.</li>}
        </ul>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-2">
          {voci.map((v, i) => (
            <li key={v.slug}>
              <Link href={`${base}/${v.slug}`} className="flex h-full items-start gap-3 rounded-lg border border-stone-200 bg-white p-3 shadow-sm hover:border-teal-300 hover:shadow">
                <span className="font-mono text-sm text-stone-400">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-semibold text-stone-900">
                  {v.titolo}
                  {v.fornitore && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">fornitore</span>}
                </span>
              </Link>
            </li>
          ))}
          {voci.length === 0 && <li className="text-sm text-stone-600">Il manuale non ha ancora capitoli.</li>}
        </ol>
      )}
    </div>
  );
}
