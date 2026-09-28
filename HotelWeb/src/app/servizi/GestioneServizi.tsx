"use client";

import { sbusta } from "@/lib/esito";
import { useState } from "react";
import {
  azioneCreaServizio,
  azioneEliminaServizioCatalogo,
  azioneImpostaAttivoServizio,
  azioneModificaServizioCatalogo,
  datiGestioneServizi,
} from "./actions";

type Dati = Awaited<ReturnType<typeof datiGestioneServizi>>;

function eur(n: number) {
  return `€ ${n.toFixed(2)}`;
}

export function GestioneServizi({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovoPrezzo, setNuovoPrezzo] = useState("");

  const [inModifica, setInModifica] = useState<number | null>(null);
  const [modNome, setModNome] = useState("");
  const [modPrezzo, setModPrezzo] = useState("");
  const [daEliminare, setDaEliminare] = useState<number | null>(null);

  function apriModifica(s: Dati["servizi"][number]) {
    setDaEliminare(null);
    setInModifica(s.id);
    setModNome(s.nome);
    setModPrezzo(String(s.prezzo));
  }

  async function eseguendo(fn: () => Promise<Dati>) {
    setErrore(null);
    setBusy(true);
    try {
      setDati(await fn());
      setInModifica(null);
      setDaEliminare(null);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <h1 className="text-xl font-bold">Servizi aggiuntivi</h1>
      <p className="text-sm text-stone-600">
        Catalogo dei servizi extra a listino (es. sala conferenze, pranzo aggiuntivo, colazione extra).
        Un servizio a prezzo libero (importo deciso al momento) non serve qui: si aggiunge direttamente dal dettaglio di una prenotazione.
      </p>

      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Catalogo</h2>
        <table className="mb-4 w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr><th className="pb-1">Nome</th><th className="pb-1">Prezzo</th><th className="pb-1">Attivo</th><th className="pb-1" /></tr>
          </thead>
          <tbody>
            {dati.servizi.map((s) =>
              inModifica === s.id ? (
                <tr key={s.id} className="border-t border-stone-100 bg-teal-50/40">
                  <td className="py-1.5 pr-2">
                    <input
                      autoFocus
                      className="w-full rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900"
                      value={modNome}
                      onChange={(e) => setModNome(e.target.value)}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900"
                      value={modPrezzo}
                      onChange={(e) => setModPrezzo(e.target.value)}
                    />
                  </td>
                  <td className="py-1.5" colSpan={2}>
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={busy || !modNome.trim() || modPrezzo === ""}
                        className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                        onClick={() =>
                          eseguendo(() => sbusta(azioneModificaServizioCatalogo(s.id, { nome: modNome.trim(), prezzo: Number(modPrezzo) })))
                        }
                      >
                        Salva
                      </button>
                      <button className="rounded-md px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setInModifica(null)}>
                        Annulla
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-t border-stone-100">
                  <td className="py-1.5 font-semibold">{s.nome}</td>
                  <td className="py-1.5 font-mono">{eur(s.prezzo)}</td>
                  <td className="py-1.5">
                    <button
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                      onClick={() => eseguendo(() => sbusta(azioneImpostaAttivoServizio(s.id, !s.attivo)))}
                    >
                      {s.attivo ? "Attivo" : "Disattivato"}
                    </button>
                  </td>
                  <td className="py-1.5">
                    {daEliminare === s.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-stone-600">Eliminare &quot;{s.nome}&quot;?</span>
                        <button
                          disabled={busy}
                          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                          onClick={() => eseguendo(() => sbusta(azioneEliminaServizioCatalogo(s.id)))}
                        >
                          Elimina
                        </button>
                        <button className="rounded-md px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setDaEliminare(null)}>
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button className="rounded-md px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50" onClick={() => apriModifica(s)}>
                          Modifica
                        </button>
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setInModifica(null);
                            setErrore(null);
                            setDaEliminare(s.id);
                          }}
                        >
                          Elimina
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ),
            )}
            {dati.servizi.length === 0 && (
              <tr><td colSpan={4} className="py-2 text-stone-500">Nessun servizio a catalogo.</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
            placeholder="Nome (es. Sala conferenze)"
            value={nuovoNome}
            onChange={(e) => setNuovoNome(e.target.value)}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-28 rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
            placeholder="Prezzo"
            value={nuovoPrezzo}
            onChange={(e) => setNuovoPrezzo(e.target.value)}
          />
          <button
            disabled={busy || !nuovoNome.trim() || !nuovoPrezzo}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            onClick={() =>
              eseguendo(async () => {
                const r = await sbusta(azioneCreaServizio({ nome: nuovoNome.trim(), prezzo: Number(nuovoPrezzo) }));
                setNuovoNome("");
                setNuovoPrezzo("");
                return r;
              })
            }
          >
            + Aggiungi
          </button>
        </div>
      </section>
    </div>
  );
}
