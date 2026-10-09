"use client";

import { ChevronLeft, ChevronRight, Lock, LockOpen, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { METODI_CAUZIONE, type MetodoCauzione } from "@/lib/cauzioniRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Sezione, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCaricaGiorno, azioneChiudiGiornata, azioneRiapriGiornata, datiCassa } from "./actions";

type Dati = Awaited<ReturnType<typeof datiCassa>>;

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const it = (g: string) => g.split("-").reverse().join("/");
const sposta = (g: string, n: number) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const numero = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

/**
 * Cassa del giorno: incassi e rimborsi (camere ed eventi) per metodo e per operatore, addebiti dei
 * reparti, chiusura della giornata con il conteggio dei contanti (facoltativo).
 */
export function Cassa({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [chiudi, setChiudi] = useState<null | { fondoIniziale: string; contantiContati: string; fondoLasciato: string; nota: string }>(null);
  const [riapri, setRiapri] = useState(false);

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
    setChiudi(null);
    setRiapri(false);
    window.history.replaceState(null, "", `/cassa?giorno=${giorno}`);
    return esegui(() => sbusta(azioneCaricaGiorno(giorno)));
  };

  // Contanti attesi nel cassetto: incassi in contanti più il saldo delle cauzioni in contanti del giorno.
  const attesiProposti = chiudi && numero(chiudi.fondoIniziale) !== null ? numero(chiudi.fondoIniziale)! + d.contanti + d.contantiCauzioni : null;
  const differenzaProposta = attesiProposti !== null && chiudi && numero(chiudi.contantiContati) !== null ? numero(chiudi.contantiContati)! - attesiProposti : null;
  const c = d.chiusura;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Cassa e chiusura del giorno"
        sottotitolo={`${it(d.giorno)}${d.giorno === d.oggi ? " (oggi)" : ""} · incassato ${eur(d.totale)}${c ? " · giornata chiusa" : ""}`}
        azioni={
          <Pulsante dimensione="piccolo" icona={Printer} onClick={() => window.print()}>
            Stampa
          </Pulsante>
        }
      />
      <Suggerimento id="cassa" titolo="A cosa serve">
        <p>
          Qui trovi tutti gli incassi e i rimborsi registrati con la data del giorno, sulle camere e sugli eventi in sala, divisi per metodo e per
          operatore. A fine giornata (o a fine turno) si contano i contanti e si <strong>chiude la giornata</strong>: da quel momento non si registrano
          più pagamenti con quella data, così il totale resta quello controllato.
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Pulsante dimensione="piccolo" icona={ChevronLeft} disabled={busy} onClick={() => vai(sposta(d.giorno, -1))}>
          Giorno prima
        </Pulsante>
        <div className="w-44">
          <Input type="date" aria-label="Giorno" value={d.giorno} max={d.oggi} onChange={(e) => e.target.value && vai(e.target.value)} />
        </div>
        <Pulsante dimensione="piccolo" disabled={busy || d.giorno >= d.oggi} onClick={() => vai(sposta(d.giorno, 1))}>
          Giorno dopo <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Pulsante>
        {d.giorno !== d.oggi && (
          <Pulsante dimensione="piccolo" variante="leggero" disabled={busy} onClick={() => vai(d.oggi)}>
            Oggi
          </Pulsante>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Sezione titolo="Per metodo">
          {d.perMetodo.length === 0 ? (
            <p className="text-sm text-stone-600">Nessun incasso.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-1 text-sm">
              {d.perMetodo.map((m) => (
                <div key={m.metodo} className="contents">
                  <dt>{m.testo}</dt>
                  <dd className="text-right font-mono">{eur(m.importo)}</dd>
                </div>
              ))}
              <dt className="border-t border-stone-200 pt-1 font-bold">Totale</dt>
              <dd className="border-t border-stone-200 pt-1 text-right font-mono font-bold">{eur(d.totale)}</dd>
            </dl>
          )}
        </Sezione>
        <Sezione titolo="Per operatore">
          {d.perOperatore.length === 0 ? (
            <p className="text-sm text-stone-600">—</p>
          ) : (
            <dl className="grid grid-cols-2 gap-1 text-sm">
              {d.perOperatore.map((o) => (
                <div key={o.operatore} className="contents">
                  <dt>{o.operatore}</dt>
                  <dd className="text-right font-mono">{eur(o.importo)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Sezione>
        <Sezione titolo="Addebiti dei reparti">
          <AiutoSezione breve="Consumi segnati oggi sul conto delle camere: non sono incassi, si pagano al saldo." />
          {d.reparti.length === 0 ? (
            <p className="mt-2 text-sm text-stone-600">Nessun addebito.</p>
          ) : (
            <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {d.reparti.map((r) => (
                <div key={r.nome} className="contents">
                  <dt>
                    {r.nome} <span className="text-xs text-stone-500">({r.quantita})</span>
                  </dt>
                  <dd className="text-right font-mono">{eur(r.importo)}</dd>
                </div>
              ))}
            </dl>
          )}
        </Sezione>
      </div>

      <Sezione titolo={`Movimenti (${d.movimenti.length})`}>
        <div className="overflow-x-auto">
          <table className="tabella-responsive w-full text-sm">
            <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
              <tr>
                <th className="py-1.5 pr-2">Ora</th>
                <th className="py-1.5 pr-2">Movimento</th>
                <th className="py-1.5 pr-2">Su</th>
                <th className="py-1.5 pr-2">Operatore</th>
                <th className="py-1.5 pr-2 text-right">Importo</th>
              </tr>
            </thead>
            <tbody>
              {d.movimenti.map((m) => (
                <tr key={m.chiave} className={`border-b border-stone-100 align-top last:border-0 ${m.stornato ? "text-stone-400" : ""}`}>
                  <td data-label="Ora" className="py-1.5 pr-2 font-mono text-xs">
                    {m.ora ?? "—"}
                  </td>
                  <td data-label="Movimento" className={`py-1.5 pr-2 ${m.stornato ? "line-through" : ""}`}>
                    {m.tipoTesto} · {m.metodoTesto}
                    {m.nota && <div className="text-xs text-stone-600 no-underline">{m.nota}</div>}
                    {m.stornato && <Etichetta className="ml-1">stornato</Etichetta>}
                  </td>
                  <td data-label="Su" className="py-1.5 pr-2">
                    {m.link ? (
                      <Link href={m.link} className="hover:underline">
                        {m.descrizione}
                      </Link>
                    ) : (
                      m.descrizione
                    )}
                  </td>
                  <td data-label="Operatore" className="py-1.5 pr-2">
                    {m.operatore}
                  </td>
                  <td data-label="Importo" className={`py-1.5 pr-2 text-right font-mono ${m.importo < 0 ? "text-red-700" : "font-semibold"} ${m.stornato ? "line-through" : ""}`}>
                    {eur(m.importo)}
                  </td>
                </tr>
              ))}
              {d.movimenti.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-center text-stone-600">
                    Nessun movimento in questa giornata.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Sezione>

      {d.cauzioni.length > 0 && (
        <Sezione titolo={`Cauzioni (${d.cauzioni.length})`} descrizione="Depositi degli ospiti: non sono incassi, ma il contante entra ed esce dal cassetto.">
          <ul className="flex flex-col divide-y divide-stone-100 text-sm">
            {d.cauzioni.map((m) => (
              <li key={m.chiave} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span>
                  <Link href={`/prenotazioni/${m.prenotazioneId}`} className="text-teal-800 hover:underline">
                    {m.descrizione}
                  </Link>{" "}
                  <span className="text-stone-600">
                    · {m.tipo === "incasso" ? "cauzione incassata" : m.tipo === "restituzione" ? "cauzione restituita" : "trattenuta passata al conto"} · {METODI_CAUZIONE[m.metodo as MetodoCauzione] ?? m.metodo} · {m.operatore}
                  </span>
                </span>
                <span className={`font-mono ${m.importo < 0 ? "text-red-700" : ""}`}>{eur(m.importo)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            Saldo delle cauzioni in contanti: <strong className="font-mono">{eur(d.contantiCauzioni)}</strong> (conta nei contanti attesi alla chiusura).
          </p>
        </Sezione>
      )}

      <Sezione titolo="Chiusura della giornata">
        <AiutoSezione breve="Si contano i contanti in cassa e si chiude: il fondo cassa è facoltativo, chi non lo usa chiude e basta.">
          <Esempio>
            Fondo all&apos;apertura 100 €, incassati in contanti 250 €: in cassa devono esserci 350 €. Se ne conti 345 €, la differenza di −5 € va
            spiegata nella nota. Lasci 100 € di fondo per domani.
          </Esempio>
        </AiutoSezione>
        {c ? (
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <p className="flex items-center gap-2 font-semibold text-emerald-800">
              <Lock className="h-4 w-4" aria-hidden /> Chiusa da {c.chiusaDa} il {new Date(c.chiusaIl).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}, totale{" "}
              {eur(c.totale)}
            </p>
            {c.fondoIniziale !== null && (
              <dl className="grid max-w-md grid-cols-2 gap-1">
                <dt>Fondo all&apos;apertura</dt>
                <dd className="text-right font-mono">{eur(c.fondoIniziale)}</dd>
                <dt>Contanti attesi</dt>
                <dd className="text-right font-mono">{c.attesi !== null ? eur(c.attesi) : "—"}</dd>
                <dt>Contanti contati</dt>
                <dd className="text-right font-mono">{c.contantiContati !== null ? eur(c.contantiContati) : "—"}</dd>
                {c.contantiContati !== null && c.attesi !== null && (
                  <>
                    <dt className="font-bold">Differenza</dt>
                    <dd className={`text-right font-mono font-bold ${Math.abs(c.contantiContati - c.attesi) > 0.005 ? "text-red-700" : "text-emerald-800"}`}>
                      {eur(c.contantiContati - c.attesi)}
                    </dd>
                  </>
                )}
                <dt>Fondo lasciato</dt>
                <dd className="text-right font-mono">{c.fondoLasciato !== null ? eur(c.fondoLasciato) : "—"}</dd>
              </dl>
            )}
            {c.nota && <p className="text-stone-700">Nota: {c.nota}</p>}
            {d.differenze.length > 0 && (
              <Avviso tipo="avviso">
                Dopo la chiusura sono cambiati dei movimenti:{" "}
                {d.differenze.map((x) => `${x.metodo} ${eur(x.chiusura)} → ${eur(x.adesso)}`).join("; ")}.
              </Avviso>
            )}
            <div className="flex items-center gap-2 print:hidden">
              {riapri ? (
                <>
                  <span>Riaprire la giornata? Servirà chiuderla di nuovo.</span>
                  <Pulsante variante="pericolo" dimensione="piccolo" disabled={busy} onClick={async () => (await esegui(() => sbusta(azioneRiapriGiornata(d.giorno)), "Giornata riaperta.")) && setRiapri(false)}>
                    Sì, riapri
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setRiapri(false)}>
                    No
                  </Pulsante>
                </>
              ) : (
                <Pulsante dimensione="piccolo" icona={LockOpen} onClick={() => setRiapri(true)}>
                  Riapri la giornata
                </Pulsante>
              )}
            </div>
          </div>
        ) : chiudi ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <Campo etichetta="Fondo all'apertura (€)" aiuto={d.fondoProposto !== null ? `Lasciato alla chiusura precedente: ${eur(d.fondoProposto)}` : "Vuoto se non usi il fondo cassa."}>
                <Input inputMode="decimal" value={chiudi.fondoIniziale} onChange={(e) => setChiudi({ ...chiudi, fondoIniziale: e.target.value })} />
              </Campo>
              <Campo etichetta="Contanti contati (€)" aiuto={attesiProposti !== null ? `Attesi: ${eur(attesiProposti)}` : "Facoltativo."}>
                <Input inputMode="decimal" value={chiudi.contantiContati} onChange={(e) => setChiudi({ ...chiudi, contantiContati: e.target.value })} />
              </Campo>
              <Campo etichetta="Fondo lasciato per domani (€)">
                <Input inputMode="decimal" value={chiudi.fondoLasciato} onChange={(e) => setChiudi({ ...chiudi, fondoLasciato: e.target.value })} />
              </Campo>
            </div>
            {differenzaProposta !== null && Math.abs(differenzaProposta) > 0.005 && (
              <Avviso tipo="avviso">I contanti non tornano: differenza {eur(differenzaProposta)}. Scrivi il motivo nella nota.</Avviso>
            )}
            <Campo etichetta="Nota">
              <Textarea rows={2} value={chiudi.nota} onChange={(e) => setChiudi({ ...chiudi, nota: e.target.value })} />
            </Campo>
            <div className="flex gap-2">
              <Pulsante
                variante="primario"
                icona={Lock}
                disabled={busy}
                onClick={async () => {
                  const ok = await esegui(
                    () =>
                      sbusta(
                        azioneChiudiGiornata(d.giorno, {
                          fondoIniziale: numero(chiudi.fondoIniziale),
                          contantiContati: numero(chiudi.contantiContati),
                          fondoLasciato: numero(chiudi.fondoLasciato),
                          nota: chiudi.nota,
                        }),
                      ),
                    "Giornata chiusa.",
                  );
                  if (ok) setChiudi(null);
                }}
              >
                Chiudi la giornata
              </Pulsante>
              <Pulsante onClick={() => setChiudi(null)}>Annulla</Pulsante>
            </div>
          </div>
        ) : (
          <Pulsante
            variante="primario"
            icona={Lock}
            className="mt-3 print:hidden"
            disabled={d.giorno > d.oggi}
            onClick={() =>
              setChiudi({
                fondoIniziale: d.fondoProposto !== null ? d.fondoProposto.toFixed(2) : "",
                contantiContati: "",
                fondoLasciato: d.fondoProposto !== null ? d.fondoProposto.toFixed(2) : "",
                nota: "",
              })
            }
          >
            Chiudi la giornata…
          </Pulsante>
        )}
      </Sezione>

      {d.chiusure.length > 0 && (
        <Sezione titolo="Ultime giornate chiuse" className="print:hidden">
          <ul className="divide-y divide-stone-100 text-sm">
            {d.chiusure.map((x) => (
              <li key={x.giorno} className="flex items-center gap-3 py-1.5">
                <button type="button" className="font-mono text-teal-800 hover:underline" onClick={() => vai(x.giorno)}>
                  {it(x.giorno)}
                </button>
                <span className="min-w-0 flex-1 text-stone-600">{x.chiusaDa}</span>
                {x.differenzaContanti !== null && Math.abs(x.differenzaContanti) > 0.005 && <Etichetta tono="rosso">contanti {eur(x.differenzaContanti)}</Etichetta>}
                <span className="font-mono">{eur(x.totale)}</span>
              </li>
            ))}
          </ul>
        </Sezione>
      )}
    </div>
  );
}
