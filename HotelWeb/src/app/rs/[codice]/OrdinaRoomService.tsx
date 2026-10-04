"use client";

import { CheckCircle2, Minus, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { ALLERGENI } from "@/lib/allergeni";
import { CATEGORIE_PIATTO, ORDINE_CATEGORIE, numeroAllergene } from "@/lib/menuRegole";
import type { paginaOspite } from "@/lib/roomService";
import { azioneOrdina, azioneRicarica } from "./actions";

type Dati = NonNullable<Awaited<ReturnType<typeof paginaOspite>>>;
type Attivo = Extract<Dati, { attivo: true }>;

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const STATI: Record<string, string> = { ricevuto: "Ricevuto", in_preparazione: "In preparazione", pronto: "In arrivo", consegnato: "Consegnato", annullato: "Annullato" };

/** Pagina del room service sul telefono dell'ospite: menu, carrello, orario, invio e stato degli ordini. */
export function OrdinaRoomService({ codice, iniziale }: { codice: string; iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [carrello, setCarrello] = useState<Record<number, number>>({});
  const [quando, setQuando] = useState<"subito" | "orario">("subito");
  const [orario, setOrario] = useState("");
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inviato, setInviato] = useState(false);

  if (!d.attivo) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-stone-500">{d.hotel}</p>
        <h1 className="text-xl font-bold text-stone-900">Room service non disponibile</h1>
        <p className="text-stone-700">Questo link vale solo durante il soggiorno. Per qualsiasi richiesta chiama la reception.</p>
      </main>
    );
  }
  const a: Attivo = d;
  const voci = a.menu.flatMap((m) => m.voci.map((v) => ({ ...v, menu: m })));
  const scelte = voci.filter((v) => carrello[v.voceId]);
  const totale = scelte.reduce((t, v) => t + v.prezzo * carrello[v.voceId], 0);
  const cambia = (voceId: number, delta: number) => setCarrello((c) => ({ ...c, [voceId]: Math.max(0, Math.min(10, (c[voceId] ?? 0) + delta)) }));
  const usati = new Set(voci.flatMap((v) => v.allergeni));

  async function prova(fn: () => Promise<Dati>) {
    setErrore(null);
    setBusy(true);
    try {
      setD(await fn());
      return true;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Qualcosa non ha funzionato: riprova o chiama la reception.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md p-4 pb-40 text-stone-900">
      <header className="mb-4 text-center">
        <p className="text-xs uppercase tracking-widest text-stone-500">{a.hotel}</p>
        <h1 className="text-2xl font-bold">Room service</h1>
        {a.camera && <p className="text-sm text-stone-600">Camera {a.camera} · si paga con il conto della camera</p>}
      </header>

      {inviato && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> Ordine inviato! Lo stato si aggiorna qui sotto.
        </p>
      )}

      {a.ordini.length > 0 && (
        <section className="mb-5 rounded-lg border border-stone-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">I tuoi ordini</h2>
            <button type="button" className="flex items-center gap-1 text-sm font-semibold text-teal-800" disabled={busy} onClick={() => prova(() => sbusta(azioneRicarica(codice)))}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Aggiorna
            </button>
          </div>
          <ul className="mt-2 divide-y divide-stone-100 text-sm">
            {a.ordini.map((o) => (
              <li key={o.id} className="py-2">
                <span className="flex justify-between gap-2">
                  <strong>{STATI[o.stato] ?? o.stato}</strong>
                  <span className="text-stone-600">
                    ore {o.ora}
                    {o.perQuando && ` · per ${o.perQuando}`}
                  </span>
                </span>
                <span className="block text-stone-700">{o.righe.join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.menu.length === 0 && <p className="text-center text-stone-700">Oggi il room service non è disponibile. Chiama la reception.</p>}
      {a.menu.map((m) => (
        <section key={m.id} className="mb-5">
          <h2 className="text-lg font-bold">{m.nome}</h2>
          {m.dalle && m.alle && (
            <p className="text-sm text-stone-600">
              dalle {m.dalle} alle {m.alle}
            </p>
          )}
          {ORDINE_CATEGORIE.map((cat) => {
            const lista = m.voci.filter((v) => v.categoria === cat);
            if (!lista.length) return null;
            return (
              <div key={cat} className="mt-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">{CATEGORIE_PIATTO[cat]}</h3>
                <ul className="divide-y divide-stone-100">
                  {lista.map((v) => (
                    <li key={v.voceId} className="flex items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{v.nome}</span>
                        {v.allergeni.length > 0 && <sup className="ml-1 text-xs text-stone-500">{v.allergeni.map(numeroAllergene).join(",")}</sup>}
                        {v.descrizione && <span className="block text-sm text-stone-600">{v.descrizione}</span>}
                        <span className="block text-sm">{v.prezzo > 0 ? eur(v.prezzo) : "compreso"}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        {carrello[v.voceId] ? (
                          <>
                            <button type="button" aria-label={`Togli ${v.nome}`} className="rounded-full border border-stone-300 p-2" onClick={() => cambia(v.voceId, -1)}>
                              <Minus className="h-4 w-4" aria-hidden />
                            </button>
                            <span className="w-5 text-center font-bold">{carrello[v.voceId]}</span>
                          </>
                        ) : null}
                        <button type="button" aria-label={`Aggiungi ${v.nome}`} className="rounded-full bg-teal-700 p-2 text-white" onClick={() => cambia(v.voceId, 1)}>
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {m.note && <p className="mt-2 text-sm text-stone-600">{m.note}</p>}
        </section>
      ))}

      {usati.size > 0 && (
        <footer className="mt-6 border-t border-stone-200 pt-3 text-xs text-stone-600">
          <p className="font-semibold">Allergeni (Reg. UE 1169/2011)</p>
          <p>
            {ALLERGENI.map((x, i) => `${i + 1}. ${x.nome}`).join(" · ")}
          </p>
          <p className="mt-1">Allergie o intolleranze? Scrivilo nella nota o chiama la reception prima di ordinare.</p>
        </footer>
      )}

      {scelte.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white p-3 shadow-lg">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {errore && <p className="rounded-md bg-red-50 p-2 text-sm font-semibold text-red-800">{errore}</p>}
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1">
                <input type="radio" checked={quando === "subito"} onChange={() => setQuando("subito")} /> Appena possibile
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={quando === "orario"} onChange={() => setQuando("orario")} /> Per le ore
              </label>
              {quando === "orario" && (
                <input
                  type="datetime-local"
                  aria-label="Orario"
                  className="min-w-0 flex-1 rounded border border-stone-300 px-1"
                  min={`${a.oggi}T00:00`}
                  max={`${a.partenza}T23:59`}
                  value={orario}
                  onChange={(e) => setOrario(e.target.value)}
                />
              )}
            </div>
            <input className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Nota (es. senza ghiaccio, allergie…)" maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />
            <button
              type="button"
              disabled={busy || (quando === "orario" && !orario)}
              className="rounded-lg bg-teal-700 py-3 font-bold text-white disabled:opacity-50"
              onClick={async () => {
                const ok = await prova(() =>
                  sbusta(
                    azioneOrdina(codice, {
                      righe: scelte.map((v) => ({ voceId: v.voceId, quantita: carrello[v.voceId] })),
                      perQuando: quando === "orario" ? orario : null,
                      nota,
                    }),
                  ),
                );
                if (ok) {
                  setCarrello({});
                  setNota("");
                  setInviato(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              Ordina {scelte.reduce((t, v) => t + carrello[v.voceId], 0)} {scelte.length === 1 && carrello[scelte[0].voceId] === 1 ? "piatto" : "piatti"}
              {totale > 0 ? ` · ${eur(totale)}` : ""}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
