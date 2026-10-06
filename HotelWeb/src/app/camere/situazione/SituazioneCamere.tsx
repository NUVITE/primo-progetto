"use client";

import { STATI_PULIZIA, type StatoPulizia } from "@/lib/pulizieRegole";
import { sbusta, type ValoreDi } from "@/lib/esito";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { OspiteSearch, type OspiteValue } from "../../prenotazioni/nuova/OspiteSearch";
import { anteprimaGenerica, assegnaCameraASegmento, datiIniziali, salvaPrenotazioneGenerica } from "./actions";
import { CampoComposizione } from "@/app/prenotazioni/CampoComposizione";
import { ChevronLeft, ChevronRight, ExternalLink, KeyRound, Lock, Plus, Sun, X } from "lucide-react";
import { Avviso, Campo, classePulsante, Input, Pulsante, Select, Textarea } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";
import { AiutoSezione } from "@/components/AiutoSezione";
import type { Composizione } from "@/lib/pricing";

type Stato = "libera" | "occupata" | "in_arrivo" | "in_partenza" | "fuori_servizio" | "occupata_generica" | "uso_diurno";
type Candidato = { segmentoId: number; prenotazioneId: number; label: string };
type Cella = { stato: Stato; label: string | null; segmentoId: number | null; prenotazioneId: number | null; genericiCandidati?: Candidato[] };
type CameraRiga = {
  id: number;
  codice: string;
  piano: string | null;
  tipoCameraId: number;
  tipoCameraNome: string;
  celle: Record<string, Cella>;
  pulizia: { stato: StatoPulizia; nonDisturbare: boolean } | null;
};
type TipoRiepilogo = { id: number; descrizione: string; perGiorno: Record<string, { liberi: number; totale: number; allotment?: number }> };
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
  uso_diurno: { bg: "#FFFFFF", border: "#7C5BB5", text: "#3D2A5C" },
};

const ETICHETTA: Record<Stato, string> = {
  libera: "Libera",
  in_partenza: "Libera (check-out stamattina)",
  occupata: "Occupata",
  in_arrivo: "Occupata (arriva oggi)",
  fuori_servizio: "Fuori servizio",
  occupata_generica: "Occupata (da assegnare)",
  uso_diurno: "Uso diurno (libera per la notte)",
};


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

/** puoGestire=false: planning in sola lettura (niente prenotazione veloce né assegnazione camere). */
export function SituazioneCamere({ puoGestire }: { puoGestire: boolean }) {
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
  const pannelloVeloceRef = useRef<HTMLDivElement>(null);
  const periodoAperto = periodoConfermato !== null;

  // Su schermi stretti il pannello sta sotto la griglia: quando si apre lo si porta in vista.
  useEffect(() => {
    if (periodoAperto && window.matchMedia("(max-width: 1023px)").matches) {
      pannelloVeloceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [periodoAperto]);

  function cambiaDatePeriodo(dal: string, al: string) {
    if (!dal) return;
    // Partenza mancante o non successiva all'arrivo: si riporta a una notte.
    const alValido = al && al > dal ? al : isoGiorno(addDays(new Date(dal), 1));
    setPeriodoConfermato({ dal, al: alValido });
  }

  const [quantita, setQuantita] = useState<Record<number, number>>({});
  const [ospitePren, setOspitePren] = useState<OspiteValue>({ mode: "vuoto" });
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [trattamenti, setTrattamenti] = useState<string[]>([]);
  const [trattamento, setTrattamento] = useState("");
  // Persone in OGNI camera di quel tipo (base del prezzo); il totale persone si ricava da qui.
  const [composizioni, setComposizioni] = useState<Record<number, Composizione>>({});
  const [listinoId, setListinoId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [anteprima, setAnteprima] = useState<ValoreDi<typeof anteprimaGenerica>>(null);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const { dal, al } = useMemo(() => finestra(anchor, viewMode), [anchor, viewMode]);

  useEffect(() => {
    datiIniziali().then((d) => {
      setListini(d.listini);
      setListinoId(d.listini[0]?.id ?? null);
      setTrattamenti(d.trattamenti);
      setTrattamento(d.trattamenti[0] ?? "");
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
    if (!periodoConfermato || !listinoId) {
      setAnteprima(null);
      return;
    }
    const richieste = richiesteVeloci();
    if (richieste.length === 0) {
      setAnteprima(null);
      return;
    }
    const timer = setTimeout(() => {
      sbusta(anteprimaGenerica({
        richieste,
        listinoId,
        trattamento,
        dataInizio: periodoConfermato.dal,
        dataFine: periodoConfermato.al,
      }))
        .then(setAnteprima)
        .catch(() => setAnteprima(null));
    }, 200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantita, composizioni, periodoConfermato, listinoId, trattamento]);

  useEffect(() => {
    function onMouseUp() {
      if (stoTrascinando.current && trascinamento) {
        const inizioIdx = Math.min(trascinamento.inizioIdx, trascinamento.fineIdx);
        const fineIdx = Math.max(trascinamento.inizioIdx, trascinamento.fineIdx);
        const dalIso = giorni[inizioIdx];
        const alIso = isoGiorno(addDays(new Date(giorni[fineIdx]), 1));
        setPeriodoConfermato({ dal: dalIso, al: alIso });
      }
      stoTrascinando.current = false;
      setTrascinamento(null);
    }
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trascinamento, giorni]);

  function iniziaTrascinamento(idx: number) {
    if (!puoGestire) return;
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
    setTrattamento(trattamenti[0] ?? "");
    setComposizioni({});
    setNote("");
    setAnteprima(null);
    setErrore(null);
    setDettagliAperti(false);
  }

  function composizioneDi(tipoCameraId: number): Composizione {
    return composizioni[tipoCameraId] ?? { adulti: Math.max(1, Math.min(2, capienzaPerTipo[tipoCameraId] ?? 1)), etaBambini: [] };
  }
  function richiesteVeloci() {
    return Object.entries(quantita)
      .map(([tipoCameraId, q]) => ({ tipoCameraId: Number(tipoCameraId), quantita: q, composizione: composizioneDi(Number(tipoCameraId)) }))
      .filter((r) => r.quantita > 0);
  }
  const capienzaTotaleRichiesta = Object.entries(quantita).reduce(
    (tot, [tipoCameraId, q]) => tot + q * (capienzaPerTipo[Number(tipoCameraId)] ?? 0),
    0
  );
  const quantitaTotaleCamere = Object.values(quantita).reduce((t, q) => t + q, 0);
  const personeTotali = richiesteVeloci().reduce((t, r) => t + r.quantita * (r.composizione.adulti + r.composizione.etaBambini.length), 0);
  // Tipi in cui le persone indicate superano la capienza: servono letti aggiunti.
  const tipiOltreCapienza = richiesteVeloci().filter(
    (r) => r.composizione.adulti + r.composizione.etaBambini.length > (capienzaPerTipo[r.tipoCameraId] ?? Infinity),
  );
  // Avviso anche nel verso opposto: camere scelte piu' capienti del necessario (feedback utente 2026-09-26).
  const postiLettoInEccesso = quantitaTotaleCamere > 0 ? Math.max(0, capienzaTotaleRichiesta - personeTotali) : 0;

  async function confermaPrenotazioneGenerica() {
    if (!periodoConfermato || ospitePren.mode === "vuoto" || !listinoId) return;
    const richieste = richiesteVeloci();
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
        listinoId,
        trattamento,
        dataInizio: periodoConfermato.dal,
        dataFine: periodoConfermato.al,
        richieste,
        numeroPersone: personeTotali || undefined,
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
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-xl font-bold">Planning camere</h1>
        <span className="text-sm font-medium text-stone-700">{rangeLabel()}</span>
      </div>

      <Suggerimento id="planning" titolo="Come si usa il planning">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Le righe verdi riassumono, per tipo di camera, <strong>quante camere sono libere</strong> ogni giorno. Clicca sul nome del tipo per vedere le
            singole camere e chi le occupa.
          </li>
          <li>
            Per prenotare <strong>trascina il mouse sulle date</strong> di una riga (dal giorno di arrivo all&apos;ultima notte). Su tablet o telefono
            tocca il giorno di arrivo e poi sistema la partenza nel riquadro che si apre.
          </li>
          <li>Clicca una camera occupata per vedere di chi è la prenotazione e aprirla.</li>
        </ol>
      </Suggerimento>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-hidden rounded-md border border-stone-300 bg-white shadow-sm">
          {(["giorno", "settimana", "quindicina", "mese"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              aria-pressed={viewMode === m}
              className={`h-8 px-3 text-sm font-semibold pointer-coarse:h-10 ${m !== "mese" ? "border-r border-stone-300" : ""} ${
                viewMode === m ? "bg-teal-700 text-white" : "bg-white text-stone-800 hover:bg-stone-50"
              }`}
            >
              {m === "giorno" ? "Giorno" : m === "settimana" ? "Settimana" : m === "quindicina" ? "15 giorni" : "Mese"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Pulsante aria-label="Periodo precedente" title="Periodo precedente" onClick={() => shiftPeriodo(-1)} className="w-8 px-0 pointer-coarse:w-10">
            <ChevronLeft className="h-4 w-4" />
          </Pulsante>
          <Pulsante onClick={() => setAnchor(oggi())}>Oggi</Pulsante>
          <Pulsante aria-label="Periodo successivo" title="Periodo successivo" onClick={() => shiftPeriodo(1)} className="w-8 px-0 pointer-coarse:w-10">
            <ChevronRight className="h-4 w-4" />
          </Pulsante>
          {puoGestire && (
            <Link href="/prenotazioni/nuova" className={classePulsante("primario")}>
              <Plus className="h-4 w-4" aria-hidden />
              Nuova prenotazione
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm text-stone-800 shadow-sm">
        {(Object.keys(ETICHETTA) as Stato[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded" style={{ background: STILE[s].bg, border: `1px solid ${STILE[s].border}` }} />
            {ETICHETTA[s]}
          </span>
        ))}

      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Su schermi stretti la griglia scorre in orizzontale con la colonna dei nomi fissa a sinistra. */}
        <div className="min-w-0 flex-grow overflow-x-auto rounded-lg border border-stone-200 bg-white p-2 shadow-sm select-none [--col-etichetta:92px] sm:p-4 sm:[--col-etichetta:140px]">
          {caricando ? (
            <p className="text-sm text-stone-600">Caricamento...</p>
          ) : erroreCaricamento ? (
            <div className="flex flex-col items-start gap-2">
              <Avviso tipo="errore">{erroreCaricamento}</Avviso>
              <Pulsante onClick={() => setAnchor((a) => new Date(a))}>Riprova</Pulsante>
            </div>
          ) : (
            <div style={{ minWidth: `calc(var(--col-etichetta) + ${giorni.length * 44}px)` }}>
              {/* Header giorni: solo visualizzazione (nessun contesto di tipo camera, quindi non
                  avviabile da qui un trascinamento — si seleziona un periodo dalle righe sotto). */}
              <div className="mb-1 grid gap-1" style={{ gridTemplateColumns: `var(--col-etichetta) repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                <div className="sticky left-0 z-10 bg-white" />
                {giorni.map((g, idx) => {
                  const d = new Date(g);
                  const evidenziato = giornoEvidenziato(idx);
                  const festivo = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={g}
                      className={`rounded py-0.5 text-center text-xs leading-tight ${festivo && !evidenziato ? "bg-stone-100 text-stone-800" : "text-stone-700"}`}
                      style={{ background: evidenziato ? "#0F6B66" : undefined, color: evidenziato ? "white" : undefined, fontWeight: evidenziato ? 700 : 500 }}
                    >
                      <div className="text-[11px] uppercase">{["dom", "lun", "mar", "mer", "gio", "ven", "sab"][d.getDay()]}</div>
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
                      <div className="mb-0.5 grid items-center gap-1" style={{ gridTemplateColumns: `var(--col-etichetta) repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                        <button
                          type="button"
                          onClick={() => toggleTipo(t.id)}
                          aria-expanded={espanso}
                          className="sticky left-0 z-10 flex h-full items-center gap-1 truncate rounded bg-white pr-1 text-left text-sm font-semibold text-stone-800 hover:bg-teal-50 hover:text-teal-800"
                          title={espanso ? "Nascondi le camere di questo tipo" : "Mostra le camere fisiche di questo tipo"}
                        >
                          <ChevronRight className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${espanso ? "rotate-90" : ""}`} aria-hidden />
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
                              className={`h-7 rounded text-center ${puoGestire ? "cursor-pointer" : ""} text-[11px] font-mono font-bold leading-7`}
                              style={{
                                background: stile?.bg ?? "#EDEBE6",
                                color: stile?.text ?? "#6B6759",
                                border: evidenziato ? "2px solid #0F6B66" : `1px solid ${stile?.border ?? "#D8D4CB"}`,
                              }}
                              title={`${t.descrizione}: ${info?.liberi ?? 0} libere su ${info?.totale ?? 0}${info?.allotment ? ` (più ${info.allotment} in allotment alle agenzie)` : ""}`}
                            >
                              {info ? info.liberi : "—"}
                              {info?.allotment ? <sup className="ml-0.5 text-[0.6rem] font-normal">+{info.allotment}A</sup> : null}
                            </div>
                          );
                        })}
                      </div>

                      {espanso &&
                        raggruppaPerPiano(camere.filter((c) => c.tipoCameraId === t.id)).map(([piano, righe]) => (
                          // Il rientro va solo sulla colonna dei nomi: se si rientrasse tutta la riga, le colonne dei giorni
                          // si restringerebbero e non sarebbero più allineate con quelle del tipo camera (segnalato 2026-09-30).
                          <div key={piano}>
                            <div className="py-1 pl-5 text-xs font-bold uppercase tracking-wide text-stone-500">{piano}</div>
                            {righe.map((c) => (
                              <div key={c.id} className="mb-1 grid gap-1" style={{ gridTemplateColumns: `var(--col-etichetta) repeat(${giorni.length}, minmax(36px, 1fr))` }}>
                                <div className="sticky left-0 z-10 flex items-center gap-1.5 truncate bg-white pl-5 text-sm">
                                  <span className="font-bold">{c.codice}</span>
                                  {c.pulizia && (
                                    <span
                                      className={`h-2 w-2 shrink-0 rounded-full ${STATI_PULIZIA[c.pulizia.stato].colore}`}
                                      title={`${STATI_PULIZIA[c.pulizia.stato].testo}${c.pulizia.nonDisturbare ? " · non disturbare" : ""}`}
                                      aria-label={STATI_PULIZIA[c.pulizia.stato].testo}
                                    />
                                  )}
                                </div>
                                {giorni.map((g) => {
                                  const cella = c.celle[g];
                                  const stile = STILE[cella.stato];
                                  const isSel = selezionata?.cameraId === c.id && selezionata?.giorno === g;
                                  return (
                                    <button
                                      key={g}
                                      onClick={() => {
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

        {/* Colonna destra: la nuova prenotazione si apre SOPRA il dettaglio, senza sostituirlo —
            chi prenota deve continuare a vedere chi c'e' gia' in quelle date (feedback 2026-09-28). */}
        <div className="flex w-full flex-col gap-4 lg:w-80 lg:flex-shrink-0">
          {periodoConfermato && (
            <div ref={pannelloVeloceRef} className="flex scroll-mt-4 flex-col gap-3 rounded-lg border-2 border-teal-600 bg-white p-4 shadow-md sm:p-5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                    <Lock className="h-4 w-4 text-teal-700" aria-hidden /> Prenotazione veloce
                  </h2>
                  <button type="button" aria-label="Chiudi" onClick={chiudiPannelloVeloce} className="flex h-7 w-7 items-center justify-center rounded text-stone-500 hover:bg-stone-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <AiutoSezione breve="Blocca le camere per tipo, senza sceglierle subito." >
                  <p>
                    Indica quante camere di ogni tipo servono e quante persone in ciascuna: il prezzo si calcola subito. Le camere precise si assegnano
                    dopo, dal dettaglio della prenotazione.
                  </p>
                </AiutoSezione>
                {/* Date modificabili: su touch non si puo' trascinare (il dito scorre la griglia),
                    quindi si tocca il giorno di arrivo e qui si sistema la partenza. */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Campo etichetta="Arrivo">
                    <Input type="date" className="font-semibold" value={periodoConfermato.dal} onChange={(e) => cambiaDatePeriodo(e.target.value, periodoConfermato.al)} />
                  </Campo>
                  <Campo etichetta="Partenza">
                    <Input
                      type="date"
                      className="font-semibold"
                      min={isoGiorno(addDays(new Date(periodoConfermato.dal), 1))}
                      value={periodoConfermato.al}
                      onChange={(e) => cambiaDatePeriodo(periodoConfermato.dal, e.target.value)}
                    />
                  </Campo>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-stone-700">Camere richieste</span>
                {tipiOrdinati.map((t) => {
                  const min = minimoLiberoPerTipo(t.id);
                  return (
                    <div key={t.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-stone-900">{t.descrizione}</span>
                        <div className="flex items-center gap-2">
                          {min !== null && <span className="text-xs text-stone-500">{min} libere</span>}
                          <Input
                            type="number"
                            min={0}
                            aria-label={`Camere ${t.descrizione}`}
                            className="w-16"
                            value={quantita[t.id] ?? 0}
                            onChange={(e) => setQuantita({ ...quantita, [t.id]: Math.max(0, Number(e.target.value)) })}
                          />
                        </div>
                      </div>
                      {(quantita[t.id] ?? 0) > 0 && (
                        <div className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5">
                          <p className="mb-1 text-xs text-stone-600">Persone in ogni camera</p>
                          <CampoComposizione compatto valore={composizioneDi(t.id)} onChange={(c) => setComposizioni({ ...composizioni, [t.id]: c })} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Campo etichetta="Listino">
                  <Select value={listinoId ?? ""} onChange={(e) => setListinoId(Number(e.target.value))}>
                    {listini.map((l) => <option key={l.id} value={l.id}>{l.descrizione}</option>)}
                  </Select>
                </Campo>
                <Campo etichetta="Trattamento">
                  <Select value={trattamento} onChange={(e) => setTrattamento(e.target.value)}>
                    {trattamenti.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </Campo>
              </div>

              <OspiteSearch value={ospitePren} onChange={setOspitePren} etichetta="Cliente" />
              {ospitePren.mode === "nuovo" && (
                <div className="flex flex-col gap-2">
                  <Input type="tel" placeholder="Telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                  <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              )}

              {quantitaTotaleCamere > 0 && (
                <div className="text-sm">
                  Totale persone: <span className="font-bold">{personeTotali}</span>
                  {tipiOltreCapienza.map((r) => (
                    <p key={r.tipoCameraId} className="mt-1 text-sm font-medium text-amber-800">
                      {tipiOrdinati.find((t) => t.id === r.tipoCameraId)?.descrizione}: più persone della capienza ({capienzaPerTipo[r.tipoCameraId]}), servono letti aggiunti.
                    </p>
                  ))}
                  {postiLettoInEccesso > 0 && (
                    <p className="mt-1 text-sm font-medium text-amber-800">
                      Le camere scelte ospitano fino a {capienzaTotaleRichiesta} persone, più delle {personeTotali} indicate
                      ({postiLettoInEccesso} {postiLettoInEccesso === 1 ? "posto letto in più" : "posti letto in più"}).
                    </p>
                  )}
                </div>
              )}

              <Campo etichetta="Note">
                <Textarea rows={2} className="resize-none" placeholder="Richieste particolari, orario di arrivo, ecc." value={note} onChange={(e) => setNote(e.target.value)} />
              </Campo>

              {anteprima && (
                <div className="rounded-md border border-stone-200 bg-stone-50 p-2.5 text-sm">
                  <div className="flex justify-between"><span>Soggiorno</span><span className="font-mono">{eur(anteprima.subtotale)}</span></div>
                  <div className="flex justify-between text-stone-600"><span>Tassa di soggiorno (stimata)</span><span className="font-mono">{eur(anteprima.tassaStimata)}</span></div>
                  <div className="flex justify-between border-t border-stone-200 pt-1 font-bold"><span>Totale stimato</span><span className="font-mono">{eur(anteprima.totale)}</span></div>
                  <button
                    type="button"
                    onClick={() => setDettagliAperti((v) => !v)}
                    className="mt-1.5 text-xs font-semibold text-teal-800 underline"
                  >
                    {dettagliAperti ? "Nascondi il dettaglio" : "Da cosa deriva questo totale?"}
                  </button>
                  {dettagliAperti && (
                    <div className="mt-1.5 flex flex-col gap-1 border-t border-stone-200 pt-1.5 text-xs text-stone-700">
                      {anteprima.dettaglio.map((d) => (
                        <div key={d.tipoCameraId} className="flex justify-between">
                          <span>{d.quantita}× {d.descrizione} × {d.notti} notti × {eur(d.prezzoNotte)} (media per camera)</span>
                          <span className="font-mono">{eur(d.subtotale)}</span>
                        </div>
                      ))}
                      {anteprima.regolamento ? (
                        <div className="flex justify-between">
                          <span>
                            Tassa {anteprima.regolamento.comune}: {eur(anteprima.regolamento.aliquota)}/notte × {anteprima.nottiTassabili} notti
                            (tetto {anteprima.regolamento.tettoNotti}) × {personeTotali} persone
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

              {anteprima?.avvisi.map((a) => (
                <Avviso key={a} tipo="avviso">{a}</Avviso>
              ))}

              {anteprima && anteprima.tipiSenzaTariffa.length > 0 && (
                <Avviso tipo="avviso">
                  Nessuna tariffa impostata per {anteprima.tipiSenzaTariffa.join(", ")} in queste date: il totale è incompleto. Puoi bloccare le camere
                  comunque e sistemare il listino più avanti.
                </Avviso>
              )}

              {errore && <Avviso tipo="errore">{errore}</Avviso>}
              {ospitePren.mode === "vuoto" && <p className="text-xs text-stone-600">Per bloccare le camere indica il cliente.</p>}

              <div className="flex gap-2">
                <Pulsante className="flex-1" onClick={chiudiPannelloVeloce}>
                  Annulla
                </Pulsante>
                <Pulsante variante="primario" icona={Lock} className="flex-1" disabled={salvando || ospitePren.mode === "vuoto"} onClick={confermaPrenotazioneGenerica}>
                  {salvando ? "Salvataggio..." : "Blocca camere"}
                </Pulsante>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-stone-900">{selezionata ? "Camera selezionata" : "Prenotazioni in questo periodo"}</h2>
              {selezionata && (
                <Pulsante variante="leggero" dimensione="piccolo" icona={ChevronLeft} onClick={() => setSelezionata(null)}>
                  Torna all&apos;elenco
                </Pulsante>
              )}
            </div>
            {selezionata && cellaSelezionata && cameraSelezionata ? (
              <div className="flex flex-col gap-2">
                <div className="text-lg font-bold">Camera {cameraSelezionata.codice}</div>
                <div className="text-sm text-stone-600">{cameraSelezionata.tipoCameraNome}</div>
                <span
                  className="inline-block w-fit rounded px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ring-black/10"
                  style={{ background: STILE[cellaSelezionata.stato].bg, color: STILE[cellaSelezionata.stato].text }}
                >
                  {ETICHETTA[cellaSelezionata.stato]}
                </span>
                {cellaSelezionata.label && <div className="text-sm"><strong>{cellaSelezionata.label}</strong></div>}
                {(cellaSelezionata.stato === "libera" || cellaSelezionata.stato === "in_partenza" || cellaSelezionata.stato === "uso_diurno") && (
                  <Link href="/prenotazioni/nuova" className={classePulsante("primario", "normale", "mt-2")}>
                    <Plus className="h-4 w-4" aria-hidden /> Nuova prenotazione (camera specifica)
                  </Link>
                )}
                {puoGestire && selezionata && (cellaSelezionata.stato === "libera" || cellaSelezionata.stato === "in_partenza" || cellaSelezionata.stato === "uso_diurno") && (
                  <Link
                    href={`/prenotazioni/uso-diurno?camera=${cameraSelezionata.id}&giorno=${selezionata.giorno}`}
                    className={classePulsante("secondario", "normale")}
                  >
                    <Sun className="h-4 w-4" aria-hidden /> Uso diurno (day use)
                  </Link>
                )}
                {cellaSelezionata.prenotazioneId && (
                  <Link
                    href={`/prenotazioni/${cellaSelezionata.prenotazioneId}`}
                    className={classePulsante("secondario", "normale", "mt-2")}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden /> Apri prenotazione #{cellaSelezionata.prenotazioneId}
                  </Link>
                )}
                {cellaSelezionata.stato === "occupata_generica" && cellaSelezionata.genericiCandidati && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-stone-700">
                      Questa camera non è ancora assegnata: {cellaSelezionata.genericiCandidati.length === 1 ? "una prenotazione" : `${cellaSelezionata.genericiCandidati.length} prenotazioni`}{" "}
                      di questo tipo occupano la disponibilità in questo giorno. Puoi assegnarle questa camera.
                    </p>
                    {cellaSelezionata.genericiCandidati.map((cand) => (
                      <div key={cand.segmentoId} className="flex items-center justify-between gap-2 rounded-md border border-stone-200 p-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{cand.label}</span>
                          <Link href={`/prenotazioni/${cand.prenotazioneId}`} className="text-xs font-semibold text-teal-800 underline">
                            Apri prenotazione #{cand.prenotazioneId}
                          </Link>
                        </div>
                        {puoGestire && (
                          <Pulsante variante="primario" dimensione="piccolo" icona={KeyRound} disabled={assegnando} onClick={() => assegnaQuestaCamera(cameraSelezionata.id, cand)}>
                            Assegna
                          </Pulsante>
                        )}
                      </div>
                    ))}
                    {erroreAssegnazione && <Avviso tipo="errore">{erroreAssegnazione}</Avviso>}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  {prenotazioniNelPeriodo.length === 0 ? (
                    <p className="text-sm text-stone-500">Nessuna prenotazione attiva nel periodo visualizzato.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {prenotazioniNelPeriodo.map((p) => (
                        <li key={p.segmentoId}>
                          <Link
                            href={`/prenotazioni/${p.prenotazioneId}`}
                            className="group flex flex-col gap-0.5 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-teal-200 hover:bg-teal-50"
                          >
                            <span className="font-semibold text-stone-900 group-hover:text-teal-800 group-hover:underline">{p.label}</span>
                            <span className="flex items-center gap-1 text-xs text-stone-600">
                              {p.cameraCodice ?? "da assegnare"} · {formattaIt(p.dal)}–{formattaIt(p.al)}
                              <ChevronRight className="h-3.5 w-3.5 text-teal-700" aria-hidden />
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
