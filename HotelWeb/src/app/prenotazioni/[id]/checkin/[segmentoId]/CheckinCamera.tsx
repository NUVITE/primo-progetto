"use client";

import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { CODICE_ITALIA } from "@/lib/codiciPolizia";
import type { datiCheckin, AnagraficaInput, DatiPresenzaInput } from "@/lib/checkin";
import { OspiteSearch, type OspiteValue } from "../../../nuova/OspiteSearch";
import { LuogoSearch } from "./LuogoSearch";
import {
  azioneAggiungiOccupante,
  azioneCheckoutCamera,
  azioneCheckoutOccupante,
  azioneConfermaArrivo,
  azioneRimuoviOccupante,
  azioneSalvaOccupante,
  azioneSostituisciOccupante,
} from "./actions";

type Dati = Awaited<ReturnType<typeof datiCheckin>>;
type Occupante = Dati["occupanti"][number];

const INPUT = "mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900 disabled:bg-stone-50";
const ETICHETTA = "flex flex-col text-xs text-stone-600";
const it = (iso: string) => iso.split("-").reverse().join("/");

const STATO: Record<string, { testo: string; classe: string }> = {
  attesa: { testo: "In arrivo", classe: "bg-stone-100 text-stone-600" },
  arrivato: { testo: "Arrivato", classe: "bg-teal-100 text-teal-800" },
  partito: { testo: "Partito", classe: "bg-emerald-100 text-emerald-800" },
};

function rifOspite(v: OspiteValue) {
  return v.mode === "esistente" ? { id: v.id } : v.mode === "nuovo" ? { nome: v.nome, cognome: v.cognome } : null;
}

/** Tipo di alloggiato proposto quando non è ancora indicato (si può sempre cambiare). */
function tipoSuggerito(dati: Dati, o: Occupante): { tipo: number; capo: number | null } {
  const persone = dati.personePrenotazione;
  if (persone.length <= 1) return { tipo: 16, capo: null };
  const capo = persone.some((p) => p.id === dati.segmento.prenotanteId) ? dati.segmento.prenotanteId : persone[0].id;
  const gruppo = !!dati.segmento.gruppo;
  if (o.ospiteId === capo) return { tipo: gruppo ? 18 : 17, capo: null };
  return { tipo: gruppo ? 20 : 19, capo };
}

export function CheckinCamera({ iniziale, puoGestire }: { iniziale: Dati; puoGestire: boolean }) {
  const [dati, setDati] = useState(iniziale);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore" | "avviso"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [nuovo, setNuovo] = useState<OspiteValue>({ mode: "vuoto" });
  const [aggiungi, setAggiungi] = useState(false);
  const [dataCheckout, setDataCheckout] = useState<string | null>(null);
  const s = dati.segmento;
  const tuttiArrivati = dati.occupanti.every((o) => o.stato !== "attesa");
  const tuttiPartiti = dati.occupanti.every((o) => o.stato === "partito");

  async function esegui(fn: () => Promise<{ dati: Dati; avviso: string | null }>, ok?: string) {
    setMessaggio(null);
    setBusy(true);
    try {
      const r = await fn();
      setDati(r.dati);
      setMessaggio(r.avviso ? { tipo: "avviso", testo: r.avviso } : ok ? { tipo: "ok", testo: ok } : null);
      return true;
    } catch (e) {
      setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <Link href={`/prenotazioni/${s.prenotazioneId}`} className="text-sm text-teal-700">
          ← Prenotazione #{s.prenotazioneId}
        </Link>
        <h1 className="text-xl font-bold">
          Check-in {s.camera ? `camera ${s.camera}` : `${s.tipoCamera} (camera da assegnare)`}
        </h1>
        <p className="text-sm text-stone-600">
          {s.tipoCamera} · dal {it(s.dal)} al {it(s.al)}
          {s.capienza !== null && ` · fino a ${s.capienza} persone`}
          {s.gruppo && ` · gruppo ${s.gruppo}`}
        </p>
      </div>

      {!dati.tabelleCaricate && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Le tabelle ufficiali Polizia non sono ancora caricate: luoghi e documenti non si possono indicare. Le carica il gestore della
          piattaforma (Piattaforma &gt; Tabelle Polizia).
        </p>
      )}
      {messaggio && (
        <p
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            messaggio.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : messaggio.tipo === "avviso" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-700"
          }`}
        >
          {messaggio.testo}
        </p>
      )}

      {dati.occupanti.map((o) => (
        <SchedaOccupante key={`${o.presenzaId}-${o.ospiteId}`} dati={dati} o={o} puoGestire={puoGestire} busy={busy} esegui={esegui} />
      ))}

      {puoGestire && !tuttiPartiti && (
        <section className="rounded-xl border border-dashed border-stone-300 bg-white p-4">
          {aggiungi ? (
            <div className="flex flex-col gap-2">
              <OspiteSearch value={nuovo} onChange={setNuovo} etichetta="Aggiungi una persona alla camera" />
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-md px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setAggiungi(false)}>
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={busy || nuovo.mode === "vuoto"}
                  className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                  onClick={async () => {
                    const rif = rifOspite(nuovo);
                    if (rif && (await esegui(() => sbusta(azioneAggiungiOccupante(s.id, rif)), "Persona aggiunta: completa i suoi dati."))) {
                      setNuovo({ mode: "vuoto" });
                      setAggiungi(false);
                    }
                  }}
                >
                  Aggiungi
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="text-sm font-semibold text-teal-700" onClick={() => setAggiungi(true)}>
              + Aggiungi una persona alla camera
            </button>
          )}
        </section>
      )}

      {puoGestire && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-sm text-stone-700">
            {tuttiPartiti ? "Tutti partiti: soggiorno chiuso." : tuttiArrivati ? "Tutti gli occupanti sono arrivati." : "Quando arrivano, conferma l'arrivo: da lì partono le 24 ore per la schedina PS."}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!tuttiArrivati && (
              <button
                type="button"
                disabled={busy}
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                onClick={() => esegui(() => sbusta(azioneConfermaArrivo(s.id)), "Arrivo confermato.")}
              >
                Conferma arrivo
              </button>
            )}
            {tuttiArrivati && !tuttiPartiti && dataCheckout === null && (
              <button type="button" className="rounded-md bg-stone-800 px-4 py-2 text-sm font-bold text-white" onClick={() => setDataCheckout(s.al)}>
                Check-out della camera
              </button>
            )}
            {dataCheckout !== null && (
              <span className="flex flex-wrap items-end gap-2 rounded-md bg-stone-50 px-3 py-2">
                <label className={ETICHETTA}>
                  Data di partenza
                  <input type="date" className={INPUT} min={s.dal} max={s.al} value={dataCheckout} onChange={(e) => setDataCheckout(e.target.value)} />
                </label>
                <span className="max-w-xs text-xs text-stone-600">
                  Tutte le persone risultano partite e la loro tassa diventa definitiva.{dataCheckout < s.al ? " Partenza anticipata: le notti successive si liberano." : ""}
                </span>
                <button
                  type="button"
                  disabled={busy || !dataCheckout}
                  className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
                  onClick={async () => {
                    if (await esegui(() => sbusta(azioneCheckoutCamera(s.id, dataCheckout)), "Check-out registrato.")) setDataCheckout(null);
                  }}
                >
                  Conferma check-out
                </button>
                <button type="button" className="rounded-md px-3 py-1.5 text-sm font-semibold text-stone-600" onClick={() => setDataCheckout(null)}>
                  Annulla
                </button>
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function SchedaOccupante({
  dati,
  o,
  puoGestire,
  busy,
  esegui,
}: {
  dati: Dati;
  o: Occupante;
  puoGestire: boolean;
  busy: boolean;
  esegui: (fn: () => Promise<{ dati: Dati; avviso: string | null }>, ok?: string) => Promise<boolean>;
}) {
  const suggerito = tipoSuggerito(dati, o);
  const [a, setA] = useState<AnagraficaInput>({
    ...o.anagrafica,
    // Precompilazioni più frequenti, visibili e correggibili.
    statoNascitaCodice: o.anagrafica.statoNascitaCodice || CODICE_ITALIA,
    cittadinanzaCodice: o.anagrafica.cittadinanzaCodice || CODICE_ITALIA,
    residenzaStatoCodice: o.anagrafica.residenzaStatoCodice || CODICE_ITALIA,
  });
  const [p, setP] = useState<DatiPresenzaInput>({
    ...o.presenza,
    tipoAlloggiato: o.presenza.tipoAlloggiato ?? suggerito.tipo,
    capoOspiteId: o.presenza.capoOspiteId ?? suggerito.capo,
  });
  const [desc, setDesc] = useState<Record<string, string>>({ ...o.descrizioni, [CODICE_ITALIA]: "ITALIA" });
  const [sostituisci, setSostituisci] = useState<OspiteValue | null>(null);
  const [confermaRimuovi, setConfermaRimuovi] = useState(false);
  const [partenza, setPartenza] = useState<string | null>(null);
  const bloccata = !puoGestire || o.chiusa;
  const tipo = dati.tipiAlloggiato.find((t) => t.codice === p.tipoAlloggiato);
  const liste = dati.liste;
  const luogo = (campo: keyof AnagraficaInput) => ({
    codice: a[campo],
    descrizione: desc[a[campo]] ?? "",
    disabled: bloccata || !dati.tabelleCaricate,
    onChange: (codice: string, descrizione: string) => {
      setA({ ...a, [campo]: codice });
      setDesc({ ...desc, [codice]: descrizione });
    },
  });
  const statoToggle = (campo: "statoNascitaCodice" | "residenzaStatoCodice", italia: boolean) =>
    setA({ ...a, [campo]: italia ? CODICE_ITALIA : "", ...(campo === "statoNascitaCodice" ? { comuneNascitaCodice: "" } : { residenzaComuneCodice: "" }) });

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">
            {o.anagrafica.nome} {o.anagrafica.cognome}
            {o.intestatario && <span className="ml-2 text-xs font-normal text-stone-500">(intestatario della camera)</span>}
          </h2>
          {o.mancanti.length === 0 ? (
            <p className="text-xs font-semibold text-emerald-700">✓ Dati per la schedina PS{dati.sistemaIstat ? " e l'ISTAT" : ""} completi</p>
          ) : (
            <p className="text-xs text-amber-800">Mancano: {o.mancanti.join(", ")}</p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATO[o.stato]?.classe}`}>{STATO[o.stato]?.testo ?? o.stato}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={ETICHETTA}>
          Cognome
          <input className={INPUT} disabled={bloccata} value={a.cognome} onChange={(e) => setA({ ...a, cognome: e.target.value })} />
        </label>
        <label className={ETICHETTA}>
          Nome
          <input className={INPUT} disabled={bloccata} value={a.nome} onChange={(e) => setA({ ...a, nome: e.target.value })} />
        </label>
        <label className={ETICHETTA}>
          Sesso
          <select className={INPUT} disabled={bloccata} value={a.sesso} onChange={(e) => setA({ ...a, sesso: e.target.value })}>
            <option value="">—</option>
            <option value="M">Maschio</option>
            <option value="F">Femmina</option>
          </select>
        </label>
        <label className={ETICHETTA}>
          Data di nascita
          <input type="date" className={INPUT} disabled={bloccata} value={a.dataNascita} onChange={(e) => setA({ ...a, dataNascita: e.target.value })} />
        </label>

        <div className={ETICHETTA}>
          <span className="flex flex-wrap items-center gap-x-3">
            Nascita
            <label className="flex items-center gap-1">
              <input type="radio" disabled={bloccata} checked={a.statoNascitaCodice === CODICE_ITALIA} onChange={() => statoToggle("statoNascitaCodice", true)} /> Italia
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" disabled={bloccata} checked={a.statoNascitaCodice !== CODICE_ITALIA} onChange={() => statoToggle("statoNascitaCodice", false)} /> Estero
            </label>
          </span>
          {a.statoNascitaCodice === CODICE_ITALIA ? (
            <LuogoSearch tipo="comune" validoAl={a.dataNascita || undefined} {...luogo("comuneNascitaCodice")} />
          ) : (
            <LuogoSearch tipo="stato" {...luogo("statoNascitaCodice")} />
          )}
        </div>
        <div className={ETICHETTA}>
          Cittadinanza
          <LuogoSearch tipo="stato" {...luogo("cittadinanzaCodice")} />
        </div>
        <div className={ETICHETTA}>
          <span className="flex flex-wrap items-center gap-x-3">
            Residenza
            <label className="flex items-center gap-1">
              <input type="radio" disabled={bloccata} checked={a.residenzaStatoCodice === CODICE_ITALIA} onChange={() => statoToggle("residenzaStatoCodice", true)} /> Italia
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" disabled={bloccata} checked={a.residenzaStatoCodice !== CODICE_ITALIA} onChange={() => statoToggle("residenzaStatoCodice", false)} /> Estero
            </label>
          </span>
          {a.residenzaStatoCodice === CODICE_ITALIA ? <LuogoSearch tipo="comune" {...luogo("residenzaComuneCodice")} /> : <LuogoSearch tipo="stato" {...luogo("residenzaStatoCodice")} />}
        </div>
        <label className={ETICHETTA}>
          Tipo di alloggiato
          <select className={INPUT} disabled={bloccata} value={p.tipoAlloggiato ?? ""} onChange={(e) => setP({ ...p, tipoAlloggiato: e.target.value ? Number(e.target.value) : null })}>
            {dati.tipiAlloggiato.map((t) => (
              <option key={t.codice} value={t.codice}>
                {t.descrizione}
              </option>
            ))}
          </select>
        </label>

        {(p.tipoAlloggiato === 19 || p.tipoAlloggiato === 20) && (
          <label className={ETICHETTA}>
            {p.tipoAlloggiato === 19 ? "Capofamiglia" : "Capogruppo"}
            <select className={INPUT} disabled={bloccata} value={p.capoOspiteId ?? ""} onChange={(e) => setP({ ...p, capoOspiteId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">—</option>
              {dati.personePrenotazione
                .filter((x) => x.id !== o.ospiteId)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
            </select>
          </label>
        )}

        {tipo?.documento && (
          <>
            <label className={ETICHETTA}>
              Tipo di documento
              <select className={INPUT} disabled={bloccata || !dati.tabelleCaricate} value={a.documentoTipoCodice} onChange={(e) => setA({ ...a, documentoTipoCodice: e.target.value })}>
                <option value="">—</option>
                {dati.documenti.map((d) => (
                  <option key={d.codice} value={d.codice}>
                    {d.descrizione}
                  </option>
                ))}
              </select>
            </label>
            <label className={ETICHETTA}>
              Numero del documento
              <input className={INPUT} disabled={bloccata} value={a.documentoNumero} onChange={(e) => setA({ ...a, documentoNumero: e.target.value })} />
            </label>
            <div className={ETICHETTA}>
              Rilasciato a (comune o stato)
              <LuogoSearch tipo="comune" placeholder="Comune italiano..." {...luogo("documentoRilascioCodice")} />
              {!a.documentoRilascioCodice && !bloccata && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[11px] text-stone-500">Rilasciato all&apos;estero?</summary>
                  <LuogoSearch tipo="stato" {...luogo("documentoRilascioCodice")} />
                </details>
              )}
            </div>
          </>
        )}
      </div>

      {liste && (
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-stone-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={ETICHETTA}>
            Motivo del viaggio (ISTAT)
            <select className={INPUT} disabled={bloccata} value={p.motivoViaggio} onChange={(e) => setP({ ...p, motivoViaggio: e.target.value })}>
              <option value="">—</option>
              {liste.motivo.map((v) => (
                <option key={v.valore} value={v.valore}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          <label className={ETICHETTA}>
            {liste.mezzoMovimento ? "Mezzo per arrivare" : "Mezzo di trasporto"} (ISTAT)
            <select className={INPUT} disabled={bloccata} value={p.mezzoArrivo} onChange={(e) => setP({ ...p, mezzoArrivo: e.target.value })}>
              <option value="">—</option>
              {liste.mezzoArrivo.map((v) => (
                <option key={v.valore} value={v.valore}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>
          {liste.mezzoMovimento && (
            <label className={ETICHETTA}>
              Mezzo per muoversi sul posto (ISTAT)
              <select className={INPUT} disabled={bloccata} value={p.mezzoMovimento} onChange={(e) => setP({ ...p, mezzoMovimento: e.target.value })}>
                <option value="">—</option>
                {liste.mezzoMovimento.map((v) => (
                  <option key={v.valore} value={v.valore}>
                    {v.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          {liste.postoLetto && (
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" className="h-4 w-4 accent-teal-700" disabled={bloccata} checked={p.occupaPostoLetto} onChange={(e) => setP({ ...p, occupaPostoLetto: e.target.checked })} />
              Occupa un posto letto
            </label>
          )}
        </div>
      )}

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-stone-600">Arriva dopo o parte prima degli altri?</summary>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={ETICHETTA}>
            Arriva il (vuoto = con la camera)
            <input type="date" className={INPUT} disabled={bloccata} min={dati.segmento.dal} max={dati.segmento.al} value={p.dal} onChange={(e) => setP({ ...p, dal: e.target.value })} />
          </label>
          <label className={ETICHETTA}>
            Parte il (vuoto = con la camera)
            <input type="date" className={INPUT} disabled={bloccata} min={dati.segmento.dal} max={dati.segmento.al} value={p.al} onChange={(e) => setP({ ...p, al: e.target.value })} />
          </label>
        </div>
      </details>

      {o.chiusa && <p className="mt-3 text-xs text-stone-600">Soggiorno chiuso: per correggere i dati va riaperto dalla sezione Tassa di soggiorno della prenotazione.</p>}

      {puoGestire && !o.chiusa && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
          <div className="flex flex-wrap gap-2">
            {sostituisci === null ? (
              <button type="button" className="rounded-md px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50" onClick={() => setSostituisci({ mode: "vuoto" })}>
                Sostituisci persona
              </button>
            ) : (
              <div className="flex w-full flex-col gap-2 rounded-md border border-dashed border-stone-300 p-2 sm:w-96">
                <OspiteSearch value={sostituisci} onChange={setSostituisci} etichetta={`Al posto di ${o.anagrafica.nome} ${o.anagrafica.cognome}`} />
                <div className="flex justify-end gap-2">
                  <button type="button" className="text-xs font-semibold text-stone-600" onClick={() => setSostituisci(null)}>
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled={busy || sostituisci.mode === "vuoto"}
                    className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                    onClick={() => {
                      const rif = rifOspite(sostituisci);
                      if (rif) esegui(() => sbusta(azioneSostituisciOccupante(dati.segmento.id, o.presenzaId, rif)), "Persona sostituita: completa i suoi dati.");
                    }}
                  >
                    Sostituisci
                  </button>
                </div>
              </div>
            )}
            {dati.occupanti.length > 1 &&
              (confermaRimuovi ? (
                <span className="flex items-center gap-2 text-xs">
                  Togliere dalla camera?
                  <button type="button" disabled={busy} className="rounded-md bg-red-600 px-2 py-1 font-bold text-white" onClick={() => esegui(() => sbusta(azioneRimuoviOccupante(dati.segmento.id, o.presenzaId)), "Persona tolta dalla camera.")}>
                    Togli
                  </button>
                  <button type="button" className="font-semibold text-stone-600" onClick={() => setConfermaRimuovi(false)}>
                    Annulla
                  </button>
                </span>
              ) : (
                <button type="button" className="rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => setConfermaRimuovi(true)}>
                  Togli dalla camera
                </button>
              ))}
            {o.stato === "arrivato" &&
              dati.occupanti.length > 1 &&
              (partenza === null ? (
                <button type="button" className="rounded-md px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100" onClick={() => setPartenza(p.al || dati.segmento.al)}>
                  Check-out solo di questa persona
                </button>
              ) : (
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <input type="date" className="rounded-md border border-stone-300 px-2 py-1 text-sm" value={partenza} onChange={(e) => setPartenza(e.target.value)} />
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md bg-stone-800 px-2 py-1 font-bold text-white"
                    onClick={() => esegui(() => sbusta(azioneCheckoutOccupante(dati.segmento.id, o.presenzaId, partenza)), "Check-out della persona registrato.")}
                  >
                    Conferma partenza
                  </button>
                  <button type="button" className="font-semibold text-stone-600" onClick={() => setPartenza(null)}>
                    Annulla
                  </button>
                </span>
              ))}
          </div>
          <button
            type="button"
            disabled={busy}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            onClick={() => esegui(() => sbusta(azioneSalvaOccupante(dati.segmento.id, o.presenzaId, a, p)), `Dati di ${a.nome} ${a.cognome} salvati.`)}
          >
            Salva dati
          </button>
        </div>
      )}
    </section>
  );
}
