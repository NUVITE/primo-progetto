"use client";

import { sbusta, type ValoreDi } from "@/lib/esito";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { OspiteSearch, type OspiteValue } from "../../prenotazioni/nuova/OspiteSearch";
import { anteprimaGenerica, assegnaCameraASegmento, datiIniziali, salvaPrenotazioneGenerica } from "./actions";

type Stato = "libera" | "occupata" | "in_arrivo" | "in_partenza" | "fuori_servizio" | "occupata_generica";
type Candidato = { segmentoId: number; prenotazioneId: number; label: string };
type Cella = { stato: Stato; label: string | null; segmentoId: number | null; prenotazioneId: number | null; genericiCandidati?: Candidato[] };
type CameraRiga = { id: number; codice: string; piano: string | null; tipoCameraId: number; tipoCameraNome: string; celle: Record<string, Cella> };
type TipoRiepilogo = { id: number; descrizione: string; perGiorno: Record<string, { liberi: number; totale: number }> };
type Listino = { id: number; descrizione: string; tipo: string };

type ViewMode = "giorno" | "settimana" | "quindicina" | "mese";

// Contrasto testo/sfondo verificato >= 5.5:1 su ogni riga (feedback utente 2026-09-25: testo poco leggibile).
const STILE: Record<Stato, { bg: string; border: string; text: string }> = {
  libera: { bg: "#CFEAD9", border: "#8FCDAE", text: "#0F4A2E" },
  in_partenza: { bg: "#FBE49A", border: "#E3BE4A", text: "#5C4300" },
  occupata: { bg: "#F0C6AE", border: "#DE9A6E", text: "#6E2E0A" },
  in_arrivo: { bg: "#C3DCEC", border: "#8FB8D6", text: "#0D3348" },
  fuori_servizio: { bg: "#DCD9D3", border: "#B3ACA1", text: "#3A352C" },
  occupata_generica: { bg: "#E3D6F2", border: "#B79BD9", text: "#3D2A5C" },
};

const ETICHETTA: Record<Stato, string> = {
  libera: "Libera",
  in_partenza: "Libera (check-out stamattina)",
  occupata: "Occupata",
  in_arrivo: "Occupata (arriva oggi)",
  fuori_servizio: "Fuori servizio",
  occupata_generica: "Occupata (da assegnare)",
};

const TRATTAMENTI = ["Mezza pensione", "Pensione completa", "B&B"];

// Heat-map della disponibilita' per tipo/giorno: colore pieno (non solo il numero) per
// vedere a colpo d'occhio se ci sono molte, poche o nessuna camera libera (feedback utente
// 2026-09-26). Soglia in percentuale sul totale, cosi' funziona sia con 4 che con 200 camere.
const STILE_DISPONIBILITA = {
  nessuna: { bg: "#F3C9C2", border: "#DE8F80", text: "#7A2418" },
  poche: { bg: "#FBE49A", border: "#E3BE4A", text: "#5C4300" },
  molte: { bg: "#CFEAD9", border: "#8FCDAE", text: "#0F4A2E" },
};
function tierDisponibilita(liberi: number, totale: number): keyof typeof STILE_DISPONIBILITA {
  if (totale <= 0 || liberi <= 0) return "nessuna";
  if (liberi / totale <= 0.25) return "poche";
  return "molte";
}

function eur(n: number) {
  return `€ ${n.toFixed(2)}`;
}

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
  const len = mode === "giorno" ? 1 : mode === "settimana" ? 7 : 14;
  return { dal: anchor, al: addDays(anchor, len) };
}

function oggi() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function SituazioneCamere() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("quindicina");
  const [anchor, setAnchor] = useState(oggi);
  const [giorni, setGiorni] = useState<string[]>([]);
  const [camere, setCamere] = useState<CameraRiga[]>([]);
  const [tipiRiepilogo, setTipiRiepilogo] = useState<TipoRiepilogo[]>([]);
  const [listini, setListini] = useState<Listino[]>([]);
  const [capienzaPerTipo, setCapienzaPerTipo] = useState<Record<number, number>>({});
  const [dettagliAperti, setDettagliAperti] = useState(false);
  const [caricando, setCaricando] = useState(true);
  const [erroreCaricamento, setErroreCaricamento] = useState<string | null>(null);
  const [selezionata, setSelezionata] = useState<{ cameraId: number; giorno: string } | null>(null);
  const [tipiEspansi, setTipiEspansi] = useState<Set<number>>(new Set());
  const [assegnando, setAssegnando] = useState(false);
  const [erroreAssegnazione, setErroreAssegnazione] = useState<string | null>(null);

  // Selezione periodo trascinando sulla riga di riepilogo per tipo (un click singolo, senza
  // trascinare, seleziona un soggiorno di una sola notte — e' l'unico modo per prenotare 1 notte,
  // quindi va sempre committato su mouseup). L'header con le sole date (senza contesto di tipo
  // camera) NON ha piu' drag: cliccarci sopra apriva un pannello di prenotazione senza senso,
  // sovrascrivendo un Dettaglio che si stava guardando (feedback utente 2026-09-26, poi corretto
  // di nuovo lo stesso giorno perche' la versione precedente del fix rompeva la prenotazione di 1 notte).
  const [trascinamento, setTrascinamento] = useState<{ inizioIdx: number; fineIdx: number } | null>(null);
  const [periodoConfermato, setPeriodoConfermato] = useState<{ dal: string; al: string } | null>(null);
  const stoTrascinando = useRef(false);

  const [quantita, setQuantita] = useState<Record<number, number>>({});
  const [ospitePren, setOspitePren] = useState<OspiteValue>({ mode: "vuoto" });
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [trattamento, setTrattamento] = useState(TRATTAMENTI[0]);
  const [numeroPersone, setNumeroPersone] = useState("");
  const [note, setNote] = useState("");
  const [anteprima, setAnteprima] = useState<ValoreDi<typeof anteprimaGenerica>>(null);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const { dal, al } = useMemo(() => finestra(anchor, viewMode), [anchor, viewMode]);

  useEffect(() => {
    datiIniziali().then((d) => {
      setListini(d.listini);
      // Capienza di riferimento per tipo camera (usata solo per l'avviso "persone vs camere
      // scelte"): prendo la capienza massima tra le camere dello stesso tipo, assumendo che
      // di norma condividano la stessa capienza.
      const capienza: Record<number, number> = {};
      for (const c of d.camere) {
        capienza[c.tipoCameraId] = Math.max(capienza[c.tipoCameraId] ?? 0, c.capienza);
      }
      setCapienzaPerTipo(capienza);
    });
  }, []);

  useEffect(() => {
    setPeriodoConfermato(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dal, al]);

  useEffect(() => {
    const controller = new AbortController();
    setCaricando(true);
    setErroreCaricamento(null);
    fetch(`/api/camere/situazione?dal=${isoGiorno(dal)}&al=${isoGiorno(al)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Sessione scaduta, effettua di nuovo l'accesso." : `Errore ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setGiorni(data.giorni);
        setCamere(data.camere);
        setTipiRiepilogo(data.tipiCamera);
        setCaricando(false);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setErroreCaricamento(e instanceof Error ? e.message : "Errore imprevisto nel caricamento.");
        setCaricando(false);
      });
    return () => controller.abort();
  }, [dal, al, refreshTick]);

  // Anteprima prezzo/tassa per la prenotazione veloce: ricalcolata quando cambiano le
  // quantita' richieste o il periodo, con un piccolo debounce per non chiamare il server ad ogni tasto.
  useEffect(() => {
    if (!periodoConfermato || !listini[0]) {
      setAnteprima(null);
      return;
    }
    const richieste = Object.entries(quantita)
      .map(([tipoCameraId, q]) => ({ tipoCameraId: Number(tipoCameraId), quantita: q }))
      .filter((r) => r.quantita > 0);
    if (richieste.length === 0) {
      setAnteprima(null);
      return;
    }
    const timer = setTimeout(() => {
      sbusta(anteprimaGenerica({
        richieste,
        listinoId: listini[0].id,
        dataInizio: periodoConfermato.dal,
        dataFine: periodoConfermato.al,
      }))
        .then(setAnteprima)
        .catch(() => setAnteprima(null));
    }, 200);
    return () => clearTimeout(timer);
  }, [quantita, periodoConfermato, listini]);

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

  function raggruppaPerPiano(righe: CameraRiga[]) {
    const gruppi = new Map<string, CameraRiga[]>();
    for (const c of righe) {
      const chiave = c.piano ?? "—";
      const lista = gruppi.get(chiave) ?? [];
      lista.push(c);
      gruppi.set(chiave, lista);
    }
    return Array.from(gruppi.entries());
  }

  function toggleTipo(tipoId: number) {
    setTipiEspansi((prev) => {
      const next = new Set(prev);
      if (next.has(tipoId)) next.delete(tipoId);
      else next.add(tipoId);
      return next;
    });
  }

  async function assegnaQuestaCamera(cameraId: number, candidato: Candidato) {
    setAssegnando(true);
    setErroreAssegnazione(null);
    try {
      await sbusta(assegnaCameraASegmento(candidato.segmentoId, cameraId));
      setSelezionata(null);
      setRefreshTick((t) => t + 1);
    } catch (e) {
      setErroreAssegnazione(e instanceof Error ? e.message : "Errore imprevisto nell'assegnazione.");
    } finally {
      setAssegnando(false);
    }
  }

  const cellaSelezionata =
    selezionata !== null ? camere.find((c) => c.id === selezionata.cameraId)?.celle[selezionata.giorno] : undefined;
  const cameraSelezionata = selezionata !== null ? camere.find((c) => c.id === selezionata.cameraId) : undefined;

  // Righe per tipo ordinate per capienza crescente e poi alfabetico (feedback utente 2026-09-26),
  // cosi' la Singola sta sempre sopra le Doppie e la Suite piu' in basso, indipendentemente
  // dall'ordine (arbitrario) con cui i tipi sono stati creati nel DB.
  const tipiOrdinati = useMemo(() => {
    return [...tipiRiepilogo].sort((a, b) => {
      const capA = capienzaPerTipo[a.id] ?? 0;
      const capB = capienzaPerTipo[b.id] ?? 0;
      return capA - capB || a.descrizione.localeCompare(b.descrizione);
    });
  }, [tipiRiepilogo, capienzaPerTipo]);

  // Elenco nomi delle prenotazioni attive nel periodo visualizzato (non solo un giorno) — per
  // trovare velocemente una prenotazione scorrendo la vista, senza dover leggere ogni cella colorata
  // una per una (feedback utente 2026-09-26). Deduplica per segmentoId: lo stesso soggiorno occupa
  // piu' giorni/celle ma va contato una volta sola, con il range di date effettivamente visibile.
  const prenotazioniNelPeriodo = useMemo(() => {
    const mappa = new Map<number, { segmentoId: number; prenotazioneId: number; label: string; cameraCodice: string | null; dal: string; al: string }>();
    for (const c of camere) {
      for (const g of giorni) {
        const cella = c.celle[g];
        if (!cella) continue;
        if (cella.segmentoId && cella.prenotazioneId && cella.label) {
          const esistente = mappa.get(cella.segmentoId);
          if (esistente) {
            if (g < esistente.dal) esistente.dal = g;
            if (g > esistente.al) esistente.al = g;
          } else {
            mappa.set(cella.segmentoId, { segmentoId: cella.segmentoId, prenotazioneId: cella.prenotazioneId, label: cella.label, cameraCodice: c.codice, dal: g, al: g });
          }
        }
        if (cella.genericiCandidati) {
          for (const cand of cella.genericiCandidati) {
            const esistente = mappa.get(cand.segmentoId);
            if (esistente) {
              if (g < esistente.dal) esistente.dal = g;
              if (g > esistente.al) esistente.al = g;
            } else {
              mappa.set(cand.segmentoId, { segmentoId: cand.segmentoId, prenotazioneId: cand.prenotazioneId, label: cand.label, cameraCodice: null, dal: g, al: g });
            }
          }
        }
      }
    }
    return Array.from(mappa.values()).sort((a, b) => a.dal.localeCompare(b.dal) || a.label.localeCompare(b.label));
  }, [camere, giorni]);

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
    if (giorni.length === 1) {
      return primo.toLocaleDateString("it-IT", opzioni);
    }
    if (primo.getMonth() === ultimo.getMonth()) {
      return `${primo.getDate()} – ${ultimo.toLocaleDateString("it-IT", opzioni)}`;
    }
    return `${primo.toLocaleDateString("it-IT", opzioni)} – ${ultimo.toLocaleDateString("it-IT", opzioni)}`;
  }

  function shiftPeriodo(verso: 1 | -1) {
    if (viewMode === "mese") {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + verso, 1));
    } else {
      const len = viewMode === "giorno" ? 1 : viewMode === "settimana" ? 7 : 14;
      setAnchor(addDays(anchor, verso * len));
    }
  }

  function chiudiPannelloVeloce() {
    setPeriodoConfermato(null);
    setQuantita({});
    setOspitePren({ mode: "vuoto" });
    setTelefono("");
    setEmail("");
    setTrattamento(TRATTAMENTI[0]);
    setNumeroPersone("");
    setNote("");
    setAnteprima(null);
    setErrore(null);
    setDettagliAperti(false);
  }

  const capienzaTotaleRichiesta = Object.entries(quantita).reduce(
    (tot, [tipoCameraId, q]) => tot + q * (capienzaPerTipo[Number(tipoCameraId)] ?? 0),
    0
  );
  const quantitaTotaleCamere = Object.values(quantita).reduce((t, q) => t + q, 0);
  const personeNonOspitate =
    numeroPersone && quantitaTotaleCamere > 0 ? Math.max(0, Number(numeroPersone) - capienzaTotaleRichiesta) : 0;
  // Avviso anche nel verso opposto: camere scelte piu' capienti del necessario (feedback utente 2026-09-26).
  const postiLettoInEccesso =
    numeroPersone && quantitaTotaleCamere > 0 ? Math.max(0, capienzaTotaleRichiesta - Number(numeroPersone)) : 0;

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
      const risultato = await sbusta(salvaPrenotazioneGenerica({
        ospitePrenotante: ospite,
        listinoId: listini[0].id,
        trattamento,
        dataInizio: periodoConfermato.dal,
        dataFine: periodoConfermato.al,
        richieste,
        numeroPersone: numeroPersone ? Number(numeroPersone) : undefined,
        note: note || undefined,
      }));
      chiudiPannelloVeloce();
      // Si va alla scheda della prenotazione (non si resta sulla griglia): e' li' che si
      // completano subito eventuali servizi aggiuntivi (feedback utente 2026-09-26).
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
      </div>

      <div className="flex items-center justify-between">
        <div className="flex overflow-hidden rounded-md border border-stone-300">
          {(["giorno", "settimana", "quindicina", "mese"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 text-sm font-semibold ${m !== "mese" ? "border-r border-stone-300" : ""} ${
                viewMode === m ? "bg-teal-700 text-white" : "bg-white text-stone-800"
              }`}
            >
              {m === "giorno" ? "Giorno" : m === "settimana" ? "Settimana" : m === "quindicina" ? "15 giorni" : "Mese"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftPeriodo(-1)} className="h-8 w-8 rounded-md border border-stone-300 text-sm">←</button>
          <button onClick={() => setAnchor(oggi())} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold">Oggi</button>
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
          ) : erroreCaricamento ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-semibold text-red-700">{erroreCaricamento}</p>
              <button
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold"
                onClick={() => setAnchor((a) => new Date(a))}
              >
                Riprova
              </button>
            </div>
          ) : (
            <div style={{ minWidth: giorni.length * 44 + 140 }}>
              {/* Header giorni: solo visualizzazione (nessun contesto di tipo camera, quindi non
                  avviabile da qui un trascinamento — si seleziona un periodo dalle righe sotto). */}
              <div className="mb-1 grid gap-1" style={{ gridTemplateColumns: `140px repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                <div />
                {giorni.map((g, idx) => {
                  const d = new Date(g);
                  const evidenziato = giornoEvidenziato(idx);
                  return (
                    <div
                      key={g}
                      className="rounded text-center text-[11px] text-stone-600"
                      style={{ background: evidenziato ? "#0F6B66" : "transparent", color: evidenziato ? "white" : undefined, fontWeight: evidenziato ? 700 : 400 }}
                    >
                      <div className="font-mono">{pad2(d.getDate())}/{pad2(d.getMonth() + 1)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Riepilogo disponibilita' per tipo camera: conta anche le prenotazioni generiche non assegnate.
                  Cliccando sul nome del tipo si espandono le camere fisiche di quel tipo (a comparsa: non tutte
                  le camere sono sempre renderizzate, per restare leggibile anche con hotel da decine/centinaia di camere). */}
              <div className="mb-2 border-b border-stone-200 pb-2">
                {tipiOrdinati.map((t) => {
                  const espanso = tipiEspansi.has(t.id);
                  return (
                    <div key={t.id}>
                      <div className="mb-0.5 grid items-center gap-1" style={{ gridTemplateColumns: `140px repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                        <button
                          type="button"
                          onClick={() => toggleTipo(t.id)}
                          className="flex items-center gap-1 truncate text-left text-xs font-semibold text-stone-700 hover:text-teal-700"
                          title={espanso ? "Nascondi le camere di questo tipo" : "Mostra le camere fisiche di questo tipo"}
                        >
                          <span className="inline-block w-3 text-[9px]">{espanso ? "▾" : "▸"}</span>
                          {t.descrizione}
                        </button>
                        {giorni.map((g, idx) => {
                          const info = t.perGiorno[g];
                          const evidenziato = giornoEvidenziato(idx);
                          const tier = info ? tierDisponibilita(info.liberi, info.totale) : null;
                          const stile = tier ? STILE_DISPONIBILITA[tier] : null;
                          return (
                            <div
                              key={g}
                              onMouseDown={() => iniziaTrascinamento(idx)}
                              onMouseEnter={() => estendiTrascinamento(idx)}
                              className="h-7 cursor-pointer rounded text-center text-[11px] font-mono font-bold leading-7"
                              style={{
                                background: stile?.bg ?? "#EDEBE6",
                                color: stile?.text ?? "#6B6759",
                                border: evidenziato ? "2px solid #0F6B66" : `1px solid ${stile?.border ?? "#D8D4CB"}`,
                              }}
                              title={`${t.descrizione}: ${info?.liberi ?? 0} libere su ${info?.totale ?? 0}`}
                            >
                              {info ? info.liberi : "—"}
                            </div>
                          );
                        })}
                      </div>

                      {espanso &&
                        raggruppaPerPiano(camere.filter((c) => c.tipoCameraId === t.id)).map(([piano, righe]) => (
                          <div key={piano} className="pl-4">
                            <div className="py-1 text-[10px] font-bold uppercase tracking-wide text-stone-500">{piano}</div>
                            {righe.map((c) => (
                              <div key={c.id} className="mb-1 grid gap-1" style={{ gridTemplateColumns: `140px repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                                <div className="flex items-center gap-1.5 truncate text-sm">
                                  <span className="font-bold">{c.codice}</span>
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
                                        setErroreAssegnazione(null);
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
                                      {cella.label ? cella.label.split(" ")[0] : cella.stato === "occupata_generica" ? "···" : ""}
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>

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
                {tipiOrdinati.map((t) => {
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

              <div>
                <label className="mb-1 block text-xs text-stone-600">Numero persone</label>
                <input
                  type="number"
                  min={1}
                  className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                  value={numeroPersone}
                  onChange={(e) => setNumeroPersone(e.target.value)}
                />
                {personeNonOspitate > 0 && (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Con le camere scelte dormono al massimo {capienzaTotaleRichiesta}
                    {capienzaTotaleRichiesta === 1 ? " persona" : " persone"}: {personeNonOspitate}
                    {personeNonOspitate === 1 ? " persona resta" : " persone restano"} senza camera.
                  </p>
                )}
                {postiLettoInEccesso > 0 && (
                  <p className="mt-1 text-xs font-semibold text-amber-700">
                    Le camere scelte ospitano fino a {capienzaTotaleRichiesta} persone, più delle {numeroPersone} indicate
                    ({postiLettoInEccesso} {postiLettoInEccesso === 1 ? "posto letto in più" : "posti letto in più"}).
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-stone-600">Note</label>
                <textarea
                  rows={2}
                  className="w-full resize-none rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                  placeholder="Richieste particolari, orario di arrivo, ecc."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {anteprima && (
                <div className="rounded-md border border-stone-200 bg-stone-50 p-2.5 text-sm">
                  <div className="flex justify-between"><span>Subtotale</span><span className="font-mono">{eur(anteprima.subtotale)}</span></div>
                  <div className="flex justify-between text-xs text-stone-600"><span>Tassa di soggiorno (stimata)</span><span className="font-mono">{eur(anteprima.tassaStimata)}</span></div>
                  <div className="flex justify-between font-bold"><span>Totale stimato</span><span className="font-mono">{eur(anteprima.totale)}</span></div>
                  <button
                    type="button"
                    onClick={() => setDettagliAperti((v) => !v)}
                    className="mt-1.5 text-[11px] font-semibold text-teal-700 underline"
                  >
                    {dettagliAperti ? "Nascondi il dettaglio" : "Da cosa deriva questo totale?"}
                  </button>
                  {dettagliAperti && (
                    <div className="mt-1.5 flex flex-col gap-1 border-t border-stone-200 pt-1.5 text-[11px] text-stone-600">
                      {anteprima.dettaglio.map((d) => (
                        <div key={d.tipoCameraId} className="flex justify-between">
                          <span>{d.quantita}× {d.descrizione} × {d.notti} notti × {eur(d.prezzoNotte)}</span>
                          <span className="font-mono">{eur(d.subtotale)}</span>
                        </div>
                      ))}
                      {anteprima.regolamento ? (
                        <div className="flex justify-between">
                          <span>
                            Tassa {anteprima.regolamento.comune}: {eur(anteprima.regolamento.aliquota)}/notte × {anteprima.nottiTassabili} notti
                            (tetto {anteprima.regolamento.tettoNotti}) × {quantitaTotaleCamere} camere
                          </span>
                          <span className="font-mono">{eur(anteprima.tassaStimata)}</span>
                        </div>
                      ) : (
                        <span>Nessun regolamento di tassa di soggiorno attivo per questo comune/periodo.</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {anteprima && anteprima.tipiSenzaTariffa.length > 0 && (
                <p className="text-sm font-semibold text-amber-700">
                  Attenzione: nessuna tariffa impostata per {anteprima.tipiSenzaTariffa.join(", ")} in queste date, il totale sopra è incompleto. Puoi bloccare le camere comunque e sistemare il listino più avanti.
                </p>
              )}

              {errore && <p className="text-sm font-semibold text-red-700">{errore}</p>}

              <div className="flex gap-2">
                <button className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold" onClick={chiudiPannelloVeloce}>
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
                  {cellaSelezionata.stato === "occupata_generica" && cellaSelezionata.genericiCandidati && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-stone-500">
                        Questa camera non e' ancora assegnata: {cellaSelezionata.genericiCandidati.length} prenotazione/i
                        generica/che di questo tipo occupano la disponibilita' in questo giorno.
                      </p>
                      {cellaSelezionata.genericiCandidati.map((cand) => (
                        <div key={cand.segmentoId} className="flex items-center justify-between gap-2 rounded-md border border-stone-200 p-2">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{cand.label}</span>
                            <Link href={`/prenotazioni/${cand.prenotazioneId}`} className="text-xs text-teal-700 underline">
                              Apri prenotazione #{cand.prenotazioneId}
                            </Link>
                          </div>
                          <button
                            disabled={assegnando}
                            onClick={() => assegnaQuestaCamera(cameraSelezionata.id, cand)}
                            className="rounded-md bg-teal-700 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                          >
                            Assegna questa camera
                          </button>
                        </div>
                      ))}
                      {erroreAssegnazione && <p className="text-sm font-semibold text-red-700">{erroreAssegnazione}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-stone-600">Clicca una cella per i dettagli, oppure trascina sulle date per prenotare un periodo.</p>
                  <div className="border-t border-stone-200 pt-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">
                      Prenotazioni in questo periodo
                    </h3>
                    {prenotazioniNelPeriodo.length === 0 ? (
                      <p className="text-sm text-stone-500">Nessuna prenotazione attiva nel periodo visualizzato.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {prenotazioniNelPeriodo.map((p) => (
                          <li key={p.segmentoId}>
                            <Link
                              href={`/prenotazioni/${p.prenotazioneId}`}
                              className="group flex items-center justify-between gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-teal-200 hover:bg-teal-50"
                            >
                              <span className="font-semibold group-hover:text-teal-700 group-hover:underline">{p.label}</span>
                              <span className="flex items-center gap-1 text-xs text-stone-500">
                                {p.cameraCodice ?? "da assegnare"} · {formattaIt(p.dal)}–{formattaIt(p.al)}
                                <span className="text-teal-700 opacity-0 group-hover:opacity-100">›</span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
