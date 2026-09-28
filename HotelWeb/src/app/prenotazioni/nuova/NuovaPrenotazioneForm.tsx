"use client";

import { sbusta, type ValoreDi } from "@/lib/esito";
import { useEffect, useMemo, useState } from "react";
import { OspiteSearch, type OspiteValue } from "./OspiteSearch";
import { anteprimaSegmento, datiIniziali, salvaPrenotazione } from "./actions";

type Camera = { id: number; codice: string; tipoCameraId: number; tipoCameraNome: string };
type Listino = { id: number; descrizione: string; tipo: string };

type Anteprima = ValoreDi<typeof anteprimaSegmento>;

type Segmento = {
  chiave: string;
  cameraId: number | null;
  ospite: OspiteValue;
  trattamento: string;
  listinoId: number | null;
  dataInizio: string;
  dataFine: string;
  anteprima: Anteprima | null;
};

const TRATTAMENTI = ["Mezza pensione", "Pensione completa", "B&B"];

function nuovoSegmento(listinoId: number | null): Segmento {
  return {
    chiave: crypto.randomUUID(),
    cameraId: null,
    ospite: { mode: "vuoto" },
    trattamento: TRATTAMENTI[0],
    listinoId,
    dataInizio: "",
    dataFine: "",
    anteprima: null,
  };
}

export function NuovaPrenotazioneForm() {
  const [camere, setCamere] = useState<Camera[]>([]);
  const [listini, setListini] = useState<Listino[]>([]);
  const [caricato, setCaricato] = useState(false);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);

  const [ospitePrenotante, setOspitePrenotante] = useState<OspiteValue>({ mode: "vuoto" });
  const [gruppoAttivo, setGruppoAttivo] = useState(false);
  const [gruppoNome, setGruppoNome] = useState("");
  const [segmenti, setSegmenti] = useState<Segmento[]>([]);
  const [accontoRichiesto, setAccontoRichiesto] = useState("");

  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<ValoreDi<typeof salvaPrenotazione> | null>(null);

  useEffect(() => {
    datiIniziali()
      .then((d) => {
        setCamere(d.camere);
        setListini(d.listini);
        setSegmenti([nuovoSegmento(d.listini[0]?.id ?? null)]);
        setCaricato(true);
      })
      .catch((e) => {
        setErroreCaricamento(e instanceof Error ? e.message : "Errore imprevisto nel caricamento.");
      });
  }, []);

  // Ricalcola l'anteprima di un segmento quando cambiano camera/listino/date.
  useEffect(() => {
    segmenti.forEach((seg, idx) => {
      if (!seg.cameraId || !seg.listinoId || !seg.dataInizio || !seg.dataFine) return;
      const timer = setTimeout(async () => {
        const anteprima = await sbusta(anteprimaSegmento({
          cameraId: seg.cameraId!,
          listinoId: seg.listinoId!,
          dataInizio: seg.dataInizio,
          dataFine: seg.dataFine,
        }));
        setSegmenti((prev) => {
          const next = [...prev];
          if (next[idx] && next[idx].chiave === seg.chiave) next[idx] = { ...next[idx], anteprima };
          return next;
        });
      }, 200);
      return () => clearTimeout(timer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmenti.map((s) => `${s.cameraId}-${s.listinoId}-${s.dataInizio}-${s.dataFine}`).join("|")]);

  function aggiornaSegmento(idx: number, patch: Partial<Segmento>) {
    setSegmenti((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function aggiungiSegmento() {
    setSegmenti((prev) => [...prev, nuovoSegmento(listini[0]?.id ?? null)]);
  }

  function rimuoviSegmento(idx: number) {
    setSegmenti((prev) => prev.filter((_, i) => i !== idx));
  }

  const totali = useMemo(() => {
    const subtotale = segmenti.reduce((t, s) => t + (s.anteprima?.subtotale ?? 0), 0);
    const tassa = segmenti.reduce((t, s) => t + (s.anteprima?.tassaStimata ?? 0), 0);
    return { subtotale, tassa, totale: subtotale + tassa };
  }, [segmenti]);

  function ospiteValidoPerInvio(o: OspiteValue) {
    return o.mode === "esistente" || o.mode === "nuovo";
  }

  const formValido =
    ospiteValidoPerInvio(ospitePrenotante) &&
    segmenti.length > 0 &&
    segmenti.every((s) => s.cameraId && s.listinoId && s.dataInizio && s.dataFine && ospiteValidoPerInvio(s.ospite));

  async function handleSalva() {
    setErrore(null);
    setSalvando(true);
    try {
      const risultato = await sbusta(salvaPrenotazione({
        ospitePrenotante: ospiteValueToInput(ospitePrenotante),
        gruppoNome: gruppoAttivo && gruppoNome.trim() ? gruppoNome.trim() : undefined,
        accontoRichiesto: accontoRichiesto ? Number(accontoRichiesto) : undefined,
        segmenti: segmenti.map((s) => ({
          cameraId: s.cameraId!,
          tipoCameraId: camere.find((c) => c.id === s.cameraId)!.tipoCameraId,
          ospite: ospiteValueToInput(s.ospite),
          trattamento: s.trattamento,
          listinoId: s.listinoId!,
          dataInizio: s.dataInizio,
          dataFine: s.dataFine,
        })),
      }));
      setEsito(risultato);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto durante il salvataggio.");
    } finally {
      setSalvando(false);
    }
  }

  if (erroreCaricamento) {
    return <div className="p-8 text-sm font-semibold text-red-700">{erroreCaricamento}</div>;
  }

  if (!caricato) {
    return <div className="p-8 text-sm text-stone-600">Caricamento...</div>;
  }

  if (esito) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-bold text-emerald-800">Prenotazione #{esito.id} creata</h2>
        <p className="mt-1 text-sm text-emerald-900">Ospite prenotante: {esito.ospitePrenotante}</p>
        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotale soggiorno</span><span className="font-mono">€ {esito.subtotale.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tassa di soggiorno</span><span className="font-mono">€ {esito.tassa.toFixed(2)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Totale</span><span className="font-mono">€ {esito.totale.toFixed(2)}</span></div>
        </div>
        <button
          type="button"
          className="mt-6 rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800"
          onClick={() => window.location.reload()}
        >
          Nuova prenotazione
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <h1 className="text-xl font-bold">Nuova prenotazione</h1>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <div className="flex flex-1 flex-col gap-6 xl:max-w-3xl">

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Ospite prenotante</h2>
        <OspiteSearch value={ospitePrenotante} onChange={setOspitePrenotante} etichetta="Cerca per nome o cognome" />

        <div className="mt-4 flex items-center gap-2">
          <input id="gruppo" type="checkbox" checked={gruppoAttivo} onChange={(e) => setGruppoAttivo(e.target.checked)} />
          <label htmlFor="gruppo" className="text-sm">Fa parte di un gruppo</label>
          {gruppoAttivo && (
            <input
              className="ml-2 rounded-md border border-stone-300 px-2 py-1 text-sm"
              placeholder="Nome gruppo"
              value={gruppoNome}
              onChange={(e) => setGruppoNome(e.target.value)}
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-600">Camere e soggiorni</h2>
          <button type="button" onClick={aggiungiSegmento} className="rounded-md border border-teal-700 px-3 py-1.5 text-sm font-semibold text-teal-700">
            + Aggiungi camera / segmento
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {segmenti.map((seg, idx) => (
            <div key={seg.chiave} className="rounded-lg border border-stone-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Camera {idx + 1}</span>
                {segmenti.length > 1 && (
                  <button type="button" className="text-xs font-semibold text-red-600" onClick={() => rimuoviSegmento(idx)}>
                    Rimuovi
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-stone-600">Camera</label>
                  <select
                    className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                    value={seg.cameraId ?? ""}
                    onChange={(e) => aggiornaSegmento(idx, { cameraId: Number(e.target.value) })}
                  >
                    <option value="" disabled>Seleziona...</option>
                    {camere.map((c) => (
                      <option key={c.id} value={c.id}>{c.codice} — {c.tipoCameraNome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-stone-600">Trattamento</label>
                  <select
                    className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                    value={seg.trattamento}
                    onChange={(e) => aggiornaSegmento(idx, { trattamento: e.target.value })}
                  >
                    {TRATTAMENTI.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-stone-600">Check-in</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                    value={seg.dataInizio}
                    onChange={(e) => aggiornaSegmento(idx, { dataInizio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-stone-600">Check-out</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                    value={seg.dataFine}
                    onChange={(e) => aggiornaSegmento(idx, { dataFine: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-3">
                <OspiteSearch value={seg.ospite} onChange={(v) => aggiornaSegmento(idx, { ospite: v })} etichetta="Ospite di questa camera" />
              </div>

              {seg.anteprima && (
                <div className="mt-3 flex justify-between rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-600">
                  <span>{seg.anteprima.notti} notti · € {seg.anteprima.subtotale.toFixed(2)}</span>
                  {seg.anteprima.regolamento ? (
                    <span>Tassa stimata ({seg.anteprima.regolamento.comune}): € {seg.anteprima.tassaStimata.toFixed(2)}</span>
                  ) : (
                    <span>Nessuna tassa di soggiorno per questo comune</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 xl:sticky xl:top-6 xl:w-96 xl:flex-shrink-0">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Riepilogo</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotale soggiorno</span><span className="font-mono">€ {totali.subtotale.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tassa di soggiorno (stimata)</span><span className="font-mono">€ {totali.tassa.toFixed(2)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Totale stimato</span><span className="font-mono">€ {totali.totale.toFixed(2)}</span></div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs text-stone-600">Acconto richiesto</label>
          <input
            className="w-40 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            value={accontoRichiesto}
            onChange={(e) => setAccontoRichiesto(e.target.value)}
            placeholder="€ 0,00"
          />
        </div>

        {errore && <p className="mt-3 text-sm font-semibold text-red-600">{errore}</p>}

        <button
          type="button"
          disabled={!formValido || salvando}
          onClick={handleSalva}
          className="mt-4 w-full rounded-md bg-teal-700 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {salvando ? "Salvataggio..." : "Conferma prenotazione"}
        </button>
      </section>

      </div>
    </div>
  );
}

function ospiteValueToInput(v: OspiteValue) {
  if (v.mode === "esistente") return { id: v.id };
  if (v.mode === "nuovo") return { nome: v.nome, cognome: v.cognome };
  throw new Error("Ospite non selezionato.");
}
