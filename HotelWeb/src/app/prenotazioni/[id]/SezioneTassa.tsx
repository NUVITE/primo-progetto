"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { ChevronDown, ChevronUp, LogOut, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Avviso, CLASSE_CAMPO, Etichetta, Pulsante, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
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

const INPUT = CLASSE_CAMPO;
const ETICHETTA = "flex flex-col gap-1 text-xs font-semibold text-stone-700";

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
    <Sezione
      titolo="Tassa di soggiorno"
      descrizione={
        tassa.regolamento
          ? `Regolamento di ${tassa.regolamento.comune}${tassa.regolamento.atto ? ` — ${tassa.regolamento.atto}` : ""}`
          : "Nessun regolamento della tassa di soggiorno in vigore per questo comune nel periodo."
      }
    >
      <AiutoSezione breve="Calcolata per ogni persona e per ogni notte, secondo il regolamento del Comune.">
        <p>
          Il calcolo è automatico: età (dalla data di nascita), tetto di notti ed esenzioni previste dal regolamento. Finché il soggiorno è aperto la
          tassa è <strong>provvisoria</strong>; con <strong>Chiudi soggiorno</strong> diventa definitiva e si può solo riaprire lasciando traccia.
        </p>
        <p>
          Se l&apos;ospite consegna una dichiarazione (per esempio accompagnatore di un paziente o lavoratore) registrala in{" "}
          <strong>Esenzioni e riduzioni dichiarate</strong>: la tassa si ricalcola subito.
        </p>
        <Esempio>tassa 2 € a notte con tetto di 5 notti: un soggiorno di 7 notti paga 5 × 2 € = 10 €.</Esempio>
      </AiutoSezione>
      {tassa.regolamento?.daConfermare && (
        <Avviso tipo="avviso" className="mt-3">
          <strong>Da confermare con il Comune:</strong> {tassa.regolamento.daConfermare}
        </Avviso>
      )}
      <div className="mt-3 flex flex-col gap-3">
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
    </Sezione>
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
    <section className={`rounded-md border p-3 ${ospite.definitiva ? "border-emerald-200 bg-emerald-50/40" : "border-stone-200 bg-stone-50/60"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-stone-900">{ospite.nome}</div>
          <div className="text-sm text-stone-700">
            {conta(["tassata", "ridotta"])} notti tassate
            {conta(["esente"]) > 0 && ` · ${conta(["esente"])} esenti`}
            {conta(["oltre_tetto", "oltre_tetto_annuo"]) > 0 && ` · ${conta(["oltre_tetto", "oltre_tetto_annuo"])} oltre il tetto`}
            {conta(["residente"]) > 0 && " · residente (fuori campo)"}
            {importi && <> · <strong>{eur(totale)}</strong></>}
            {!ospite.dataNascita && <span className="font-semibold text-amber-800"> · data di nascita mancante: esenzioni per età non verificabili</span>}
          </div>
        </div>
        <Etichetta tono={ospite.definitiva ? "verde" : "neutro"}>{ospite.definitiva ? "Soggiorno chiuso — tassa definitiva" : "Tassa provvisoria"}</Etichetta>
      </div>

      {errore && <Avviso tipo="errore" className="mt-2">{errore}</Avviso>}

      <Pulsante variante="leggero" dimensione="piccolo" icona={dettaglio ? ChevronUp : ChevronDown} className="-ml-2 mt-1" onClick={() => setDettaglio((v) => !v)}>
        {dettaglio ? "Nascondi le notti" : "Notte per notte"}
      </Pulsante>
      {dettaglio && (
        <table className="mt-2 w-full rounded-md bg-white text-sm">
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
        <Spunta etichetta="Residente nel comune (fuori campo)" disabled={!modificabile} checked={dati.residente} onChange={(e) => setDati({ ...dati, residente: e.target.checked })} />
        <Spunta etichetta="L'ospite rifiuta di pagare" disabled={!modificabile} checked={dati.rifiutoPagamento} onChange={(e) => setDati({ ...dati, rifiutoPagamento: e.target.checked })} />
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
          <Pulsante
            dimensione="piccolo"
            icona={Save}
            disabled={busy}
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
          </Pulsante>
        </div>
      )}

      {/* Esenzioni e riduzioni dichiarate */}
      <div className="mt-3">
        <div className="text-xs font-semibold text-stone-700">Esenzioni e riduzioni dichiarate</div>
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
                <Pulsante
                  variante="pericolo"
                  dimensione="piccolo"
                  icona={Trash2}
                  disabled={busy}
                  onClick={() => esegui(() => sbusta(azioneRimuoviDichiarazione(prenotazioneId, d.id)))}
                >
                  Rimuovi
                </Pulsante>
              )}
            </li>
          ))}
        </ul>

        {modificabile && regole.length > 0 && !nuova && (
          <Pulsante
            dimensione="piccolo"
            icona={Plus}
            className="mt-2"
            onClick={() => setNuova({ regolaId: regole[0].id, dal: "", al: "", tipoDocumento: "", estremiDocumento: "", consegnataIl: oggiIso(), note: "" })}
          >
            Aggiungi esenzione o riduzione
          </Pulsante>
        )}
        {nuova && (
          <div className="mt-2 flex flex-col gap-3 rounded-md border border-teal-200 bg-teal-50/50 p-3">
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
              <Pulsante onClick={() => setNuova(null)}>Annulla</Pulsante>
              <Pulsante
                variante="primario"
                disabled={busy}
                onClick={() => esegui(() => sbusta(azioneAggiungiDichiarazione(prenotazioneId, ospite.ospiteId, nuova)), () => setNuova(null))}
              >
                Registra e ricalcola
              </Pulsante>
            </div>
          </div>
        )}
      </div>

      {/* Check-out della tassa e riapertura */}
      <div className="mt-3 border-t border-stone-100 pt-2">
        {!ospite.definitiva && puoGestire && !confermaChiusura && (
          <Pulsante variante="primario" dimensione="piccolo" icona={LogOut} onClick={() => setConfermaChiusura(true)}>
            Chiudi soggiorno (check-out)
          </Pulsante>
        )}
        {confermaChiusura && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <span>
              La tassa diventa definitiva: {conta(["tassata", "ridotta"])} notti tassate
              {importi && ` per ${eur(totale)}`}. Dopo si potrà solo riaprire, con traccia. Confermi?
            </span>
            <Pulsante
              variante="primario"
              dimensione="piccolo"
              disabled={busy}
              onClick={() => esegui(() => sbusta(azioneChiudiSoggiorno(prenotazioneId, ospite.ospiteId)), () => setConfermaChiusura(false))}
            >
              Sì, chiudi
            </Pulsante>
            <Pulsante dimensione="piccolo" onClick={() => setConfermaChiusura(false)}>
              Annulla
            </Pulsante>
          </div>
        )}
        {ospite.definitiva && puoRiaprire && notaRiapertura === null && (
          <Pulsante dimensione="piccolo" icona={RotateCcw} onClick={() => setNotaRiapertura("")}>
            Riapri per rettifica
          </Pulsante>
        )}
        {notaRiapertura !== null && (
          <div className="flex flex-wrap items-end gap-2">
            <label className={`${ETICHETTA} min-w-[16rem] flex-1`}>
              Motivo della riapertura (resta registrato)
              <input className={INPUT} autoFocus value={notaRiapertura} onChange={(e) => setNotaRiapertura(e.target.value)} />
            </label>
            <Pulsante
              variante="primario"
              disabled={busy || !notaRiapertura.trim()}
              onClick={() => esegui(() => sbusta(azioneRiapriSoggiorno(prenotazioneId, ospite.ospiteId, notaRiapertura)), () => setNotaRiapertura(null))}
            >
              Riapri
            </Pulsante>
            <Pulsante onClick={() => setNotaRiapertura(null)}>Annulla</Pulsante>
          </div>
        )}
        {ospite.eventi.length > 0 && (
          <ul className="mt-2 text-xs text-stone-600">
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
