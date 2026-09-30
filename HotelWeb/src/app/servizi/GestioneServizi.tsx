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
import { Suggerimento } from "@/components/Suggerimento";

type Dati = Awaited<ReturnType<typeof datiGestioneServizi>>;
type Addebito = Dati["servizi"][number]["addebito"];
type Effetto = Dati["servizi"][number]["effetto"];

export const ETICHETTA_ADDEBITO: Record<string, string> = {
  una_tantum: "una tantum",
  per_notte: "per notte",
  per_persona_notte: "per persona per notte",
};
const ETICHETTA_EFFETTO: Record<string, string> = { letto_aggiunto: "letto aggiunto", animale: "animale" };

/** Addebito ed effetto del supplemento: stessi controlli per nuovo e modifica. */
function CampiSupplemento({ addebito, effetto, onChange }: { addebito: Addebito; effetto: Effetto; onChange: (a: Addebito, e: Effetto) => void }) {
  const sel = "rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900";
  return (
    <>
      <select className={sel} value={addebito} onChange={(e) => onChange(e.target.value as Addebito, effetto)} title="Come si addebita">
        {Object.entries(ETICHETTA_ADDEBITO).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <select className={sel} value={effetto ?? ""} onChange={(e) => onChange(addebito, (e.target.value || null) as Effetto)} title="Effetto sulla camera">
        <option value="">nessun effetto</option>
        <option value="letto_aggiunto">letto aggiunto (+1 posto)</option>
        <option value="animale">animale (solo camere che li ammettono)</option>
      </select>
    </>
  );
}

function eur(n: number) {
  return `€ ${n.toFixed(2)}`;
}

export function GestioneServizi({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovoPrezzo, setNuovoPrezzo] = useState("");
  const [nuovoAddebito, setNuovoAddebito] = useState<Addebito>("una_tantum");
  const [nuovoEffetto, setNuovoEffetto] = useState<Effetto>(null);

  const [inModifica, setInModifica] = useState<number | null>(null);
  const [modNome, setModNome] = useState("");
  const [modPrezzo, setModPrezzo] = useState("");
  const [modAddebito, setModAddebito] = useState<Addebito>("una_tantum");
  const [modEffetto, setModEffetto] = useState<Effetto>(null);
  const [daEliminare, setDaEliminare] = useState<number | null>(null);

  function apriModifica(s: Dati["servizi"][number]) {
    setDaEliminare(null);
    setInModifica(s.id);
    setModNome(s.nome);
    setModPrezzo(String(s.prezzo));
    setModAddebito(s.addebito);
    setModEffetto(s.effetto);
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
    <div className="flex w-full min-w-0 flex-col gap-6 p-3 sm:p-6">
      <h1 className="text-xl font-bold">Servizi aggiuntivi</h1>
      <Suggerimento id="servizi" titolo="Come funziona il catalogo dei servizi">
        <p>
          Qui prepari i servizi e i supplementi che poi si aggiungono alle prenotazioni. Per ognuno scegli il <strong>modo di addebito</strong>: una
          tantum, per notte o per persona per notte (la quantità si calcola da sola) e l&apos;eventuale <strong>effetto</strong> sulla camera.
        </p>
      </Suggerimento>
      <p className="text-sm text-stone-700">
        Catalogo dei servizi e supplementi a richiesta (es. letto aggiunto, cuccia per il cane, colazione in camera). Si addebitano una tantum, per notte
        o per persona per notte: la quantità si calcola dalle notti e dalle persone delle camere scelte. Il letto aggiunto aumenta i posti della camera
        (entro il massimo del tipo camera); gli animali sono ammessi solo nei tipi camera che li accettano (Impostazioni &gt; Camere).
        Un servizio a prezzo libero (importo deciso al momento) non serve qui: si aggiunge direttamente dal dettaglio di una prenotazione.
      </p>

      {errore && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{errore}</p>}

      <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-900">Catalogo</h2>
        <table className="tabella-responsive mb-4 w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr><th className="pb-1">Nome</th><th className="pb-1">Prezzo</th><th className="pb-1">Addebito</th><th className="pb-1">Attivo</th><th className="pb-1" /></tr>
          </thead>
          <tbody>
            {dati.servizi.map((s) =>
              inModifica === s.id ? (
                <tr key={s.id} className="border-t border-stone-100 bg-teal-50/40">
                  <td data-label="Nome" className="cella-intera py-1.5 pr-2">
                    <input
                      autoFocus
                      className="h-8 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2.5 text-sm text-stone-900 hover:border-stone-400 disabled:bg-stone-100 pointer-coarse:h-10"
                      value={modNome}
                      onChange={(e) => setModNome(e.target.value)}
                    />
                  </td>
                  <td data-label="Prezzo" className="py-1.5 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900"
                      value={modPrezzo}
                      onChange={(e) => setModPrezzo(e.target.value)}
                    />
                  </td>
                  <td data-label="Addebito" className="py-1.5 pr-2">
                    <div className="flex flex-wrap gap-1">
                      <CampiSupplemento addebito={modAddebito} effetto={modEffetto} onChange={(a, e) => { setModAddebito(a); setModEffetto(e); }} />
                    </div>
                  </td>
                  <td className="cella-intera py-1.5" colSpan={2}>
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={busy || !modNome.trim() || modPrezzo === ""}
                        className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9"
                        onClick={() =>
                          eseguendo(() => sbusta(azioneModificaServizioCatalogo(s.id, { nome: modNome.trim(), prezzo: Number(modPrezzo), addebito: modAddebito, effetto: modEffetto })))
                        }
                      >
                        Salva
                      </button>
                      <button className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setInModifica(null)}>
                        Annulla
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-t border-stone-100">
                  <td className="cella-intera py-1.5 font-semibold">{s.nome}</td>
                  <td data-label="Prezzo" className="py-1.5 font-mono">{eur(s.prezzo)}</td>
                  <td data-label="Addebito" className="py-1.5 text-xs">
                    {ETICHETTA_ADDEBITO[s.addebito]}
                    {s.effetto && <span className="ml-1 rounded bg-teal-50 px-1.5 py-0.5 text-teal-800">{ETICHETTA_EFFETTO[s.effetto]}</span>}
                  </td>
                  <td data-label="Stato" className="py-1.5">
                    <button
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                      onClick={() => eseguendo(() => sbusta(azioneImpostaAttivoServizio(s.id, !s.attivo)))}
                    >
                      {s.attivo ? "Attivo" : "Disattivato"}
                    </button>
                  </td>
                  <td className="cella-intera py-1.5">
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
                        <button className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setDaEliminare(null)}>
                          Annulla
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9" onClick={() => apriModifica(s)}>
                          Modifica
                        </button>
                        <button
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
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
              <tr><td colSpan={5} className="cella-intera py-2 text-stone-500">Nessun servizio a catalogo.</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[12rem] flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
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
          <CampiSupplemento addebito={nuovoAddebito} effetto={nuovoEffetto} onChange={(a, e) => { setNuovoAddebito(a); setNuovoEffetto(e); }} />
          <button
            disabled={busy || !nuovoNome.trim() || !nuovoPrezzo}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
            onClick={() =>
              eseguendo(async () => {
                const r = await sbusta(azioneCreaServizio({ nome: nuovoNome.trim(), prezzo: Number(nuovoPrezzo), addebito: nuovoAddebito, effetto: nuovoEffetto }));
                setNuovoNome("");
                setNuovoPrezzo("");
                setNuovoAddebito("una_tantum");
                setNuovoEffetto(null);
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
