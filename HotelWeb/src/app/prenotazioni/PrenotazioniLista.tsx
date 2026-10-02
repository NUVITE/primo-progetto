"use client";

import { CalendarRange, ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Campo, Etichetta, Input } from "@/components/ui";
import { azioneCercaPrenotazioni } from "./actions";
import { statoPrenotazione } from "./stato";
import type { RigaElenco as Riga } from "./righe";

/** Etichetta della scadenza di un'opzione (solo se scaduta o vicina). */
function EtichettaOpzione({ opzione }: { opzione: Riga["opzione"] }) {
  if (!opzione || opzione.stato === "valida") return null;
  return <Etichetta tono={opzione.stato === "scaduta" ? "rosso" : "ambra"}>{opzione.stato === "scaduta" ? `opzione scaduta il ${opzione.data}` : `scade il ${opzione.data}`}</Etichetta>;
}

/** Arrivo di oggi: arrivato, atteso (con ora e garanzia) o possibile no-show oltre l'orario limite. */
function EtichettaArrivo({ p }: { p: Riga }) {
  const a = p.arrivoOggi;
  if (!a) return null;
  if (a.arrivate === a.camere) return <Etichetta tono="verde">arrivato oggi</Etichetta>;
  return (
    <>
      <Etichetta tono={a.possibileNoShow ? "rosso" : "blu"}>
        {a.possibileNoShow ? "possibile no-show" : `arriva oggi${p.oraArrivo ? ` alle ${p.oraArrivo}` : ""}`}
        {a.arrivate > 0 ? ` (${a.arrivate} di ${a.camere} camere arrivate)` : ""}
      </Etichetta>
      {p.garanzia === "nessuna" && <Etichetta tono="ambra">non garantita</Etichetta>}
    </>
  );
}

export function PrenotazioniLista({ iniziale, vista = "ultime" }: { iniziale: Riga[]; vista?: "ultime" | "opzioni" | "arrivi" }) {
  const soloOpzioni = vista === "opzioni";
  const [query, setQuery] = useState("");
  const [risultati, setRisultati] = useState<Riga[] | null>(null);
  const [cercando, setCercando] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setRisultati(null);
      return;
    }
    setCercando(true);
    const timer = setTimeout(() => {
      azioneCercaPrenotazioni(query)
        .then(setRisultati)
        .catch(() => setRisultati([]))
        .finally(() => setCercando(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const righe = risultati ?? iniziale;
  const vuoto = cercando
    ? "Ricerca in corso..."
    : query.trim().length >= 2
      ? "Nessuna prenotazione trovata."
      : soloOpzioni
        ? "Nessuna opzione scaduta o in scadenza."
        : vista === "arrivi"
          ? "Nessun arrivo previsto oggi."
          : "Nessuna prenotazione ancora.";

  return (
    <div className="flex flex-col gap-3">
      <Campo etichetta="Cerca per nome o cognome" aiuto="Trova anche le prenotazioni passate e i componenti dei gruppi." className="max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
          <Input className="pl-8" placeholder="es. Rossi" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </Campo>

      <p className="text-sm text-stone-600">
        {risultati
          ? `${righe.length} ${righe.length === 1 ? "risultato" : "risultati"} per “${query.trim()}”`
          : soloOpzioni
            ? "Opzioni scadute o che scadono entro 2 giorni: confermale o annullale dal dettaglio."
            : vista === "arrivi"
              ? "Prenotazioni con camere che arrivano oggi, in ordine di ora di arrivo. Le non garantite oltre l'orario limite sono un possibile no-show: la camera si può liberare."
              : "Ultime prenotazioni inserite"}
      </p>

      {/* Telefono: una scheda per prenotazione al posto della tabella. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {righe.map((p) => {
          const stato = statoPrenotazione(p.stato);
          return (
            <li key={p.id}>
              <Link href={`/prenotazioni/${p.id}`} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm active:bg-teal-50">
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-stone-900">{p.ospitePrenotante}</span>
                    <Etichetta tono={stato.tono}>{stato.testo}</Etichetta>
                    <EtichettaOpzione opzione={p.opzione} />
                    <EtichettaArrivo p={p} />
                  </span>
                  {p.periodo && (
                    <span className="flex items-center gap-1.5 text-sm text-stone-700">
                      <CalendarRange className="h-4 w-4 text-stone-500" aria-hidden />
                      {p.periodo}
                    </span>
                  )}
                  {p.camere && <span className="text-sm text-stone-600">{p.camere}</span>}
                  <span className="text-xs text-stone-500">
                    #{p.id}
                    {p.gruppoNome ? ` · gruppo ${p.gruppoNome}` : ""}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden />
              </Link>
            </li>
          );
        })}
        {righe.length === 0 && <li className="rounded-lg border border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-600">{vuoto}</li>}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs font-semibold text-stone-600">
            <tr>
              <th className="px-4 py-2">Ospite prenotante</th>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">Camere</th>
              <th className="px-4 py-2">Gruppo</th>
              <th className="px-4 py-2">Stato</th>
              <th className="px-4 py-2 text-right">N.</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((p) => {
              const stato = statoPrenotazione(p.stato);
              return (
                <tr key={p.id} className="group border-b border-stone-100 last:border-0 hover:bg-teal-50">
                  <td className="px-4 py-2">
                    {/* Il link copre la riga: si apre con un clic, con il tasto centrale o da tastiera. */}
                    <Link href={`/prenotazioni/${p.id}`} className="font-semibold text-stone-900 group-hover:text-teal-800 group-hover:underline">
                      {p.ospitePrenotante}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-stone-800">{p.periodo ?? "—"}</td>
                  <td className="px-4 py-2 text-stone-700">{p.camere ?? "—"}</td>
                  <td className="px-4 py-2 text-stone-700">
                    {p.gruppoNome ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-stone-500" aria-hidden />
                        {p.gruppoNome}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="flex flex-wrap gap-1">
                      <Etichetta tono={stato.tono}>{stato.testo}</Etichetta>
                      <EtichettaOpzione opzione={p.opzione} />
                      <EtichettaArrivo p={p} />
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-stone-500">#{p.id}</td>
                </tr>
              );
            })}
            {righe.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-600">
                  {vuoto}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
