"use client";

import { BellOff, CheckCircle2, Minus, Play, Plus, RefreshCw, Refrigerator, Wrench } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { LAVORI, STATI_PULIZIA, testoArrivo, testoBiancheria } from "@/lib/pulizieRegole";
import { Avviso, Etichetta, Input, Pulsante, Spunta } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCaricaMieCamere, azioneFrigobar, azioneGuastoCamera, azioneMiaCamera, datiMieCamere } from "./actions";

type Dati = Awaited<ReturnType<typeof datiMieCamere>>;
type Azione = "inizia" | "finita" | "dnd" | "rifiutato" | "riapri";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const ESITI: Record<string, string> = { fatta: "Fatta", dnd: "Non disturbare", rifiutato: "Riassetto rifiutato" };

/**
 * Le mie camere: la lista della cameriera, nell'ordine in cui farle. Si tocca Inizia e Finita; da qui
 * si segnano «Non disturbare», il riassetto rifiutato e i consumi del frigobar (vanno sul conto).
 */
export function MieCamere({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [aperta, setAperta] = useState<null | { cameraId: number; modo: "frigobar" | "nota" | "guasto"; azione?: Azione; quantita: Record<number, number>; nota: string; urgente?: boolean }>(null);

  async function esegui(fn: () => Promise<Dati>, ok: string) {
    setMsg(null);
    setBusy(true);
    try {
      setD(await fn());
      setMsg({ tipo: "ok", testo: ok });
      setAperta(null);
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const azione = (cameraId: number, a: Azione, nota: string, ok: string) => esegui(() => sbusta(azioneMiaCamera(cameraId, a, nota)), ok);
  const daFare = d.camere.filter((c) => !c.fatta && !c.assegnata?.esito);
  const chiuse = d.camere.filter((c) => c.fatta || c.assegnata?.esito);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Le mie camere</h1>
        <Pulsante dimensione="piccolo" icona={RefreshCw} disabled={busy} onClick={() => esegui(() => sbusta(azioneCaricaMieCamere()), "Aggiornato.")}>
          Aggiorna
        </Pulsante>
      </div>
      <p className="text-sm text-stone-600">
        {d.oggi.split("-").reverse().join("/")} · {daFare.length} da fare · {chiuse.length} chiuse
      </p>
      <Suggerimento id="mie-camere" titolo="Come si usa">
        <p>
          Fai le camere nell&apos;ordine della lista: prima quelle con un arrivo. Tocca <strong>Inizia</strong> quando entri e <strong>Finita</strong> quando
          esci{d.controlloGovernante ? ": la governante la controllerà" : ""}. Se trovi consumi del frigobar segnali con <strong>Frigobar</strong>: vanno
          direttamente sul conto della camera.
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}
      {d.camere.length === 0 && <p className="text-center text-stone-700">Oggi non hai camere assegnate.</p>}

      {[...daFare, ...chiuse].map((c) => {
        const chiusa = c.fatta || !!c.assegnata?.esito;
        const qui = aperta?.cameraId === c.cameraId ? aperta : null;
        return (
          <section key={c.cameraId} className={`rounded-xl border p-3 shadow-sm ${chiusa ? "border-stone-200 bg-stone-50 text-stone-500" : c.arrivoOggi ? "border-red-300 bg-white" : "border-stone-200 bg-white"}`}>
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${STATI_PULIZIA[c.stato].colore}`} aria-hidden />
              <span className="text-2xl font-bold">{c.codice}</span>
              <span className="min-w-0 flex-1 text-sm">{LAVORI[c.lavoro]}</span>
              {c.nonDisturbare && <Etichetta tono="rosso">non disturbare</Etichetta>}
            </div>
            {c.arrivoOggi && <p className="mt-1 text-sm font-semibold text-red-800">{testoArrivo(c)}</p>}
            <p className="mt-1 text-sm">
              {testoBiancheria(c)}
              {c.couverture && " · couverture stasera"}
            </p>
            {chiusa ? (
              <p className="mt-2 flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {c.assegnata?.esito ? ESITI[c.assegnata.esito] : STATI_PULIZIA[c.stato].testo}
                {c.assegnata?.nota ? ` — ${c.assegnata.nota}` : ""}
                <button type="button" className="ml-auto text-xs font-semibold text-teal-800 underline" disabled={busy} onClick={() => azione(c.cameraId, "riapri", "", "Camera riaperta.")}>
                  Riapri
                </button>
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {c.stato !== "in_pulizia" ? (
                  <Pulsante variante="secondario" icona={Play} disabled={busy} onClick={() => azione(c.cameraId, "inizia", "", `Camera ${c.codice}: iniziata.`)}>
                    Inizia
                  </Pulsante>
                ) : (
                  <span className="flex items-center justify-center text-sm font-semibold text-sky-800">In pulizia…</span>
                )}
                <Pulsante variante="primario" icona={CheckCircle2} disabled={busy} onClick={() => azione(c.cameraId, "finita", "", `Camera ${c.codice}: finita.`)}>
                  Finita
                </Pulsante>
                {c.lavoro === "fermata" && (
                  <>
                    <Pulsante dimensione="piccolo" icona={BellOff} disabled={busy} onClick={() => setAperta({ cameraId: c.cameraId, modo: "nota", azione: "dnd", quantita: {}, nota: "" })}>
                      Non disturbare
                    </Pulsante>
                    <Pulsante dimensione="piccolo" disabled={busy} onClick={() => setAperta({ cameraId: c.cameraId, modo: "nota", azione: "rifiutato", quantita: {}, nota: "" })}>
                      Riassetto rifiutato
                    </Pulsante>
                  </>
                )}
              </div>
            )}
            {!qui && (
              <div className="mt-2 flex flex-wrap gap-1">
                {d.frigobar.length > 0 && (c.lavoro === "fermata" || c.occupazione === "partita" || c.occupazione === "in_partenza") && (
                  <Pulsante dimensione="piccolo" variante="leggero" icona={Refrigerator} onClick={() => setAperta({ cameraId: c.cameraId, modo: "frigobar", quantita: {}, nota: "" })}>
                    Frigobar
                  </Pulsante>
                )}
                {d.puoSegnalare && (
                  <Pulsante dimensione="piccolo" variante="leggero" icona={Wrench} onClick={() => setAperta({ cameraId: c.cameraId, modo: "guasto", quantita: {}, nota: "", urgente: false })}>
                    Segnala un guasto
                  </Pulsante>
                )}
              </div>
            )}
            {qui?.modo === "guasto" && (
              <div className="mt-2 flex flex-col gap-2 rounded-lg bg-stone-50 p-2">
                <Input placeholder="Cosa non va (es. la lampada del comodino non si accende)" value={qui.nota} onChange={(e) => setAperta({ ...qui, nota: e.target.value })} />
                <Spunta etichetta="Urgente: la camera non si può usare" checked={!!qui.urgente} onChange={(e) => setAperta({ ...qui, urgente: e.target.checked })} />
                <div className="flex gap-2">
                  <Pulsante
                    variante="primario"
                    dimensione="piccolo"
                    disabled={busy || qui.nota.trim().length < 3}
                    onClick={() => esegui(() => sbusta(azioneGuastoCamera(c.cameraId, qui.nota, !!qui.urgente)), `Guasto della camera ${c.codice} segnalato.`)}
                  >
                    Invia
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setAperta(null)}>
                    Annulla
                  </Pulsante>
                </div>
              </div>
            )}

            {qui?.modo === "nota" && qui.azione && (
              <div className="mt-2 flex flex-col gap-2 rounded-lg bg-stone-50 p-2">
                <Input placeholder="Nota (facoltativa, es. cartello sulla porta alle 11)" value={qui.nota} onChange={(e) => setAperta({ ...qui, nota: e.target.value })} />
                <div className="flex gap-2">
                  <Pulsante variante="primario" dimensione="piccolo" disabled={busy} onClick={() => azione(c.cameraId, qui.azione!, qui.nota, "Segnato.")}>
                    Conferma
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setAperta(null)}>
                    Annulla
                  </Pulsante>
                </div>
              </div>
            )}
            {qui?.modo === "frigobar" && (
              <div className="mt-2 flex flex-col gap-1 rounded-lg bg-stone-50 p-2">
                {d.frigobar.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1">
                      {a.nome} <span className="text-stone-500">{eur(a.prezzo)}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Togli ${a.nome}`}
                      className="rounded-full border border-stone-300 p-1.5"
                      onClick={() => setAperta({ ...qui, quantita: { ...qui.quantita, [a.id]: Math.max(0, (qui.quantita[a.id] ?? 0) - 1) } })}
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="w-5 text-center font-bold">{qui.quantita[a.id] ?? 0}</span>
                    <button
                      type="button"
                      aria-label={`Aggiungi ${a.nome}`}
                      className="rounded-full bg-teal-700 p-1.5 text-white"
                      onClick={() => setAperta({ ...qui, quantita: { ...qui.quantita, [a.id]: Math.min(20, (qui.quantita[a.id] ?? 0) + 1) } })}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))}
                <div className="mt-1 flex gap-2">
                  <Pulsante
                    variante="primario"
                    dimensione="piccolo"
                    disabled={busy || !Object.values(qui.quantita).some((q) => q > 0)}
                    onClick={() =>
                      esegui(
                        () =>
                          sbusta(
                            azioneFrigobar(
                              c.cameraId,
                              Object.entries(qui.quantita).map(([articoloId, quantita]) => ({ articoloId: Number(articoloId), quantita })),
                            ),
                          ),
                        `Frigobar della camera ${c.codice} segnato sul conto.`,
                      )
                    }
                  >
                    Segna sul conto
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setAperta(null)}>
                    Annulla
                  </Pulsante>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
