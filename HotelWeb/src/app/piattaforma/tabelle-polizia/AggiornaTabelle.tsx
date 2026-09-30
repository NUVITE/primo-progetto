"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { statoTabellePolizia } from "@/lib/tabellePolizia";
import { azioneAggiornaTabelle } from "./actions";

type Stato = Awaited<ReturnType<typeof statoTabellePolizia>>;

export function AggiornaTabelle({ iniziale }: { iniziale: Stato }) {
  const [stato, setStato] = useState(iniziale);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      {messaggio && (
        <p className={`mb-3 rounded-md px-3 py-2 text-sm font-semibold ${messaggio.tipo === "ok" ? "border border-emerald-300 bg-emerald-50 text-emerald-900" : "border border-red-300 bg-red-50 text-red-800"}`}>
          {messaggio.testo}
        </p>
      )}
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-stone-500">Comuni</dt>
          <dd className="font-semibold">
            {stato.comuni} <span className="text-xs font-normal text-stone-500">({stato.comuniValidi} validi oggi)</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Stati</dt>
          <dd className="font-semibold">{stato.stati}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Tipi di documento</dt>
          <dd className="font-semibold">{stato.documenti}</dd>
        </div>
        <div>
          <dt className="text-xs text-stone-500">Ultimo aggiornamento</dt>
          <dd className="font-semibold">{stato.aggiornateIl ? new Date(stato.aggiornateIl).toLocaleString("it-IT") : "mai"}</dd>
        </div>
      </dl>
      {stato.comuni === 0 && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Tabelle non ancora caricate: senza, al check-in non si possono indicare luoghi e documenti.
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
        onClick={async () => {
          setMessaggio(null);
          setBusy(true);
          try {
            const r = await sbusta(azioneAggiornaTabelle());
            setStato(r.stato);
            setMessaggio({
              tipo: "ok",
              testo: `Aggiornate dal portale: ${r.importate.comuni} comuni, ${r.importate.stati} stati, ${r.importate.documenti} tipi di documento.`,
            });
          } catch (e) {
            setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Scaricamento in corso..." : "Aggiorna dal portale Alloggiati"}
      </button>
    </section>
  );
}
