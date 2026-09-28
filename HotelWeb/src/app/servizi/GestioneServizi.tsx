"use client";

import { useState } from "react";
import { azioneCreaServizio, azioneImpostaAttivoServizio, datiGestioneServizi } from "./actions";

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

  async function eseguendo(fn: () => Promise<Dati>) {
    setErrore(null);
    setBusy(true);
    try {
      setDati(await fn());
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
            <tr><th className="pb-1">Nome</th><th className="pb-1">Prezzo</th><th className="pb-1">Attivo</th></tr>
          </thead>
          <tbody>
            {dati.servizi.map((s) => (
              <tr key={s.id} className="border-t border-stone-100">
                <td className="py-1.5 font-semibold">{s.nome}</td>
                <td className="py-1.5 font-mono">{eur(s.prezzo)}</td>
                <td className="py-1.5">
                  <button
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                    onClick={() => eseguendo(() => azioneImpostaAttivoServizio(s.id, !s.attivo))}
                  >
                    {s.attivo ? "Attivo" : "Disattivato"}
                  </button>
                </td>
              </tr>
            ))}
            {dati.servizi.length === 0 && (
              <tr><td colSpan={3} className="py-2 text-stone-500">Nessun servizio a catalogo.</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            placeholder="Nome (es. Sala conferenze)"
            value={nuovoNome}
            onChange={(e) => setNuovoNome(e.target.value)}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-28 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            placeholder="Prezzo"
            value={nuovoPrezzo}
            onChange={(e) => setNuovoPrezzo(e.target.value)}
          />
          <button
            disabled={busy || !nuovoNome.trim() || !nuovoPrezzo}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            onClick={() =>
              eseguendo(async () => {
                const r = await azioneCreaServizio({ nome: nuovoNome.trim(), prezzo: Number(nuovoPrezzo) });
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
