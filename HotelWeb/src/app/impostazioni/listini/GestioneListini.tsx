"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import {
  azioneCompletaNotti,
  azioneCreaListino,
  azioneCreaPeriodo,
  azioneEliminaPeriodo,
  azioneModificaPeriodo,
  azioneRinominaListino,
  datiListini,
} from "../actions";
import { RegoleListino } from "./RegoleListino";
import { Suggerimento } from "@/components/Suggerimento";

type Dati = Awaited<ReturnType<typeof datiListini>>;
type Periodo = { dal: string; al: string; prezzoNotte: string };

const CELLA = "h-8 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2.5 text-sm text-stone-900 hover:border-stone-400 disabled:bg-stone-100 pointer-coarse:h-10";
const it = (iso: string) => iso.split("-").reverse().join("/");
const vuoto = (): Periodo => ({ dal: "", al: "", prezzoNotte: "" });

export function GestioneListini({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [listinoId, setListinoId] = useState(iniziale.listini[0]?.id ?? 0);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [modifica, setModifica] = useState<{ id: number; p: Periodo } | null>(null);
  const [nuovi, setNuovi] = useState<Record<number, Periodo>>({});
  const [nuovoListino, setNuovoListino] = useState<{ codice: string; descrizione: string; gruppo: boolean } | null>(null);
  const [rinomina, setRinomina] = useState<string | null>(null);
  const listino = dati.listini.find((l) => l.id === listinoId) ?? dati.listini[0];

  async function esegui<T>(fn: () => Promise<{ listini: Dati; risultato: T }>, ok?: (r: T) => string) {
    setMessaggio(null);
    setBusy(true);
    try {
      const r = await fn();
      setDati(r.listini);
      if (ok) setMessaggio({ tipo: "ok", testo: ok(r.risultato) });
      return true;
    } catch (e) {
      setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const numero = (p: Periodo) => ({ dal: p.dal, al: p.al, prezzoNotte: Number(p.prezzoNotte) });

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <h1 className="text-xl font-bold">Listini e tariffe</h1>
      <Suggerimento id="listini" titolo="Come si imposta un listino">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Scegli il listino dai pulsanti qui sotto, oppure creane uno nuovo con <strong>+ Nuovo listino</strong> (per esempio uno per i gruppi scout o
            per le scuole).
          </li>
          <li>
            In <strong>Regole del listino</strong> indica se il prezzo è <strong>a camera</strong> o <strong>a persona</strong>, i supplementi dei
            trattamenti (mezza pensione, pensione completa) e le riduzioni per i bambini.
          </li>
          <li>
            Per ogni tipo di camera aggiungi i <strong>periodi</strong> con il prezzo per notte (date comprese). Le notti non coperte da un periodo
            restano &quot;senza tariffa&quot; e il totale della prenotazione risulta incompleto.
          </li>
        </ol>
        <p>Ogni modifica vale per le nuove prenotazioni: quelle già fatte conservano il prezzo concordato.</p>
      </Suggerimento>
      {messaggio && (
        <p className={`rounded-md px-3 py-2 text-sm font-semibold ${messaggio.tipo === "ok" ? "border border-emerald-300 bg-emerald-50 text-emerald-900" : "border border-red-300 bg-red-50 text-red-800"}`}>
          {messaggio.testo}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {dati.listini.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setListinoId(l.id);
              setRinomina(null);
            }}
            className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${l.id === listino?.id ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 bg-white text-stone-700"}`}
          >
            {l.descrizione}
          </button>
        ))}
        {nuovoListino ? (
          <span className="flex flex-wrap items-center gap-2">
            <input className="w-24 rounded-md border border-stone-300 px-2 py-1 text-sm" placeholder="Codice" value={nuovoListino.codice} onChange={(e) => setNuovoListino({ ...nuovoListino, codice: e.target.value })} />
            <input className="w-48 rounded-md border border-stone-300 px-2 py-1 text-sm" placeholder="es. Gruppi scout" value={nuovoListino.descrizione} onChange={(e) => setNuovoListino({ ...nuovoListino, descrizione: e.target.value })} />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={nuovoListino.gruppo} onChange={(e) => setNuovoListino({ ...nuovoListino, gruppo: e.target.checked })} /> per gruppi
            </label>
            <button
              type="button"
              disabled={busy}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9"
              onClick={async () => {
                if (await esegui(() => sbusta(azioneCreaListino(nuovoListino.codice, nuovoListino.descrizione, nuovoListino.gruppo)), () => "Listino creato.")) setNuovoListino(null);
              }}
            >
              Crea
            </button>
            <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setNuovoListino(null)}>
              Annulla
            </button>
          </span>
        ) : (
          <button type="button" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10" onClick={() => setNuovoListino({ codice: "", descrizione: "", gruppo: false })}>
            + Nuovo listino
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          className="ml-auto inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10"
          title="Prenotazioni fatte quando la tariffa mancava: usa i prezzi attuali del listino"
          onClick={() =>
            esegui(
              () => sbusta(azioneCompletaNotti()),
              (r) =>
                r.completate || r.ancoraMancanti
                  ? `Notti senza prezzo completate: ${r.completate}. Ancora senza tariffa: ${r.ancoraMancanti}.`
                  : "Nessuna notte senza prezzo.",
            )
          }
        >
          Completa le notti senza prezzo
        </button>
      </div>

      {listino && (
        <div className="flex items-center gap-2 text-sm text-stone-600">
          {rinomina === null ? (
            <>
              Codice <span className="font-mono">{listino.codice}</span>
              <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9" onClick={() => setRinomina(listino.descrizione)}>
                Rinomina
              </button>
            </>
          ) : (
            <>
              <input className="w-64 rounded-md border border-stone-300 px-2 py-1 text-sm" value={rinomina} onChange={(e) => setRinomina(e.target.value)} />
              <button
                type="button"
                disabled={busy}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9"
                onClick={async () => {
                  if (await esegui(() => sbusta(azioneRinominaListino(listino.id, rinomina)))) setRinomina(null);
                }}
              >
                Salva
              </button>
              <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setRinomina(null)}>
                Annulla
              </button>
            </>
          )}
        </div>
      )}

      {listino && (
        <RegoleListino
          key={listino.id}
          listino={listino}
          trattamenti={dati.trattamenti}
          politiche={dati.politiche}
          busy={busy}
          esegui={(fn, ok) => esegui(fn, () => ok)}
        />
      )}

      {listino?.perTipo.map((t) => {
        const tipo = dati.tipi.find((x) => x.id === t.tipoCameraId)!;
        const nuovo = nuovi[t.tipoCameraId] ?? vuoto();
        return (
          <section key={t.tipoCameraId} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-2 font-bold">{tipo.descrizione}</h2>
            {t.buchi.length > 0 && (
              <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Senza tariffa nei prossimi 12 mesi: {t.buchi.map((b) => (b.dal === b.al ? it(b.dal) : `${it(b.dal)} – ${it(b.al)}`)).join(", ")}.
                Le prenotazioni in quelle date restano con il prezzo da completare.
              </p>
            )}
            <table className="tabella-responsive w-full text-sm">
              <thead className="text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="pb-1 pr-2">Dal</th>
                  <th className="pb-1 pr-2">Al (compreso)</th>
                  <th className="pb-1 pr-2">{listino.regole.modalita === "persona" ? "€ / persona / notte" : "€ / camera / notte"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {t.periodi.map((p) =>
                  modifica?.id === p.id ? (
                    <tr key={p.id} className="border-t border-stone-100 bg-teal-50/40">
                      <td data-label="Dal" className="py-1.5 pr-2">
                        <input type="date" className={CELLA} value={modifica.p.dal} onChange={(e) => setModifica({ id: p.id, p: { ...modifica.p, dal: e.target.value } })} />
                      </td>
                      <td data-label="Al" className="py-1.5 pr-2">
                        <input type="date" className={CELLA} value={modifica.p.al} onChange={(e) => setModifica({ id: p.id, p: { ...modifica.p, al: e.target.value } })} />
                      </td>
                      <td data-label="€ / notte" className="py-1.5 pr-2">
                        <input type="number" min={0} step="0.01" className={CELLA} value={modifica.p.prezzoNotte} onChange={(e) => setModifica({ id: p.id, p: { ...modifica.p, prezzoNotte: e.target.value } })} />
                      </td>
                      <td className="cella-intera py-1.5 md:text-right">
                        <button
                          type="button"
                          disabled={busy}
                          className="mr-2 inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9"
                          onClick={async () => {
                            if (await esegui(() => sbusta(azioneModificaPeriodo(p.id, numero(modifica.p))), () => "Periodo aggiornato.")) setModifica(null);
                          }}
                        >
                          Salva
                        </button>
                        <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setModifica(null)}>
                          Annulla
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id} className="border-t border-stone-100">
                      <td data-label="Dal" className="py-1.5 pr-2 font-mono">{it(p.dal)}</td>
                      <td data-label="Al" className="py-1.5 pr-2 font-mono">{it(p.al)}</td>
                      <td data-label="€ / notte" className="py-1.5 pr-2 font-mono">{p.prezzoNotte.toFixed(2)}</td>
                      <td className="cella-intera py-1.5 md:text-right">
                        <button
                          type="button"
                          className="mr-2 inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
                          onClick={() => setModifica({ id: p.id, p: { dal: p.dal, al: p.al, prezzoNotte: String(p.prezzoNotte) } })}
                        >
                          Modifica
                        </button>
                        <button type="button" disabled={busy} className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => esegui(() => sbusta(azioneEliminaPeriodo(p.id)), () => "Periodo eliminato.")}>
                          Elimina
                        </button>
                      </td>
                    </tr>
                  ),
                )}
                <tr className="border-t border-stone-100">
                  <td data-label="Dal" className="py-1.5 pr-2">
                    <input type="date" className={CELLA} value={nuovo.dal} onChange={(e) => setNuovi({ ...nuovi, [t.tipoCameraId]: { ...nuovo, dal: e.target.value } })} />
                  </td>
                  <td data-label="Al" className="py-1.5 pr-2">
                    <input type="date" className={CELLA} value={nuovo.al} onChange={(e) => setNuovi({ ...nuovi, [t.tipoCameraId]: { ...nuovo, al: e.target.value } })} />
                  </td>
                  <td data-label="€ / notte" className="py-1.5 pr-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={CELLA}
                      placeholder="0,00"
                      value={nuovo.prezzoNotte}
                      onChange={(e) => setNuovi({ ...nuovi, [t.tipoCameraId]: { ...nuovo, prezzoNotte: e.target.value } })}
                    />
                  </td>
                  <td className="cella-intera py-1.5 md:text-right">
                    <button
                      type="button"
                      disabled={busy || !nuovo.dal || !nuovo.al || nuovo.prezzoNotte === ""}
                      className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9"
                      onClick={async () => {
                        if (await esegui(() => sbusta(azioneCreaPeriodo(listino.id, t.tipoCameraId, numero(nuovo))), () => "Periodo aggiunto.")) {
                          setNuovi({ ...nuovi, [t.tipoCameraId]: vuoto() });
                        }
                      }}
                    >
                      + Aggiungi periodo
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        );
      })}
      {dati.tipi.length === 0 && <p className="text-sm text-stone-500">Nessun tipo di camera: crealo prima in Impostazioni &gt; Camere.</p>}
    </div>
  );
}
