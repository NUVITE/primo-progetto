"use client";

import { SezioneTassa } from "./SezioneTassa";
import { sbusta } from "@/lib/esito";
import { useEffect, useState } from "react";
import Link from "next/link";
import { OspiteSearch, type OspiteValue } from "../nuova/OspiteSearch";
import {
  azioneAccorciaEstendi,
  azioneAggiungiSegmento,
  azioneAggiungiServizio,
  azioneAssegnaCamera,
  azioneCambiaCamera,
  azioneModificaServizio,
  azioneRimuoviServizio,
  caricaPrenotazione,
  datiIniziali,
} from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Camera = { id: number; codice: string; tipoCameraId: number; tipoCameraNome: string };
type Listino = { id: number; descrizione: string; tipo: string };
type ServizioCatalogo = { id: number; nome: string; prezzo: number };

const TRATTAMENTI = ["Mezza pensione", "Pensione completa", "B&B"];

function eur(n: number) {
  return `€ ${n.toFixed(2)}`;
}

/** puoGestire=false: sola lettura. Gli importi arrivano già azzerati dal server se non visibili. */
export function PrenotazioneDettaglio({ iniziale, puoGestire, puoRiaprire }: { iniziale: Prenotazione; puoGestire: boolean; puoRiaprire: boolean }) {
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

  const [serviziCatalogo, setServiziCatalogo] = useState<ServizioCatalogo[]>([]);
  const [dettagliTotaliAperti, setDettagliTotaliAperti] = useState(false);
  const [servizioAperto, setServizioAperto] = useState(false);
  const [servizioCatalogoId, setServizioCatalogoId] = useState<number | "libero">("libero");
  const [servizioDescrizione, setServizioDescrizione] = useState("");
  const [servizioPrezzo, setServizioPrezzo] = useState("");
  const [servizioQuantita, setServizioQuantita] = useState("1");
  const [servizioAmbito, setServizioAmbito] = useState<"tutta" | "specifici">("tutta");
  const [servizioSegmenti, setServizioSegmenti] = useState<Set<number>>(new Set());
  const [servizioInModifica, setServizioInModifica] = useState<number | null>(null);
  const [servizioEditNome, setServizioEditNome] = useState("");
  const [servizioEditDaCatalogo, setServizioEditDaCatalogo] = useState(false);

  useEffect(() => {
    datiIniziali().then((d) => {
      setCamere(d.camere);
      setListini(d.listini);
      setServiziCatalogo(d.serviziCatalogo);
    });
  }, []);

  function resetFormServizio() {
    setServizioAperto(false);
    setServizioCatalogoId("libero");
    setServizioDescrizione("");
    setServizioPrezzo("");
    setServizioQuantita("1");
    setServizioAmbito("tutta");
    setServizioSegmenti(new Set());
    setServizioInModifica(null);
    setServizioEditNome("");
    setServizioEditDaCatalogo(false);
  }

  function iniziaModificaServizio(s: Prenotazione["serviziAggiunti"][number]) {
    setServizioInModifica(s.id);
    setServizioEditNome(s.nome);
    setServizioEditDaCatalogo(s.daCatalogo);
    setServizioDescrizione(s.descrizione ?? "");
    setServizioPrezzo(String(s.prezzoUnitario));
    setServizioQuantita(String(s.quantita));
    setServizioAmbito(s.segmenti.length === 0 ? "tutta" : "specifici");
    setServizioSegmenti(new Set(s.segmenti.map((sg) => sg.segmentoId)));
    setServizioAperto(true);
  }

  async function confermaAggiungiServizio() {
    const prezzo = Number(servizioPrezzo);
    if (!prezzo || prezzo <= 0) return;
    const risultato = await eseguendo(() =>
      servizioInModifica !== null
        ? sbusta(azioneModificaServizio(prenotazione.id, servizioInModifica, {
            descrizione: servizioEditDaCatalogo ? undefined : servizioDescrizione.trim(),
            prezzoUnitario: prezzo,
            quantita: Number(servizioQuantita) || 1,
            segmentoIds: servizioAmbito === "specifici" ? Array.from(servizioSegmenti) : undefined,
          }))
        : sbusta(azioneAggiungiServizio(prenotazione.id, {
            servizioCatalogoId: servizioCatalogoId === "libero" ? undefined : servizioCatalogoId,
            descrizione: servizioCatalogoId === "libero" ? servizioDescrizione.trim() : undefined,
            prezzoUnitario: prezzo,
            quantita: Number(servizioQuantita) || 1,
            segmentoIds: servizioAmbito === "specifici" ? Array.from(servizioSegmenti) : undefined,
          }))
    );
    if (risultato) {
      setPrenotazione(risultato);
      resetFormServizio();
    }
  }

  async function rimuoviServizio(servizioAggiuntoId: number) {
    const risultato = await eseguendo(() => sbusta(azioneRimuoviServizio(prenotazione.id, servizioAggiuntoId)));
    if (risultato) setPrenotazione(risultato);
  }

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
    const risultato = await eseguendo(() => sbusta(azioneAccorciaEstendi(segmentoId, valore)));
    if (risultato) {
      setPrenotazione(risultato);
      setModificaFine(null);
    }
  }

  async function confermaCambioCamera() {
    if (!cambioCamera || !cambioCamera.nuovaCameraId) return;
    const risultato = await eseguendo(() =>
      sbusta(azioneCambiaCamera(cambioCamera.segmentoId, cambioCamera.dataCambio, cambioCamera.nuovaCameraId!))
    );
    if (risultato) {
      setPrenotazione(risultato);
      setCambioCamera(null);
    }
  }

  async function confermaAssegnaCamera() {
    if (!assegnaCameraState || !assegnaCameraState.cameraId) return;
    const risultato = await eseguendo(() => sbusta(azioneAssegnaCamera(assegnaCameraState.segmentoId, assegnaCameraState.cameraId!)));
    if (risultato) {
      setPrenotazione(risultato);
      setAssegnaCameraState(null);
    }
  }

  async function confermaAggiungiSegmento() {
    if (!nuovaCameraId || !nuovoDal || !nuovoAl || nuovoOspite.mode === "vuoto" || !listini[0]) return;
    const ospite = nuovoOspite.mode === "esistente" ? { id: nuovoOspite.id } : { nome: nuovoOspite.nome, cognome: nuovoOspite.cognome };
    const risultato = await eseguendo(() =>
      sbusta(azioneAggiungiSegmento(prenotazione.id, {
        cameraId: nuovaCameraId,
        tipoCameraId: camere.find((c) => c.id === nuovaCameraId)!.tipoCameraId,
        ospite,
        trattamento: nuovoTrattamento,
        listinoId: listini[0].id,
        dataInizio: nuovoDal,
        dataFine: nuovoAl,
      }))
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

  const importi = prenotazione.importiVisibili;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-3 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-sm text-teal-700">← Situazione camere</Link>
          <h1 className="text-xl font-bold">Prenotazione #{prenotazione.id}</h1>
          <p className="text-sm text-stone-600">
            {prenotazione.ospitePrenotante} {prenotazione.gruppoNome && `· Gruppo: ${prenotazione.gruppoNome}`} · {prenotazione.stato}
          </p>
        </div>
      </div>

      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="flex flex-1 flex-col gap-4">
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="tabella-responsive w-full text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2">Camera</th>
                  <th className="px-3 py-2">Ospiti</th>
                  <th className="px-3 py-2">Check-in</th>
                  <th className="px-3 py-2">Check-out</th>
                  <th className="px-3 py-2">Notti</th>
                  {importi && <th className="px-3 py-2">Subtot.</th>}
                  {importi && <th className="px-3 py-2">Tassa</th>}
                  {puoGestire && <th className="px-3 py-2">Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {prenotazione.segmenti.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0 align-top">
                    <td data-label="Camera" className="px-3 py-2">
                      {s.cameraCodice ? (
                        <div className="font-semibold">{s.cameraCodice}</div>
                      ) : (
                        <div className="font-semibold text-amber-700">Da assegnare</div>
                      )}
                      <div className="text-xs text-stone-600">{s.tipoCameraNome}</div>
                    </td>
                    <td data-label="Ospiti" className="px-3 py-2">
                      {s.occupanti.map((o) => (
                        <div key={o.presenzaId}>
                          {o.nome}
                          {o.stato !== "attesa" && (
                            <span className={`ml-1 text-[10px] font-semibold uppercase ${o.stato === "partito" ? "text-emerald-700" : "text-teal-700"}`}>
                              {o.stato === "partito" ? "partito" : "arrivato"}
                            </span>
                          )}
                        </div>
                      ))}
                      <Link href={`/prenotazioni/${prenotazione.id}/checkin/${s.id}`} className="text-xs font-semibold text-teal-700 underline">
                        {s.occupanti.every((o) => o.stato === "attesa") ? "Check-in" : "Ospiti e check-out"}
                      </Link>
                    </td>
                    <td data-label="Check-in" className="px-3 py-2 font-mono">{s.dataInizio.split("-").reverse().join("/")}</td>
                    <td data-label="Check-out" className="px-3 py-2">
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
                      ) : !puoGestire ? (
                        <span className="font-mono">{s.dataFine.split("-").reverse().join("/")}</span>
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
                    <td data-label="Notti" className="px-3 py-2 font-mono">{s.notti}</td>
                    {importi && <td data-label="Subtotale" className="px-3 py-2 font-mono">
                      {eur(s.subtotale)}
                      {s.tariffaIncompleta && (
                        <div className="mt-0.5 text-[11px] font-semibold text-amber-700" title="Manca la tariffa per una o più notti: il subtotale non è completo.">
                          ⚠ tariffa mancante
                        </div>
                      )}
                    </td>}
                    {importi && <td data-label="Tassa" className="px-3 py-2 font-mono">{eur(s.tassa)}</td>}
                    {puoGestire && <td className="cella-intera px-3 py-2">
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
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {puoGestire && (
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            {aggiungiAperto ? (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold">Aggiungi un arrivo al gruppo</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          )}

          <SezioneTassa
            prenotazioneId={prenotazione.id}
            tassa={prenotazione.tassa}
            importi={importi}
            puoGestire={puoGestire}
            puoRiaprire={puoRiaprire}
            onAggiornata={setPrenotazione}
          />

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold">Servizi aggiuntivi</h3>
            {prenotazione.serviziAggiunti.length > 0 && (
              <table className="tabella-responsive mb-3 w-full text-sm">
                <thead className="text-left text-xs uppercase text-stone-500">
                  <tr><th className="pb-1">Servizio</th><th className="pb-1">Ambito</th>{importi && <th className="pb-1">Importo</th>}{puoGestire && <th />}</tr>
                </thead>
                <tbody>
                  {prenotazione.serviziAggiunti.map((s) => (
                    <tr key={s.id} className="border-t border-stone-100">
                      <td className="cella-intera py-1.5">
                        <div className="font-semibold">{s.nome}</div>
                        {s.note && <div className="text-xs text-stone-500">{s.note}</div>}
                      </td>
                      <td data-label="Ambito" className="py-1.5 text-xs text-stone-600">
                        {s.segmenti.length === 0 ? "Tutta la prenotazione" : s.segmenti.map((sg) => sg.etichetta).join(", ")}
                      </td>
                      {importi && <td data-label="Importo" className="py-1.5 font-mono">
                        {s.quantita > 1 ? `${s.quantita} × ${eur(s.prezzoUnitario)} = ` : ""}
                        {eur(s.totale)}
                      </td>}
                      {puoGestire && <td className="cella-intera py-1.5 md:text-right">
                        <button className="mr-3 text-xs font-semibold text-teal-700" onClick={() => iniziaModificaServizio(s)}>
                          Modifica
                        </button>
                        <button className="text-xs font-semibold text-red-600" onClick={() => rimuoviServizio(s.id)}>
                          Rimuovi
                        </button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {prenotazione.serviziAggiunti.length === 0 && !puoGestire && <p className="text-sm text-stone-500">Nessun servizio aggiunto.</p>}
            {puoGestire && (servizioAperto ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {servizioInModifica !== null ? (
                    <div>
                      <label className="mb-1 block text-xs text-stone-600">Servizio</label>
                      <div className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm text-stone-700">{servizioEditNome}</div>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-xs text-stone-600">Servizio</label>
                      <select
                        className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                        value={servizioCatalogoId}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "libero") {
                            setServizioCatalogoId("libero");
                            setServizioPrezzo("");
                          } else {
                            const id = Number(v);
                            setServizioCatalogoId(id);
                            setServizioPrezzo(String(serviziCatalogo.find((sc) => sc.id === id)?.prezzo ?? ""));
                          }
                        }}
                      >
                        <option value="libero">Prezzo libero...</option>
                        {serviziCatalogo.map((sc) => (
                          <option key={sc.id} value={sc.id}>{sc.nome} ({eur(sc.prezzo)})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {(servizioInModifica !== null ? !servizioEditDaCatalogo : servizioCatalogoId === "libero") && (
                    <div>
                      <label className="mb-1 block text-xs text-stone-600">Descrizione</label>
                      <input
                        className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                        placeholder="Es. Transfer aeroporto"
                        value={servizioDescrizione}
                        onChange={(e) => setServizioDescrizione(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-stone-600">Prezzo unitario</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                      value={servizioPrezzo}
                      onChange={(e) => setServizioPrezzo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-stone-600">Quantità</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                      value={servizioQuantita}
                      onChange={(e) => setServizioQuantita(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-stone-600">Si applica a</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={servizioAmbito === "tutta"} onChange={() => setServizioAmbito("tutta")} />
                      Tutta la prenotazione
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" checked={servizioAmbito === "specifici"} onChange={() => setServizioAmbito("specifici")} />
                      Solo alcuni componenti del gruppo
                    </label>
                  </div>
                  {servizioAmbito === "specifici" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {prenotazione.segmenti.map((s) => {
                        const attivo = servizioSegmenti.has(s.id);
                        return (
                          <button
                            type="button"
                            key={s.id}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attivo ? "border border-teal-700 bg-teal-50 text-teal-700" : "border border-stone-300 bg-stone-100 text-stone-500"}`}
                            onClick={() =>
                              setServizioSegmenti((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              })
                            }
                          >
                            {s.ospiteNome} {s.cameraCodice ? `— ${s.cameraCodice}` : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold" onClick={resetFormServizio}>
                    Annulla
                  </button>
                  <button
                    disabled={
                      salvando ||
                      !servizioPrezzo ||
                      Number(servizioPrezzo) <= 0 ||
                      ((servizioInModifica !== null ? !servizioEditDaCatalogo : servizioCatalogoId === "libero") && !servizioDescrizione.trim()) ||
                      (servizioAmbito === "specifici" && servizioSegmenti.size === 0)
                    }
                    className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                    onClick={confermaAggiungiServizio}
                  >
                    {servizioInModifica !== null ? "Salva modifiche" : "Aggiungi"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setServizioAperto(true)} className="rounded-md border border-teal-700 px-3 py-1.5 text-sm font-semibold text-teal-700">
                + Aggiungi servizio
              </button>
            ))}
          </div>
        </div>

        {importi && <div className="rounded-xl border border-stone-200 bg-white p-5 xl:w-80 xl:flex-shrink-0">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Riepilogo</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotale soggiorno</span><span className="font-mono">{eur(prenotazione.totali.subtotale)}</span></div>
            <div className="flex justify-between"><span>Tassa di soggiorno</span><span className="font-mono">{eur(prenotazione.totali.tassa)}</span></div>
            {prenotazione.totali.servizi > 0 && (
              <div className="flex justify-between"><span>Servizi aggiuntivi</span><span className="font-mono">{eur(prenotazione.totali.servizi)}</span></div>
            )}
            <div className="flex justify-between text-base font-bold"><span>Totale</span><span className="font-mono">{eur(prenotazione.totali.totale)}</span></div>
            {prenotazione.segmenti.some((s) => s.tariffaIncompleta) && (
              <p className="text-xs font-semibold text-amber-700">
                ⚠ Manca la tariffa per una o più camere/notti: il totale sopra è incompleto (calcolato come se costassero €0). Da correggere manualmente una volta impostato il listino per queste date.
              </p>
            )}
            <button
              type="button"
              onClick={() => setDettagliTotaliAperti((v) => !v)}
              className="text-[11px] font-semibold text-teal-700 underline"
            >
              {dettagliTotaliAperti ? "Nascondi il dettaglio" : "Da cosa deriva questo totale?"}
            </button>
            {dettagliTotaliAperti && (
              <div className="flex flex-col gap-1 border-t border-stone-200 pt-1.5 text-[11px] text-stone-600">
                {prenotazione.segmenti.map((s) => (
                  <div key={s.id} className="flex justify-between">
                    <span>{s.ospiteNome} — {s.cameraCodice ?? s.tipoCameraNome} ({s.notti} notti)</span>
                    <span className="font-mono">{eur(s.subtotale + s.tassa)}</span>
                  </div>
                ))}
                {prenotazione.serviziAggiunti.map((sv) => (
                  <div key={sv.id} className="flex justify-between">
                    <span>{sv.nome}{sv.quantita > 1 ? ` ×${sv.quantita}` : ""}</span>
                    <span className="font-mono">{eur(sv.totale)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}
