"use client";

import { SezioneTassa } from "./SezioneTassa";
import { sbusta } from "@/lib/esito";
import { Fragment, useEffect, useState } from "react";
import { ArrowLeft, Ban, BedDouble, CalendarRange, Check, ChevronDown, ChevronUp, KeyRound, LogIn, Pencil, Plus, RefreshCw, Repeat, Trash2, Users } from "lucide-react";
import { Avviso, Campo, classePulsante, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { statoPrenotazione } from "../stato";
import { BarraStato, PannelloPagamenti } from "./StatoEPagamenti";
import { ProvenienzaCondizioni } from "./ProvenienzaCondizioni";
import Link from "next/link";
import { OspiteSearch, type OspiteValue } from "../nuova/OspiteSearch";
import { CampoComposizione } from "../CampoComposizione";
import type { Composizione } from "@/lib/pricing";
import {
  azioneAccorciaEstendi,
  azioneAggiungiSegmento,
  azioneAggiungiServizio,
  azioneAssegnaCamera,
  azioneAnnullaCamera,
  azioneCambiaCamera,
  azioneComposizione,
  azioneModificaServizio,
  azioneRimuoviServizio,
  caricaPrenotazione,
  datiIniziali,
} from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Camera = { id: number; codice: string; tipoCameraId: number; tipoCameraNome: string };
type Listino = { id: number; descrizione: string; tipo: string };
type ServizioCatalogo = { id: number; nome: string; prezzo: number; addebito: string; effetto: string | null };
const ADDEBITO: Record<string, string> = { per_notte: "per notte", per_persona_notte: "per persona per notte" };


function eur(n: number) {
  return `€ ${n.toFixed(2)}`;
}

/** puoGestire=false: sola lettura. Gli importi arrivano già azzerati dal server se non visibili. */
export function PrenotazioneDettaglio({
  iniziale,
  puoGestire: puoGestireRuolo,
  puoRiaprire,
  puoIncassare,
}: {
  iniziale: Prenotazione;
  puoGestire: boolean;
  puoRiaprire: boolean;
  puoIncassare: boolean;
}) {
  const [prenotazione, setPrenotazione] = useState(iniziale);
  const [camere, setCamere] = useState<Camera[]>([]);
  const [listini, setListini] = useState<Listino[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [cameraDaAnnullare, setCameraDaAnnullare] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [modificaFine, setModificaFine] = useState<{ segmentoId: number; valore: string } | null>(null);
  const [cambioCamera, setCambioCamera] = useState<{ segmentoId: number; dataCambio: string; nuovaCameraId: number | null } | null>(null);
  const [assegnaCameraState, setAssegnaCameraState] = useState<{ segmentoId: number; cameraId: number | null } | null>(null);

  const [aggiungiAperto, setAggiungiAperto] = useState(false);
  const [nuovoOspite, setNuovoOspite] = useState<OspiteValue>({ mode: "vuoto" });
  const [nuovaCameraId, setNuovaCameraId] = useState<number | null>(null);
  const [trattamenti, setTrattamenti] = useState<string[]>([]);
  const [nuovoTrattamento, setNuovoTrattamento] = useState("");
  const [nuovoDal, setNuovoDal] = useState("");
  const [nuovoAl, setNuovoAl] = useState("");
  const [nuovaComposizione, setNuovaComposizione] = useState<Composizione>({ adulti: 2, etaBambini: [] });
  const [modificaComposizione, setModificaComposizione] = useState<{ segmentoId: number; valore: Composizione; ricalcola: boolean } | null>(null);
  const [dettaglioPrezzo, setDettaglioPrezzo] = useState<number | null>(null);
  const [servizioDaRimuovere, setServizioDaRimuovere] = useState<number | null>(null);

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
      setTrattamenti(d.trattamenti);
      setNuovoTrattamento(d.trattamenti[0] ?? "");
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
    setServizioQuantita(String(s.unita));
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
        // Stesso listino delle altre camere della prenotazione (es. listino del gruppo).
        listinoId: prenotazione.segmenti[0]?.listinoId ?? listini[0].id,
        dataInizio: nuovoDal,
        dataFine: nuovoAl,
        composizione: nuovaComposizione,
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

  async function salvaComposizione(segmentoId: number, valore: Composizione, ricalcola: boolean) {
    const risultato = await eseguendo(() => sbusta(azioneComposizione(segmentoId, valore, ricalcola)));
    if (risultato) {
      setPrenotazione(risultato);
      setModificaComposizione(null);
    }
  }

  const importi = prenotazione.importiVisibili;
  const annullata = prenotazione.stato === "ANNULLATA";
  const puoGestire = puoGestireRuolo && !annullata;
  const camereAttive = prenotazione.segmenti.filter((s) => !s.annullata).length;
  const it = (iso: string) => iso.split("-").reverse().join("/");
  const nomeListino = (id: number) => listini.find((l) => l.id === id)?.descrizione ?? "";
  const stato = statoPrenotazione(prenotazione.stato);
  const pannello = "mt-3 flex flex-col gap-3 rounded-md border border-teal-200 bg-teal-50/50 p-3";

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        sopra={
          <Link href="/" className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Planning camere
          </Link>
        }
        titolo={
          <span className="flex flex-wrap items-center gap-2">
            Prenotazione #{prenotazione.id} <Etichetta tono={stato.tono}>{stato.testo}</Etichetta>
          </span>
        }
        sottotitolo={
          <>
            Prenotata da <strong className="text-stone-900">{prenotazione.ospitePrenotante}</strong>
            {prenotazione.gruppoNome && <> · gruppo <strong className="text-stone-900">{prenotazione.gruppoNome}</strong></>}
          </>
        }
      />

      <Suggerimento id="dettaglio-prenotazione" titolo="Come si gestisce una prenotazione">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Ogni riquadro è una camera prenotata: se è &quot;da assegnare&quot;, scegli la camera con <strong>Assegna camera</strong>.</li>
          <li>
            All&apos;arrivo premi <strong>Check-in</strong> sulla camera e registra i dati di ogni persona (servono per la schedina di Polizia e per la
            tassa di soggiorno).
          </li>
          <li>Per allungare o accorciare il soggiorno usa <strong>Cambia partenza</strong>; per spostare gli ospiti in un&apos;altra camera <strong>Cambia camera</strong>.</li>
          <li>Extra come letto aggiunto, colazione in camera o transfer si aggiungono in <strong>Servizi aggiuntivi</strong>.</li>
        </ol>
      </Suggerimento>

      <BarraStato prenotazione={prenotazione} puoGestire={puoGestireRuolo} puoIncassare={puoIncassare} salvando={salvando} esegui={eseguendo} aggiorna={setPrenotazione} />

      {errore && <Avviso tipo="errore">{errore}</Avviso>}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {prenotazione.segmenti.map((s) => (
            <Sezione
              key={s.id}
              className={s.annullata ? "opacity-60" : undefined}
              titolo={
                <span className="flex flex-wrap items-center gap-2">
                  <BedDouble className="h-4 w-4 text-teal-700" aria-hidden />
                  {s.cameraCodice ? `Camera ${s.cameraCodice}` : "Camera da assegnare"}
                  <span className="font-normal text-stone-600">{s.tipoCameraNome}</span>
                  {!s.cameraCodice && !s.annullata && <Etichetta tono="ambra">da assegnare</Etichetta>}
                  {s.annullata && <Etichetta tono="neutro">annullata</Etichetta>}
                </span>
              }
              descrizione={
                <>
                  {it(s.dataInizio)} → {it(s.dataFine)} · {s.notti} {s.notti === 1 ? "notte" : "notti"} · {s.trattamento}
                  {nomeListino(s.listinoId) && <> · {nomeListino(s.listinoId)}</>}
                </>
              }
              azioni={
                !s.annullata && !annullata && (
                  <Link href={`/prenotazioni/${prenotazione.id}/checkin/${s.id}`} className={classePulsante("primario", "piccolo")}>
                    <LogIn className="h-3.5 w-3.5" aria-hidden />
                    {s.occupanti.every((o) => o.stato === "attesa") ? "Check-in" : "Ospiti e check-out"}
                  </Link>
                )
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs font-semibold text-stone-700">Persone (base del prezzo)</p>
                  {modificaComposizione?.segmentoId === s.id ? (
                    <div className="flex flex-col gap-2">
                      <CampoComposizione valore={modificaComposizione.valore} onChange={(v) => setModificaComposizione({ ...modificaComposizione, valore: v })} />
                      <Spunta
                        etichetta="Ricalcola anche il prezzo delle notti"
                        checked={modificaComposizione.ricalcola}
                        onChange={(e) => setModificaComposizione({ ...modificaComposizione, ricalcola: e.target.checked })}
                      />
                      <div className="flex gap-2">
                        <Pulsante variante="primario" dimensione="piccolo" disabled={salvando} onClick={() => salvaComposizione(s.id, modificaComposizione.valore, modificaComposizione.ricalcola)}>
                          Salva
                        </Pulsante>
                        <Pulsante dimensione="piccolo" onClick={() => setModificaComposizione(null)}>
                          Annulla
                        </Pulsante>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-sm text-stone-900">
                        <Users className="h-4 w-4 text-stone-500" aria-hidden />
                        {s.composizioneTesto}
                      </span>
                      {puoGestire && (
                        <Pulsante variante="leggero" dimensione="piccolo" icona={Pencil} onClick={() => setModificaComposizione({ segmentoId: s.id, valore: s.composizione, ricalcola: false })}>
                          Modifica
                        </Pulsante>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-stone-700">Ospiti registrati</p>
                  <ul className="space-y-1">
                    {s.occupanti.map((o) => (
                      <li key={o.presenzaId} className="flex flex-wrap items-center gap-1.5 text-sm text-stone-900">
                        {o.nome}
                        <Etichetta tono={o.stato === "partito" ? "neutro" : o.stato === "arrivato" ? "verde" : "blu"}>
                          {o.stato === "partito" ? "partito" : o.stato === "arrivato" ? "arrivato" : "in arrivo"}
                        </Etichetta>
                      </li>
                    ))}
                  </ul>
                </div>

                {importi && (
                  <div>
                    <p className="mb-1 text-xs font-semibold text-stone-700">Importi</p>
                    <dl className={`space-y-0.5 text-sm ${s.annullata ? "text-stone-400 line-through" : ""}`} title={s.annullata ? "Camera annullata: non si addebita" : undefined}>
                      <div className="flex justify-between gap-2"><dt>Soggiorno</dt><dd className="font-mono">{eur(s.subtotale)}</dd></div>
                      <div className="flex justify-between gap-2 text-stone-600"><dt>Tassa di soggiorno</dt><dd className="font-mono">{eur(s.tassa)}</dd></div>
                    </dl>
                    {s.dettaglioNotti.length > 0 && (
                      <Pulsante
                        variante="leggero"
                        dimensione="piccolo"
                        icona={dettaglioPrezzo === s.id ? ChevronUp : ChevronDown}
                        className="-ml-2 mt-1"
                        onClick={() => setDettaglioPrezzo(dettaglioPrezzo === s.id ? null : s.id)}
                      >
                        {dettaglioPrezzo === s.id ? "Nascondi il calcolo" : "Come è calcolato?"}
                      </Pulsante>
                    )}
                  </div>
                )}
              </div>

              {s.tariffaIncompleta && (
                <Avviso tipo="avviso" className="mt-3">
                  Manca la tariffa per una o più notti: il prezzo di questa camera è incompleto. Aggiungi il periodo in Impostazioni &gt; Listini e tariffe,
                  poi usa &quot;Completa le notti senza prezzo&quot;.
                </Avviso>
              )}
              {s.composizioneReale && (
                <Avviso
                  tipo="avviso"
                  className="mt-3"
                  azione={
                    puoGestire && (
                      <Pulsante variante="primario" dimensione="piccolo" icona={RefreshCw} disabled={salvando} onClick={() => salvaComposizione(s.id, s.composizioneReale!.composizione, true)}>
                        Ricalcola il prezzo
                      </Pulsante>
                    )
                  }
                >
                  Al check-in risultano <strong>{s.composizioneReale.testo}</strong>
                  {s.composizioneReale.senzaData > 0 && ` (${s.composizioneReale.senzaData} senza data di nascita, contati come adulti)`}: diverso dalla
                  prenotazione. Il prezzo resta quello concordato finché non lo ricalcoli.
                </Avviso>
              )}

              {dettaglioPrezzo === s.id && (
                <div className="mt-3 overflow-x-auto rounded-md border border-stone-200">
                  <table className="w-full text-sm">
                    <tbody>
                      {s.dettaglioNotti.map((n) => (
                        <Fragment key={n.data}>
                          <tr className="border-t border-stone-200 bg-stone-50 first:border-t-0">
                            <td className="px-3 py-1.5 font-semibold text-stone-900">Notte del {it(n.data)}</td>
                            <td className="px-3 py-1.5 text-right font-mono font-semibold">{n.mancante ? "tariffa mancante" : eur(n.prezzo)}</td>
                          </tr>
                          {n.righe.map((r, i) => (
                            <tr key={i}>
                              <td className="px-3 py-0.5 pl-6 text-stone-600">{r.voce}</td>
                              <td className="px-3 py-0.5 text-right font-mono text-stone-600">{eur(r.importo)}</td>
                            </tr>
                          ))}
                          {n.gratuita > 0 && (
                            <tr>
                              <td className="px-3 py-0.5 pl-6 text-emerald-800">Gratuità del gruppo</td>
                              <td className="px-3 py-0.5 text-right font-mono text-emerald-800">−{eur(n.gratuita)}</td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {puoGestire && !s.annullata && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                  {!s.cameraId && (
                    <Pulsante dimensione="piccolo" icona={KeyRound} onClick={() => setAssegnaCameraState({ segmentoId: s.id, cameraId: null })}>
                      Assegna camera
                    </Pulsante>
                  )}
                  {s.cameraId && (
                    <Pulsante dimensione="piccolo" icona={Repeat} onClick={() => setCambioCamera({ segmentoId: s.id, dataCambio: s.dataInizio, nuovaCameraId: null })}>
                      Cambia camera
                    </Pulsante>
                  )}
                  <Pulsante dimensione="piccolo" icona={CalendarRange} onClick={() => setModificaFine({ segmentoId: s.id, valore: s.dataFine })}>
                    Cambia partenza
                  </Pulsante>
                  {camereAttive > 1 &&
                    s.occupanti.every((o) => o.stato === "attesa") &&
                    (cameraDaAnnullare === s.id ? (
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold text-red-800">Annullare solo questa camera?</span>
                        <Pulsante
                          variante="pericolo"
                          dimensione="piccolo"
                          disabled={salvando}
                          onClick={async () => {
                            const r = await eseguendo(() => sbusta(azioneAnnullaCamera(s.id)));
                            if (r) setPrenotazione(r);
                            setCameraDaAnnullare(null);
                          }}
                        >
                          Sì, annulla la camera
                        </Pulsante>
                        <Pulsante dimensione="piccolo" onClick={() => setCameraDaAnnullare(null)}>
                          No
                        </Pulsante>
                      </span>
                    ) : (
                      <Pulsante variante="pericolo" dimensione="piccolo" icona={Ban} onClick={() => setCameraDaAnnullare(s.id)}>
                        Annulla questa camera
                      </Pulsante>
                    ))}
                </div>
              )}

              {assegnaCameraState?.segmentoId === s.id && (
                <div className={pannello}>
                  <Campo etichetta={`Camera (${s.tipoCameraNome})`} className="max-w-xs">
                    <Select value={assegnaCameraState.cameraId ?? ""} onChange={(e) => setAssegnaCameraState({ ...assegnaCameraState, cameraId: Number(e.target.value) })}>
                      <option value="" disabled>Seleziona...</option>
                      {camere.filter((c) => c.tipoCameraId === s.tipoCameraId).map((c) => (
                        <option key={c.id} value={c.id}>{c.codice}</option>
                      ))}
                    </Select>
                  </Campo>
                  <div className="flex gap-2">
                    <Pulsante variante="primario" disabled={salvando || !assegnaCameraState.cameraId} onClick={confermaAssegnaCamera}>Assegna</Pulsante>
                    <Pulsante onClick={() => setAssegnaCameraState(null)}>Annulla</Pulsante>
                  </div>
                </div>
              )}

              {cambioCamera?.segmentoId === s.id && (
                <div className={pannello}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo etichetta="Dal giorno" aiuto="Da questa notte gli ospiti dormono nella nuova camera.">
                      <Input type="date" min={s.dataInizio} max={s.dataFine} value={cambioCamera.dataCambio} onChange={(e) => setCambioCamera({ ...cambioCamera, dataCambio: e.target.value })} />
                    </Campo>
                    <Campo etichetta="Nuova camera">
                      <Select value={cambioCamera.nuovaCameraId ?? ""} onChange={(e) => setCambioCamera({ ...cambioCamera, nuovaCameraId: Number(e.target.value) })}>
                        <option value="" disabled>Seleziona...</option>
                        {camere.filter((c) => c.id !== s.cameraId).map((c) => (
                          <option key={c.id} value={c.id}>{c.codice} — {c.tipoCameraNome}</option>
                        ))}
                      </Select>
                    </Campo>
                  </div>
                  <div className="flex gap-2">
                    <Pulsante variante="primario" disabled={salvando || !cambioCamera.nuovaCameraId} onClick={confermaCambioCamera}>Cambia camera</Pulsante>
                    <Pulsante onClick={() => setCambioCamera(null)}>Annulla</Pulsante>
                  </div>
                </div>
              )}

              {modificaFine?.segmentoId === s.id && (
                <div className={pannello}>
                  <Campo etichetta="Nuova data di partenza" aiuto="Prima della data attuale accorcia il soggiorno, dopo lo allunga (se la camera è libera)." className="max-w-sm">
                    <Input type="date" value={modificaFine.valore} min={s.dataInizio} onChange={(e) => setModificaFine({ segmentoId: s.id, valore: e.target.value })} />
                  </Campo>
                  <div className="flex gap-2">
                    <Pulsante variante="primario" disabled={salvando} onClick={() => salvaNuovaFine(s.id, modificaFine.valore)}>Salva partenza</Pulsante>
                    <Pulsante onClick={() => setModificaFine(null)}>Annulla</Pulsante>
                  </div>
                </div>
              )}
            </Sezione>
          ))}

          {puoGestire &&
            (aggiungiAperto ? (
              <Sezione titolo="Aggiungi una camera a questa prenotazione" descrizione="Per esempio un componente del gruppo che arriva dopo o in un'altra camera.">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Campo etichetta="Camera" obbligatorio className="lg:col-span-2">
                    <Select value={nuovaCameraId ?? ""} onChange={(e) => setNuovaCameraId(Number(e.target.value))}>
                      <option value="" disabled>Seleziona...</option>
                      {camere.map((c) => (
                        <option key={c.id} value={c.id}>{c.codice} — {c.tipoCameraNome}</option>
                      ))}
                    </Select>
                  </Campo>
                  <Campo etichetta="Arrivo" obbligatorio>
                    <Input type="date" value={nuovoDal} onChange={(e) => setNuovoDal(e.target.value)} />
                  </Campo>
                  <Campo etichetta="Partenza" obbligatorio>
                    <Input type="date" value={nuovoAl} min={nuovoDal || undefined} onChange={(e) => setNuovoAl(e.target.value)} />
                  </Campo>
                  <Campo etichetta="Trattamento" className="lg:col-span-2">
                    <Select value={nuovoTrattamento} onChange={(e) => setNuovoTrattamento(e.target.value)}>
                      {trattamenti.map((t) => <option key={t} value={t}>{t}</option>)}
                    </Select>
                  </Campo>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-stone-700">Persone in camera</span>
                  <CampoComposizione valore={nuovaComposizione} onChange={setNuovaComposizione} />
                </div>
                <div className="mt-3">
                  <OspiteSearch value={nuovoOspite} onChange={setNuovoOspite} etichetta="Intestatario della camera" />
                </div>
                <p className="mt-2 text-xs text-stone-500">Si usa lo stesso listino delle altre camere della prenotazione.</p>
                <div className="mt-3 flex justify-end gap-2">
                  <Pulsante onClick={() => setAggiungiAperto(false)}>Annulla</Pulsante>
                  <Pulsante
                    variante="primario"
                    icona={Plus}
                    disabled={salvando || !nuovaCameraId || !nuovoDal || !nuovoAl || nuovoOspite.mode === "vuoto"}
                    onClick={confermaAggiungiSegmento}
                  >
                    Aggiungi camera
                  </Pulsante>
                </div>
              </Sezione>
            ) : (
              <div>
                <Pulsante icona={Plus} onClick={() => setAggiungiAperto(true)}>
                  Aggiungi una camera
                </Pulsante>
              </div>
            ))}

          <SezioneTassa
            prenotazioneId={prenotazione.id}
            tassa={prenotazione.tassa}
            importi={importi}
            puoGestire={puoGestire}
            puoRiaprire={puoRiaprire}
            onAggiornata={setPrenotazione}
          />

          <Sezione
            titolo="Servizi aggiuntivi"
            azioni={
              puoGestire &&
              !servizioAperto && (
                <Pulsante icona={Plus} dimensione="piccolo" onClick={() => setServizioAperto(true)}>
                  Aggiungi servizio
                </Pulsante>
              )
            }
          >
            <AiutoSezione breve="Extra addebitati sulla prenotazione: letto aggiunto, colazione in camera, transfer, animali…">
              <p>
                I servizi del catalogo (Anagrafiche &gt; Servizi) hanno già prezzo e modo di addebito: <strong>una tantum</strong>,{" "}
                <strong>per notte</strong> o <strong>per persona per notte</strong>. La quantità si moltiplica da sola per le notti (e le persone) delle
                camere scelte. Con &quot;Prezzo libero&quot; scrivi tu descrizione e importo.
              </p>
              <p>Il letto aggiunto va assegnato a una camera precisa e ne aumenta i posti; gli animali sono accettati solo nelle camere che li ammettono.</p>
              <Esempio>colazione in camera 8 € per persona per notte, camera con 3 persone per 2 notti = 6 × 8 € = 48 €.</Esempio>
            </AiutoSezione>

            {prenotazione.serviziAggiunti.length > 0 && (
              <table className="tabella-responsive mt-3 w-full text-sm">
                <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
                  <tr>
                    <th className="py-1.5 pr-2">Servizio</th>
                    <th className="py-1.5 pr-2">Per</th>
                    {importi && <th className="py-1.5 pr-2 text-right">Importo</th>}
                    {puoGestire && <th />}
                  </tr>
                </thead>
                <tbody>
                  {prenotazione.serviziAggiunti.map((s) => (
                    <tr key={s.id} className="border-b border-stone-100 last:border-0">
                      <td className="cella-intera py-2 pr-2">
                        <div className="font-semibold text-stone-900">{s.nome}</div>
                        {s.note && <div className="text-xs text-stone-500">{s.note}</div>}
                      </td>
                      <td data-label="Per" className="py-2 pr-2 text-stone-700">
                        {s.segmenti.length === 0 ? "Tutta la prenotazione" : s.segmenti.map((sg) => sg.etichetta).join(", ")}
                      </td>
                      {importi && (
                        <td data-label="Importo" className="py-2 pr-2 md:text-right">
                          <div className="font-mono font-semibold">{eur(s.totale)}</div>
                          <div className="text-xs text-stone-500">
                            {s.quantita > 1 ? `${s.quantita} × ${eur(s.prezzoUnitario)}` : eur(s.prezzoUnitario)}
                            {ADDEBITO[s.addebito] ? ` · ${s.unita > 1 ? `${s.unita} unità ` : ""}${ADDEBITO[s.addebito]}` : ""}
                          </div>
                        </td>
                      )}
                      {puoGestire && (
                        <td className="cella-intera py-2">
                          {servizioDaRimuovere === s.id ? (
                            <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                              <span className="font-semibold text-red-800">Rimuovere il servizio?</span>
                              <Pulsante
                                variante="pericolo"
                                dimensione="piccolo"
                                disabled={salvando}
                                onClick={async () => {
                                  await rimuoviServizio(s.id);
                                  setServizioDaRimuovere(null);
                                }}
                              >
                                Sì, rimuovi
                              </Pulsante>
                              <Pulsante dimensione="piccolo" onClick={() => setServizioDaRimuovere(null)}>
                                No
                              </Pulsante>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Pulsante variante="leggero" dimensione="piccolo" icona={Pencil} onClick={() => iniziaModificaServizio(s)}>
                                Modifica
                              </Pulsante>
                              <Pulsante variante="pericolo" dimensione="piccolo" icona={Trash2} onClick={() => setServizioDaRimuovere(s.id)}>
                                Rimuovi
                              </Pulsante>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {prenotazione.serviziAggiunti.length === 0 && !servizioAperto && <p className="mt-3 text-sm text-stone-500">Nessun servizio aggiunto.</p>}

            {puoGestire && servizioAperto && (
              <div className={pannello}>
                <p className="text-sm font-bold text-stone-900">{servizioInModifica !== null ? "Modifica servizio" : "Nuovo servizio"}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {servizioInModifica !== null ? (
                    <Campo etichetta="Servizio">
                      <div className="flex h-8 items-center rounded-md border border-stone-200 bg-stone-100 px-2.5 text-sm text-stone-700">{servizioEditNome}</div>
                    </Campo>
                  ) : (
                    <Campo etichetta="Servizio">
                      <Select
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
                          <option key={sc.id} value={sc.id}>{sc.nome} ({eur(sc.prezzo)}{ADDEBITO[sc.addebito] ? ` ${ADDEBITO[sc.addebito]}` : ""})</option>
                        ))}
                      </Select>
                    </Campo>
                  )}
                  {(servizioInModifica !== null ? !servizioEditDaCatalogo : servizioCatalogoId === "libero") && (
                    <Campo etichetta="Descrizione" obbligatorio>
                      <Input placeholder="Es. Transfer aeroporto" value={servizioDescrizione} onChange={(e) => setServizioDescrizione(e.target.value)} />
                    </Campo>
                  )}
                  <Campo etichetta="Prezzo unitario (€)" obbligatorio>
                    <Input type="number" min={0} step="0.01" value={servizioPrezzo} onChange={(e) => setServizioPrezzo(e.target.value)} />
                  </Campo>
                  <Campo
                    etichetta="Quantità"
                    aiuto={
                      typeof servizioCatalogoId === "number" && ADDEBITO[serviziCatalogo.find((sc) => sc.id === servizioCatalogoId)?.addebito ?? ""]
                        ? `Viene moltiplicata per le notti${serviziCatalogo.find((sc) => sc.id === servizioCatalogoId)?.addebito === "per_persona_notte" ? " e le persone" : ""} delle camere scelte.`
                        : undefined
                    }
                  >
                    <Input type="number" min={1} value={servizioQuantita} onChange={(e) => setServizioQuantita(e.target.value)} />
                  </Campo>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-stone-700">Si applica a</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" checked={servizioAmbito === "tutta"} onChange={() => setServizioAmbito("tutta")} />
                      Tutta la prenotazione
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="radio" checked={servizioAmbito === "specifici"} onChange={() => setServizioAmbito("specifici")} />
                      Solo alcune camere
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
                            aria-pressed={attivo}
                            className={`inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold pointer-coarse:h-9 ${
                              attivo ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                            }`}
                            onClick={() =>
                              setServizioSegmenti((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.id)) next.delete(s.id);
                                else next.add(s.id);
                                return next;
                              })
                            }
                          >
                            {attivo && <Check className="h-3.5 w-3.5" aria-hidden />}
                            {s.cameraCodice ? `Camera ${s.cameraCodice}` : s.tipoCameraNome} — {s.ospiteNome}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Pulsante onClick={resetFormServizio}>Annulla</Pulsante>
                  <Pulsante
                    variante="primario"
                    disabled={
                      salvando ||
                      !servizioPrezzo ||
                      Number(servizioPrezzo) <= 0 ||
                      ((servizioInModifica !== null ? !servizioEditDaCatalogo : servizioCatalogoId === "libero") && !servizioDescrizione.trim()) ||
                      (servizioAmbito === "specifici" && servizioSegmenti.size === 0)
                    }
                    onClick={confermaAggiungiServizio}
                  >
                    {servizioInModifica !== null ? "Salva modifiche" : "Aggiungi servizio"}
                  </Pulsante>
                </div>
              </div>
            )}
          </Sezione>
        </div>

        <div className="flex flex-col gap-4 xl:w-80 xl:flex-shrink-0">
          {importi && (
          <>
          <Sezione titolo="Riepilogo">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Soggiorno</dt><dd className="font-mono">{eur(prenotazione.totali.subtotale)}</dd></div>
              <div className="flex justify-between"><dt>Tassa di soggiorno</dt><dd className="font-mono">{eur(prenotazione.totali.tassa)}</dd></div>
              {prenotazione.totali.servizi > 0 && (
                <div className="flex justify-between"><dt>Servizi aggiuntivi</dt><dd className="font-mono">{eur(prenotazione.totali.servizi)}</dd></div>
              )}
              <div className="flex justify-between border-t border-stone-200 pt-1 text-base font-bold"><dt>{annullata ? "Dovuto (penale)" : "Totale"}</dt><dd className="font-mono">{eur(prenotazione.totali.totale)}</dd></div>
              <div className="flex justify-between"><dt>Pagato</dt><dd className="font-mono">{eur(prenotazione.totali.pagato)}</dd></div>
              <div className={`flex justify-between font-bold ${prenotazione.totali.daPagare > 0 ? "text-amber-900" : "text-emerald-800"}`}>
                <dt>{prenotazione.totali.daPagare < 0 ? "Da restituire" : "Da pagare"}</dt>
                <dd className="font-mono">{eur(Math.abs(prenotazione.totali.daPagare))}</dd>
              </div>
            </dl>
            {prenotazione.segmenti.some((s) => s.tariffaIncompleta) && (
              <Avviso tipo="avviso" className="mt-3">
                Manca la tariffa per una o più notti: il totale è incompleto.
              </Avviso>
            )}
            <Pulsante
              variante="leggero"
              dimensione="piccolo"
              icona={dettagliTotaliAperti ? ChevronUp : ChevronDown}
              className="-ml-2 mt-2"
              onClick={() => setDettagliTotaliAperti((v) => !v)}
            >
              {dettagliTotaliAperti ? "Nascondi il dettaglio" : "Da cosa deriva il totale?"}
            </Pulsante>
            {dettagliTotaliAperti && (
              <div className="mt-1 flex flex-col gap-1 border-t border-stone-200 pt-2 text-xs text-stone-700">
                {prenotazione.segmenti.map((s) => (
                  <div key={s.id} className="flex justify-between gap-2">
                    <span>{s.cameraCodice ? `Camera ${s.cameraCodice}` : s.tipoCameraNome} — {s.ospiteNome} ({s.notti} notti, con tassa)</span>
                    <span className="font-mono">{eur(s.subtotale + s.tassa)}</span>
                  </div>
                ))}
                {prenotazione.serviziAggiunti.map((sv) => (
                  <div key={sv.id} className="flex justify-between gap-2">
                    <span>{sv.nome}{sv.quantita > 1 ? ` ×${sv.quantita}` : ""}</span>
                    <span className="font-mono">{eur(sv.totale)}</span>
                  </div>
                ))}
              </div>
            )}
          </Sezione>
          <PannelloPagamenti prenotazione={prenotazione} puoGestire={puoGestire} puoIncassare={puoIncassare && importi} salvando={salvando} esegui={eseguendo} aggiorna={setPrenotazione} />
          </>
          )}
          <ProvenienzaCondizioni prenotazione={prenotazione} puoGestire={puoGestireRuolo} salvando={salvando} esegui={eseguendo} aggiorna={setPrenotazione} />
        </div>
      </div>
    </div>
  );
}
