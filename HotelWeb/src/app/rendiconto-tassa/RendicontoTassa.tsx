"use client";

import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Dato, Etichetta, IntestazionePagina, Pulsante, Select, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCsv, azionePeriodo, datiRendiconto } from "./actions";

type Dati = Awaited<ReturnType<typeof datiRendiconto>>;

const it = (g: string) => g.split("-").reverse().join("/");
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export function RendicontoTassa({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [soloDifferenze, setSoloDifferenze] = useState(true);
  const n = d.numeri;
  const ric = d.riconciliazione;
  const righeRic = soloDifferenze ? ric.righe.filter((r) => r.cause.length) : ric.righe;
  const anno = Number(d.periodo.codice.slice(0, 4));
  const scaduto = !d.inCorso && d.periodo.scadenza && d.periodo.scadenza < d.oggi;

  async function carica(codice: string) {
    setErrore(null);
    setBusy(true);
    try {
      setD(await sbusta(azionePeriodo(codice)));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Rendiconto tassa di soggiorno"
        sottotitolo={`Comune di ${d.cfg.comune} · rendiconto ${d.cfg.rendicontoPeriodo}`}
        azioni={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Pulsante
              icona={Download}
              disabled={busy || d.ospiti.length === 0}
              onClick={async () => {
                try {
                  const f = await sbusta(azioneCsv(d.periodo.codice));
                  const url = URL.createObjectURL(new Blob([f.testo], { type: "text/csv;charset=utf-8" }));
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = f.nome;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
                }
              }}
            >
              Elenco ospiti (Excel)
            </Pulsante>
            <Pulsante icona={Printer} onClick={() => window.print()}>
              Stampa / PDF
            </Pulsante>
          </div>
        }
      />
      <div className="print:hidden">
        <Suggerimento id="rendiconto-tassa" titolo="Come si usa il rendiconto">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Scegli il periodo: di solito è già selezionato l&apos;ultimo concluso, quello da presentare al Comune.</li>
            <li>
              Riporta sul portale del Comune i numeri del riquadro <strong>Da comunicare</strong> e versa l&apos;importo indicato entro la scadenza.
            </li>
            <li>
              Controlla la <strong>riconciliazione con la Polizia</strong>: il Comune confronta i tuoi numeri con le schedine. Qui trovi, per ogni ospite,
              il motivo di ogni differenza, da tenere pronto in caso di richiesta di chiarimenti.
            </li>
          </ol>
        </Suggerimento>
      </div>

      {!d.cfg.regolamento && <Avviso tipo="avviso">Per il Comune di {d.cfg.comune} non è ancora configurato il regolamento della tassa di soggiorno.</Avviso>}
      {errore && <Avviso tipo="errore">{errore}</Avviso>}

      <Sezione titolo="Periodo">
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <label className="flex flex-col gap-1 text-xs font-semibold text-stone-700">
            Anno
            <Select value={anno} disabled={busy} onChange={(e) => carica(`${e.target.value}-A`)} className="w-28">
              {Array.from({ length: 6 }, (_, k) => Number(d.oggi.slice(0, 4)) - k).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex min-w-64 flex-col gap-1 text-xs font-semibold text-stone-700">
            Periodo
            <Select value={d.periodo.codice} disabled={busy} onChange={(e) => carica(e.target.value)}>
              {d.periodi
                .filter((p) => p.codice.startsWith(String(anno)))
                .map((p) => (
                  <option key={p.codice} value={p.codice}>
                    {p.nome}
                  </option>
                ))}
            </Select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-semibold text-stone-900">
            {d.periodo.nome}: dal {it(d.periodo.dal)} al {it(d.periodo.al)}
          </span>
          {d.inCorso ? (
            <Etichetta tono="blu">periodo in corso: numeri provvisori</Etichetta>
          ) : (
            d.periodo.scadenza && (
              // HotelWeb non sa se il rendiconto è stato presentato: a termine passato lo si indica senza allarmi.
              <span className={scaduto ? "text-stone-700" : "font-semibold text-amber-800"}>
                {scaduto ? "Termine era il " : `${d.periodo.codice.endsWith("-A") ? "Dichiarazione annuale" : "Comunicazione"} entro il `}
                {it(d.periodo.scadenza)}
                {d.periodo.versamento && d.periodo.versamento !== d.periodo.scadenza ? ` · versamento entro il ${it(d.periodo.versamento)}` : ""}
              </span>
            )
          )}
        </div>
        {d.cfg.nota && <p className="mt-2 text-sm text-stone-700">{d.cfg.nota}</p>}
      </Sezione>

      <Sezione titolo="Da comunicare al Comune">
        <AiutoSezione breve="Ospiti e pernottamenti comprendono anche esenti e residenti, come chiedono i Comuni.">
          <p>
            <strong>Ospiti</strong> = persone che hanno dormito in struttura almeno una notte del periodo (anche se arrivate prima).{" "}
            <strong>Pernottamenti</strong> = notti di tutte le persone nel periodo. Una notte vale per il periodo in cui cade: un soggiorno a cavallo
            di due trimestri si divide tra i due.
          </p>
          <Esempio>Due coniugi dal 30 marzo al 2 aprile: nel 1° trimestre 2 ospiti e 4 pernottamenti (30 e 31 marzo), nel 2° 2 ospiti e 2 pernottamenti.</Esempio>
        </AiutoSezione>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato etichetta="Ospiti">
            <span className="text-lg font-bold">{n.ospiti}</span> <span className="text-xs text-stone-600">({n.arrivi} arrivati nel periodo)</span>
          </Dato>
          <Dato etichetta="Pernottamenti totali">
            <span className="text-lg font-bold">{n.pernottamenti}</span>
          </Dato>
          <Dato etichetta="Pernottamenti tassati">
            <span className="text-lg font-bold">{n.tassate.notti + n.ridotte.notti}</span>
            {n.ridotte.notti > 0 && <span className="text-xs text-stone-600"> (di cui {n.ridotte.notti} ridotti)</span>}
          </Dato>
          <Dato etichetta="Imposta dovuta">
            <span className="text-lg font-bold">{eur(n.dovuto)}</span>
          </Dato>
        </div>
        {n.rifiuti.persone > 0 && (
          <Avviso tipo="avviso" className="mt-3">
            {n.rifiuti.persone} {n.rifiuti.persone === 1 ? "ospite ha" : "ospiti hanno"} rifiutato di pagare ({eur(n.rifiuti.importo)}): vanno segnalati al Comune
            con la loro dichiarazione. Da versare: <strong>{eur(n.daVersare)}</strong>.
          </Avviso>
        )}
        {n.nonCalcolate > 0 && (
          <Avviso tipo="errore" className="mt-3">
            {n.nonCalcolate} notti non hanno la tassa calcolata (manca il regolamento per quelle date o la tariffa per la categoria): controlla prima di presentare.
          </Avviso>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-stone-700">Esenzioni per motivo</p>
            {n.esenti.length === 0 ? (
              <p className="text-sm text-stone-600">Nessuna esenzione nel periodo.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-stone-200 text-left text-xs text-stone-600">
                  <tr>
                    <th className="py-1 pr-2">Motivo</th>
                    <th className="py-1 pr-2 text-right">Persone</th>
                    <th className="py-1 text-right">Notti</th>
                  </tr>
                </thead>
                <tbody>
                  {n.esenti.map((e) => (
                    <tr key={e.motivo} className="border-b border-stone-100">
                      <td className="py-1 pr-2">
                        {e.motivo}
                        {e.articolo && <span className="text-xs text-stone-500"> ({e.articolo})</span>}
                      </td>
                      <td className="py-1 pr-2 text-right">{e.persone}</td>
                      <td className="py-1 text-right">{e.notti}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-stone-700">Altre notti non tassate</p>
            {n.altri.length === 0 ? (
              <p className="text-sm text-stone-600">Nessuna.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {n.altri.map((a) => (
                    <tr key={a.esito} className="border-b border-stone-100">
                      <td className="py-1 pr-2">{a.etichetta}</td>
                      <td className="py-1 pr-2 text-right">{a.persone} pers.</td>
                      <td className="py-1 text-right">{a.notti} notti</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Sezione>

      <Sezione titolo={`Ospiti del periodo (${d.ospiti.length})`}>
        {d.ospiti.length === 0 ? (
          <p className="text-sm text-stone-600">Nessun ospite nel periodo.</p>
        ) : (
          <table className="tabella-responsive w-full text-sm">
            <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
              <tr>
                <th className="py-1.5 pr-2">Ospite</th>
                <th className="py-1.5 pr-2">Soggiorno</th>
                <th className="py-1.5 pr-2 text-right">Notti</th>
                <th className="py-1.5 pr-2 text-right">Tassate</th>
                <th className="py-1.5 pr-2 text-right">Importo</th>
                <th className="py-1.5 pr-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {d.ospiti.map((o) => (
                <tr key={o.chiave} className="border-b border-stone-100 last:border-0">
                  <td data-label="Ospite" className="py-1.5 pr-2">
                    <Link href={`/prenotazioni/${o.prenotazioneId}`} className="font-semibold text-stone-900 hover:underline">
                      {o.nome}
                    </Link>
                  </td>
                  <td data-label="Soggiorno" className="py-1.5 pr-2 font-mono text-xs">
                    {it(o.arrivo)} → {it(o.partenza)}
                  </td>
                  <td data-label="Notti" className="py-1.5 pr-2 text-right">
                    {o.notti}
                  </td>
                  <td data-label="Tassate" className="py-1.5 pr-2 text-right">
                    {o.tassate}
                  </td>
                  <td data-label="Importo" className="py-1.5 pr-2 text-right font-mono">
                    {eur(o.importo)}
                  </td>
                  <td data-label="Note" className="py-1.5 pr-2 text-xs">
                    {o.residente && <Etichetta className="mr-1">residente</Etichetta>}
                    {o.rifiuto && (
                      <Etichetta tono="rosso" className="mr-1">
                        rifiuta di pagare
                      </Etichetta>
                    )}
                    {o.esenzioni.join("; ")}
                    {o.nonCalcolate > 0 && <span className="font-semibold text-red-800"> {o.nonCalcolate} notti senza tassa calcolata</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sezione>

      <Sezione titolo="Riconciliazione con le schedine di Polizia">
        <AiutoSezione breve="Il Comune riceve dalla Questura i dati delle schedine e li confronta con il rendiconto: qui ogni differenza ha la sua spiegazione.">
          <p>
            La schedina dichiara all&apos;arrivo i <strong>giorni di permanenza previsti</strong> e non si può correggere: se l&apos;ospite parte prima o si
            ferma di più, i numeri della Polizia restano diversi dalle notti effettive. Inoltre le notti esenti o oltre il tetto ci sono per la Polizia ma
            non sono tassate. Sono differenze normali, ma vanno sapute spiegare.
          </p>
          <Esempio>
            Schedina con 5 giorni, ospite partito dopo 3 notti, bambino esente: Polizia 5, effettive 3, tassate 0. Causa: partenza anticipata ed esenzione
            per età.
          </Esempio>
          <p>Si considerano i soggiorni arrivati nel periodo, interi (anche le notti che cadono nel periodo dopo), come fa la Questura.</p>
        </AiutoSezione>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Dato etichetta="Soggiorni arrivati">{ric.righe.length}</Dato>
          <Dato etichetta="Giorni dichiarati alla Polizia">
            {ric.giorniPolizia}
            {ric.senzaGiorni > 0 && <span className="text-xs text-stone-600"> ({ric.senzaGiorni} senza dato)</span>}
          </Dato>
          <Dato etichetta="Notti effettive">{ric.nottiEffettive}</Dato>
          <Dato etichetta="Notti tassate">{ric.nottiTassate}</Dato>
        </div>
        <div className="mt-3 print:hidden">
          <Spunta etichetta="Mostra solo i soggiorni con differenze" checked={soloDifferenze} onChange={(e) => setSoloDifferenze(e.target.checked)} />
        </div>
        {righeRic.length === 0 ? (
          <p className="mt-2 text-sm text-emerald-800">{ric.righe.length ? "Nessuna differenza: i numeri coincidono." : "Nessun soggiorno arrivato nel periodo."}</p>
        ) : (
          <table className="tabella-responsive mt-2 w-full text-sm">
            <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
              <tr>
                <th className="py-1.5 pr-2">Ospite</th>
                <th className="py-1.5 pr-2">Soggiorno</th>
                <th className="py-1.5 pr-2 text-right">Polizia</th>
                <th className="py-1.5 pr-2 text-right">Effettive</th>
                <th className="py-1.5 pr-2 text-right">Tassate</th>
                <th className="py-1.5 pr-2">Perché</th>
              </tr>
            </thead>
            <tbody>
              {righeRic.map((r) => (
                <tr key={r.chiave} className="border-b border-stone-100 align-top last:border-0">
                  <td data-label="Ospite" className="py-1.5 pr-2">
                    <Link href={`/prenotazioni/${r.prenotazioneId}`} className="font-semibold text-stone-900 hover:underline">
                      {r.nome}
                    </Link>
                  </td>
                  <td data-label="Soggiorno" className="py-1.5 pr-2 font-mono text-xs">
                    {it(r.arrivo)} → {it(r.partenza)}
                  </td>
                  <td data-label="Polizia" className="py-1.5 pr-2 text-right">
                    {r.giorniPolizia ?? "—"}
                  </td>
                  <td data-label="Effettive" className="py-1.5 pr-2 text-right">
                    {r.nottiEffettive}
                  </td>
                  <td data-label="Tassate" className="py-1.5 pr-2 text-right">
                    {r.nottiTassate}
                  </td>
                  <td data-label="Perché" className="py-1.5 pr-2 text-xs">
                    {r.cause.length ? (
                      <ul className="space-y-0.5">
                        {r.cause.map((c, k) => (
                          <li key={k}>{c}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-emerald-800">coincide</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sezione>
    </div>
  );
}
