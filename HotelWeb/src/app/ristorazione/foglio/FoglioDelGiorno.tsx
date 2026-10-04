"use client";

import { ChevronLeft, ChevronRight, ChefHat, Plus, Printer, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { ALLERGENI, REGIMI, nomeVoce, type Regime } from "@/lib/allergeni";
import { ELENCO_PASTI, PASTI, type Pasto } from "@/lib/pastiRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCaricaFoglio, azioneTavolo, azioneVariazionePasto, datiFoglio } from "./actions";

type Dati = Awaited<ReturnType<typeof datiFoglio>>;
type Riga = Dati["servizi"][Pasto]["righe"][number];

const coperti = (n: number) => `${n} ${n === 1 ? "coperto" : "coperti"}`;
const it = (g: string) => g.split("-").reverse().join("/");
const sposta = (g: string, n: number) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const giornoSettimana = (g: string) => new Date(`${g}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", timeZone: "UTC" });

/** Il servizio da mostrare appena si apre la pagina: quello che viene dopo, secondo l'ora. */
function servizioDellOra(): Pasto {
  const ora = Number(new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return ora < 10 ? "colazione" : ora < 15 ? "pranzo" : "cena";
}

const persone = (r: { adulti: number; bambini: number; piccoli: number }) =>
  [r.adulti && `${r.adulti} ad.`, r.bambini && `${r.bambini} bamb.`, r.piccoli && `${r.piccoli} sotto i 3 anni`].filter(Boolean).join(", ");

/**
 * Foglio del giorno: coperti di colazione, pranzo e cena camera per camera, con le note alimentari.
 * Vista Sala (nomi, tavoli, coperti in più o in meno) e vista Cucina (numeri e allergie).
 */
export function FoglioDelGiorno({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [pasto, setPasto] = useState<Pasto>(servizioDellOra);
  const [vista, setVista] = useState<"sala" | "cucina">("sala");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [modifica, setModifica] = useState<null | { segmentoId: number; base: number; coperti: string; nota: string }>(null);
  const [extra, setExtra] = useState<null | { segmentoId: string; coperti: string; nota: string }>(null);
  const [tavoli, setTavoli] = useState<Record<number, string>>({});

  async function esegui(fn: () => Promise<Dati>, ok?: string) {
    setMsg(null);
    setBusy(true);
    try {
      setD(await fn());
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const vai = (giorno: string) => {
    setModifica(null);
    setExtra(null);
    setTavoli({});
    window.history.replaceState(null, "", `/ristorazione/foglio?giorno=${giorno}`);
    return esegui(() => sbusta(azioneCaricaFoglio(giorno)));
  };
  const variazione = (segmentoId: number, delta: number, nota: string, ok: string) =>
    esegui(() => sbusta(azioneVariazionePasto(d.giorno, segmentoId, pasto, delta, nota)), ok);

  const s = d.servizi[pasto];
  const senzaPasto = d.camere.filter((c) => !s.righe.some((r) => r.segmentoId === c.segmentoId));

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo={`Foglio del giorno · ${PASTI[pasto]}`}
        sottotitolo={`${giornoSettimana(d.giorno)} ${it(d.giorno)} · ${coperti(s.coperti)}`}
        azioni={
          <Pulsante dimensione="piccolo" icona={Printer} onClick={() => window.print()}>
            Stampa
          </Pulsante>
        }
      />
      <Suggerimento id="foglio-pasti" titolo="Come si legge">
        <p>
          I coperti vengono dai trattamenti delle camere occupate: con N notti spettano N colazioni (dalla mattina dopo l&apos;arrivo a quella della
          partenza), N cene (dalla sera dell&apos;arrivo a quella prima della partenza) e, in pensione completa, N pranzi (fino al pranzo del giorno di
          partenza). Se un ospite salta un pasto o ne aggiunge uno, correggi i coperti della camera: la correzione vale solo per quel giorno.
        </p>
        <p>La vista <strong>Cucina</strong> mette in evidenza numeri e allergie; la vista <strong>Sala</strong> nomi e tavoli.</p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}
      {d.trattamentiSconosciuti.length > 0 && (
        <Avviso tipo="avviso">
          Trattamenti senza pasti impostati: {d.trattamentiSconosciuti.join(", ")}. Indica i pasti compresi in{" "}
          <Link href="/impostazioni/trattamenti" className="font-semibold underline">
            Impostazioni › Trattamenti
          </Link>
          .
        </Avviso>
      )}
      {!d.conNote && <Avviso tipo="info">Le note alimentari non si vedono: serve il permesso «Note alimentari».</Avviso>}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Pulsante dimensione="piccolo" icona={ChevronLeft} disabled={busy} onClick={() => vai(sposta(d.giorno, -1))}>
          Giorno prima
        </Pulsante>
        <div className="w-44">
          <Input type="date" aria-label="Giorno" value={d.giorno} onChange={(e) => e.target.value && vai(e.target.value)} />
        </div>
        <Pulsante dimensione="piccolo" disabled={busy} onClick={() => vai(sposta(d.giorno, 1))}>
          Giorno dopo <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Pulsante>
        <span className="ml-auto flex gap-1">
          <Pulsante dimensione="piccolo" variante={vista === "sala" ? "primario" : "secondario"} icona={UtensilsCrossed} onClick={() => setVista("sala")}>
            Sala
          </Pulsante>
          <Pulsante dimensione="piccolo" variante={vista === "cucina" ? "primario" : "secondario"} icona={ChefHat} onClick={() => setVista("cucina")}>
            Cucina
          </Pulsante>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 print:hidden" role="tablist">
        {ELENCO_PASTI.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={p === pasto}
            className={`rounded-lg border p-3 text-left ${p === pasto ? "border-teal-600 bg-teal-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}
            onClick={() => {
              setPasto(p);
              setModifica(null);
              setExtra(null);
            }}
          >
            <span className="block text-sm font-semibold text-stone-700">{PASTI[p]}</span>
            <span className="block text-2xl font-bold text-stone-900">{d.servizi[p].coperti}</span>
            <span className="block text-xs text-stone-600">{d.servizi[p].righe.filter((r) => r.note.some((n) => n.allergie)).length > 0 ? "con allergie" : "coperti"}</span>
          </button>
        ))}
      </div>

      <Sezione titolo={`${PASTI[pasto]}: ${coperti(s.coperti)}`}>
        <p className="text-sm text-stone-700">{persone(s) || "Nessun coperto previsto."}</p>
        {vista === "cucina" ? <VistaCucina righe={s.righe} /> : null}
        {vista === "sala" && (
          <div className="mt-3 overflow-x-auto">
            <table className="tabella-responsive w-full text-sm">
              <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
                <tr>
                  <th className="py-1.5 pr-2">Camera</th>
                  <th className="py-1.5 pr-2">Ospite</th>
                  <th className="py-1.5 pr-2 text-right">Coperti</th>
                  <th className="py-1.5 pr-2">Tavolo</th>
                  <th className="py-1.5 pr-2">Note alimentari</th>
                  <th className="py-1.5 pr-2 print:hidden" />
                </tr>
              </thead>
              <tbody>
                {s.righe.map((r) => (
                  <tr key={r.segmentoId} className={`border-b border-stone-100 align-top last:border-0 ${r.coperti === 0 ? "text-stone-400" : ""}`}>
                    <td data-label="Camera" className="py-1.5 pr-2 font-semibold">
                      {r.camera ?? "—"}
                    </td>
                    <td data-label="Ospite" className="py-1.5 pr-2">
                      <Link href={`/prenotazioni/${r.prenotazioneId}`} className="hover:underline">
                        {r.nome}
                      </Link>
                      <span className="block text-xs text-stone-500">
                        {r.trattamento}
                        {r.arrivo && " · arriva oggi"}
                        {r.partenza && " · parte oggi"}
                      </span>
                      {r.opzione && <Etichetta tono="ambra">opzione</Etichetta>}
                    </td>
                    <td data-label="Coperti" className="py-1.5 pr-2 text-right">
                      <span className="text-base font-bold">{r.coperti}</span>
                      <span className="block text-xs text-stone-500">{persone(r)}</span>
                      {r.delta !== 0 && (
                        <span className="block text-xs text-amber-800">
                          {r.delta > 0 ? `+${r.delta}` : r.delta} sul trattamento{r.notaVariazione ? `: ${r.notaVariazione}` : ""}
                        </span>
                      )}
                    </td>
                    <td data-label="Tavolo" className="py-1.5 pr-2">
                      <Input
                        className="w-20"
                        aria-label={`Tavolo ${r.camera ?? r.nome}`}
                        value={tavoli[r.segmentoId] ?? r.tavolo}
                        onChange={(e) => setTavoli({ ...tavoli, [r.segmentoId]: e.target.value })}
                        onBlur={() => {
                          const v = tavoli[r.segmentoId];
                          if (v !== undefined && v !== r.tavolo) esegui(() => sbusta(azioneTavolo(d.giorno, r.segmentoId, v)), "Tavolo salvato.");
                        }}
                      />
                    </td>
                    <td data-label="Note" className="py-1.5 pr-2">
                      {r.note.map((n) => (
                        <span key={n.nome} className="block">
                          <span className={n.allergie ? "font-semibold text-red-800" : "text-stone-800"}>
                            {n.nome}: {n.sintesi}
                          </span>
                          {n.daEvitare.length > 0 && (
                            <span className="block text-xs text-red-800">Da evitare: {n.daEvitare.map((x) => `${x.piatto} (${x.motivi.join(", ")})`).join("; ")}</span>
                          )}
                        </span>
                      ))}
                    </td>
                    <td className="cella-intera py-1.5 print:hidden md:text-right">
                      {modifica?.segmentoId === r.segmentoId ? (
                        <span className="flex flex-wrap items-center gap-1 md:justify-end">
                          <Input
                            type="number"
                            min={0}
                            className="w-20"
                            aria-label="Coperti"
                            value={modifica.coperti}
                            onChange={(e) => setModifica({ ...modifica, coperti: e.target.value })}
                          />
                          <Input className="w-40" placeholder="Motivo (es. cena fuori)" value={modifica.nota} onChange={(e) => setModifica({ ...modifica, nota: e.target.value })} />
                          <Pulsante
                            variante="primario"
                            dimensione="piccolo"
                            disabled={busy || modifica.coperti === ""}
                            onClick={async () => {
                              if (await variazione(r.segmentoId, Number(modifica.coperti) - modifica.base, modifica.nota, "Coperti aggiornati.")) setModifica(null);
                            }}
                          >
                            Salva
                          </Pulsante>
                          <Pulsante dimensione="piccolo" onClick={() => setModifica(null)}>
                            Annulla
                          </Pulsante>
                        </span>
                      ) : (
                        <span className="flex flex-wrap gap-1 md:justify-end">
                          <Pulsante
                            variante="leggero"
                            dimensione="piccolo"
                            onClick={() => setModifica({ segmentoId: r.segmentoId, base: r.base, coperti: String(r.coperti), nota: r.notaVariazione })}
                          >
                            Cambia coperti
                          </Pulsante>
                          {r.delta !== 0 && (
                            <Pulsante variante="leggero" dimensione="piccolo" disabled={busy} onClick={() => variazione(r.segmentoId, 0, "", "Tornati i coperti del trattamento.")}>
                              Come da trattamento
                            </Pulsante>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {s.righe.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-3 text-center text-stone-600">
                      Nessuna camera con {PASTI[pasto].toLowerCase()} in questo giorno.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {vista === "sala" && senzaPasto.length > 0 && (
          <div className="mt-3 print:hidden">
            {extra ? (
              <div className="flex flex-wrap items-end gap-2 rounded-md border border-teal-200 bg-teal-50/50 p-3">
                <Campo etichetta="Camera">
                  <Select value={extra.segmentoId} onChange={(e) => setExtra({ ...extra, segmentoId: e.target.value })}>
                    <option value="">Scegli…</option>
                    {senzaPasto.map((c) => (
                      <option key={c.segmentoId} value={c.segmentoId}>
                        {c.camera ? `${c.camera} · ` : ""}
                        {c.nome} ({c.trattamento})
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo etichetta="Coperti">
                  <Input type="number" min={1} className="w-20" value={extra.coperti} onChange={(e) => setExtra({ ...extra, coperti: e.target.value })} />
                </Campo>
                <Campo etichetta="Nota">
                  <Input value={extra.nota} placeholder="es. pasto extra da addebitare" onChange={(e) => setExtra({ ...extra, nota: e.target.value })} />
                </Campo>
                <Pulsante
                  variante="primario"
                  dimensione="piccolo"
                  disabled={busy || !extra.segmentoId || !(Number(extra.coperti) > 0)}
                  onClick={async () => {
                    if (await variazione(Number(extra.segmentoId), Number(extra.coperti), extra.nota, "Coperti aggiunti.")) setExtra(null);
                  }}
                >
                  Aggiungi
                </Pulsante>
                <Pulsante dimensione="piccolo" onClick={() => setExtra(null)}>
                  Annulla
                </Pulsante>
              </div>
            ) : (
              <Pulsante dimensione="piccolo" icona={Plus} onClick={() => setExtra({ segmentoId: "", coperti: "1", nota: "" })}>
                Coperti per una camera senza {PASTI[pasto].toLowerCase()}
              </Pulsante>
            )}
            <AiutoSezione breve="Per un ospite che non ha il pasto nel trattamento (es. B&B che cena in hotel). Il prezzo del pasto si segna sul conto come consumo del ristorante.">
              <Esempio>Camera 12 in B&amp;B, stasera cenano in due: 2 coperti con la nota «cena extra», poi consumo Ristorante sul conto.</Esempio>
            </AiutoSezione>
          </div>
        )}
      </Sezione>
    </div>
  );
}

/** Vista cucina: le allergie raggruppate per allergene (con le camere), i regimi e i coperti per camera. */
function VistaCucina({ righe }: { righe: Riga[] }) {
  const allergeni = new Map<string, { nome: string; allergia: string[]; intolleranza: string[] }>();
  const regimi = new Map<string, number>();
  const altre: string[] = [];
  const evitare = new Map<string, { allergia: boolean; chi: string[] }>();
  for (const r of righe) {
    if (r.coperti === 0) continue;
    for (const n of r.note) {
      const dove = r.camera ? `cam. ${r.camera} (${n.nome})` : n.nome;
      for (const v of n.voci) {
        const chiave = v.codice ?? `testo:${(v.testo ?? "").toLowerCase()}`;
        const a = allergeni.get(chiave) ?? { nome: nomeVoce(v), allergia: [], intolleranza: [] };
        a[v.tipo].push(dove);
        allergeni.set(chiave, a);
      }
      for (const g of n.regimi) regimi.set(g, (regimi.get(g) ?? 0) + 1);
      if (n.esigenze) altre.push(`${dove}: ${n.esigenze}`);
      for (const x of n.daEvitare) {
        const e = evitare.get(x.piatto) ?? { allergia: false, chi: [] as string[] };
        e.allergia ||= x.allergia;
        e.chi.push(dove);
        evitare.set(x.piatto, e);
      }
    }
  }
  const ordine = [...ALLERGENI.map((a) => a.codice as string)];
  const elenco = [...allergeni.entries()].sort(([a], [b]) => (ordine.indexOf(a) + 1 || 99) - (ordine.indexOf(b) + 1 || 99));

  return (
    <div className="mt-3 flex flex-col gap-3">
      {elenco.length === 0 && regimi.size === 0 && altre.length === 0 ? (
        <p className="text-sm text-emerald-800">Nessuna allergia, intolleranza o regime segnalato.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {elenco.map(([k, a]) => (
            <div key={k} className={`rounded-md border p-2 text-sm ${a.allergia.length ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
              <p className="font-bold uppercase">{a.nome}</p>
              {a.allergia.length > 0 && <p className="text-red-900">Allergia: {a.allergia.join(", ")}</p>}
              {a.intolleranza.length > 0 && <p className="text-amber-900">Intolleranza: {a.intolleranza.join(", ")}</p>}
            </div>
          ))}
          {regimi.size > 0 && (
            <div className="rounded-md border border-stone-200 p-2 text-sm">
              <p className="font-bold">Regimi</p>
              <p>{[...regimi].map(([g, n]) => `${REGIMI[g as Regime] ?? g}: ${n}`).join(" · ")}</p>
            </div>
          )}
          {altre.length > 0 && (
            <div className="rounded-md border border-stone-200 p-2 text-sm">
              <p className="font-bold">Altre esigenze</p>
              {altre.map((x) => (
                <p key={x}>{x}</p>
              ))}
            </div>
          )}
        </div>
      )}
      {evitare.size > 0 && (
        <div className="rounded-md border border-red-300 bg-white p-2 text-sm">
          <p className="font-bold text-red-900">Piatti del menu da non servire a…</p>
          <ul className="mt-1">
            {[...evitare].map(([piatto, e]) => (
              <li key={piatto}>
                <strong>{piatto}</strong>: {e.chi.join(", ")}
                {e.allergia && <Etichetta tono="rosso" className="ml-1">allergia</Etichetta>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <table className="w-full max-w-lg text-sm">
        <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
          <tr>
            <th className="py-1 pr-2">Camera</th>
            <th className="py-1 pr-2 text-right">Coperti</th>
            <th className="py-1 pr-2">Tavolo</th>
          </tr>
        </thead>
        <tbody>
          {righe
            .filter((r) => r.coperti > 0)
            .map((r) => (
              <tr key={r.segmentoId} className="border-b border-stone-100 last:border-0">
                <td className="py-1 pr-2 font-semibold">
                  {r.camera ?? r.nome}
                  {r.note.some((n) => n.allergie) && <Etichetta tono="rosso" className="ml-1">allergie</Etichetta>}
                </td>
                <td className="py-1 pr-2 text-right">
                  {r.coperti}
                  {r.piccoli > 0 && <span className="text-xs text-stone-500"> (+ seggiolone?)</span>}
                </td>
                <td className="py-1 pr-2">{r.tavolo || "—"}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
