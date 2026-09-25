"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OspiteSearch, type OspiteValue } from "../../prenotazioni/nuova/OspiteSearch";
import { datiIniziali, salvaPrenotazioneGenerica } from "./actions";

type Stato = "libera" | "occupata" | "in_arrivo" | "in_partenza" | "fuori_servizio";
type Cella = { stato: Stato; label: string | null; segmentoId: number | null; prenotazioneId: number | null };
type CameraRiga = { id: number; codice: string; piano: string | null; tipoCameraId: number; tipoCameraNome: string; celle: Record<string, Cella> };
type TipoRiepilogo = { id: number; descrizione: string; perGiorno: Record<string, { liberi: number; totale: number }> };
type Listino = { id: number; descrizione: string; tipo: string };

type ViewMode = "settimana" | "quindicina" | "mese";

// Contrasto testo/sfondo verificato >= 5.5:1 su ogni riga (feedback utente 2026-09-25: testo poco leggibile).
const STILE: Record<Stato, { bg: string; border: string; text: string }> = {
  libera: { bg: "#CFEAD9", border: "#8FCDAE", text: "#0F4A2E" },
  in_partenza: { bg: "#FBE49A", border: "#E3BE4A", text: "#5C4300" },
  occupata: { bg: "#F0C6AE", border: "#DE9A6E", text: "#6E2E0A" },
  in_arrivo: { bg: "#C3DCEC", border: "#8FB8D6", text: "#0D3348" },
  fuori_servizio: { bg: "#DCD9D3", border: "#B3ACA1", text: "#3A352C" },
};

const ETICHETTA: Record<Stato, string> = {
  libera: "Libera",
  in_partenza: "Libera (check-out stamattina)",
  occupata: "Occupata",
  in_arrivo: "Occupata (arriva oggi)",
  fuori_servizio: "Fuori servizio",
};

const TRATTAMENTI = ["Mezza pensione", "Pensione completa", "B&B"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function isoGiorno(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function formattaIt(iso: string) {
  return iso.split("-").reverse().join("/");
}

function finestra(anchor: Date, mode: ViewMode): { dal: Date; al: Date } {
  if (mode === "mese") {
    const dal = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const al = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return { dal, al };
  }
  const len = mode === "settimana" ? 7 : 14;
  return { dal: anchor, al: addDays(anchor, len) };
}

const OGGI_DEMO = new Date(2026, 6, 14); // stessa data di riferimento usata nei dati seed/mockup

export function SituazioneCamere() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("quindicina");
  const [anchor, setAnchor] = useState(OGGI_DEMO);
  const [giorni, setGiorni] = useState<string[]>([]);
  const [camere, setCamere] = useState<CameraRiga[]>([]);
  const [tipiRiepilogo, setTipiRiepilogo] = useState<TipoRiepilogo[]>([]);
  const [listini, setListini] = useState<Listino[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [selezionata, setSelezionata] = useState<{ cameraId: number; giorno: string } | null>(null);

  // Selezione periodo trascinando sul planning (header giorni o riepilogo per tipo).
  const [trascinamento, setTrascinamento] = useState<{ inizioIdx: number; fineIdx: number } | null>(null);
  const [periodoConfermato, setPeriodoConfermato] = useState<{ dal: string; al: string } | null>(null);
  const stoTrascinando = useRef(false);

  const [quantita, setQuantita] = useState<Record<number, number>>({});
  const [ospitePren, setOspitePren] = useState<OspiteValue>({ mode: "vuoto" });
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [trattamento, setTrattamento] = useState(TRATTAMENTI[0]);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const { dal, al } = useMemo(() => finestra(anchor, viewMode), [anchor, viewMode]);

  useEffect(() => {
    datiIniziali().then((d) => setListini(d.listini));
  }, []);

  useEffect(() => {
    setCaricando(true);
    setPeriodoConfermato(null);
    fetch(`/api/camere/situazione?dal=${isoGiorno(dal)}&al=${isoGiorno(al)}`)
      .then((r) => r.json())
      .then((data) => {
        setGiorni(data.giorni);
        setCamere(data.camere);
        setTipiRiepilogo(data.tipiCamera);
        setCaricando(false);
      });
  }, [dal, al]);

  useEffect(() => {
    function onMouseUp() {
      if (stoTrascinando.current && trascinamento) {
        const inizioIdx = Math.min(trascinamento.inizioIdx, trascinamento.fineIdx);
        const fineIdx = Math.max(trascinamento.inizioIdx, trascinamento.fineIdx);
        const dalIso = giorni[inizioIdx];
        const alIso = isoGiorno(addDays(new Date(giorni[fineIdx]), 1));
        setPeriodoConfermato({ dal: dalIso, al: alIso });
        setSelezionata(null);
      }
      stoTrascinando.current = false;
      setTrascinamento(null);
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trascinamento, giorni]);

  function iniziaTrascinamento(idx: number) {
    stoTrascinando.current = true;
    setPeriodoConfermato(null);
    setTrascinamento({ inizioIdx: idx, fineIdx: idx });
  }
  function estendiTrascinamento(idx: number) {
    if (stoTrascinando.current) setTrascinamento((prev) => (prev ? { ...prev, fineIdx: idx } : prev));
  }
  function giornoEvidenziato(idx: number) {
    if (trascinamento) {
      return idx >= Math.min(trascinamento.inizioIdx, trascinamento.fineIdx) && idx <= Math.max(trascinamento.inizioIdx, trascinamento.fineIdx);
    }
    if (periodoConfermato) {
      const g = giorni[idx];
      return g >= periodoConfermato.dal && g < periodoConfermato.al;
    }
    return false;
  }

  const raggruppatePerPiano = useMemo(() => {
    const gruppi = new Map<string, CameraRiga[]>();
    for (const c of camere) {
      const chiave = c.piano ?? "—";
      const lista = gruppi.get(chiave) ?? [];
      lista.push(c);
      gruppi.set(chiave, lista);
    }
    return Array.from(gruppi.entries());
  }, [camere]);

  const cellaSelezionata =
    selezionata !== null ? camere.find((c) => c.id === selezionata.cameraId)?.celle[selezionata.giorno] : undefined;
  const cameraSelezionata = selezionata !== null ? camere.find((c) => c.id === selezionata.cameraId) : undefined;

  const giorniPeriodo = useMemo(() => {
    if (!periodoConfermato) return [];
    return giorni.filter((g) => g >= periodoConfermato.dal && g < periodoConfermato.al);
  }, [periodoConfermato, giorni]);

  function minimoLiberoPerTipo(tipoId: number) {
    if (giorniPeriodo.length === 0) return null;
    const tipo = tipiRiepilogo.find((t) => t.id === tipoId);
    if (!tipo) return null;
    return Math.min(...giorniPeriodo.map((g) => tipo.perGiorno[g]?.liberi ?? 0));
  }

  function rangeLabel() {
    if (giorni.length === 0) return "";
    const primo = new Date(giorni[0]);
    const ultimo = new Date(giorni[giorni.length - 1]);
    const opzioni: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
    if (primo.getMonth() === ultimo.getMonth()) {
      return `${primo.getDate()} – ${ultimo.toLocaleDateString("it-IT", opzioni)}`;
    }
    return `${primo.toLocaleDateString("it-IT", opzioni)} – ${ultimo.toLocaleDateString("it-IT", opzioni)}`;
  }

  function shiftPeriodo(verso: 1 | -1) {
    if (viewMode === "mese") {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + verso, 1));
    } else {
      const len = viewMode === "settimana" ? 7 : 14;
      setAnchor(addDays(anchor, verso * len));
    }
  }

  async function confermaPrenotazioneGenerica() {
    if (!periodoConfermato || ospitePren.mode === "vuoto" || !listini[0]) return;
    const richieste = Object.entries(quantita)
      .map(([tipoCameraId, q]) => ({ tipoCameraId: Number(tipoCameraId), quantita: q }))
      .filter((r) => r.quantita > 0);
    if (richieste.length === 0) {
      setErrore("Indica almeno una camera.");
      return;
    }
    setErrore(null);
    setSalvando(true);
    try {
      const ospite =
        ospitePren.mode === "esistente"
          ? { id: ospitePren.id }
          : { nome: ospitePren.nome, cognome: ospitePren.cognome, telefono: telefono || undefined, email: email || undefined };
      const risultato = await salvaPrenotazioneGenerica({
        ospitePrenotante: ospite,
        listinoId: listini[0].id,
        trattamento,
        dataInizio: periodoConfermato.dal,
        dataFine: periodoConfermato.al,
        richieste,
      });
      router.push(`/prenotazioni/${risultato.id}`);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold">Situazione camere</h1>
          <span className="text-sm text-stone-600">{rangeLabel()}</span>
        </div>
        <div className="flex gap-2">
          <Link href="/camere/gestione" className="rounded-md border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700">
            Gestione camere
          </Link>
          <Link href="/prenotazioni" className="rounded-md border border-teal-700 px-4 py-2 text-sm font-bold text-teal-700">
            Tutte le prenotazioni
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex overflow-hidden rounded-md border border-stone-300">
          {(["settimana", "quindicina", "mese"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 text-sm font-semibold ${m !== "mese" ? "border-r border-stone-300" : ""} ${
                viewMode === m ? "bg-teal-700 text-white" : "bg-white text-stone-800"
              }`}
            >
              {m === "settimana" ? "Settimana" : m === "quindicina" ? "15 giorni" : "Mese"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftPeriodo(-1)} className="h-8 w-8 rounded-md border border-stone-300 text-sm">←</button>
          <button onClick={() => setAnchor(OGGI_DEMO)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold">Oggi</button>
          <button onClick={() => shiftPeriodo(1)} className="h-8 w-8 rounded-md border border-stone-300 text-sm">→</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border border-stone-200 bg-white px-4 py-2 text-xs">
        {(Object.keys(ETICHETTA) as Stato[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded" style={{ background: STILE[s].bg, border: `1px solid ${STILE[s].border}` }} />
            {ETICHETTA[s]}
          </span>
        ))}
        <span className="ml-auto text-stone-600">Trascina sulle date per selezionare un periodo e prenotare velocemente.</span>
      </div>

      <div className="flex gap-4">
        <div className="flex-grow overflow-x-auto rounded-xl border border-stone-200 bg-white p-4 select-none">
          {caricando ? (
            <p className="text-sm text-stone-600">Caricamento...</p>
          ) : (
            <div style={{ minWidth: giorni.length * 44 + 140 }}>
              {/* Header giorni: trascinabile per selezionare un periodo */}
              <div className="mb-1 grid gap-1" style={{ gridTemplateColumns: `140px repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                <div />
                {giorni.map((g, idx) => {
                  const d = new Date(g);
                  const evidenziato = giornoEvidenziato(idx);
                  return (
                    <div
                      key={g}
                      onMouseDown={() => iniziaTrascinamento(idx)}
                      onMouseEnter={() => estendiTrascinamento(idx)}
                      className="cursor-pointer rounded text-center text-[11px] text-stone-600"
                      style={{ background: evidenziato ? "#0F6B66" : "transparent", color: evidenziato ? "white" : undefined, fontWeight: evidenziato ? 700 : 400 }}
                    >
                      <div className="font-mono">{pad2(d.getDate())}/{pad2(d.getMonth() + 1)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Riepilogo disponibilita' per tipo camera: conta anche le prenotazioni generiche non assegnate */}
              <div className="mb-2 border-b border-stone-200 pb-2">
                {tipiRiepilogo.map((t) => (
                  <div key={t.id} className="mb-0.5 grid items-center gap-1" style={{ gridTemplateColumns: `140px repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                    <div className="truncate text-xs font-semibold text-stone-700">{t.descrizione}</div>
                    {giorni.map((g, idx) => {
                      const info = t.perGiorno[g];
                      const evidenziato = giornoEvidenziato(idx);
                      const colore = !info ? "#6B6759" : info.liberi <= 0 ? "#A2540F" : info.liberi <= 2 ? "#8A6D1B" : "#2F6D4F";
                      return (
                        <div
                          key={g}
                          onMouseDown={() => iniziaTrascinamento(idx)}
                          onMouseEnter={() => estendiTrascinamento(idx)}
                          className="cursor-pointer rounded text-center text-[10px] font-mono font-semibold"
                          style={{ color: colore, outline: evidenziato ? "2px solid #0F6B66" : "none" }}
                          title={`${t.descrizione}: ${info?.liberi ?? 0} libere su ${info?.totale ?? 0}`}
                        >
                          {info ? `${info.liberi}/${info.totale}` : "—"}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {raggruppatePerPiano.map(([piano, righe]) => (
                <div key={piano}>
                  <div className="py-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-600">{piano}</div>
                  {righe.map((c) => (
                    <div key={c.id} className="mb-1 grid gap-1" style={{ gridTemplateColumns: `140px repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                      <div className="flex items-center gap-1.5 truncate text-sm">
                        <span className="font-bold">{c.codice}</span>
                        <span className="truncate text-xs text-stone-600">{c.tipoCameraNome}</span>
                      </div>
                      {giorni.map((g) => {
                        const cella = c.celle[g];
                        const stile = STILE[cella.stato];
                        const isSel = selezionata?.cameraId === c.id && selezionata?.giorno === g;
                        return (
                          <button
                            key={g}
                            onClick={() => {
                              setPeriodoConfermato(null);
                              setSelezionata({ cameraId: c.id, giorno: g });
                            }}
                            title={`${c.codice} — ${g} — ${ETICHETTA[cella.stato]}${cella.label ? " — " + cella.label : ""}`}
                            className="h-8 truncate rounded text-[11px] font-semibold"
                            style={{
                              background: stile.bg,
                              color: stile.text,
                              border: `1px solid ${isSel ? "#0F6B66" : stile.border}`,
                              boxShadow: isSel ? "0 0 0 2px #0F6B66 inset" : "none",
                            }}
                          >
                            {cella.label ? cella.label.split(" ")[0] : ""}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-80 flex-shrink-0 rounded-xl border border-stone-200 bg-white p-5">
          {periodoConfermato ? (
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-600">Nuova prenotazione veloce</h2>
                <p className="text-sm font-bold">{formattaIt(periodoConfermato.dal)} → {formattaIt(periodoConfermato.al)}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-stone-600">Camere richieste</label>
                {tipiRiepilogo.map((t) => {
                  const min = minimoLiberoPerTipo(t.id);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm">{t.descrizione}</span>
                      <div className="flex items-center gap-2">
                        {min !== null && <span className="text-[11px] text-stone-500">({min} libere)</span>}
                        <input
                          type="number"
                          min={0}
                          className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm"
                          value={quantita[t.id] ?? 0}
                          onChange={(e) => setQuantita({ ...quantita, [t.id]: Math.max(0, Number(e.target.value)) })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="mb-1 block text-xs text-stone-600">Trattamento</label>
                <select className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={trattamento} onChange={(e) => setTrattamento(e.target.value)}>
                  {TRATTAMENTI.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <OspiteSearch value={ospitePren} onChange={setOspitePren} etichetta="Cliente" />
              {ospitePren.mode === "nuovo" && (
                <div className="flex flex-col gap-2">
                  <input className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                  <input className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              )}

              {errore && <p className="text-sm font-semibold text-red-700">{errore}</p>}

              <div className="flex gap-2">
                <button className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold" onClick={() => setPeriodoConfermato(null)}>
                  Annulla
                </button>
                <button
                  disabled={salvando || ospitePren.mode === "vuoto"}
                  onClick={confermaPrenotazioneGenerica}
                  className="flex-1 rounded-md bg-teal-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  {salvando ? "..." : "Blocca camere"}
                </button>
              </div>
              <p className="text-[11px] text-stone-500">Le camere fisiche specifiche si assegnano più avanti, dal dettaglio della prenotazione.</p>
            </div>
          ) : (
            <>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Dettaglio</h2>
              {selezionata && cellaSelezionata && cameraSelezionata ? (
                <div className="flex flex-col gap-2">
                  <div className="text-lg font-bold">Camera {cameraSelezionata.codice}</div>
                  <div className="text-sm text-stone-600">{cameraSelezionata.tipoCameraNome}</div>
                  <span
                    className="inline-block w-fit rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: STILE[cellaSelezionata.stato].bg, color: STILE[cellaSelezionata.stato].text }}
                  >
                    {ETICHETTA[cellaSelezionata.stato]}
                  </span>
                  {cellaSelezionata.label && <div className="text-sm"><strong>{cellaSelezionata.label}</strong></div>}
                  {(cellaSelezionata.stato === "libera" || cellaSelezionata.stato === "in_partenza") && (
                    <Link href="/prenotazioni/nuova" className="mt-2 rounded-md bg-teal-700 py-2 text-center text-sm font-bold text-white">
                      + Nuova prenotazione (camera specifica)
                    </Link>
                  )}
                  {cellaSelezionata.prenotazioneId && (
                    <Link
                      href={`/prenotazioni/${cellaSelezionata.prenotazioneId}`}
                      className="mt-2 rounded-md border border-teal-700 py-2 text-center text-sm font-bold text-teal-700"
                    >
                      Apri prenotazione #{cellaSelezionata.prenotazioneId}
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-600">Clicca una cella per i dettagli, oppure trascina sulle date per prenotare un periodo.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
