"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { FILTRI_OSPITI, SOGGIORNI_ABITUALE, type FiltroOspiti } from "@/lib/ospitiRegole";
import { Avviso, Etichetta, Input, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneCercaOspiti, type datiOspiti } from "./actions";

type Dati = Awaited<ReturnType<typeof datiOspiti>>;
const it = (g: string) => g.split("-").reverse().join("/");

export function ElencoOspiti({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<FiltroOspiti>("tutti");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function cerca(testo: string, f: FiltroOspiti) {
    setBusy(true);
    setErrore(null);
    try {
      setD(await sbusta(azioneCercaOspiti(testo, f)));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Ospiti" sottotitolo={d.totale === 1 ? "1 ospite" : `${d.totale} ospiti`} />
      <Sezione>
        <AiutoSezione breve="Le schede delle persone che hanno soggiornato o prenotato: storico, preferenze, ospiti di riguardo e consenso al marketing.">
          <p>
            Un ospite è <strong>abituale</strong> dal {SOGGIORNI_ABITUALE}° soggiorno: la prenotazione lo segnala al ricevimento insieme alle preferenze. I{" "}
            <strong>possibili doppioni</strong> sono schede con lo stesso nome (o la stessa email, telefono o documento): dalla scheda si uniscono.
          </p>
        </AiutoSezione>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            cerca(q, filtro);
          }}
        >
          <Input className="w-64" placeholder="Nome, cognome, email o telefono" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca ospite" />
          <Pulsante type="submit" icona={Search} disabled={busy}>
            Cerca
          </Pulsante>
        </form>
        <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Filtro">
          {(Object.entries(FILTRI_OSPITI) as [FiltroOspiti, string][]).map(([k, testo]) => (
            <Pulsante
              key={k}
              dimensione="piccolo"
              variante={filtro === k ? "primario" : "secondario"}
              disabled={busy}
              onClick={() => {
                setFiltro(k);
                cerca(q, k);
              }}
            >
              {testo}
            </Pulsante>
          ))}
        </div>
      </Sezione>

      {errore && <Avviso tipo="errore">{errore}</Avviso>}

      <Sezione corpoClassName="p-0">
        {d.ospiti.length === 0 ? (
          <p className="p-4 text-sm text-stone-600">Nessun ospite trovato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs text-stone-600">
                <tr>
                  <th className="px-4 py-2">Ospite</th>
                  <th className="px-4 py-2">Contatti</th>
                  <th className="px-4 py-2 text-right">Soggiorni</th>
                  <th className="px-4 py-2">Ultima partenza</th>
                </tr>
              </thead>
              <tbody>
                {d.ospiti.map((o) => (
                  <tr key={o.id} className="border-t border-stone-100 align-top">
                    <td className="px-4 py-2">
                      <Link href={`/ospiti/${o.id}`} className="font-semibold text-teal-800 hover:underline">
                        {o.cognome} {o.nome}
                      </Link>
                      {o.dataNascita && <span className="text-stone-500"> · {it(o.dataNascita)}</span>}
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {o.riguardo && <Etichetta tono="viola">Di riguardo</Etichetta>}
                        {o.soggiorni >= SOGGIORNI_ABITUALE && <Etichetta tono="verde">Abituale</Etichetta>}
                        {o.consensoMarketing && <Etichetta tono="blu">Marketing sì</Etichetta>}
                        {o.preferenze && <Etichetta>Preferenze</Etichetta>}
                        {o.doppione && <Etichetta tono="ambra">Doppione? {o.doppione}</Etichetta>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-stone-700">
                      {o.email && <div>{o.email}</div>}
                      {o.telefono && <div>{o.telefono}</div>}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{o.soggiorni}</td>
                    <td className="px-4 py-2">{o.ultimo ? it(o.ultimo) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {d.totale > d.ospiti.length && <p className="border-t border-stone-100 px-4 py-2 text-xs text-stone-600">Sono mostrati i primi {d.ospiti.length}: restringi la ricerca.</p>}
          </div>
        )}
      </Sezione>
    </div>
  );
}
