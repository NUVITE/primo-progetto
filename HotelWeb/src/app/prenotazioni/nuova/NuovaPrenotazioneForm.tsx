"use client";

import { conUnita } from "@/lib/funzioniRegole";
import { sbusta, type ValoreDi } from "@/lib/esito";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BedDouble, Check, Plus, Trash2 } from "lucide-react";
import { Avviso, Campo, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";
import { OspiteSearch, type OspiteValue } from "./OspiteSearch";
import { anteprimaSegmento, datiIniziali, salvaPrenotazione } from "./actions";
import { CampoComposizione } from "../CampoComposizione";
import type { Composizione } from "@/lib/pricing";

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
  composizione: Composizione;
  anteprima: Anteprima | null;
};

function nuovoSegmento(listinoId: number | null, trattamento: string): Segmento {
  return {
    chiave: crypto.randomUUID(),
    cameraId: null,
    ospite: { mode: "vuoto" },
    trattamento,
    listinoId,
    dataInizio: "",
    dataFine: "",
    composizione: { adulti: 2, etaBambini: [] },
    anteprima: null,
  };
}

export function NuovaPrenotazioneForm() {
  const [camere, setCamere] = useState<Camera[]>([]);
  const [listini, setListini] = useState<Listino[]>([]);
  const [caricato, setCaricato] = useState(false);
  // Scelte per provenienza e garanzia (canali, mezzi, aziende/agenzie/portali, orario limite).
  const [scelte, setScelte] = useState<Pick<Awaited<ReturnType<typeof datiIniziali>>, "canali" | "mezzi" | "garanzie" | "intermediari" | "orarioLimiteArrivo">>({
    canali: [],
    mezzi: [],
    garanzie: [],
    intermediari: [],
    orarioLimiteArrivo: "18:00",
  });
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);

  const [ospitePrenotante, setOspitePrenotante] = useState<OspiteValue>({ mode: "vuoto" });
  const [gruppoAttivo, setGruppoAttivo] = useState(false);
  const [gruppoNome, setGruppoNome] = useState("");
  const [segmenti, setSegmenti] = useState<Segmento[]>([]);
  const [accontoRichiesto, setAccontoRichiesto] = useState("");
  const [accontoEntro, setAccontoEntro] = useState("");
  const [scadenzaOpzione, setScadenzaOpzione] = useState("");
  // Provenienza e garanzia: diretta e senza garanzia se non si indica altro.
  const [provenienza, setProvenienza] = useState({ canale: "diretta", mezzo: "", intermediarioId: "", garanzia: "nessuna", oraArrivo: "" });

  const [trattamenti, setTrattamenti] = useState<string[]>([]);
  // Struttura: funzioni spente (es. gruppi) e nome delle unità (camera o appartamento).
  const [struttura, setStruttura] = useState<{ spente: string[]; unita: { singolare: string; plurale: string; femminile: boolean } }>({
    spente: [],
    unita: { singolare: "camera", plurale: "camere", femminile: true },
  });
  const u = (testo: string) => conUnita(testo, struttura.unita);
  // Concordanze: "la camera / le camere" ma "l'appartamento / gli appartamenti".
  const f = struttura.unita.femminile;
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<ValoreDi<typeof salvaPrenotazione> | null>(null);

  useEffect(() => {
    datiIniziali()
      .then((d) => {
        setCamere(d.camere);
        setListini(d.listini);
        setScelte({ canali: d.canali, mezzi: d.mezzi, garanzie: d.garanzie, intermediari: d.intermediari, orarioLimiteArrivo: d.orarioLimiteArrivo });
        setTrattamenti(d.trattamenti);
        setStruttura({ spente: d.funzioniSpente, unita: d.unita });
        if (d.giorniOpzione > 0) {
          const scad = new Date();
          scad.setDate(scad.getDate() + d.giorniOpzione);
          setScadenzaOpzione(`${scad.getFullYear()}-${String(scad.getMonth() + 1).padStart(2, "0")}-${String(scad.getDate()).padStart(2, "0")}`);
        }
        setSegmenti([nuovoSegmento(d.listini[0]?.id ?? null, d.trattamenti[0] ?? "")]);
        setCaricato(true);
      })
      .catch((e) => {
        setErroreCaricamento(e instanceof Error ? e.message : "Errore imprevisto nel caricamento.");
      });
  }, []);

  // Ricalcola l'anteprima di un segmento quando cambiano camera/listino/date/trattamento/persone.
  useEffect(() => {
    segmenti.forEach((seg, idx) => {
      if (!seg.cameraId || !seg.listinoId || !seg.dataInizio || !seg.dataFine) return;
      const timer = setTimeout(async () => {
        // Composizione non valida (es. nessuna persona): niente anteprima, l'errore arriva al salvataggio.
        const anteprima = await sbusta(anteprimaSegmento({
          cameraId: seg.cameraId!,
          listinoId: seg.listinoId!,
          dataInizio: seg.dataInizio,
          dataFine: seg.dataFine,
          trattamento: seg.trattamento,
          composizione: seg.composizione,
        })).catch(() => null);
        setSegmenti((prev) => {
          const next = [...prev];
          if (next[idx] && next[idx].chiave === seg.chiave) next[idx] = { ...next[idx], anteprima };
          return next;
        });
      }, 200);
      return () => clearTimeout(timer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmenti.map((s) => `${s.cameraId}-${s.listinoId}-${s.dataInizio}-${s.dataFine}-${s.trattamento}-${JSON.stringify(s.composizione)}`).join("|")]);

  function aggiornaSegmento(idx: number, patch: Partial<Segmento>) {
    setSegmenti((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function aggiungiSegmento() {
    setSegmenti((prev) => [...prev, nuovoSegmento(listini[0]?.id ?? null, trattamenti[0] ?? "")]);
  }

  function rimuoviSegmento(idx: number) {
    setSegmenti((prev) => prev.filter((_, i) => i !== idx));
  }

  const totali = useMemo(() => {
    const subtotale = segmenti.reduce((t, s) => t + (s.anteprima?.subtotale ?? 0), 0);
    const tassa = segmenti.reduce((t, s) => t + (s.anteprima?.tassaStimata ?? 0), 0);
    const pulizie = segmenti.reduce((t, s) => t + (s.anteprima?.puliziaFinale ?? 0), 0);
    return { subtotale, tassa, pulizie, totale: subtotale + pulizie + tassa };
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
        scadenzaOpzione: scadenzaOpzione || undefined,
        accontoEntro: accontoEntro || undefined,
        provenienza: {
          canale: provenienza.canale,
          mezzo: provenienza.mezzo || null,
          intermediarioId: provenienza.canale !== "diretta" && provenienza.intermediarioId ? Number(provenienza.intermediarioId) : null,
          garanzia: provenienza.garanzia,
          oraArrivo: provenienza.oraArrivo || null,
        },
        segmenti: segmenti.map((s) => ({
          cameraId: s.cameraId!,
          tipoCameraId: camere.find((c) => c.id === s.cameraId)!.tipoCameraId,
          ospite: ospiteValueToInput(s.ospite),
          trattamento: s.trattamento,
          listinoId: s.listinoId!,
          dataInizio: s.dataInizio,
          dataFine: s.dataFine,
          composizione: s.composizione,
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
    return (
      <div className="p-3 sm:p-6">
        <Avviso tipo="errore">{erroreCaricamento}</Avviso>
      </div>
    );
  }

  if (!caricato) {
    return <div className="p-6 text-sm text-stone-600">Caricamento...</div>;
  }

  if (esito) {
    return (
      <div className="p-3 sm:p-6">
        <Sezione className="mx-auto max-w-lg" titolo={`Prenotazione #${esito.id} creata`}>
          <Avviso tipo="ok">Ospite prenotante: {esito.ospitePrenotante}</Avviso>
          {esito.importiVisibili && (
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotale soggiorno</dt><dd className="font-mono">€ {esito.subtotale.toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt>Tassa di soggiorno</dt><dd className="font-mono">€ {esito.tassa.toFixed(2)}</dd></div>
              <div className="flex justify-between border-t border-stone-200 pt-1 text-base font-bold"><dt>Totale</dt><dd className="font-mono">€ {esito.totale.toFixed(2)}</dd></div>
            </dl>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/prenotazioni/${esito.id}`} className="inline-flex h-8 items-center rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 pointer-coarse:h-10">
              Apri la prenotazione
            </Link>
            <Pulsante icona={Plus} onClick={() => window.location.reload()}>
              Nuova prenotazione
            </Pulsante>
          </div>
        </Sezione>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Nuova prenotazione" />
      <Suggerimento id="nuova-prenotazione" titolo="Come si fa una prenotazione">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Cerca chi prenota per nome o cognome; se non c&apos;è, crealo dal menu della ricerca.</li>
          <li>
            {u("Per ogni {camera} scegli {camera}, arrivo e partenza, listino e trattamento, e indica le")} <strong>persone</strong> (adulti ed età dei
            bambini): servono per il prezzo.
          </li>
          <li>Il prezzo si calcola mentre compili; controlla il riepilogo e premi <strong>Conferma prenotazione</strong>.</li>
        </ol>
        <p>{u(`Per bloccare più {camere} senza ${f ? "sceglierle" : "sceglierli"} subito, trascina le date sul Planning {camere} (prenotazione veloce).`)}</p>
      </Suggerimento>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4 xl:max-w-3xl">
          <Sezione titolo="Ospite prenotante">
            <OspiteSearch value={ospitePrenotante} onChange={setOspitePrenotante} etichetta="Chi prenota" />
            {!struttura.spente.includes("gruppi") && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Spunta etichetta="Fa parte di un gruppo" checked={gruppoAttivo} onChange={(e) => setGruppoAttivo(e.target.checked)} />
              {gruppoAttivo && <Input className="max-w-xs" placeholder="Nome del gruppo" value={gruppoNome} onChange={(e) => setGruppoNome(e.target.value)} />}
            </div>
            )}
          </Sezione>

          <Sezione
            titolo={u("{Camere} e soggiorni")}
            azioni={
              <Pulsante icona={Plus} onClick={aggiungiSegmento}>
                {u("Aggiungi {camera}")}
              </Pulsante>
            }
            corpoClassName="flex flex-col gap-4"
          >
            {segmenti.map((seg, idx) => (
              <div key={seg.chiave} className="rounded-md border border-stone-200 bg-stone-50/60 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold text-stone-900">
                    <BedDouble className="h-4 w-4 text-teal-700" aria-hidden />
                    {u("{Camera}")} {idx + 1}
                  </span>
                  {segmenti.length > 1 && (
                    <Pulsante variante="pericolo" dimensione="piccolo" icona={Trash2} onClick={() => rimuoviSegmento(idx)}>
                      Rimuovi
                    </Pulsante>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Campo etichetta={u("{Camera}")} obbligatorio className="lg:col-span-2">
                    <Select value={seg.cameraId ?? ""} onChange={(e) => aggiornaSegmento(idx, { cameraId: Number(e.target.value) })}>
                      <option value="" disabled>Seleziona...</option>
                      {camere.map((c) => (
                        <option key={c.id} value={c.id}>{c.codice} — {c.tipoCameraNome}</option>
                      ))}
                    </Select>
                  </Campo>
                  <Campo etichetta="Arrivo" obbligatorio>
                    <Input type="date" value={seg.dataInizio} onChange={(e) => aggiornaSegmento(idx, { dataInizio: e.target.value })} />
                  </Campo>
                  <Campo etichetta="Partenza" obbligatorio>
                    <Input type="date" value={seg.dataFine} min={seg.dataInizio || undefined} onChange={(e) => aggiornaSegmento(idx, { dataFine: e.target.value })} />
                  </Campo>
                  {/* Con un solo listino o un solo trattamento la scelta non serve: si usa quello. */}
                  {listini.length > 1 && (
                  <Campo etichetta="Listino" className="lg:col-span-2">
                    <Select value={seg.listinoId ?? ""} onChange={(e) => aggiornaSegmento(idx, { listinoId: Number(e.target.value) })}>
                      {listini.map((l) => (
                        <option key={l.id} value={l.id}>{l.descrizione}</option>
                      ))}
                    </Select>
                  </Campo>
                  )}
                  {trattamenti.length > 1 && (
                  <Campo etichetta="Trattamento" className="lg:col-span-2">
                    <Select value={seg.trattamento} onChange={(e) => aggiornaSegmento(idx, { trattamento: e.target.value })}>
                      {trattamenti.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                  </Campo>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-stone-700">{u("Persone in {camera}")} <span className="font-normal text-stone-500">(base del prezzo)</span></span>
                  <CampoComposizione valore={seg.composizione} onChange={(c) => aggiornaSegmento(idx, { composizione: c })} />
                </div>

                <div className="mt-3">
                  <OspiteSearch value={seg.ospite} onChange={(v) => aggiornaSegmento(idx, { ospite: v })} etichetta={u(f ? "Intestatario della {camera}" : "Intestatario dell'{camera}")} />
                </div>

                {seg.anteprima && (
                  <div className="mt-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold text-stone-900">
                        {seg.anteprima.notti} {seg.anteprima.notti === 1 ? "notte" : "notti"} · € {seg.anteprima.subtotale.toFixed(2)}
                        {seg.anteprima.puliziaFinale > 0 && <span className="font-normal text-stone-600"> + pulizia finale € {seg.anteprima.puliziaFinale.toFixed(2)}</span>}
                      </span>
                      <span className="text-xs text-stone-600">
                        {seg.anteprima.regolamento
                          ? `Tassa stimata (${seg.anteprima.regolamento.comune}): € ${seg.anteprima.tassaStimata.toFixed(2)}`
                          : "Nessuna tassa di soggiorno per questo comune"}
                      </span>
                    </div>
                    {seg.anteprima.dettaglioPrimaNotte.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 border-t border-stone-100 pt-1.5 text-xs text-stone-600">
                        <li className="font-semibold text-stone-700">Prima notte</li>
                        {seg.anteprima.dettaglioPrimaNotte.map((r, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span>{r.voce}</span>
                            <span className="font-mono">€ {r.importo.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {seg.anteprima.nottiSenzaTariffa > 0 && (
                      <Avviso tipo="avviso" className="mt-2">
                        {seg.anteprima.nottiSenzaTariffa} notti senza tariffa nel listino: il totale è incompleto.
                      </Avviso>
                    )}
                    {seg.anteprima.avvisi.map((a) => (
                      <Avviso key={a} tipo="avviso" className="mt-2">
                        {a}
                      </Avviso>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Sezione>
        </div>

        <Sezione titolo="Riepilogo" className="xl:sticky xl:top-6 xl:w-96 xl:flex-shrink-0">
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotale soggiorno</dt><dd className="font-mono">€ {totali.subtotale.toFixed(2)}</dd></div>
            {totali.pulizie > 0 && <div className="flex justify-between"><dt>Pulizia finale</dt><dd className="font-mono">€ {totali.pulizie.toFixed(2)}</dd></div>}
            <div className="flex justify-between text-stone-600"><dt>Tassa di soggiorno (stimata)</dt><dd className="font-mono">€ {totali.tassa.toFixed(2)}</dd></div>
            <div className="flex justify-between border-t border-stone-200 pt-1 text-base font-bold"><dt>Totale stimato</dt><dd className="font-mono">€ {totali.totale.toFixed(2)}</dd></div>
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Campo etichetta="Canale">
              <Select value={provenienza.canale} onChange={(e) => setProvenienza({ ...provenienza, canale: e.target.value })}>
                {scelte.canali.map((c) => (
                  <option key={c.valore} value={c.valore}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Mezzo">
              <Select value={provenienza.mezzo} onChange={(e) => setProvenienza({ ...provenienza, mezzo: e.target.value })}>
                <option value="">—</option>
                {scelte.mezzi.map((m) => (
                  <option key={m.valore} value={m.valore}>
                    {m.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            {provenienza.canale !== "diretta" && (
              <Campo etichetta="Tramite" className="col-span-2" aiuto={scelte.intermediari.length ? undefined : "Aziende, agenzie e portali si aggiungono in Anagrafiche > Clienti e aziende."}>
                <Select value={provenienza.intermediarioId} onChange={(e) => setProvenienza({ ...provenienza, intermediarioId: e.target.value })}>
                  <option value="">—</option>
                  {scelte.intermediari.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.denominazione}
                    </option>
                  ))}
                </Select>
              </Campo>
            )}
            <Campo etichetta="Garanzia" aiuto={provenienza.garanzia === "nessuna" ? `Senza garanzia, dopo le ${scelte.orarioLimiteArrivo} è un possibile no-show.` : undefined}>
              <Select value={provenienza.garanzia} onChange={(e) => setProvenienza({ ...provenienza, garanzia: e.target.value })}>
                {scelte.garanzie.map((g) => (
                  <option key={g.valore} value={g.valore}>
                    {g.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Ora di arrivo">
              <Input type="time" value={provenienza.oraArrivo} onChange={(e) => setProvenienza({ ...provenienza, oraArrivo: e.target.value })} />
            </Campo>
            <Campo etichetta="Acconto richiesto">
              <Input inputMode="decimal" value={accontoRichiesto} onChange={(e) => setAccontoRichiesto(e.target.value)} placeholder="€ 0,00" />
            </Campo>
            <Campo etichetta="Acconto entro il">
              <Input type="date" value={accontoEntro} onChange={(e) => setAccontoEntro(e.target.value)} />
            </Campo>
          </div>
          <Campo etichetta="Opzione valida fino al" aiuto="La prenotazione nasce in opzione: a scadenza compare un avviso, non si annulla da sola." className="mt-2">
            <Input type="date" value={scadenzaOpzione} onChange={(e) => setScadenzaOpzione(e.target.value)} />
          </Campo>

          {errore && <Avviso tipo="errore" className="mt-3">{errore}</Avviso>}
          {!formValido && !errore && (
            <p className="mt-3 text-xs text-stone-500">Per confermare servono chi prenota e, per ogni camera, camera, date e intestatario.</p>
          )}

          <Pulsante variante="primario" icona={Check} disabled={!formValido || salvando} onClick={handleSalva} className="mt-3 w-full">
            {salvando ? "Salvataggio..." : "Conferma prenotazione"}
          </Pulsante>
        </Sezione>
      </div>
    </div>
  );
}

function ospiteValueToInput(v: OspiteValue) {
  if (v.mode === "esistente") return { id: v.id };
  if (v.mode === "nuovo") return { nome: v.nome, cognome: v.cognome };
  throw new Error("Ospite non selezionato.");
}
