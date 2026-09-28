"use client";

import { sbusta } from "@/lib/esito";
import { CATALOGO_PERMESSI, permessiCheRichiedono, permessiEffettivi, type Permesso } from "@/lib/permessi";
import { useState } from "react";
import { azioneCreaRuolo, azioneEliminaRuolo, azioneImpostaPermessi, azioneRinominaRuolo, datiRuoli } from "./actions";

type Dati = Awaited<ReturnType<typeof datiRuoli>>;
type Ruolo = Dati["ruoli"][number];

export function GestioneRuoli({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inRinomina, setInRinomina] = useState<{ id: number; nome: string } | null>(null);
  const [daEliminare, setDaEliminare] = useState<number | null>(null);
  const [nuovoNome, setNuovoNome] = useState("");
  const [copiaDa, setCopiaDa] = useState<number | "">("");

  async function eseguendo(fn: () => Promise<Dati>) {
    setErrore(null);
    setBusy(true);
    try {
      setDati(await fn());
      setInRinomina(null);
      setDaEliminare(null);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  // Stesse regole del server, solo per non proporre azioni che verrebbero rifiutate.
  const possiedo = (p: Permesso) => dati.sonoSuperAdmin || dati.permessiMiei.includes(p);
  const modificabile = (r: Ruolo) => r.permessi.every(possiedo);

  function cambiaPermesso(r: Ruolo, p: Permesso, attivo: boolean) {
    const togliere = new Set<Permesso>(attivo ? [] : [p, ...permessiCheRichiedono(p)]);
    const nuovi = attivo ? permessiEffettivi([...r.permessi, p]) : r.permessi.filter((q) => !togliere.has(q));
    eseguendo(() => sbusta(azioneImpostaPermessi(r.id, nuovi)));
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Ruoli</h1>
        <p className="text-sm text-stone-600">
          I ruoli di <strong>{dati.hotelNome}</strong> e cosa può fare ciascuno. Le modifiche valgono subito per tutti gli utenti con quel ruolo.
        </p>
      </div>

      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {dati.ruoli.map((r) => {
          const puoModificare = modificabile(r);
          return (
            <section key={r.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                {inRinomina?.id === r.id ? (
                  <div className="flex flex-1 flex-wrap gap-2">
                    <input
                      autoFocus
                      className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900"
                      value={inRinomina.nome}
                      onChange={(e) => setInRinomina({ id: r.id, nome: e.target.value })}
                    />
                    <button
                      disabled={busy || !inRinomina.nome.trim()}
                      className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                      onClick={() => eseguendo(() => sbusta(azioneRinominaRuolo(r.id, inRinomina.nome)))}
                    >
                      Salva
                    </button>
                    <button className="rounded-md px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setInRinomina(null)}>
                      Annulla
                    </button>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-bold">{r.nome}</h2>
                    <p className="text-xs text-stone-500">
                      {r.utenti === 0 ? "Nessun utente" : r.utenti === 1 ? "1 utente" : `${r.utenti} utenti`}
                      {!puoModificare && " · ha permessi che tu non hai: non modificabile"}
                    </p>
                  </div>
                )}
                {puoModificare && inRinomina?.id !== r.id && (
                  <div className="flex gap-1">
                    <button className="rounded-md px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50" onClick={() => setInRinomina({ id: r.id, nome: r.nome })}>
                      Rinomina
                    </button>
                    {r.utenti === 0 && (
                      <button
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setErrore(null);
                          setDaEliminare(r.id);
                        }}
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                )}
              </div>

              {daEliminare === r.id && (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-red-50 px-3 py-2">
                  <span className="text-xs text-red-800">Eliminare il ruolo &quot;{r.nome}&quot;?</span>
                  <button
                    disabled={busy}
                    className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                    onClick={() => eseguendo(() => sbusta(azioneEliminaRuolo(r.id)))}
                  >
                    Elimina
                  </button>
                  <button className="rounded-md px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-white" onClick={() => setDaEliminare(null)}>
                    Annulla
                  </button>
                </div>
              )}

              {CATALOGO_PERMESSI.map((gruppo) => (
                <fieldset key={gruppo.area} className="flex flex-col gap-1">
                  <legend className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{gruppo.area}</legend>
                  {gruppo.voci.map((v) => {
                    const attivo = r.permessi.includes(v.permesso);
                    const bloccato = busy || !puoModificare || !possiedo(v.permesso);
                    return (
                      <label key={v.permesso} className={`flex items-start gap-2 text-sm ${bloccato && !busy ? "opacity-60" : ""}`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 accent-teal-700"
                          checked={attivo}
                          disabled={bloccato}
                          onChange={(e) => cambiaPermesso(r, v.permesso, e.target.checked)}
                        />
                        <span>
                          <span className="font-semibold text-stone-800">{v.nome}</span>
                          <span className="block text-xs text-stone-500">{v.descrizione}</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
            </section>
          );
        })}
      </div>

      <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Nuovo ruolo</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-64">
            Nome
            <input
              className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
              placeholder="es. Portiere di notte"
              value={nuovoNome}
              onChange={(e) => setNuovoNome(e.target.value)}
            />
          </label>
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-64">
            Parti dai permessi di
            <select
              className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
              value={copiaDa}
              onChange={(e) => setCopiaDa(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Nessun permesso</option>
              {dati.ruoli.filter(modificabile).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </label>
          <button
            disabled={busy || !nuovoNome.trim()}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            onClick={() =>
              eseguendo(async () => {
                const permessi = dati.ruoli.find((r) => r.id === copiaDa)?.permessi ?? [];
                const r = await sbusta(azioneCreaRuolo(nuovoNome, permessi));
                setNuovoNome("");
                setCopiaDa("");
                return r;
              })
            }
          >
            + Crea ruolo
          </button>
        </div>
      </section>
    </div>
  );
}
