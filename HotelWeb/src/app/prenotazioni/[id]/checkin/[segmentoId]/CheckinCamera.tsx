"use client";

import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { CODICE_ITALIA } from "@/lib/codiciPolizia";
import type { datiCheckin, AnagraficaInput, DatiPresenzaInput } from "@/lib/checkin";
import { OspiteSearch, type OspiteValue } from "../../../nuova/OspiteSearch";
import { LuogoSearch } from "./LuogoSearch";
import { ContoApertoCheckout } from "./ContoApertoCheckout";
import { ChiaviCamera } from "./ChiaviCamera";
import { NoteAlimentari } from "./NoteAlimentari";
import { STATI_PULIZIA, type StatoPulizia } from "@/lib/pulizieRegole";
import type { NotaOspite } from "@/lib/noteAlimentari";
import { ArrowLeft, QrCode, CheckCircle2, LogIn, LogOut, RefreshCw, Save, UserMinus, UserPlus, UserRoundCog } from "lucide-react";
import { Avviso, CLASSE_CAMPO, classePulsante, Etichetta, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import {
  azioneRicalcolaDaPresenti,
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

const INPUT = CLASSE_CAMPO;
const ETICHETTA = "flex min-w-0 flex-col gap-1 text-xs font-semibold text-stone-700";
const SOTTOTITOLO = "mb-2 mt-4 border-t border-stone-100 pt-3 text-xs font-bold uppercase tracking-wide text-stone-500 first:mt-0 first:border-t-0 first:pt-0";
const it = (iso: string) => iso.split("-").reverse().join("/");

const STATO: Record<string, { testo: string; tono: "blu" | "verde" | "neutro" }> = {
  attesa: { testo: "In arrivo", tono: "blu" },
  arrivato: { testo: "Arrivato", tono: "verde" },
  partito: { testo: "Partito", tono: "neutro" },
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

export function CheckinCamera({
  iniziale,
  puoGestire,
  puoIncassare = false,
  noteIniziali = null,
  puoRoomService = false,
  statoPulizia = null,
  daConsegnare = 0,
  valoriAperti = 0,
  chiavi = false,
  cauzione = null,
}: {
  iniziale: Dati;
  puoGestire: boolean;
  puoIncassare?: boolean;
  noteIniziali?: Record<number, NotaOspite> | null;
  puoRoomService?: boolean;
  statoPulizia?: StatoPulizia | null;
  daConsegnare?: number;
  valoriAperti?: number;
  chiavi?: boolean;
  cauzione?: number | null;
}) {
  const [dati, setDati] = useState(iniziale);
  // null = senza il permesso "Note alimentari" (o modulo Ristorazione spento): il riquadro non c'è.
  const [note, setNote] = useState(noteIniziali);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore" | "avviso"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [nuovo, setNuovo] = useState<OspiteValue>({ mode: "vuoto" });
  const [aggiungi, setAggiungi] = useState(false);
  const [dataCheckout, setDataCheckout] = useState<string | null>(null);
  // Ultima partenza con saldo da pagare: si chiede subito se incassare o lasciare in sospeso.
  const [contoAperto, setContoAperto] = useState<{ prenotazioneId: number; daPagare: number | null } | null>(null);
  const s = dati.segmento;
  const tuttiArrivati = dati.occupanti.every((o) => o.stato !== "attesa");
  const tuttiPartiti = dati.occupanti.every((o) => o.stato === "partito");

  async function esegui(fn: () => Promise<{ dati: Dati; avviso: string | null; contoAperto?: { prenotazioneId: number; daPagare: number | null } | null }>, ok?: string) {
    setMessaggio(null);
    setBusy(true);
    try {
      const r = await fn();
      setDati(r.dati);
      setContoAperto(r.contoAperto ?? null);
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
      <IntestazionePagina
        sopra={
          <Link href={`/prenotazioni/${s.prenotazioneId}`} className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Prenotazione #{s.prenotazioneId}
          </Link>
        }
        titolo={`Check-in ${s.camera ? `camera ${s.camera}` : `${s.tipoCamera} (camera da assegnare)`}`}
        azioni={
          puoRoomService && !tuttiPartiti ? (
            <Link href={`/ristorazione/cartoncino/${s.id}`} target="_blank" className={classePulsante("secondario", "piccolo")}>
              <QrCode className="h-3.5 w-3.5" aria-hidden /> Cartoncino servizi in camera
            </Link>
          ) : undefined
        }
        sottotitolo={
          <>
            {s.tipoCamera} · dal <strong className="text-stone-900">{it(s.dal)}</strong> al <strong className="text-stone-900">{it(s.al)}</strong>
            {s.capienza !== null && ` · fino a ${s.capienza} persone`}
            {s.gruppo && ` · gruppo ${s.gruppo}`}
            <br />
            Prenotata per: <strong className="text-stone-900">{s.composizione.prenotata}</strong>
            {s.lettiAggiunti > 0 && ` · ${s.lettiAggiunti} ${s.lettiAggiunti === 1 ? "letto aggiunto" : "letti aggiunti"}`}
          </>
        }
      />

      <Suggerimento id="checkin" titolo="Come si fa il check-in">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Per ogni persona in camera completa i dati richiesti (in giallo sotto il nome cosa manca) e premi <strong>Salva dati</strong>. Se c&apos;è
            una persona in più usa <strong>Aggiungi una persona</strong>.
          </li>
          <li>
            Quando gli ospiti sono arrivati premi <strong>Conferma arrivo</strong>: da quel momento hai 24 ore per inviare la schedina alla Polizia.
          </li>
          <li>
            Alla partenza usa <strong>Check-out della camera</strong> (oppure il check-out di una sola persona se parte prima degli altri): la tassa di
            soggiorno diventa definitiva.
          </li>
        </ol>
      </Suggerimento>

      {s.composizione.diversa && dati.occupanti.some((o) => o.stato !== "attesa") && (
        <Avviso
          tipo="avviso"
          azione={
            puoGestire && (
              <Pulsante
                variante="primario"
                dimensione="piccolo"
                icona={RefreshCw}
                disabled={busy}
                onClick={() => esegui(() => sbusta(azioneRicalcolaDaPresenti(s.id)), "Prezzo ricalcolato sulle persone registrate.")}
              >
                Ricalcola il prezzo
              </Pulsante>
            )
          }
        >
          Persone registrate: <strong>{s.composizione.reale}</strong>
          {s.composizione.senzaData > 0 && ` (${s.composizione.senzaData} senza data di nascita, contati come adulti)`}: diverse dalla prenotazione. Il
          prezzo resta quello concordato finché non lo ricalcoli.
        </Avviso>
      )}

      {statoPulizia && statoPulizia !== "pronta" && !tuttiArrivati && (
        <Avviso tipo="avviso">
          La camera risulta <strong>{STATI_PULIZIA[statoPulizia].testo.toLowerCase()}</strong>: se gli ospiti arrivano adesso, avvisa i piani o
          proponi di aspettare.
        </Avviso>
      )}

      {daConsegnare > 0 && (
        <Avviso tipo="avviso">
          {daConsegnare === 1 ? "C'è un messaggio o della posta da consegnare a questa prenotazione: consegnalo" : `Ci sono ${daConsegnare} messaggi o posta da consegnare a questa prenotazione: consegnali`} prima che l&apos;ospite parta (
          <Link href="/portineria/messaggi" className="underline">
            Messaggi e posta
          </Link>
          ).
        </Avviso>
      )}

      {valoriAperti > 0 && (
        <Avviso tipo="avviso">
          {valoriAperti === 1 ? "L'ospite ha dei valori in custodia nella cassaforte dell'hotel" : `L'ospite ha ${valoriAperti} depositi di valori in custodia`}: restituiscili prima
          della partenza (
          <Link href="/portineria/custodia" className="underline">
            Custodia
          </Link>
          ).
        </Avviso>
      )}

      {cauzione !== null && (
        <Avviso tipo="avviso">
          Cauzione di {cauzione.toLocaleString("it-IT", { style: "currency", currency: "EUR" })} da restituire prima della partenza (dalla prenotazione, riquadro Cauzione).
        </Avviso>
      )}

      {chiavi && <ChiaviCamera segmentoId={s.id} consegnate={s.chiaviConsegnate} restituite={s.chiaviRestituite} />}

      {!dati.tabelleCaricate && (
        <Avviso tipo="avviso">
          Le tabelle ufficiali Polizia non sono ancora caricate: luoghi e documenti non si possono indicare. Le carica il gestore della piattaforma
          (Piattaforma &gt; Tabelle Polizia).
        </Avviso>
      )}
      {messaggio && <Avviso tipo={messaggio.tipo}>{messaggio.testo}</Avviso>}
      {contoAperto && (
        <ContoApertoCheckout
          segmentoId={s.id}
          conto={contoAperto}
          puoIncassare={puoIncassare}
          onSospeso={(r) => {
            setDati(r.dati);
            setContoAperto(null);
            setMessaggio({ tipo: "ok", testo: "Conto lasciato in sospeso: lo trovi in Conti aperti e sospesi." });
          }}
        />
      )}

      {dati.occupanti.map((o) => (
        <div key={`${o.presenzaId}-${o.ospiteId}`} className="flex flex-col gap-2">
          <SchedaOccupante dati={dati} o={o} puoGestire={puoGestire} busy={busy} esegui={esegui} />
          {note && <NoteAlimentari segmentoId={s.id} ospiteId={o.ospiteId} nome={`${o.anagrafica.nome} ${o.anagrafica.cognome}`} nota={note[o.ospiteId] ?? null} onAggiorna={setNote} />}
        </div>
      ))}

      {puoGestire && !tuttiPartiti && (
        <section>
          {aggiungi ? (
            <div className="flex flex-col gap-2 rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
              <OspiteSearch value={nuovo} onChange={setNuovo} etichetta="Aggiungi una persona alla camera" />
              <div className="flex justify-end gap-2">
                <Pulsante onClick={() => setAggiungi(false)}>Annulla</Pulsante>
                <Pulsante
                  variante="primario"
                  icona={UserPlus}
                  disabled={busy || nuovo.mode === "vuoto"}
                  onClick={async () => {
                    const rif = rifOspite(nuovo);
                    if (rif && (await esegui(() => sbusta(azioneAggiungiOccupante(s.id, rif)), "Persona aggiunta: completa i suoi dati."))) {
                      setNuovo({ mode: "vuoto" });
                      setAggiungi(false);
                    }
                  }}
                >
                  Aggiungi
                </Pulsante>
              </div>
            </div>
          ) : (
            <Pulsante icona={UserPlus} onClick={() => setAggiungi(true)}>
              Aggiungi una persona alla camera
            </Pulsante>
          )}
        </section>
      )}

      {puoGestire && (
        <section className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-300 bg-white p-3 shadow-md sm:p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-stone-800">
            {tuttiArrivati && <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden />}
            {tuttiPartiti ? "Tutti partiti: soggiorno chiuso." : tuttiArrivati ? "Tutti gli occupanti sono arrivati." : "Quando arrivano, conferma l'arrivo: da lì partono le 24 ore per la schedina PS."}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!tuttiArrivati && (
              <Pulsante variante="primario" icona={LogIn} disabled={busy} onClick={() => esegui(() => sbusta(azioneConfermaArrivo(s.id)), "Arrivo confermato.")}>
                Conferma arrivo
              </Pulsante>
            )}
            {tuttiArrivati && !tuttiPartiti && dataCheckout === null && (
              <Pulsante variante="primario" icona={LogOut} onClick={() => setDataCheckout(s.al)}>
                Check-out della camera
              </Pulsante>
            )}
            {dataCheckout !== null && (
              <span className="flex flex-wrap items-end gap-2 rounded-md border border-teal-200 bg-teal-50/50 px-3 py-2">
                <label className={ETICHETTA}>
                  Data di partenza
                  <input type="date" className={INPUT} min={s.dal} max={s.al} value={dataCheckout} onChange={(e) => setDataCheckout(e.target.value)} />
                </label>
                <span className="max-w-xs text-sm text-stone-700">
                  Tutte le persone risultano partite e la loro tassa diventa definitiva.{dataCheckout < s.al ? " Partenza anticipata: le notti successive si liberano." : ""}
                </span>
                <Pulsante
                  variante="primario"
                  disabled={busy || !dataCheckout}
                  onClick={async () => {
                    if (await esegui(() => sbusta(azioneCheckoutCamera(s.id, dataCheckout)), "Check-out registrato.")) setDataCheckout(null);
                  }}
                >
                  Conferma check-out
                </Pulsante>
                <Pulsante onClick={() => setDataCheckout(null)}>Annulla</Pulsante>
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
    <Sezione
      titolo={
        <span className="flex flex-wrap items-center gap-2">
          {o.anagrafica.nome} {o.anagrafica.cognome}
          {o.intestatario && <span className="text-sm font-normal text-stone-600">(intestatario della camera)</span>}
          <Etichetta tono={STATO[o.stato]?.tono ?? "neutro"}>{STATO[o.stato]?.testo ?? o.stato}</Etichetta>
        </span>
      }
    >
      {o.mancanti.length === 0 ? (
        <Avviso tipo="ok" className="mb-3">Dati per la schedina PS{dati.sistemaIstat ? " e l'ISTAT" : ""} completi.</Avviso>
      ) : (
        <Avviso tipo="avviso" className="mb-3">
          <strong>Mancano:</strong> {o.mancanti.join(", ")}.
        </Avviso>
      )}

      <p className={SOTTOTITOLO}>Dati personali</p>
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

      </div>
      <p className={SOTTOTITOLO}>Nascita, cittadinanza e residenza</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
      <p className={SOTTOTITOLO}>Schedina di Polizia</p>
      <AiutoSezione breve="Il tipo di alloggiato dice alla Polizia chi è il riferimento del gruppo o della famiglia.">
        <p>
          <strong>Ospite singolo</strong> se è solo; in una famiglia uno è il <strong>capofamiglia</strong> e gli altri <strong>familiari</strong>; in un
          gruppo uno è il <strong>capogruppo</strong> e gli altri <strong>membri del gruppo</strong>. Il sistema lo propone già: controllalo.
        </p>
        <p>Il documento serve solo per ospite singolo, capofamiglia e capogruppo.</p>
      </AiutoSezione>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  <summary className="cursor-pointer text-xs font-semibold text-teal-800">Rilasciato all&apos;estero?</summary>
                  <LuogoSearch tipo="stato" {...luogo("documentoRilascioCodice")} />
                </details>
              )}
            </div>
          </>
        )}
      </div>

      {liste && (
        <>
        <p className={SOTTOTITOLO}>Statistica turistica (ISTAT)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={ETICHETTA}>
            Motivo del viaggio
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
            {liste.mezzoMovimento ? "Mezzo per arrivare" : "Mezzo di trasporto"}
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
              Mezzo per muoversi sul posto
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
            <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
              <input type="checkbox" disabled={bloccata} checked={p.occupaPostoLetto} onChange={(e) => setP({ ...p, occupaPostoLetto: e.target.checked })} />
              Occupa un posto letto
            </label>
          )}
        </div>
        </>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-sm font-semibold text-teal-800">Arriva dopo o parte prima degli altri?</summary>
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

      {o.chiusa && (
        <Avviso tipo="info" className="mt-3">
          Soggiorno chiuso: per correggere i dati va riaperto dalla sezione Tassa di soggiorno della prenotazione.
        </Avviso>
      )}

      {puoGestire && !o.chiusa && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
          <div className="flex flex-wrap gap-2">
            {sostituisci === null ? (
              <Pulsante variante="leggero" dimensione="piccolo" icona={UserRoundCog} onClick={() => setSostituisci({ mode: "vuoto" })}>
                Sostituisci persona
              </Pulsante>
            ) : (
              <div className="flex w-full flex-col gap-2 rounded-md border border-teal-200 bg-teal-50/50 p-3 sm:w-96">
                <OspiteSearch value={sostituisci} onChange={setSostituisci} etichetta={`Al posto di ${o.anagrafica.nome} ${o.anagrafica.cognome}`} />
                <div className="flex justify-end gap-2">
                  <Pulsante dimensione="piccolo" onClick={() => setSostituisci(null)}>
                    Annulla
                  </Pulsante>
                  <Pulsante
                    variante="primario"
                    dimensione="piccolo"
                    disabled={busy || sostituisci.mode === "vuoto"}
                    onClick={() => {
                      const rif = rifOspite(sostituisci);
                      if (rif) esegui(() => sbusta(azioneSostituisciOccupante(dati.segmento.id, o.presenzaId, rif)), "Persona sostituita: completa i suoi dati.");
                    }}
                  >
                    Sostituisci
                  </Pulsante>
                </div>
              </div>
            )}
            {dati.occupanti.length > 1 &&
              (confermaRimuovi ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-red-800">Togliere dalla camera?</span>
                  <Pulsante
                    variante="pericolo"
                    dimensione="piccolo"
                    disabled={busy}
                    onClick={() => esegui(() => sbusta(azioneRimuoviOccupante(dati.segmento.id, o.presenzaId)), "Persona tolta dalla camera.")}
                  >
                    Sì, togli
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setConfermaRimuovi(false)}>
                    No
                  </Pulsante>
                </span>
              ) : (
                <Pulsante variante="pericolo" dimensione="piccolo" icona={UserMinus} onClick={() => setConfermaRimuovi(true)}>
                  Togli dalla camera
                </Pulsante>
              ))}
            {o.stato === "arrivato" &&
              dati.occupanti.length > 1 &&
              (partenza === null ? (
                <Pulsante dimensione="piccolo" icona={LogOut} onClick={() => setPartenza(p.al || dati.segmento.al)}>
                  Check-out solo di questa persona
                </Pulsante>
              ) : (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="date" className={`${INPUT} w-auto`} value={partenza} onChange={(e) => setPartenza(e.target.value)} />
                  <Pulsante
                    variante="primario"
                    dimensione="piccolo"
                    disabled={busy}
                    onClick={() => esegui(() => sbusta(azioneCheckoutOccupante(dati.segmento.id, o.presenzaId, partenza)), "Check-out della persona registrato.")}
                  >
                    Conferma partenza
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setPartenza(null)}>
                    Annulla
                  </Pulsante>
                </span>
              ))}
          </div>
          <Pulsante
            variante="primario"
            icona={Save}
            disabled={busy}
            onClick={() => esegui(() => sbusta(azioneSalvaOccupante(dati.segmento.id, o.presenzaId, a, p)), `Dati di ${a.nome} ${a.cognome} salvati.`)}
          >
            Salva dati
          </Pulsante>
        </div>
      )}
    </Sezione>
  );
}
