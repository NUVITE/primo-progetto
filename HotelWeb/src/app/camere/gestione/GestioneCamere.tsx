"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  azioneCambiaTipoCamera,
  azioneCreaCamera,
  azioneCreaIndisponibilita,
  azioneCreaTipoCamera,
  azioneEliminaIndisponibilita,
  azioneImpostaCameraAttiva,
  datiGestione,
} from "./actions";

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
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Gestione camere</h1>
        <Link href="/" className="rounded-md border border-teal-700 px-4 py-2 text-sm font-bold text-teal-700">
          Situazione camere
        </Link>
      </div>

      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Tipi camera */}
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Tipi camera</h2>
          <table className="mb-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-stone-500">
              <tr><th className="pb-1">Codice</th><th className="pb-1">Descrizione</th></tr>
            </thead>
            <tbody>
              {dati.tipiCamera.map((t) => (
                <tr key={t.id} className="border-t border-stone-100">
                  <td className="py-1.5 font-mono">{t.codice}</td>
                  <td className="py-1.5">{t.descrizione}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <input className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Codice" value={nuovoTipoCodice} onChange={(e) => setNuovoTipoCodice(e.target.value)} />
            <input className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Descrizione (es. Tripla)" value={nuovoTipoDescrizione} onChange={(e) => setNuovoTipoDescrizione(e.target.value)} />
            <button
              disabled={busy || !nuovoTipoCodice || !nuovoTipoDescrizione}
              className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
              onClick={() =>
                eseguendo(async () => {
                  const r = await azioneCreaTipoCamera(nuovoTipoCodice, nuovoTipoDescrizione);
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
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Fuori servizio / manutenzione</h2>
          <table className="mb-4 w-full text-sm">
            <thead className="text-left text-xs uppercase text-stone-500">
              <tr><th className="pb-1">Camera</th><th className="pb-1">Dal</th><th className="pb-1">Al</th><th className="pb-1">Motivo</th><th /></tr>
            </thead>
            <tbody>
              {dati.indisponibilita.map((i) => (
                <tr key={i.id} className="border-t border-stone-100">
                  <td className="py-1.5 font-semibold">{i.cameraCodice}</td>
                  <td className="py-1.5 font-mono">{formattaIt(i.dal)}</td>
                  <td className="py-1.5 font-mono">{formattaIt(i.al)}</td>
                  <td className="py-1.5">{i.motivo}</td>
                  <td className="py-1.5 text-right">
                    <button className="text-xs font-semibold text-red-600" onClick={() => eseguendo(() => azioneEliminaIndisponibilita(i.id))}>
                      Rimuovi
                    </button>
                  </td>
                </tr>
              ))}
              {dati.indisponibilita.length === 0 && (
                <tr><td colSpan={5} className="py-2 text-stone-500">Nessuna camera fuori servizio in programma.</td></tr>
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
            <input className="flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Motivo (es. rifacimento bagno)" value={nuovaIndisp.motivo} onChange={(e) => setNuovaIndisp({ ...nuovaIndisp, motivo: e.target.value })} />
            <button
              disabled={busy || !nuovaIndisp.dal || !nuovaIndisp.al || !nuovaIndisp.motivo}
              className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
              onClick={() =>
                eseguendo(async () => {
                  const r = await azioneCreaIndisponibilita(nuovaIndisp);
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
      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Camere</h2>
        <table className="mb-4 w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr><th className="pb-1">Codice</th><th className="pb-1">Piano</th><th className="pb-1">Tipo</th><th className="pb-1">Cap. adulti</th><th className="pb-1">Cap. bambini</th><th className="pb-1">Attiva</th></tr>
          </thead>
          <tbody>
            {dati.camere.map((c) => (
              <tr key={c.id} className="border-t border-stone-100">
                <td className="py-1.5 font-bold">{c.codice}</td>
                <td className="py-1.5">{c.piano ?? "—"}</td>
                <td className="py-1.5">
                  <select
                    className="rounded-md border border-stone-300 px-2 py-1 text-sm"
                    value={c.tipoCameraId}
                    onChange={(e) => eseguendo(() => azioneCambiaTipoCamera(c.id, Number(e.target.value)))}
                  >
                    {dati.tipiCamera.map((t) => <option key={t.id} value={t.id}>{t.descrizione}</option>)}
                  </select>
                </td>
                <td className="py-1.5">{c.capienzaAdulti}</td>
                <td className="py-1.5">{c.capienzaBambini}</td>
                <td className="py-1.5">
                  <button
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                    onClick={() => eseguendo(() => azioneImpostaCameraAttiva(c.id, !c.attivo))}
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
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            onClick={() =>
              eseguendo(async () => {
                const r = await azioneCreaCamera(nuovaCamera);
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
