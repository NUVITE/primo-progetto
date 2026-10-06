"use client";

import { sbusta } from "@/lib/esito";
import { useEffect, useState } from "react";
import {
  azioneOpzioniTipoCamera,
  azionePrezzoUsoDiurno,
  azionePuliziaFinale,
  azioneCambiaTipoCamera,
  azioneCreaCamera,
  azioneCreaIndisponibilita,
  azioneCreaTipoCamera,
  azioneEliminaIndisponibilita,
  azioneImpostaCameraAttiva,
  datiGestione,
} from "./actions";
import { Suggerimento } from "@/components/Suggerimento";

type Dati = Awaited<ReturnType<typeof datiGestione>>;

function formattaIt(iso: string) {
  return iso.split("-").reverse().join("/");
}

export function GestioneCamere({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nuovoTipoCodice, setNuovoTipoCodice] = useState("");
  const [nuovoTipoDescrizione, setNuovoTipoDescrizione] = useState("");

  const [nuovaCamera, setNuovaCamera] = useState({ codice: "", tipoCameraId: 0, piano: "", capienzaAdulti: 2, capienzaBambini: 0 });

  const [nuovaIndisp, setNuovaIndisp] = useState({ cameraId: 0, dal: "", al: "", motivo: "" });

  useEffect(() => {
    if (dati.tipiCamera[0] && nuovaCamera.tipoCameraId === 0) {
      setNuovaCamera((n) => ({ ...n, tipoCameraId: dati.tipiCamera[0].id }));
    }
    if (dati.camere[0] && nuovaIndisp.cameraId === 0) {
      setNuovaIndisp((n) => ({ ...n, cameraId: dati.camere[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dati]);

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
    <div className="flex w-full min-w-0 flex-col gap-6 p-3 sm:p-6">
      <h1 className="text-xl font-bold">Gestione camere</h1>
      <Suggerimento id="gestione-camere" titolo="Come si configurano le camere">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Crea i <strong>tipi camera</strong> (singola, doppia, suite…): i prezzi dei listini sono per tipo. Qui indichi anche quanti letti aggiunti sono possibili, se gli animali sono ammessi e il prezzo all&apos;ora proposto per l&apos;uso diurno (day use).</li>
          <li>Aggiungi le <strong>camere</strong> con numero, tipo, piano e capienza.</li>
          <li>Per una camera in manutenzione usa <strong>Fuori servizio</strong>: nel periodo indicato non si può prenotare.</li>
        </ol>
      </Suggerimento>

      {errore && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{errore}</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Tipi camera */}
        <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-stone-900">Tipi camera</h2>
          <table className="mb-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-stone-500">
              <tr><th className="pb-1">Codice</th><th className="pb-1">Descrizione</th><th className="pb-1" title="Letti aggiunti possibili oltre la capienza">Letti agg.</th><th className="pb-1">Animali</th><th className="pb-1" title="Prezzo all'ora proposto per l'uso diurno (day use)">Day use €/ora</th><th className="pb-1" title="Aggiunta da sola, una volta per soggiorno, a ogni nuova prenotazione di questo tipo">Pulizia finale €</th></tr>
            </thead>
            <tbody>
              {dati.tipiCamera.map((t) => (
                <tr key={t.id} className="border-t border-stone-100">
                  <td className="py-1.5 font-mono">{t.codice}</td>
                  <td className="py-1.5">{t.descrizione}</td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      disabled={busy}
                      className="w-14 rounded-md border border-stone-300 px-1.5 py-0.5 text-sm"
                      defaultValue={t.lettiAggiuntiMax}
                      onBlur={(e) => {
                        const v = Number(e.target.value || 0);
                        if (v !== t.lettiAggiuntiMax) eseguendo(() => sbusta(azioneOpzioniTipoCamera(t.id, v, t.animaliAmmessi)));
                      }}
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={t.animaliAmmessi}
                      onChange={(e) => eseguendo(() => sbusta(azioneOpzioniTipoCamera(t.id, t.lettiAggiuntiMax, e.target.checked)))}
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      disabled={busy}
                      placeholder="—"
                      className="w-20 rounded-md border border-stone-300 px-1.5 py-0.5 text-sm"
                      defaultValue={t.prezzoOraUsoDiurno ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim() === "" ? null : Number(e.target.value);
                        if (v !== t.prezzoOraUsoDiurno) eseguendo(() => sbusta(azionePrezzoUsoDiurno(t.id, v)));
                      }}
                    />
                  </td>
                  <td className="py-1.5">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      disabled={busy}
                      placeholder="—"
                      aria-label={`Pulizia finale ${t.descrizione}`}
                      className="w-20 rounded-md border border-stone-300 px-1.5 py-0.5 text-sm"
                      defaultValue={t.puliziaFinale ?? ""}
                      onBlur={(e) => {
                        const v = e.target.value.trim() === "" ? null : Number(e.target.value);
                        if (v !== t.puliziaFinale) eseguendo(() => sbusta(azionePuliziaFinale(t.id, v)));
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-2">
            <input className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Codice" value={nuovoTipoCodice} onChange={(e) => setNuovoTipoCodice(e.target.value)} />
            <input className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Descrizione (es. Tripla)" value={nuovoTipoDescrizione} onChange={(e) => setNuovoTipoDescrizione(e.target.value)} />
            <button
              disabled={busy || !nuovoTipoCodice || !nuovoTipoDescrizione}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
              onClick={() =>
                eseguendo(async () => {
                  const r = await sbusta(azioneCreaTipoCamera(nuovoTipoCodice, nuovoTipoDescrizione));
                  setNuovoTipoCodice("");
                  setNuovoTipoDescrizione("");
                  return r;
                })
              }
            >
              + Aggiungi
            </button>
          </div>
        </section>

        {/* Manutenzione */}
        <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-sm font-bold text-stone-900">Fuori servizio / manutenzione</h2>
          <table className="tabella-responsive mb-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-stone-500">
              <tr><th className="pb-1">Camera</th><th className="pb-1">Dal</th><th className="pb-1">Al</th><th className="pb-1">Motivo</th><th /></tr>
            </thead>
            <tbody>
              {dati.indisponibilita.map((i) => (
                <tr key={i.id} className="border-t border-stone-100">
                  <td data-label="Camera" className="py-1.5 font-semibold">{i.cameraCodice}</td>
                  <td data-label="Dal" className="py-1.5 font-mono">{formattaIt(i.dal)}</td>
                  <td data-label="Al" className="py-1.5 font-mono">{formattaIt(i.al)}</td>
                  <td data-label="Motivo" className="py-1.5">{i.motivo}</td>
                  <td className="cella-intera py-1.5 md:text-right">
                    <button className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => eseguendo(() => sbusta(azioneEliminaIndisponibilita(i.id)))}>
                      Rimuovi
                    </button>
                  </td>
                </tr>
              ))}
              {dati.indisponibilita.length === 0 && (
                <tr><td colSpan={5} className="cella-intera py-2 text-stone-500">Nessuna camera fuori servizio in programma.</td></tr>
              )}
            </tbody>
          </table>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-stone-600">Camera</label>
              <select className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovaIndisp.cameraId} onChange={(e) => setNuovaIndisp({ ...nuovaIndisp, cameraId: Number(e.target.value) })}>
                {dati.camere.map((c) => <option key={c.id} value={c.id}>{c.codice}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-600">Dal</label>
              <input type="date" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovaIndisp.dal} onChange={(e) => setNuovaIndisp({ ...nuovaIndisp, dal: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-600">Al</label>
              <input type="date" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovaIndisp.al} onChange={(e) => setNuovaIndisp({ ...nuovaIndisp, al: e.target.value })} />
            </div>
            <input className="min-w-[12rem] flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Motivo (es. rifacimento bagno)" value={nuovaIndisp.motivo} onChange={(e) => setNuovaIndisp({ ...nuovaIndisp, motivo: e.target.value })} />
            <button
              disabled={busy || !nuovaIndisp.dal || !nuovaIndisp.al || !nuovaIndisp.motivo}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
              onClick={() =>
                eseguendo(async () => {
                  const r = await sbusta(azioneCreaIndisponibilita(nuovaIndisp));
                  setNuovaIndisp({ ...nuovaIndisp, dal: "", al: "", motivo: "" });
                  return r;
                })
              }
            >
              + Segna fuori servizio
            </button>
          </div>
        </section>
      </div>

      {/* Camere */}
      <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-900">Camere</h2>
        <table className="tabella-responsive mb-4 w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr><th className="pb-1">Codice</th><th className="pb-1">Piano</th><th className="pb-1">Tipo</th><th className="pb-1">Cap. adulti</th><th className="pb-1">Cap. bambini</th><th className="pb-1">Attiva</th></tr>
          </thead>
          <tbody>
            {dati.camere.map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td data-label="Codice" className="py-1.5 font-bold">{c.codice}</td>
                <td data-label="Piano" className="py-1.5">{c.piano ?? "—"}</td>
                <td data-label="Tipo" className="cella-intera py-1.5">
                  <select
                    className="rounded-md border border-stone-300 px-2 py-1 text-sm"
                    value={c.tipoCameraId}
                    onChange={(e) => eseguendo(() => sbusta(azioneCambiaTipoCamera(c.id, Number(e.target.value))))}
                  >
                    {dati.tipiCamera.map((t) => <option key={t.id} value={t.id}>{t.descrizione}</option>)}
                  </select>
                </td>
                <td data-label="Cap. adulti" className="py-1.5">{c.capienzaAdulti}</td>
                <td data-label="Cap. bambini" className="py-1.5">{c.capienzaBambini}</td>
                <td data-label="Stato" className="py-1.5">
                  <button
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                    onClick={() => eseguendo(() => sbusta(azioneImpostaCameraAttiva(c.id, !c.attivo)))}
                  >
                    {c.attivo ? "Attiva" : "Disattivata"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
          <div>
            <label className="mb-1 block text-xs text-stone-600">Codice</label>
            <input className="w-20 rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovaCamera.codice} onChange={(e) => setNuovaCamera({ ...nuovaCamera, codice: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Piano</label>
            <input className="w-28 rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Piano 1" value={nuovaCamera.piano} onChange={(e) => setNuovaCamera({ ...nuovaCamera, piano: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Tipo</label>
            <select className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovaCamera.tipoCameraId} onChange={(e) => setNuovaCamera({ ...nuovaCamera, tipoCameraId: Number(e.target.value) })}>
              {dati.tipiCamera.map((t) => <option key={t.id} value={t.id}>{t.descrizione}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Cap. adulti</label>
            <input type="number" min={1} className="w-20 rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovaCamera.capienzaAdulti} onChange={(e) => setNuovaCamera({ ...nuovaCamera, capienzaAdulti: Number(e.target.value) })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Cap. bambini</label>
            <input type="number" min={0} className="w-20 rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovaCamera.capienzaBambini} onChange={(e) => setNuovaCamera({ ...nuovaCamera, capienzaBambini: Number(e.target.value) })} />
          </div>
          <button
            disabled={busy || !nuovaCamera.codice || !nuovaCamera.tipoCameraId}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
            onClick={() =>
              eseguendo(async () => {
                const r = await sbusta(azioneCreaCamera(nuovaCamera));
                setNuovaCamera({ ...nuovaCamera, codice: "" });
                return r;
              })
            }
          >
            + Aggiungi camera
          </button>
        </div>
      </section>
    </div>
  );
}
