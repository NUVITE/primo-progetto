"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { azioneCreaTrattamento, azioneRinominaTrattamento, azioneSpostaTrattamento, azioneTrattamentoAttivo, datiTrattamenti } from "../actions";

type Trattamento = Awaited<ReturnType<typeof datiTrattamenti>>[number];

export function GestioneTrattamenti({ iniziale }: { iniziale: Trattamento[] }) {
  const [lista, setLista] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nuovo, setNuovo] = useState("");
  const [inRinomina, setInRinomina] = useState<{ id: number; nome: string } | null>(null);

  async function esegui(fn: () => Promise<Trattamento[]>) {
    setErrore(null);
    setBusy(true);
    try {
      setLista(await fn());
      setInRinomina(null);
      return true;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Trattamenti</h1>
        <p className="text-sm text-stone-600">
          Le voci che compaiono nelle prenotazioni, in quest&apos;ordine. Rinominare o disattivare non cambia le prenotazioni già fatte.
        </p>
      </div>
      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <ul className="flex flex-col">
          {lista.map((t, i) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 py-2 first:border-0">
              {inRinomina?.id === t.id ? (
                <span className="flex flex-1 flex-wrap gap-2">
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900"
                    value={inRinomina.nome}
                    onChange={(e) => setInRinomina({ id: t.id, nome: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                    onClick={() => esegui(() => sbusta(azioneRinominaTrattamento(t.id, inRinomina.nome)))}
                  >
                    Salva
                  </button>
                  <button type="button" className="text-xs font-semibold text-stone-600" onClick={() => setInRinomina(null)}>
                    Annulla
                  </button>
                </span>
              ) : (
                <span className={`font-semibold ${t.attivo ? "" : "text-stone-400 line-through"}`}>{t.nome}</span>
              )}
              {inRinomina?.id !== t.id && (
                <span className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    aria-label="Sposta su"
                    disabled={busy || i === 0}
                    className="rounded-md px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                    onClick={() => esegui(() => sbusta(azioneSpostaTrattamento(t.id, -1)))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Sposta giù"
                    disabled={busy || i === lista.length - 1}
                    className="rounded-md px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                    onClick={() => esegui(() => sbusta(azioneSpostaTrattamento(t.id, 1)))}
                  >
                    ↓
                  </button>
                  <button type="button" className="rounded-md px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50" onClick={() => setInRinomina({ id: t.id, nome: t.nome })}>
                    Rinomina
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                    onClick={() => esegui(() => sbusta(azioneTrattamentoAttivo(t.id, !t.attivo)))}
                  >
                    {t.attivo ? "Attivo" : "Disattivato"}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
          <input
            className="min-w-[12rem] flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
            placeholder="es. All inclusive, Solo pernottamento"
            value={nuovo}
            onChange={(e) => setNuovo(e.target.value)}
          />
          <button
            type="button"
            disabled={busy || !nuovo.trim()}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            onClick={async () => {
              if (await esegui(() => sbusta(azioneCreaTrattamento(nuovo)))) setNuovo("");
            }}
          >
            + Aggiungi
          </button>
        </div>
      </section>
    </div>
  );
}
