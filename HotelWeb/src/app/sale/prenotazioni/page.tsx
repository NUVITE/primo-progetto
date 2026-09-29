import Link from "next/link";
import { datiElencoSale } from "../actions";
import { ETICHETTA_STATO, it } from "../formato";

export default async function PrenotazioniSalePage() {
  const { elenco, puoGestire } = await datiElencoSale();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Prenotazioni sale</h1>
        {puoGestire && (
          <Link href="/sale/prenotazioni/nuova" className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white">
            + Nuova prenotazione
          </Link>
        )}
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <table className="tabella-responsive w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="pb-1 pr-2">Evento</th>
              <th className="pb-1 pr-2">Per</th>
              <th className="pb-1 pr-2">Date</th>
              <th className="pb-1 pr-2">Sale</th>
              <th className="pb-1 pr-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {elenco.map((p) => {
              const s = ETICHETTA_STATO[p.stato] ?? ETICHETTA_STATO.opzione;
              return (
                <tr key={p.id} className="border-t border-stone-100">
                  <td data-label="Evento" className="py-1.5 pr-2">
                    <Link href={`/sale/prenotazioni/${p.id}`} className="font-semibold text-teal-700">
                      {p.titolo}
                    </Link>
                  </td>
                  <td data-label="Per" className="py-1.5 pr-2">{p.per}</td>
                  <td data-label="Date" className="py-1.5 pr-2 font-mono">{p.dal ? (p.dal === p.al ? it(p.dal) : `${it(p.dal)} – ${it(p.al!)}`) : "—"}</td>
                  <td data-label="Sale" className="py-1.5 pr-2">{p.sale || "—"}</td>
                  <td data-label="Stato" className="py-1.5 pr-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${s.classe}`}>{s.testo}</span>
                  </td>
                </tr>
              );
            })}
            {elenco.length === 0 && (
              <tr>
                <td colSpan={5} className="cella-intera py-3 text-sm text-stone-500">
                  Nessuna prenotazione di sala.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
