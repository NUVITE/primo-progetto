"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import {
  azioneAggiungiDichiarazione,
  azioneChiudiSoggiorno,
  azioneDatiPosizioneTassa,
  azioneRiapriSoggiorno,
  azioneRimuoviDichiarazione,
  caricaPrenotazione,
} from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Tassa = Prenotazione["tassa"];
type OspiteTassa = Tassa["ospiti"][number];

const INPUT = "mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900";
const ETICHETTA = "flex flex-col text-xs text-stone-600";

function eur(n: number) {
  return `€ ${n.toFixed(2)}`;
}
function it(iso: string) {
  return iso.split("-").reverse().join("/");
}
const oggiIso = () => new Date().toISOString().slice(0, 10);

const COLORE_ESITO: Record<string, string> = {
  tassata: "text-stone-800",
  ridotta: "text-teal-700",
  esente: "text-emerald-700",
  oltre_tetto: "text-stone-500",
  oltre_tetto_annuo: "text-stone-500",
  residente: "text-stone-500",
  fuori_stagione: "text-stone-500",
  tariffa_mancante: "text-red-700",
};

/**
 * Tassa di soggiorno nel dettaglio prenotazione: un riquadro per ospite con esito notte per notte,
 * dati dichiarati, esenzioni e check-out. Il calcolo avviene tutto lato server (motore unico).
 */
export function SezioneTassa({
  prenotazioneId,
  tassa,
  importi,
  puoGestire,
  puoRiaprire,
  onAggiornata,
}: {
  prenotazioneId: number;
  tassa: Tassa;
  importi: boolean;
  puoGestire: boolean;
  puoRiaprire: boolean;
  onAggiornata: (p: Prenotazione) => void;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-bold">Tassa di soggiorno</h3>
      {tassa.regolamento ? (
        <p className="mb-3 text-xs text-stone-500">
          Regolamento di {tassa.regolamento.comune}
          {tassa.regolamento.atto ? ` — ${tassa.regolamento.atto}` : ""}
        </p>
      ) : (
        <p className="mb-3 text-sm text-stone-500">Nessun regolamento della tassa di soggiorno in vigore per questo comune nel periodo.</p>
      )}
      {tassa.regolamento?.daConfermare && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>Da confermare con il Comune:</strong> {tassa.regolamento.daConfermare}
        </p>
      )}
      <div className="flex flex-col gap-3">
        {tassa.ospiti.map((o) => (
          <RiquadroOspite
            key={o.ospiteId}
            prenotazioneId={prenotazioneId}
            ospite={o}
            regole={tassa.regolamento?.regoleDichiarabili ?? []}
            importi={importi}
            puoGestire={puoGestire}
            puoRiaprire={puoRiaprire}
            onAggiornata={onAggiornata}
          />
        ))}
      </div>
    </div>
  );
}

function RiquadroOspite({
  prenotazioneId,
  ospite,
  regole,
  importi,
  puoGestire,
  puoRiaprire,
  onAggiornata,
}: {
  prenotazioneId: number;
  ospite: OspiteTassa;
  regole: NonNullable<Tassa["regolamento"]>["regoleDichiarabili"];
  importi: boolean;
  puoGestire: boolean;
  puoRiaprire: boolean;
  onAggiornata: (p: Prenotazione) => void;
}) {
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dettaglio, setDettaglio] = useState(false);
  const [dati, setDati] = useState({
    residente: ospite.residente,
    nottiPrecedentiAltrove: String(ospite.nottiPrecedentiAltrove),
    nottiAnnoDichiarate: String(ospite.nottiAnnoDichiarate),
    rifiutoPagamento: ospite.rifiutoPagamento,
    notaRifiuto: ospite.notaRifiuto,
  });
  const [nuova, setNuova] = useState<null | { regolaId: number; dal: string; al: string; tipoDocumento: string; estremiDocumento: string; consegnataIl: string; note: string }>(null);
  const [confermaChiusura, setConfermaChiusura] = useState(false);
  const [notaRiapertura, setNotaRiapertura] = useState<string | null>(null);

  const modificabile = puoGestire && !ospite.definitiva;
  const conta = (esiti: string[]) => ospite.notti.filter((n) => n.esito && esiti.includes(n.esito)).length;
  const totale = ospite.notti.reduce((s, n) => s + n.importo, 0);
  const haTettoAnnuo = regole.some((r) => r.tipo === "tetto_annuo");
  const regolaScelta = nuova ? regole.find((r) => r.id === nuova.regolaId) : undefined;

  async function esegui(fn: () => Promise<Prenotazione>, dopo?: () => void) {
    setErrore(null);
    setBusy(true);
    try {
      onAggiornata(await fn());
      dopo?.();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`rounded-lg border p-3 ${ospite.definitiva ? "border-emerald-200 bg-emerald-50/40" : "border-stone-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{ospite.nome}</div>
          <div className="text-xs text-stone-600">
            {conta(["tassata", "ridotta"])} notti tassate
            {conta(["esente"]) > 0 && ` · ${conta(["esente"])} esenti`}
            {conta(["oltre_tetto", "oltre_tetto_annuo"]) > 0 && ` · ${conta(["oltre_tetto", "oltre_tetto_annuo"])} oltre il tetto`}
            {conta(["residente"]) > 0 && " · residente (fuori campo)"}
            {importi && <> · <strong>{eur(totale)}</strong></>}
            {!ospite.dataNascita && <span className="text-amber-700"> · data di nascita mancante: esenzioni per età non verificabili</span>}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ospite.definitiva ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
          {ospite.definitiva ? "Soggiorno chiuso — tassa definitiva" : "Tassa provvisoria"}
        </span>
      </div>

      {errore && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <button type="button" className="mt-2 text-xs font-semibold text-teal-700 underline" onClick={() => setDettaglio((v) => !v)}>
        {dettaglio ? "Nascondi le notti" : "Notte per notte"}
      </button>
      {dettaglio && (
        <table className="mt-2 w-full text-xs">
          <tbody>
            {ospite.notti.map((n) => (
              <tr key={n.data} className="border-t border-stone-100">
                <td className="py-1 pr-2 font-mono">{it(n.data)}</td>
                <td className={`py-1 pr-2 font-semibold ${n.esito ? COLORE_ESITO[n.esito] : "text-stone-500"}`}>{n.etichetta}</td>
                <td className="py-1 pr-2 text-stone-600">{n.motivo ?? ""}</td>
                {importi && <td className="py-1 text-right font-mono">{eur(n.importo)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Dati dichiarati dall'ospite */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-teal-700" disabled={!modificabile} checked={dati.residente} onChange={(e) => setDati({ ...dati, residente: e.target.checked })} />
          Residente nel comune (fuori campo)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal-700"
            disabled={!modificabile}
            checked={dati.rifiutoPagamento}
            onChange={(e) => setDati({ ...dati, rifiutoPagamento: e.target.checked })}
          />
          L&apos;ospite rifiuta di pagare
        </label>
        <label className={ETICHETTA}>
          Notti consecutive già pagate in un&apos;altra struttura subito prima
          <input type="number" min={0} className={INPUT} disabled={!modificabile} value={dati.nottiPrecedentiAltrove} onChange={(e) => setDati({ ...dati, nottiPrecedentiAltrove: e.target.value })} />
        </label>
        {haTettoAnnuo && (
          <label className={ETICHETTA}>
            Notti già pagate nell&apos;anno (dichiarate, per il tetto annuo)
            <input type="number" min={0} className={INPUT} disabled={!modificabile} value={dati.nottiAnnoDichiarate} onChange={(e) => setDati({ ...dati, nottiAnnoDichiarate: e.target.value })} />
          </label>
        )}
        {dati.rifiutoPagamento && (
          <label className={`${ETICHETTA} sm:col-span-2`}>
            Nota sul rifiuto (l&apos;imposta resta dovuta e va segnalata al Comune)
            <input className={INPUT} disabled={!modificabile} value={dati.notaRifiuto} onChange={(e) => setDati({ ...dati, notaRifiuto: e.target.value })} />
          </label>
        )}
      </div>
      {modificabile && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={busy}
            className="rounded-md border border-teal-700 px-3 py-1 text-xs font-semibold text-teal-700 disabled:opacity-40"
            onClick={() =>
              esegui(() =>
                sbusta(
                  azioneDatiPosizioneTassa(prenotazioneId, ospite.ospiteId, {
                    residente: dati.residente,
                    nottiPrecedentiAltrove: Number(dati.nottiPrecedentiAltrove) || 0,
                    nottiAnnoDichiarate: Number(dati.nottiAnnoDichiarate) || 0,
                    rifiutoPagamento: dati.rifiutoPagamento,
                    notaRifiuto: dati.notaRifiuto,
                  }),
                ),
              )
            }
          >
            Salva e ricalcola
          </button>
        </div>
      )}

      {/* Esenzioni e riduzioni dichiarate */}
      <div className="mt-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">Esenzioni e riduzioni dichiarate</div>
        {ospite.dichiarazioni.length === 0 && <p className="text-sm text-stone-500">Nessuna.</p>}
        <ul className="flex flex-col gap-1">
          {ospite.dichiarazioni.map((d) => (
            <li key={d.id} className="flex flex-wrap items-start justify-between gap-2 border-t border-stone-100 pt-1 text-sm">
              <span>
                <strong>{d.regola}</strong>
                <span className="block text-xs text-stone-600">
                  {d.dal || d.al ? `Dal ${d.dal ? it(d.dal) : "arrivo"} al ${d.al ? it(d.al) : "partenza"}` : "Tutto il soggiorno"}
                  {d.tipoDocumento && ` · ${d.tipoDocumento}`}
                  {d.estremiDocumento && ` ${d.estremiDocumento}`} · consegnata il {it(d.consegnataIl)}
                </span>
              </span>
              {modificabile && (
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs font-semibold text-red-600"
                  onClick={() => esegui(() => sbusta(azioneRimuoviDichiarazione(prenotazioneId, d.id)))}
                >
                  Rimuovi
                </button>
              )}
            </li>
          ))}
        </ul>

        {modificabile && regole.length > 0 && !nuova && (
          <button
            type="button"
            className="mt-2 rounded-md border border-teal-700 px-3 py-1 text-xs font-semibold text-teal-700"
            onClick={() => setNuova({ regolaId: regole[0].id, dal: "", al: "", tipoDocumento: "", estremiDocumento: "", consegnataIl: oggiIso(), note: "" })}
          >
            + Aggiungi esenzione o riduzione
          </button>
        )}
        {nuova && (
          <div className="mt-2 flex flex-col gap-2 rounded-md border border-dashed border-stone-300 p-3">
            <label className={ETICHETTA}>
              Motivo
              <select className={INPUT} value={nuova.regolaId} onChange={(e) => setNuova({ ...nuova, regolaId: Number(e.target.value) })}>
                {regole.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.tipo === "riduzione" ? "Riduzione — " : r.tipo === "tetto_annuo" ? "Tetto annuo — " : ""}
                    {r.descrizione}
                  </option>
                ))}
              </select>
            </label>
            {regolaScelta && (regolaScelta.documentoRichiesto || regolaScelta.limite || regolaScelta.articolo) && (
              <div className="rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-700">
                {regolaScelta.articolo && <div>Riferimento: {regolaScelta.articolo}</div>}
                {regolaScelta.documentoRichiesto && <div>Documento richiesto: {regolaScelta.documentoRichiesto}</div>}
                {regolaScelta.limite && <div className="font-semibold text-amber-800">Attenzione: {regolaScelta.limite}</div>}
              </div>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className={ETICHETTA}>
                Coperta dal (vuoto = dall&apos;arrivo)
                <input type="date" className={INPUT} value={nuova.dal} onChange={(e) => setNuova({ ...nuova, dal: e.target.value })} />
              </label>
              <label className={ETICHETTA}>
                Fino al, esclusa (vuoto = alla partenza)
                <input type="date" className={INPUT} value={nuova.al} onChange={(e) => setNuova({ ...nuova, al: e.target.value })} />
              </label>
              <label className={ETICHETTA}>
                Tipo documento
                <input className={INPUT} placeholder="es. Autocertificazione, certificato ospedaliero" value={nuova.tipoDocumento} onChange={(e) => setNuova({ ...nuova, tipoDocumento: e.target.value })} />
              </label>
              <label className={ETICHETTA}>
                Estremi (non si conserva la copia)
                <input className={INPUT} placeholder="es. numero e data" value={nuova.estremiDocumento} onChange={(e) => setNuova({ ...nuova, estremiDocumento: e.target.value })} />
              </label>
              <label className={ETICHETTA}>
                Consegnata il
                <input type="date" className={INPUT} value={nuova.consegnataIl} onChange={(e) => setNuova({ ...nuova, consegnataIl: e.target.value })} />
              </label>
              <label className={ETICHETTA}>
                Note
                <input className={INPUT} value={nuova.note} onChange={(e) => setNuova({ ...nuova, note: e.target.value })} />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-md px-3 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setNuova(null)}>
                Annulla
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-md bg-teal-700 px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
                onClick={() => esegui(() => sbusta(azioneAggiungiDichiarazione(prenotazioneId, ospite.ospiteId, nuova)), () => setNuova(null))}
              >
                Registra e ricalcola
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Check-out della tassa e riapertura */}
      <div className="mt-3 border-t border-stone-100 pt-2">
        {!ospite.definitiva && puoGestire && !confermaChiusura && (
          <button type="button" className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-bold text-white" onClick={() => setConfermaChiusura(true)}>
            Chiudi soggiorno (check-out)
          </button>
        )}
        {confermaChiusura && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-teal-50 px-3 py-2 text-xs">
            <span>
              La tassa diventa definitiva: {conta(["tassata", "ridotta"])} notti tassate
              {importi && ` per ${eur(totale)}`}. Dopo si potrà solo riaprire, con traccia. Confermi?
            </span>
            <button
              type="button"
              disabled={busy}
              className="rounded-md bg-teal-700 px-2.5 py-1 font-bold text-white disabled:opacity-40"
              onClick={() => esegui(() => sbusta(azioneChiudiSoggiorno(prenotazioneId, ospite.ospiteId)), () => setConfermaChiusura(false))}
            >
              Chiudi
            </button>
            <button type="button" className="rounded-md px-2.5 py-1 font-semibold text-stone-600 hover:bg-white" onClick={() => setConfermaChiusura(false)}>
              Annulla
            </button>
          </div>
        )}
        {ospite.definitiva && puoRiaprire && notaRiapertura === null && (
          <button type="button" className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold" onClick={() => setNotaRiapertura("")}>
            Riapri per rettifica
          </button>
        )}
        {notaRiapertura !== null && (
          <div className="flex flex-wrap items-end gap-2">
            <label className={`${ETICHETTA} min-w-[16rem] flex-1`}>
              Motivo della riapertura (resta registrato)
              <input className={INPUT} autoFocus value={notaRiapertura} onChange={(e) => setNotaRiapertura(e.target.value)} />
            </label>
            <button
              type="button"
              disabled={busy || !notaRiapertura.trim()}
              className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
              onClick={() => esegui(() => sbusta(azioneRiapriSoggiorno(prenotazioneId, ospite.ospiteId, notaRiapertura)), () => setNotaRiapertura(null))}
            >
              Riapri
            </button>
            <button type="button" className="rounded-md px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setNotaRiapertura(null)}>
              Annulla
            </button>
          </div>
        )}
        {ospite.eventi.length > 0 && (
          <ul className="mt-2 text-[11px] text-stone-500">
            {ospite.eventi.map((e, i) => (
              <li key={i}>
                {e.tipo === "chiusura" ? "Chiuso" : "Riaperto"} da {e.utente} il {new Date(e.quando).toLocaleString("it-IT")}
                {e.nota && ` — ${e.nota}`}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
