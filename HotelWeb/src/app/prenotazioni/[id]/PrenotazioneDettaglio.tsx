"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OspiteSearch, type OspiteValue } from "../nuova/OspiteSearch";
import { azioneAccorciaEstendi, azioneAggiungiSegmento, azioneAssegnaCamera, azioneCambiaCamera, caricaPrenotazione, datiIniziali } from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Camera = { id: number; codice: string; tipoCameraId: number; tipoCameraNome: string };
type Listino = { id: number; descrizione: string; tipo: string };

const TRATTAMENTI = ["Mezza pensione", "Pensione completa", "B&B"];

function eur(n: number) {
  return `€ ${n.toFixed(2)}`;
}

export function PrenotazioneDettaglio({ iniziale }: { iniziale: Prenotazione }) {
  const [prenotazione, setPrenotazione] = useState(iniziale);
  const [camere, setCamere] = useState<Camera[]>([]);
  const [listini, setListini] = useState<Listino[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [modificaFine, setModificaFine] = useState<{ segmentoId: number; valore: string } | null>(null);
  const [cambioCamera, setCambioCamera] = useState<{ segmentoId: number; dataCambio: string; nuovaCameraId: number | null } | null>(null);
  const [assegnaCameraState, setAssegnaCameraState] = useState<{ segmentoId: number; cameraId: number | null } | null>(null);

  const [aggiungiAperto, setAggiungiAperto] = useState(false);
  const [nuovoOspite, setNuovoOspite] = useState<OspiteValue>({ mode: "vuoto" });
  const [nuovaCameraId, setNuovaCameraId] = useState<number | null>(null);
  const [nuovoTrattamento, setNuovoTrattamento] = useState(TRATTAMENTI[0]);
  const [nuovoDal, setNuovoDal] = useState("");
  const [nuovoAl, setNuovoAl] = useState("");

  useEffect(() => {
    datiIniziali().then((d) => {
      setCamere(d.camere);
      setListini(d.listini);
    });
  }, []);

  async function eseguendo<T>(fn: () => Promise<T>) {
    setErrore(null);
    setSalvando(true);
    try {
      return await fn();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      return null;
    } finally {
      setSalvando(false);
    }
  }

  async function salvaNuovaFine(segmentoId: number, valore: string) {
    const risultato = await eseguendo(() => azioneAccorciaEstendi(segmentoId, valore));
    if (risultato) {
      setPrenotazione(risultato);
      setModificaFine(null);
    }
  }

  async function confermaCambioCamera() {
    if (!cambioCamera || !cambioCamera.nuovaCameraId) return;
    const risultato = await eseguendo(() =>
      azioneCambiaCamera(cambioCamera.segmentoId, cambioCamera.dataCambio, cambioCamera.nuovaCameraId!)
    );
    if (risultato) {
      setPrenotazione(risultato);
      setCambioCamera(null);
    }
  }

  async function confermaAssegnaCamera() {
    if (!assegnaCameraState || !assegnaCameraState.cameraId) return;
    const risultato = await eseguendo(() => azioneAssegnaCamera(assegnaCameraState.segmentoId, assegnaCameraState.cameraId!));
    if (risultato) {
      setPrenotazione(risultato);
      setAssegnaCameraState(null);
    }
  }

  async function confermaAggiungiSegmento() {
    if (!nuovaCameraId || !nuovoDal || !nuovoAl || nuovoOspite.mode === "vuoto" || !listini[0]) return;
    const ospite = nuovoOspite.mode === "esistente" ? { id: nuovoOspite.id } : { nome: nuovoOspite.nome, cognome: nuovoOspite.cognome };
    const risultato = await eseguendo(() =>
      azioneAggiungiSegmento(prenotazione.id, {
        cameraId: nuovaCameraId,
        tipoCameraId: camere.find((c) => c.id === nuovaCameraId)!.tipoCameraId,
        ospite,
        trattamento: nuovoTrattamento,
        listinoId: listini[0].id,
        dataInizio: nuovoDal,
        dataFine: nuovoAl,
      })
    );
    if (risultato) {
      setPrenotazione(risultato);
      setAggiungiAperto(false);
      setNuovoOspite({ mode: "vuoto" });
      setNuovaCameraId(null);
      setNuovoDal("");
      setNuovoAl("");
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/prenotazioni" className="text-sm text-teal-700">← Tutte le prenotazioni</Link>
          <h1 className="text-xl font-bold">Prenotazione #{prenotazione.id}</h1>
          <p className="text-sm text-stone-600">
            {prenotazione.ospitePrenotante} {prenotazione.gruppoNome && `· Gruppo: ${prenotazione.gruppoNome}`} · {prenotazione.stato}
          </p>
        </div>
        <Link href="/camere/situazione" className="rounded-md border border-teal-700 px-4 py-2 text-sm font-bold text-teal-700">
          Vedi planning camere
        </Link>
      </div>

      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex flex-1 flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Camera</th>
                  <th className="px-3 py-2">Ospite</th>
                  <th className="px-3 py-2">Check-in</th>
                  <th className="px-3 py-2">Check-out</th>
                  <th className="px-3 py-2">Notti</th>
                  <th className="px-3 py-2">Subtot.</th>
                  <th className="px-3 py-2">Tassa</th>
                  <th className="px-3 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {prenotazione.segmenti.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0 align-top">
                    <td className="px-3 py-2">
                      {s.cameraCodice ? (
                        <div className="font-semibold">{s.cameraCodice}</div>
                      ) : (
                        <div className="font-semibold text-amber-700">Da assegnare</div>
                      )}
                      <div className="text-xs text-stone-600">{s.tipoCameraNome}</div>
                    </td>
                    <td className="px-3 py-2">{s.ospiteNome}</td>
                    <td className="px-3 py-2 font-mono">{s.dataInizio.split("-").reverse().join("/")}</td>
                    <td className="px-3 py-2">
                      {modificaFine?.segmentoId === s.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            className="rounded-md border border-stone-300 px-1 py-0.5 text-xs"
                            value={modificaFine.valore}
                            onChange={(e) => setModificaFine({ segmentoId: s.id, valore: e.target.value })}
                          />
                          <button disabled={salvando} onClick={() => salvaNuovaFine(s.id, modificaFine.valore)} className="text-xs font-semibold text-teal-700">
                            Salva
                          </button>
                          <button onClick={() => setModificaFine(null)} className="text-xs text-stone-500">Annulla</button>
                        </div>
                      ) : (
                        <button
                          className="font-mono underline decoration-dotted"
                          title="Accorcia o allunga il soggiorno"
                          onClick={() => setModificaFine({ segmentoId: s.id, valore: s.dataFine })}
                        >
                          {s.dataFine.split("-").reverse().join("/")}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{s.notti}</td>
                    <td className="px-3 py-2 font-mono">{eur(s.subtotale)}</td>
                    <td className="px-3 py-2 font-mono">{eur(s.tassa)}</td>
                    <td className="px-3 py-2">
                      {!s.cameraId && (
                        assegnaCameraState?.segmentoId === s.id ? (
                          <div className="flex flex-col gap-1 rounded-md border border-stone-200 p-2">
                            <label className="text-[11px] text-stone-600">Camera</label>
                            <select
                              className="rounded-md border border-stone-300 px-1 py-0.5 text-xs"
                              value={assegnaCameraState.cameraId ?? ""}
                              onChange={(e) => setAssegnaCameraState({ ...assegnaCameraState, cameraId: Number(e.target.value) })}
                            >
                              <option value="" disabled>Seleziona...</option>
                              {camere.filter((c) => c.tipoCameraId === s.tipoCameraId).map((c) => (
                                <option key={c.id} value={c.id}>{c.codice}</option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <button disabled={salvando || !assegnaCameraState.cameraId} onClick={confermaAssegnaCamera} className="text-xs font-semibold text-teal-700">
                                Conferma
                              </button>
                              <button onClick={() => setAssegnaCameraState(null)} className="text-xs text-stone-500">Annulla</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="text-xs font-semibold text-teal-700"
                            onClick={() => setAssegnaCameraState({ segmentoId: s.id, cameraId: null })}
                          >
                            Assegna camera
                          </button>
                        )
                      )}
                      {s.cameraId && (cambioCamera?.segmentoId === s.id ? (
                        <div className="flex flex-col gap-1 rounded-md border border-stone-200 p-2">
                          <label className="text-[11px] text-stone-600">Dal</label>
                          <input
                            type="date"
                            className="rounded-md border border-stone-300 px-1 py-0.5 text-xs"
                            min={s.dataInizio}
                            max={s.dataFine}
                            value={cambioCamera.dataCambio}
                            onChange={(e) => setCambioCamera({ ...cambioCamera, dataCambio: e.target.value })}
                          />
                          <label className="text-[11px] text-stone-600">Nuova camera</label>
                          <select
                            className="rounded-md border border-stone-300 px-1 py-0.5 text-xs"
                            value={cambioCamera.nuovaCameraId ?? ""}
                            onChange={(e) => setCambioCamera({ ...cambioCamera, nuovaCameraId: Number(e.target.value) })}
                          >
                            <option value="" disabled>Seleziona...</option>
                            {camere.filter((c) => c.id !== s.cameraId).map((c) => (
                              <option key={c.id} value={c.id}>{c.codice} — {c.tipoCameraNome}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button disabled={salvando || !cambioCamera.nuovaCameraId} onClick={confermaCambioCamera} className="text-xs font-semibold text-teal-700">
                              Conferma
                            </button>
                            <button onClick={() => setCambioCamera(null)} className="text-xs text-stone-500">Annulla</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="text-xs font-semibold text-teal-700"
                          onClick={() => setCambioCamera({ segmentoId: s.id, dataCambio: s.dataInizio, nuovaCameraId: null })}
                        >
                          Cambia camera
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            {aggiungiAperto ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold">Aggiungi un arrivo al gruppo</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-stone-600">Camera</label>
                    <select className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovaCameraId ?? ""} onChange={(e) => setNuovaCameraId(Number(e.target.value))}>
                      <option value="" disabled>Seleziona...</option>
                      {camere.map((c) => (
                        <option key={c.id} value={c.id}>{c.codice} — {c.tipoCameraNome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-stone-600">Trattamento</label>
                    <select className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovoTrattamento} onChange={(e) => setNuovoTrattamento(e.target.value)}>
                      {TRATTAMENTI.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-stone-600">Check-in</label>
                    <input type="date" className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovoDal} onChange={(e) => setNuovoDal(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-stone-600">Check-out</label>
                    <input type="date" className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovoAl} onChange={(e) => setNuovoAl(e.target.value)} />
                  </div>
                </div>
                <OspiteSearch value={nuovoOspite} onChange={setNuovoOspite} etichetta="Ospite" />
                <div className="flex justify-end gap-2">
                  <button className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold" onClick={() => setAggiungiAperto(false)}>Annulla</button>
                  <button
                    disabled={salvando || !nuovaCameraId || !nuovoDal || !nuovoAl || nuovoOspite.mode === "vuoto"}
                    className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                    onClick={confermaAggiungiSegmento}
                  >
                    Aggiungi
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAggiungiAperto(true)} className="rounded-md border border-teal-700 px-3 py-1.5 text-sm font-semibold text-teal-700">
                + Aggiungi arrivo al gruppo
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 xl:w-80 xl:flex-shrink-0">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Riepilogo</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotale soggiorno</span><span className="font-mono">{eur(prenotazione.totali.subtotale)}</span></div>
            <div className="flex justify-between"><span>Tassa di soggiorno</span><span className="font-mono">{eur(prenotazione.totali.tassa)}</span></div>
            <div className="flex justify-between text-base font-bold"><span>Totale</span><span className="font-mono">{eur(prenotazione.totali.totale)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
