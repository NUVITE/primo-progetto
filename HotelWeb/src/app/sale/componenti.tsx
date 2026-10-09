"use client";

import { useEffect, useState } from "react";
import { sbusta } from "@/lib/esito";
import type { anteprimaOccupazione, OccupazioneInput, TestataInput } from "@/lib/sale";
import { azioneSalvaCliente } from "../clienti/actions";
import { clienteVuoto, FormCliente } from "../clienti/FormCliente";
import { azioneAnteprima, datiContesto } from "./actions";

type Anteprima = Awaited<ReturnType<typeof anteprimaOccupazione>>;
export type Contesto = Awaited<ReturnType<typeof datiContesto>>;

export const CELLA = "h-8 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2.5 text-sm text-stone-900 hover:border-stone-400 disabled:bg-stone-100 pointer-coarse:h-10";
export const BOTTONE = "inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9";
export { ETICHETTA_STATO, euro, it } from "./formato";
import { ETICHETTA_STATO, euro } from "./formato";

function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-semibold text-stone-600 ${className}`}>
      {label}
      {children}
    </label>
  );
}

// ---------------- Occupazione (sala + giorno + fascia/orario) ----------------

export type FormOccupazione = { salaId: string; giorno: string; fasciaId: string; inizio: string; fine: string; allestimentoId: string; partecipanti: string };

export const occupazioneVuota = (p: Partial<FormOccupazione> = {}): FormOccupazione => ({
  salaId: "",
  giorno: "",
  fasciaId: "",
  inizio: "",
  fine: "",
  allestimentoId: "",
  partecipanti: "",
  ...p,
});

export function inputOccupazione(f: FormOccupazione): OccupazioneInput {
  return {
    salaId: Number(f.salaId),
    giorno: f.giorno,
    fasciaId: f.fasciaId ? Number(f.fasciaId) : null,
    inizio: f.inizio,
    fine: f.fine,
    allestimentoId: f.allestimentoId ? Number(f.allestimentoId) : null,
    partecipanti: f.partecipanti ? Number(f.partecipanti) : null,
  };
}

const completa = (f: FormOccupazione) => !!f.salaId && !!f.giorno && (!!f.fasciaId || (/^\d\d:\d\d$/.test(f.inizio) && /^\d\d:\d\d$/.test(f.fine)));

/** Campi di un'occupazione con anteprima dal server (disponibilità e prezzo) a ogni modifica. */
export function CampiOccupazione({
  contesto,
  valore,
  onChange,
  escludiOccupazioneId,
  partecipantiEvento,
}: {
  contesto: Contesto;
  valore: FormOccupazione;
  onChange: (f: FormOccupazione) => void;
  escludiOccupazioneId?: number;
  // Partecipanti dell'evento: valgono per l'avviso di capienza se l'occupazione non ne indica altri.
  partecipantiEvento?: number | null;
}) {
  const [anteprima, setAnteprima] = useState<{ chiave: string; esito: Anteprima | { errore: string } } | null>(null);
  const sala = contesto.sale.find((s) => s.id === Number(valore.salaId));
  const set = (p: Partial<FormOccupazione>) => onChange({ ...valore, ...p });
  const chiave = JSON.stringify([valore, partecipantiEvento ?? null]);

  useEffect(() => {
    if (!completa(valore)) return;
    let annullato = false;
    const t = setTimeout(async () => {
      try {
        const input = inputOccupazione(valore);
        const esito = await sbusta(azioneAnteprima({ ...input, partecipanti: input.partecipanti ?? partecipantiEvento ?? null }, escludiOccupazioneId));
        if (!annullato) setAnteprima({ chiave, esito });
      } catch (e) {
        if (!annullato) setAnteprima({ chiave, esito: { errore: e instanceof Error ? e.message : "Errore." } });
      }
    }, 300);
    return () => {
      annullato = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave, escludiOccupazioneId]);

  const a = completa(valore) && anteprima?.chiave === chiave ? anteprima.esito : null;
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Campo label="Sala">
          <select className={CELLA} value={valore.salaId} onChange={(e) => set({ salaId: e.target.value, allestimentoId: "" })}>
            <option value="">—</option>
            {contesto.sale.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
                {s.capienzaMax ? ` (${s.capienzaMax})` : ""}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Giorno">
          <input type="date" className={CELLA} value={valore.giorno} onChange={(e) => set({ giorno: e.target.value })} />
        </Campo>
        <Campo label="Fascia">
          <select className={CELLA} value={valore.fasciaId} onChange={(e) => set({ fasciaId: e.target.value })}>
            {contesto.fasce.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} {f.inizio}–{f.fine}
              </option>
            ))}
            <option value="">Orario libero (a ore)</option>
          </select>
        </Campo>
        {valore.fasciaId ? (
          <div className="hidden sm:block" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Dalle">
              <input type="time" className={CELLA} value={valore.inizio} onChange={(e) => set({ inizio: e.target.value })} />
            </Campo>
            <Campo label="Alle">
              <input type="time" className={CELLA} value={valore.fine} onChange={(e) => set({ fine: e.target.value })} />
            </Campo>
          </div>
        )}
        <Campo label="Allestimento">
          <select className={CELLA} value={valore.allestimentoId} onChange={(e) => set({ allestimentoId: e.target.value })} disabled={!sala}>
            <option value="">Nessuno</option>
            {sala?.allestimenti.map((al) => (
              <option key={al.id} value={al.id}>
                {al.nome} ({al.capienza} posti{al.costo ? `, ${euro(al.costo)}` : ""})
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Partecipanti (se diversi)">
          <input type="number" min={1} className={CELLA} value={valore.partecipanti} onChange={(e) => set({ partecipanti: e.target.value })} />
        </Campo>
      </div>
      {a &&
        ("errore" in a ? (
          <p className="text-xs font-semibold text-red-700">{a.errore}</p>
        ) : (
          <p className={`text-xs font-semibold ${a.libera && a.prezzo !== null ? "text-emerald-800" : "text-red-700"}`}>
            {a.libera ? "Libera" : a.conflitto}
            {" · "}
            {a.prezzo !== null ? `${euro(a.prezzo)} (${a.spiegazione})` : a.spiegazione}
            {a.costoAllestimento ? ` + allestimento ${euro(a.costoAllestimento)}` : ""}
          </p>
        ))}
      {a && !("errore" in a) && a.avvisoCapienza && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-950">Capienza: {a.avvisoCapienza}</p>
      )}
    </div>
  );
}

// ---------------- Ripetizione su più giorni ----------------

export type FormRipetizione = { attiva: boolean; al: string; giorni: number[] };
export const ripetizioneVuota = (): FormRipetizione => ({ attiva: false, al: "", giorni: [1, 2, 3, 4, 5] });
export function inputRipetizione(f: FormRipetizione) {
  return f.attiva ? { al: f.al, giorniSettimana: f.giorni } : null;
}
const GIORNI_SETTIMANA = [
  [1, "lun"],
  [2, "mar"],
  [3, "mer"],
  [4, "gio"],
  [5, "ven"],
  [6, "sab"],
  [0, "dom"],
] as const;

/** "Ripeti fino al … nei giorni …": stessa sala e orario su più giorni con un solo inserimento. */
export function CampiRipetizione({ valore, onChange, dal }: { valore: FormRipetizione; onChange: (f: FormRipetizione) => void; dal: string }) {
  const giorniContati = (() => {
    if (!valore.attiva || !dal || !valore.al || valore.al < dal) return 0;
    let n = 0;
    for (let d = new Date(`${dal}T00:00:00Z`); d.toISOString().slice(0, 10) <= valore.al; d = new Date(d.getTime() + 86_400_000)) {
      if (!valore.giorni.length || valore.giorni.includes(d.getUTCDay())) n++;
    }
    return n;
  })();
  return (
    <div className="flex flex-col gap-2 rounded-md border border-stone-200 bg-stone-50 p-2">
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800">
        <input type="checkbox" checked={valore.attiva} onChange={(e) => onChange({ ...valore, attiva: e.target.checked })} />
        Ripeti su più giorni (es. sessione d&apos;esami dal lunedì al venerdì)
      </label>
      {valore.attiva && (
        <div className="flex flex-wrap items-end gap-3">
          <Campo label="Fino al (compreso)">
            <input type="date" className={CELLA} min={dal || undefined} value={valore.al} onChange={(e) => onChange({ ...valore, al: e.target.value })} />
          </Campo>
          <div className="flex flex-wrap gap-2 pb-1 text-sm">
            {GIORNI_SETTIMANA.map(([g, nome]) => (
              <label key={g} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={valore.giorni.includes(g)}
                  onChange={(e) => onChange({ ...valore, giorni: e.target.checked ? [...valore.giorni, g] : valore.giorni.filter((x) => x !== g) })}
                />
                {nome}
              </label>
            ))}
          </div>
          <span className="pb-1 text-xs font-semibold text-stone-700">{giorniContati ? `${giorniContati} giorni` : ""}</span>
        </div>
      )}
    </div>
  );
}

// ---------------- Testata (titolo, cliente, stato) ----------------

export type FormTestata = { titolo: string; clienteId: string; prenotazioneId: string; stato: string; scadenzaOpzione: string; partecipanti: string; note: string };

export function inputTestata(f: FormTestata): TestataInput {
  return {
    titolo: f.titolo,
    clienteId: f.clienteId ? Number(f.clienteId) : null,
    prenotazioneId: f.prenotazioneId ? Number(f.prenotazioneId) : null,
    stato: f.stato,
    scadenzaOpzione: f.scadenzaOpzione,
    partecipanti: f.partecipanti ? Number(f.partecipanti) : null,
    note: f.note,
  };
}

export function CampiTestata({
  contesto,
  valore,
  onChange,
  onContesto,
  statiAmmessi = ["opzione", "confermata"],
}: {
  contesto: Contesto;
  valore: FormTestata;
  onChange: (f: FormTestata) => void;
  onContesto: (c: Contesto) => void;
  statiAmmessi?: string[];
}) {
  const [nuovoCliente, setNuovoCliente] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const set = (p: Partial<FormTestata>) => onChange({ ...valore, ...p });
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Titolo dell'evento" className="sm:col-span-2">
          <input className={CELLA} value={valore.titolo} onChange={(e) => set({ titolo: e.target.value })} placeholder="es. Convegno annuale" />
        </Campo>
        <Campo label="Stato">
          <select className={CELLA} value={valore.stato} onChange={(e) => set({ stato: e.target.value })}>
            {statiAmmessi.map((s) => (
              <option key={s} value={s}>
                {ETICHETTA_STATO[s].testo}
              </option>
            ))}
          </select>
        </Campo>
        {valore.stato === "opzione" ? (
          <Campo label="Opzione valida fino al">
            <input type="date" className={CELLA} value={valore.scadenzaOpzione} onChange={(e) => set({ scadenzaOpzione: e.target.value })} />
          </Campo>
        ) : (
          <div className="hidden lg:block" />
        )}
        <Campo label="Cliente o azienda" className="sm:col-span-2">
          <div className="flex gap-2">
            <select className={CELLA} value={valore.clienteId} onChange={(e) => set({ clienteId: e.target.value })}>
              <option value="">—</option>
              {contesto.clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.denominazione}
                </option>
              ))}
            </select>
            {!nuovoCliente && (
              <button type="button" className="shrink-0 inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setNuovoCliente(true)}>
                + Nuovo
              </button>
            )}
          </div>
        </Campo>
        <Campo label="Collegata a prenotazione camere" className="sm:col-span-2">
          <select className={CELLA} value={valore.prenotazioneId} onChange={(e) => set({ prenotazioneId: e.target.value })}>
            <option value="">—</option>
            {contesto.prenotazioni.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etichetta}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {nuovoCliente && (
        <>
          {errore && <p className="text-xs font-semibold text-red-700">{errore}</p>}
          <FormCliente
            iniziale={clienteVuoto()}
            busy={busy}
            onAnnulla={() => setNuovoCliente(false)}
            onSalva={async (d) => {
              setBusy(true);
              setErrore(null);
              try {
                const r = await sbusta(azioneSalvaCliente(null, d));
                onContesto({ ...contesto, clienti: r.clienti.filter((c) => c.dati.attivo).map((c) => ({ id: c.id, denominazione: c.dati.denominazione })) });
                set({ clienteId: String(r.id) });
                setNuovoCliente(false);
              } catch (e) {
                setErrore(e instanceof Error ? e.message : "Errore.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-4">
        <Campo label="Partecipanti">
          <input type="number" min={1} className={CELLA} value={valore.partecipanti} onChange={(e) => set({ partecipanti: e.target.value })} />
        </Campo>
        <Campo label="Note" className="sm:col-span-3">
          <input className={CELLA} value={valore.note} onChange={(e) => set({ note: e.target.value })} />
        </Campo>
      </div>
    </div>
  );
}
