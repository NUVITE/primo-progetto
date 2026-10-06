"use client";

import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Dato, Input, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneGiornale, type datiGiornale } from "./actions";

type Dati = Awaited<ReturnType<typeof datiGiornale>>;
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const sposta = (g: string, n: number) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const titolo = (g: string) => {
  const t = new Date(`${g}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const num = (n: number) => (n === 0 ? "" : n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

/** Giornale d'albergo (main courante) del giorno e chiusura contabile per reparto. */
export function GiornaleAlbergo({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function vai(g: string) {
    setBusy(true);
    setErrore(null);
    try {
      setD(await sbusta(azioneGiornale(g)));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Giornale d'albergo"
        sottotitolo={`${d.hotel} · ${titolo(d.giorno)}`}
        azioni={
          <span className="flex flex-wrap gap-2 print:hidden">
            <Pulsante icona={ChevronLeft} aria-label="Giorno prima" disabled={busy} onClick={() => vai(sposta(d.giorno, -1))} />
            <Input type="date" className="w-40" value={d.giorno} onChange={(e) => e.target.value && vai(e.target.value)} aria-label="Giorno" />
            <Pulsante icona={ChevronRight} aria-label="Giorno dopo" disabled={busy} onClick={() => vai(sposta(d.giorno, 1))} />
            {d.giorno !== oggi() && (
              <Pulsante disabled={busy} onClick={() => vai(oggi())}>
                Oggi
              </Pulsante>
            )}
            <Pulsante icona={Printer} onClick={() => window.print()}>
              Stampa
            </Pulsante>
          </span>
        }
      />
      <Sezione className="print:hidden">
        <AiutoSezione breve="La main courante: per ogni prenotazione gli addebiti del giorno divisi per reparto (alloggio, consumi, esborsi, abbuoni, tassa di soggiorno) e i pagamenti ricevuti. L'ultima riga è la chiusura contabile: i ricavi del giorno per reparto.">
          <p>
            L&apos;alloggio è il prezzo della notte (con il trattamento). Gli abbuoni sono in negativo, i rimborsi riducono i pagamenti. Gli incassi per metodo (contanti, carta…) e il
            conteggio dei contanti sono nella{" "}
            <Link href="/cassa" className="text-teal-800 underline">
              cassa del giorno
            </Link>
            . Gli eventi in sala non sono qui.
          </p>
        </AiutoSezione>
      </Sezione>

      {errore && <Avviso tipo="errore">{errore}</Avviso>}

      <Sezione titolo="Chiusura contabile del giorno">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {d.colonne.map((c) => (
            <Dato key={c} etichetta={c}>
              {eur(d.totali[c])}
            </Dato>
          ))}
          <Dato etichetta="Totale addebiti">
            <strong>{eur(d.totaleAddebiti)}</strong>
          </Dato>
          <Dato etichetta="Pagamenti ricevuti">
            <strong>{eur(d.totaleAccrediti)}</strong>
          </Dato>
        </div>
      </Sezione>

      <Sezione titolo={`Movimenti per prenotazione (${d.righe.length})`} corpoClassName="p-0">
        {d.righe.length === 0 ? (
          <p className="p-4 text-sm text-stone-600">Nessun movimento in questo giorno.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-stone-50 text-left text-stone-600">
                <tr>
                  <th className="px-2 py-2">Camera</th>
                  <th className="px-2 py-2">Ospite</th>
                  {d.colonne.map((c) => (
                    <th key={c} className="px-2 py-2 text-right">
                      {c}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right">Totale addebiti</th>
                  <th className="px-2 py-2 text-right">Pagamenti</th>
                </tr>
              </thead>
              <tbody>
                {d.righe.map((r) => (
                  <tr key={r.prenotazioneId} className="border-t border-stone-100">
                    <td className="px-2 py-1 font-semibold">{r.camere}</td>
                    <td className="px-2 py-1">
                      <Link href={`/prenotazioni/${r.prenotazioneId}`} className="text-teal-800 hover:underline print:text-stone-900 print:no-underline">
                        {r.ospite}
                      </Link>
                    </td>
                    {d.colonne.map((c) => (
                      <td key={c} className={`px-2 py-1 text-right font-mono ${r.importi[c] < 0 ? "text-red-700" : ""}`}>
                        {num(r.importi[c])}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right font-mono font-semibold">{num(r.addebiti)}</td>
                    <td className="px-2 py-1 text-right font-mono">{num(r.accrediti)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-stone-300 bg-stone-50 font-bold">
                <tr>
                  <td className="px-2 py-2" colSpan={2}>
                    Chiusura contabile
                  </td>
                  {d.colonne.map((c) => (
                    <td key={c} className="px-2 py-2 text-right font-mono">
                      {num(d.totali[c]) || "0,00"}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right font-mono">{num(d.totaleAddebiti) || "0,00"}</td>
                  <td className="px-2 py-2 text-right font-mono">{num(d.totaleAccrediti) || "0,00"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Sezione>
    </div>
  );
}
