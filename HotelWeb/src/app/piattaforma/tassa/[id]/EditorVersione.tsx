"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { caricaVersione, DatiRegola, DatiTariffa } from "@/lib/regolamentiTassa";
import { azioneEliminaVersione, azioneSalvaDati, azioneSalvaRegole, azioneSalvaTariffe } from "../actions";

type Versione = Awaited<ReturnType<typeof caricaVersione>>;

const INPUT = "mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900 disabled:bg-stone-50";
const CELLA = "w-full rounded-md border border-stone-300 px-1.5 py-1 text-sm text-stone-900 disabled:bg-stone-50";
const ETICHETTA = "flex flex-col text-xs text-stone-600";

const TIPI: { valore: string; nome: string }[] = [
  { valore: "eta", nome: "Per età (automatica)" },
  { valore: "dichiarata", nome: "Esenzione dichiarata" },
  { valore: "riduzione", nome: "Riduzione %" },
  { valore: "tetto_annuo", nome: "Tetto annuo" },
];

const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));

export function EditorVersione({ iniziale }: { iniziale: Versione }) {
  const router = useRouter();
  const [v, setV] = useState(iniziale);
  const [dati, setDati] = useState(iniziale.dati);
  const [tariffe, setTariffe] = useState<DatiTariffa[]>(iniziale.tariffe);
  const [regole, setRegole] = useState<DatiRegola[]>(iniziale.regole);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confermaElimina, setConfermaElimina] = useState(false);
  const ro = v.bloccata;

  async function salva(fn: () => Promise<Versione>, cosa: string) {
    setMessaggio(null);
    setBusy(true);
    try {
      const nuova = await fn();
      setV(nuova);
      setDati(nuova.dati);
      setTariffe(nuova.tariffe);
      setRegole(nuova.regole);
      setMessaggio({ tipo: "ok", testo: `${cosa} salvate. Le tasse ancora provvisorie degli hotel del comune sono state ricalcolate.` });
    } catch (e) {
      setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
    } finally {
      setBusy(false);
    }
  }

  const aggiornaTariffa = (i: number, p: Partial<DatiTariffa>) => setTariffe(tariffe.map((t, j) => (j === i ? { ...t, ...p } : t)));
  const aggiornaRegola = (i: number, p: Partial<DatiRegola>) => setRegole(regole.map((r, j) => (j === i ? { ...r, ...p } : r)));

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <Link href="/piattaforma/tassa" className="text-sm text-teal-700">
          ← Tassa di soggiorno
        </Link>
        <h1 className="text-xl font-bold">
          {v.comune.nome} — versione dal {v.dati.validoDal.split("-").reverse().join("/")}
        </h1>
      </div>

      {ro && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Questa versione è già stata usata in soggiorni chiusi: è in sola lettura. Per un cambio di regole crea una nuova versione da una data,
          dalla pagina precedente.
        </p>
      )}
      {messaggio && (
        <p className={`rounded-md px-3 py-2 text-sm font-semibold ${messaggio.tipo === "ok" ? "border border-emerald-300 bg-emerald-50 text-emerald-900" : "border border-red-300 bg-red-50 text-red-800"}`}>
          {messaggio.testo}
        </p>
      )}

      {/* Dati generali */}
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-900">Dati generali</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={ETICHETTA}>
            Valida dal
            <input type="date" className={INPUT} disabled={ro} value={dati.validoDal} onChange={(e) => setDati({ ...dati, validoDal: e.target.value })} />
          </label>
          <label className={ETICHETTA}>
            Valida fino al (vuoto = in vigore)
            <input type="date" className={INPUT} disabled={ro} value={dati.validoAl} onChange={(e) => setDati({ ...dati, validoAl: e.target.value })} />
          </label>
          <label className={ETICHETTA}>
            Stagionalità dal (MM-GG, vuoto = tutto l&apos;anno)
            <input className={INPUT} disabled={ro} placeholder="es. 05-01" value={dati.stagionalitaDal} onChange={(e) => setDati({ ...dati, stagionalitaDal: e.target.value })} />
          </label>
          <label className={ETICHETTA}>
            Stagionalità al (MM-GG)
            <input className={INPUT} disabled={ro} placeholder="es. 10-31" value={dati.stagionalitaAl} onChange={(e) => setDati({ ...dati, stagionalitaAl: e.target.value })} />
          </label>
          <label className={`${ETICHETTA} sm:col-span-2`}>
            Atto di riferimento
            <input className={INPUT} disabled={ro} value={dati.attoRiferimento} onChange={(e) => setDati({ ...dati, attoRiferimento: e.target.value })} />
          </label>
          <label className={`${ETICHETTA} sm:col-span-2`}>
            Link alla fonte ufficiale
            <input className={INPUT} disabled={ro} value={dati.fonteUrl} onChange={(e) => setDati({ ...dati, fonteUrl: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-teal-700" disabled={ro} checked={dati.esclusiResidenti} onChange={(e) => setDati({ ...dati, esclusiResidenti: e.target.checked })} />
            I residenti nel comune sono fuori campo
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-teal-700" disabled={ro} checked={dati.azzeraAnnoSolare} onChange={(e) => setDati({ ...dati, azzeraAnnoSolare: e.target.checked })} />
            Il conteggio delle notti consecutive riparte il 1° gennaio
          </label>
          <label className={`${ETICHETTA} sm:col-span-2`}>
            Note
            <textarea className={INPUT} rows={3} disabled={ro} value={dati.note} onChange={(e) => setDati({ ...dati, note: e.target.value })} />
          </label>
          <label className={`${ETICHETTA} sm:col-span-2`}>
            Da confermare con il Comune (mostrato come avviso alla reception)
            <textarea className={INPUT} rows={3} disabled={ro} value={dati.daConfermare} onChange={(e) => setDati({ ...dati, daConfermare: e.target.value })} />
          </label>
        </div>
        {!ro && (
          <div className="mt-3 flex justify-end">
            <button type="button" disabled={busy} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10" onClick={() => salva(() => sbusta(azioneSalvaDati(v.id, dati)), "Modifiche")}>
              Salva dati generali
            </button>
          </div>
        )}
      </section>

      {/* Tariffe */}
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-sm font-bold text-stone-900">Tariffe per categoria di struttura</h2>
        <p className="mb-3 text-sm text-stone-600">
          La categoria deve essere scritta come in Piattaforma &gt; Hotel. La tariffa predefinita vale per le categorie non previste.
        </p>
        <div className="overflow-x-auto">
          <table className="tabella-responsive w-full text-sm">
            <thead className="text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="pb-1 pr-2">Categoria</th>
                <th className="pb-1 pr-2">€ / persona / notte</th>
                <th className="pb-1 pr-2">Tetto notti</th>
                <th className="pb-1 pr-2">Conteggio del tetto</th>
                <th className="pb-1 pr-2">Predefinita</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tariffe.map((t, i) => (
                <tr key={t.id ?? `nuova-${i}`} className="border-t border-stone-100 align-top">
                  <td data-label="Categoria" className="cella-intera py-1.5 pr-2">
                    <input className={CELLA} disabled={ro} value={t.categoria} onChange={(e) => aggiornaTariffa(i, { categoria: e.target.value })} />
                  </td>
                  <td data-label="€ / persona / notte" className="py-1.5 pr-2">
                    <input type="number" min={0} step="0.01" className={`${CELLA} w-24`} disabled={ro} value={t.importo} onChange={(e) => aggiornaTariffa(i, { importo: Number(e.target.value) })} />
                  </td>
                  <td data-label="Tetto notti" className="py-1.5 pr-2">
                    <input
                      type="number"
                      min={1}
                      className={`${CELLA} w-20`}
                      disabled={ro}
                      placeholder="nessuno"
                      value={t.tettoNotti ?? ""}
                      onChange={(e) => aggiornaTariffa(i, { tettoNotti: numOrNull(e.target.value) })}
                    />
                  </td>
                  <td data-label="Conteggio del tetto" className="cella-intera py-1.5 pr-2">
                    <select className={CELLA} disabled={ro} value={t.modoTetto} onChange={(e) => aggiornaTariffa(i, { modoTetto: e.target.value })}>
                      <option value="consecutive_struttura">Notti consecutive nella struttura</option>
                      <option value="consecutive_anche_altrove">Consecutive anche in altre strutture (ricevuta dell&apos;ospite)</option>
                    </select>
                  </td>
                  <td data-label="Predefinita" className="py-1.5 pr-2">
                    <input
                      type="radio"
                      name="predefinita"
                      className="h-4 w-4 accent-teal-700"
                      disabled={ro}
                      checked={t.predefinita}
                      onChange={() => setTariffe(tariffe.map((x, j) => ({ ...x, predefinita: j === i })))}
                    />
                  </td>
                  <td className="py-1.5 md:text-right">
                    {!ro && (
                      <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setTariffe(tariffe.filter((_, j) => j !== i))}>
                        Togli
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!ro && (
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10"
              onClick={() => setTariffe([...tariffe, { categoria: "", importo: 0, tettoNotti: null, modoTetto: "consecutive_struttura", predefinita: false }])}
            >
              + Tariffa
            </button>
            <button type="button" disabled={busy} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10" onClick={() => salva(() => sbusta(azioneSalvaTariffe(v.id, tariffe)), "Tariffe")}>
              Salva tariffe
            </button>
          </div>
        )}
      </section>

      {/* Regole */}
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-sm font-bold text-stone-900">Esenzioni, riduzioni e tetti speciali</h2>
        <p className="mb-3 text-sm text-stone-600">
          Le regole per età si applicano da sole; le altre le registra la reception sull&apos;ospite. Il limite viene mostrato come avviso, non blocca.
        </p>
        <div className="flex flex-col gap-3">
          {regole.map((r, i) => (
            <div key={r.id ?? `nuova-${i}`} className="grid grid-cols-1 gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-6">
              <label className={`${ETICHETTA} sm:col-span-1`}>
                Codice
                <input className={INPUT} disabled={ro} value={r.codice} onChange={(e) => aggiornaRegola(i, { codice: e.target.value })} />
              </label>
              <label className={`${ETICHETTA} sm:col-span-2`}>
                Tipo
                <select className={INPUT} disabled={ro} value={r.tipo} onChange={(e) => aggiornaRegola(i, { tipo: e.target.value })}>
                  {TIPI.map((t) => (
                    <option key={t.valore} value={t.valore}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`${ETICHETTA} sm:col-span-2`}>
                Articolo
                <input className={INPUT} disabled={ro} value={r.articolo} onChange={(e) => aggiornaRegola(i, { articolo: e.target.value })} />
              </label>
              <div className="flex items-end justify-end sm:col-span-1">
                {!ro && (
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setRegole(regole.filter((_, j) => j !== i))}>
                    Togli regola
                  </button>
                )}
              </div>
              <label className={`${ETICHETTA} sm:col-span-6`}>
                Descrizione
                <input className={INPUT} disabled={ro} value={r.descrizione} onChange={(e) => aggiornaRegola(i, { descrizione: e.target.value })} />
              </label>
              {r.tipo === "eta" && (
                <>
                  <label className={`${ETICHETTA} sm:col-span-3`}>
                    Esente se ha meno di (anni)
                    <input type="number" min={0} className={INPUT} disabled={ro} value={r.etaSotto ?? ""} onChange={(e) => aggiornaRegola(i, { etaSotto: numOrNull(e.target.value) })} />
                  </label>
                  <label className={`${ETICHETTA} sm:col-span-3`}>
                    Esente da (anni compiuti)
                    <input type="number" min={0} className={INPUT} disabled={ro} value={r.etaDa ?? ""} onChange={(e) => aggiornaRegola(i, { etaDa: numOrNull(e.target.value) })} />
                  </label>
                </>
              )}
              {r.tipo === "riduzione" && (
                <label className={`${ETICHETTA} sm:col-span-2`}>
                  Riduzione %
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className={INPUT}
                    disabled={ro}
                    value={r.percentualeRiduzione ?? ""}
                    onChange={(e) => aggiornaRegola(i, { percentualeRiduzione: numOrNull(e.target.value) })}
                  />
                </label>
              )}
              {r.tipo === "tetto_annuo" && (
                <label className={`${ETICHETTA} sm:col-span-2`}>
                  Notti tassate al massimo nell&apos;anno
                  <input type="number" min={1} className={INPUT} disabled={ro} value={r.nottiTettoAnnuo ?? ""} onChange={(e) => aggiornaRegola(i, { nottiTettoAnnuo: numOrNull(e.target.value) })} />
                </label>
              )}
              {r.tipo !== "eta" && (
                <>
                  <label className={`${ETICHETTA} sm:col-span-3`}>
                    Documento richiesto
                    <input className={INPUT} disabled={ro} value={r.documentoRichiesto} onChange={(e) => aggiornaRegola(i, { documentoRichiesto: e.target.value })} />
                  </label>
                  <label className={`${ETICHETTA} ${r.tipo === "dichiarata" ? "sm:col-span-3" : "sm:col-span-1"}`}>
                    Limite (avviso)
                    <input className={INPUT} disabled={ro} value={r.limite} onChange={(e) => aggiornaRegola(i, { limite: e.target.value })} />
                  </label>
                </>
              )}
            </div>
          ))}
        </div>
        {!ro && (
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10"
              onClick={() =>
                setRegole([
                  ...regole,
                  { codice: "", tipo: "dichiarata", descrizione: "", articolo: "", documentoRichiesto: "", limite: "", etaSotto: null, etaDa: null, percentualeRiduzione: null, nottiTettoAnnuo: null },
                ])
              }
            >
              + Regola
            </button>
            <button type="button" disabled={busy} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10" onClick={() => salva(() => sbusta(azioneSalvaRegole(v.id, regole)), "Regole")}>
              Salva regole
            </button>
          </div>
        )}
      </section>

      {!ro && (
        <div className="flex justify-end">
          {confermaElimina ? (
            <span className="flex flex-wrap items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm">
              Eliminare questa versione? Si può solo se non è mai stata usata.
              <button
                type="button"
                disabled={busy}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-bold text-white"
                onClick={async () => {
                  setBusy(true);
                  try {
                    await sbusta(azioneEliminaVersione(v.id));
                    router.push("/piattaforma/tassa");
                  } catch (e) {
                    setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
                    setBusy(false);
                  }
                }}
              >
                Elimina
              </button>
              <button type="button" className="rounded-md px-3 py-1 text-xs font-semibold text-stone-600" onClick={() => setConfermaElimina(false)}>
                Annulla
              </button>
            </span>
          ) : (
            <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setConfermaElimina(true)}>
              Elimina versione
            </button>
          )}
        </div>
      )}
    </div>
  );
}
