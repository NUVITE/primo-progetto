"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { azioneCreaTrattamento, azioneRinominaTrattamento, azioneSpostaTrattamento, azioneTrattamentoAttivo, datiTrattamenti } from "../actions";
import { Suggerimento } from "@/components/Suggerimento";

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
        <Suggerimento id="trattamenti" titolo="Come si usano i trattamenti">
          <p>
            Sono le voci che si scelgono in ogni prenotazione (B&amp;B, mezza pensione…), nell&apos;ordine indicato qui: usa le frecce per spostarle.
            Il supplemento di prezzo di ogni trattamento si imposta nei <strong>Listini e tariffe</strong>. Rinominare o disattivare un trattamento
            non cambia le prenotazioni già fatte.
          </p>
        </Suggerimento>
      </div>
      {errore && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{errore}</p>}

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
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
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9"
                    onClick={() => esegui(() => sbusta(azioneRinominaTrattamento(t.id, inRinomina.nome)))}
                  >
                    Salva
                  </button>
                  <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setInRinomina(null)}>
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
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9" onClick={() => setInRinomina({ id: t.id, nome: t.nome })}>
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
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
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
