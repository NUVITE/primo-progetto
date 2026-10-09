"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { RegoleListinoInput, RiduzioneInput } from "@/lib/impostazioniHotel";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import {
  azioneEliminaRiduzione,
  azioneEliminaSupplementoStagionale,
  azioneSalvaRegoleListino,
  azioneSalvaRiduzione,
  azioneSalvaSupplementiTrattamento,
  azioneSalvaSupplementoStagionale,
  datiListini,
} from "../actions";

type Dati = Awaited<ReturnType<typeof datiListini>>;
type Listino = Dati["listini"][number];
type Esegui = (fn: () => Promise<{ listini: Dati; risultato: unknown }>, ok: string) => Promise<boolean>;

const CELLA = "h-8 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2.5 text-sm text-stone-900 hover:border-stone-400 disabled:bg-stone-100 pointer-coarse:h-10";
const BOTTONE = "inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9";
const numOppureNull = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
// Giorni della settimana per le notti weekend (0 = domenica, come in JavaScript).
const GIORNI = [
  [1, "lun"],
  [2, "mar"],
  [3, "mer"],
  [4, "gio"],
  [5, "ven"],
  [6, "sab"],
  [0, "dom"],
] as const;
const it = (g: string) => g.split("-").reverse().join("/");

type FormRiduzione = { etaDa: string; etaA: string; tipo: RiduzioneInput["tipo"]; valore: string; dalTerzoLetto: boolean };

export function descriviRiduzione(r: { etaDa: number; etaA: number | null; tipo: string; valore: number; dalTerzoLetto: boolean }) {
  const chi = r.etaDa >= 18 ? "Adulti" : r.etaA === null ? `Da ${r.etaDa} anni` : `${r.etaDa}–${r.etaA} anni`;
  const quanto =
    r.tipo === "gratis" ? "gratis" : r.tipo === "percentuale" ? `−${r.valore}%` : r.tipo === "supplemento" ? `+${r.valore.toFixed(2)} € a notte` : `−${r.valore.toFixed(2)} €`;
  return `${chi}: ${quanto}${r.dalTerzoLetto ? " (solo dal 3° letto)" : ""}`;
}

/** Regole del listino: modalità, singola, supplementi per trattamento, riduzioni per età, condizioni di gruppo. */
export function RegoleListino({
  listino,
  trattamenti,
  politiche,
  tipi,
  busy,
  esegui,
}: {
  listino: Listino;
  trattamenti: Dati["trattamenti"];
  politiche: Dati["politiche"];
  tipi: Dati["tipi"];
  busy: boolean;
  esegui: Esegui;
}) {
  const [regole, setRegole] = useState<null | {
    modalita: "camera" | "persona";
    singola: string;
    singolaPerc: boolean;
    gruppo: boolean;
    categoria: string;
    minPersone: string;
    gratuitaOgni: string;
    politica: string;
    weekend: number[];
  }>(null);
  const [stagione, setStagione] = useState<null | { id: number | null; trattamentoId: string; tipoCameraId: string; dal: string; al: string; importo: string }>(null);
  const [stagioneDaEliminare, setStagioneDaEliminare] = useState<number | null>(null);
  const politicaPredefinita = politiche.find((p) => p.predefinita);
  const politicaListino = politiche.find((p) => p.id === listino.regole.politicaId);
  const [supplementi, setSupplementi] = useState<Record<number, string> | null>(null);
  const [riduzione, setRiduzione] = useState<{ id: number; f: FormRiduzione } | null>(null);
  const [daEliminare, setDaEliminare] = useState<number | null>(null);
  const r = listino.regole;
  const aPersona = r.modalita === "persona";

  const riepilogoTrattamenti =
    trattamenti
      .filter((t) => listino.supplementiTrattamento[t.id])
      .map((t) => `${t.nome} +${listino.supplementiTrattamento[t.id].toFixed(2)} €`)
      .join(" · ") || "tutti inclusi nel prezzo";

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div>
        <h2 className="font-bold">Regole del listino</h2>
        <AiutoSezione breve="Come si calcola il prezzo di una notte con questo listino.">
          <p>
            <strong>A camera</strong>: il prezzo del periodo è quello della camera, qualunque sia il numero di persone; si aggiungono solo i supplementi
            dei trattamenti per persona.
          </p>
          <p>
            <strong>A persona</strong>: il prezzo del periodo vale per ogni persona in camera. Se in una doppia dorme una persona sola si aggiunge il{" "}
            <strong>supplemento singola</strong>.
          </p>
          <p>
            <strong>Listino per gruppi</strong>: sotto il minimo di persone compare un avviso; con &quot;1 gratuito ogni N paganti&quot; il sistema
            azzera ogni notte la quota più alta per ogni gruppo di N+1 persone.
          </p>
          <Esempio>listino a persona 45 €, 2 adulti in doppia = 90 € a notte; 1 adulto solo con singola +10 € = 55 €.</Esempio>
        </AiutoSezione>
      </div>

      {/* Modalità, singola, gruppo */}
      {regole ? (
        <div className="flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
          <div className="flex flex-wrap gap-4 text-sm">
            {(["camera", "persona"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5">
                <input type="radio" checked={regole.modalita === m} onChange={() => setRegole({ ...regole, modalita: m })} />
                {m === "camera" ? "Prezzo a camera" : "Prezzo a persona"}
              </label>
            ))}
          </div>
          {regole.modalita === "persona" && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                Supplemento singola (doppia uso singola)
                <input type="number" min={0} step="0.01" className={`${CELLA} w-32`} value={regole.singola} onChange={(e) => setRegole({ ...regole, singola: e.target.value })} />
              </label>
              <select className={`${CELLA} w-auto`} value={regole.singolaPerc ? "p" : "e"} onChange={(e) => setRegole({ ...regole, singolaPerc: e.target.value === "p" })}>
                <option value="e">€ per notte</option>
                <option value="p">% della quota</option>
              </select>
            </div>
          )}
          {listino.tipo !== "base" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={regole.gruppo} onChange={(e) => setRegole({ ...regole, gruppo: e.target.checked })} /> Listino per gruppi
            </label>
          )}
          {regole.gruppo && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                Categoria
                <input className={CELLA} value={regole.categoria} onChange={(e) => setRegole({ ...regole, categoria: e.target.value })} placeholder="es. Scout, Scuole, Parrocchie" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                Minimo persone
                <input type="number" min={1} className={CELLA} value={regole.minPersone} onChange={(e) => setRegole({ ...regole, minPersone: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                1 gratuito ogni … paganti
                <input type="number" min={1} className={CELLA} value={regole.gratuitaOgni} onChange={(e) => setRegole({ ...regole, gratuitaOgni: e.target.value })} placeholder="es. 25" />
              </label>
            </div>
          )}
          <div className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
            Notti con il prezzo weekend
            <div className="flex flex-wrap gap-3 text-sm font-normal text-stone-800">
              {GIORNI.map(([g, nome]) => (
                <label key={g} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={regole.weekend.includes(g)}
                    onChange={(e) => setRegole({ ...regole, weekend: e.target.checked ? [...regole.weekend, g] : regole.weekend.filter((x) => x !== g) })}
                  />
                  {nome}
                </label>
              ))}
            </div>
            <span className="font-normal">La notte di venerdì è quella tra venerdì e sabato. Il prezzo weekend si scrive nei periodi, accanto a quello normale.</span>
          </div>
          <label className="flex max-w-md flex-col gap-1 text-xs font-semibold text-stone-600">
            Politica di cancellazione
            <select className={CELLA} value={regole.politica} onChange={(e) => setRegole({ ...regole, politica: e.target.value })}>
              <option value="">Quella predefinita dell&apos;hotel{politicaPredefinita ? ` (${politicaPredefinita.nome})` : " (nessuna)"}</option>
              {politiche.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <span className="font-normal">Es. un listino &quot;non rimborsabile&quot; con la sua politica. Le politiche si creano in Politiche di cancellazione.</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              className={BOTTONE}
              onClick={async () => {
                const dati: RegoleListinoInput = {
                  modalita: regole.modalita,
                  supplementoSingola: numOppureNull(regole.singola),
                  supplementoSingolaPercentuale: regole.singolaPerc,
                  gruppo: regole.gruppo,
                  categoria: regole.categoria,
                  minPersone: numOppureNull(regole.minPersone),
                  gratuitaOgni: numOppureNull(regole.gratuitaOgni),
                  politicaId: regole.politica ? Number(regole.politica) : null,
                  giorniWeekend: regole.weekend,
                };
                if (await esegui(() => sbusta(azioneSalvaRegoleListino(listino.id, dati)), "Regole salvate. Valgono per le nuove prenotazioni.")) setRegole(null);
              }}
            >
              Salva
            </button>
            <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setRegole(null)}>
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
          <div>
            <p>
              <span className="font-semibold">{aPersona ? "Prezzo a persona" : "Prezzo a camera"}</span>
              {aPersona && r.supplementoSingola ? ` · singola +${r.supplementoSingolaPercentuale ? `${r.supplementoSingola}%` : `${r.supplementoSingola.toFixed(2)} €`}` : ""}
            </p>
            <p className="text-stone-600">
              Notti weekend: {r.giorniWeekend.length ? GIORNI.filter(([g]) => r.giorniWeekend.includes(g)).map(([, n]) => n).join(", ") : "nessuna"}
            </p>
            <p className="text-stone-600">
              Cancellazione: {politicaListino ? politicaListino.nome : politicaPredefinita ? `${politicaPredefinita.nome} (predefinita)` : "nessuna politica"}
            </p>
            {r.gruppo && (
              <p className="text-stone-600">
                Gruppo{r.categoria ? ` (${r.categoria})` : ""}
                {r.minPersone ? ` · da ${r.minPersone} persone` : ""}
                {r.gratuitaOgni ? ` · 1 gratuito ogni ${r.gratuitaOgni} paganti` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
            onClick={() =>
              setRegole({
                modalita: r.modalita as "camera" | "persona",
                singola: str(r.supplementoSingola),
                singolaPerc: r.supplementoSingolaPercentuale,
                gruppo: r.gruppo,
                categoria: r.categoria,
                minPersone: str(r.minPersone),
                gratuitaOgni: str(r.gratuitaOgni),
                politica: r.politicaId ? String(r.politicaId) : "",
                weekend: r.giorniWeekend,
              })
            }
          >
            Modifica
          </button>
        </div>
      )}

      {/* Supplementi per trattamento */}
      <div className="border-t border-stone-100 pt-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Trattamenti</h3>
            <AiutoSezione breve="Quanto si aggiunge a persona per notte per mezza pensione o pensione completa.">
              <p>
                Il prezzo del listino comprende il trattamento base (di solito B&amp;B). Per gli altri trattamenti indica il supplemento{" "}
                <strong>per persona per notte</strong>; lascia vuoto se è compreso nel prezzo.
              </p>
              <p>Le riduzioni per età valgono anche sul supplemento.</p>
              <Esempio>camera a 80 €, mezza pensione +20 €, 2 adulti = 80 + 20 + 20 = 120 € a notte.</Esempio>
            </AiutoSezione>
          </div>
          {!supplementi && (
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
              onClick={() => setSupplementi(Object.fromEntries(trattamenti.map((t) => [t.id, str(listino.supplementiTrattamento[t.id])])))}
            >
              Modifica
            </button>
          )}
        </div>
        {supplementi ? (
          <div className="mt-2 flex flex-col gap-2">
            <div className="grid gap-2 sm:grid-cols-3">
              {trattamenti.map((t) => (
                <label key={t.id} className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                  {t.nome}
                  {!t.attivo && " (non attivo)"}
                  <input type="number" min={0} step="0.01" className={CELLA} value={supplementi[t.id] ?? ""} onChange={(e) => setSupplementi({ ...supplementi, [t.id]: e.target.value })} />
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className={BOTTONE}
                onClick={async () => {
                  const importi = Object.fromEntries(Object.entries(supplementi).map(([k, v]) => [Number(k), numOppureNull(v)]));
                  if (await esegui(() => sbusta(azioneSalvaSupplementiTrattamento(listino.id, importi)), "Supplementi salvati.")) setSupplementi(null);
                }}
              >
                Salva
              </button>
              <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setSupplementi(null)}>
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm">{riepilogoTrattamenti}</p>
        )}
      </div>

      {/* Supplementi per stagione */}
      <div className="border-t border-stone-100 pt-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold">Supplementi per stagione</h3>
            <AiutoSezione breve="Supplemento del trattamento diverso in una stagione: nelle sue notti sostituisce quello generale qui sopra.">
              <Esempio>mezza pensione +20 € tutto l&apos;anno, +28 € dal 01/07 al 31/08: in agosto la mezza pensione costa 28 € a persona a notte.</Esempio>
              <p>Si può indicare anche per un solo tipo di camera (es. suite +35 €): per quel tipo vale il suo, per gli altri quello di tutti i tipi.</p>
            </AiutoSezione>
          </div>
          {!stagione && (
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
              onClick={() => setStagione({ id: null, trattamentoId: String(trattamenti[0]?.id ?? ""), tipoCameraId: "", dal: "", al: "", importo: "" })}
            >
              Aggiungi
            </button>
          )}
        </div>
        <ul className="mt-1 flex flex-col gap-1 text-sm">
          {listino.supplementiStagionali.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2">
              <span>
                {trattamenti.find((t) => t.id === x.trattamentoId)?.nome ?? "?"}
                {x.tipoCameraId ? ` (${tipi.find((t) => t.id === x.tipoCameraId)?.descrizione ?? "tipo"})` : ""} +{x.importo.toFixed(2)} € dal {it(x.dal)} al {it(x.al)}
              </span>
              {stagioneDaEliminare === x.id ? (
                <span className="text-xs">
                  Eliminare?{" "}
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
                    onClick={async () => {
                      await esegui(() => sbusta(azioneEliminaSupplementoStagionale(listino.id, x.id)), "Supplemento di stagione eliminato.");
                      setStagioneDaEliminare(null);
                    }}
                  >
                    Sì
                  </button>{" "}
                  <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 pointer-coarse:h-9" onClick={() => setStagioneDaEliminare(null)}>
                    No
                  </button>
                </span>
              ) : (
                !stagione && (
                  <>
                    <button
                      type="button"
                      className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
                      onClick={() =>
                        setStagione({ id: x.id, trattamentoId: String(x.trattamentoId), tipoCameraId: x.tipoCameraId ? String(x.tipoCameraId) : "", dal: x.dal, al: x.al, importo: String(x.importo) })
                      }
                    >
                      Modifica
                    </button>
                    <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 pointer-coarse:h-9" onClick={() => setStagioneDaEliminare(x.id)}>
                      Elimina
                    </button>
                  </>
                )
              )}
            </li>
          ))}
          {listino.supplementiStagionali.length === 0 && !stagione && <li className="text-stone-500">Nessuno: vale sempre il supplemento generale.</li>}
        </ul>
        {stagione && (
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
              Trattamento
              <select className={`${CELLA} w-auto`} value={stagione.trattamentoId} onChange={(e) => setStagione({ ...stagione, trattamentoId: e.target.value })}>
                {trattamenti.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
              Tipo di camera
              <select className={`${CELLA} w-auto`} value={stagione.tipoCameraId} onChange={(e) => setStagione({ ...stagione, tipoCameraId: e.target.value })}>
                <option value="">Tutti i tipi</option>
                {tipi.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.descrizione}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
              Dal
              <input type="date" className={`${CELLA} w-40`} value={stagione.dal} onChange={(e) => setStagione({ ...stagione, dal: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
              Al
              <input type="date" className={`${CELLA} w-40`} value={stagione.al} onChange={(e) => setStagione({ ...stagione, al: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
              € a persona a notte
              <input type="number" min={0} step="0.01" className={`${CELLA} w-28`} value={stagione.importo} onChange={(e) => setStagione({ ...stagione, importo: e.target.value })} />
            </label>
            <button
              type="button"
              disabled={busy || !stagione.dal || !stagione.al || stagione.importo === ""}
              className={BOTTONE}
              onClick={async () => {
                const d = {
                  trattamentoId: Number(stagione.trattamentoId),
                  tipoCameraId: stagione.tipoCameraId ? Number(stagione.tipoCameraId) : null,
                  dal: stagione.dal,
                  al: stagione.al,
                  importo: Number(stagione.importo.replace(",", ".")),
                };
                if (await esegui(() => sbusta(azioneSalvaSupplementoStagionale(listino.id, stagione.id, d)), "Supplemento di stagione salvato.")) setStagione(null);
              }}
            >
              Salva
            </button>
            <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 pointer-coarse:h-9" onClick={() => setStagione(null)}>
              Annulla
            </button>
          </div>
        )}
      </div>

      {/* Riduzioni per età */}
      <div className="border-t border-stone-100 pt-3">
        <h3 className="text-sm font-bold">Riduzioni per età</h3>
        <AiutoSezione breve="Sconti per bambini (e per adulti nel letto aggiunto) in base all'età all'arrivo.">
          <p>
            Ogni regola vale per una fascia d&apos;età; se più regole corrispondono vale la <strong>prima</strong> in elenco (ordinate per età).
          </p>
          <p>
            Lo sconto si applica alla quota della persona:{" "}
            {aPersona ? "prezzo a persona più supplemento del trattamento" : "in un listino a camera, solo al supplemento del trattamento"}.
          </p>
          <p>
            <strong>Solo dal 3° letto</strong> = la regola vale solo per chi dorme in camera con almeno altre due persone. Per gli adulti nel letto
            aggiunto indica età 18.
          </p>
          <Esempio>2 adulti + bambino di 8 anni, regola 3–11 anni −50% dal 3° letto: il bambino paga metà quota.</Esempio>
          {!aPersona && (
            <p>
              Nei listini a camera una fascia può essere un <strong>supplemento</strong>: il bambino nel letto aggiunto paga una quota a notte (es. 3–11 anni
              +20 € dal 3° letto). Per l&apos;adulto nel letto aggiunto si usa il servizio &quot;letto aggiunto&quot;.
            </p>
          )}
        </AiutoSezione>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {listino.riduzioni.map((x) =>
            riduzione?.id === x.id ? null : (
              <li key={x.id} className="flex flex-wrap items-center gap-2">
                <span>{descriviRiduzione(x)}</span>
                {daEliminare === x.id ? (
                  <span className="text-xs">
                    Eliminare?{" "}
                    <button
                      type="button"
                      disabled={busy}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
                      onClick={async () => {
                        await esegui(() => sbusta(azioneEliminaRiduzione(listino.id, x.id)), "Riduzione eliminata.");
                        setDaEliminare(null);
                      }}
                    >
                      Sì
                    </button>{" "}
                    <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setDaEliminare(null)}>
                      No
                    </button>
                  </span>
                ) : (
                  !riduzione && (
                    <>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
                        onClick={() =>
                          setRiduzione({ id: x.id, f: { etaDa: String(x.etaDa), etaA: str(x.etaA), tipo: x.tipo, valore: x.tipo === "gratis" ? "" : String(x.valore), dalTerzoLetto: x.dalTerzoLetto } })
                        }
                      >
                        Modifica
                      </button>
                      <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setDaEliminare(x.id)}>
                        Elimina
                      </button>
                    </>
                  )
                )}
              </li>
            ),
          )}
          {listino.riduzioni.length === 0 && !riduzione && <li className="text-stone-500">Nessuna riduzione.</li>}
        </ul>
        {riduzione ? (
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
              Da anni
              <input type="number" min={0} max={18} className={`${CELLA} w-20`} value={riduzione.f.etaDa} onChange={(e) => setRiduzione({ ...riduzione, f: { ...riduzione.f, etaDa: e.target.value } })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
              A anni
              <input type="number" min={0} className={`${CELLA} w-20`} value={riduzione.f.etaA} placeholder="∞" onChange={(e) => setRiduzione({ ...riduzione, f: { ...riduzione.f, etaA: e.target.value } })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
              Riduzione
              <select className={`${CELLA} w-auto`} value={riduzione.f.tipo} onChange={(e) => setRiduzione({ ...riduzione, f: { ...riduzione.f, tipo: e.target.value as FormRiduzione["tipo"] } })}>
                <option value="percentuale">Percentuale</option>
                <option value="importo">Importo € per notte</option>
                <option value="gratis">Gratis</option>
                {!aPersona && <option value="supplemento">Supplemento € per notte (letto aggiunto)</option>}
              </select>
            </label>
            {riduzione.f.tipo !== "gratis" && (
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                {riduzione.f.tipo === "percentuale" ? "%" : "€"}
                <input type="number" min={0} step="0.01" className={`${CELLA} w-24`} value={riduzione.f.valore} onChange={(e) => setRiduzione({ ...riduzione, f: { ...riduzione.f, valore: e.target.value } })} />
              </label>
            )}
            <label className="flex items-center gap-1.5 pb-1 text-sm">
              <input type="checkbox" checked={riduzione.f.dalTerzoLetto} onChange={(e) => setRiduzione({ ...riduzione, f: { ...riduzione.f, dalTerzoLetto: e.target.checked } })} /> solo dal 3° letto
            </label>
            <button
              type="button"
              disabled={busy}
              className={BOTTONE}
              onClick={async () => {
                const f = riduzione.f;
                const dati: RiduzioneInput = { etaDa: Number(f.etaDa || 0), etaA: numOppureNull(f.etaA), tipo: f.tipo, valore: Number(f.valore || 0), dalTerzoLetto: f.dalTerzoLetto };
                if (await esegui(() => sbusta(azioneSalvaRiduzione(listino.id, riduzione.id || null, dati)), "Riduzione salvata.")) setRiduzione(null);
              }}
            >
              Salva
            </button>
            <button type="button" className="pb-1 text-xs font-semibold text-stone-600" onClick={() => setRiduzione(null)}>
              Annulla
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mt-2 inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
            onClick={() => setRiduzione({ id: 0, f: { etaDa: "0", etaA: "2", tipo: "gratis", valore: "", dalTerzoLetto: false } })}
          >
            + Aggiungi riduzione
          </button>
        )}
      </div>
    </section>
  );
}
