import Link from "next/link";
import { elencoPrenotazioni } from "@/lib/prenotazioni";

function isoGiorno(d: Date) {
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
}

export default async function ElencoPrenotazioniPage() {
  const prenotazioni = await elencoPrenotazioni();

  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Prenotazioni</h1>
        <Link href="/prenotazioni/nuova" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white">
          + Nuova prenotazione
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Ospite prenotante</th>
              <th className="px-4 py-2">Gruppo</th>
              <th className="px-4 py-2">Camere</th>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {prenotazioni.map((p) => {
              const dal = p.segmenti.length ? new Date(Math.min(...p.segmenti.map((s) => s.dataInizio.getTime()))) : null;
              const al = p.segmenti.length ? new Date(Math.max(...p.segmenti.map((s) => s.dataFine.getTime()))) : null;
              return (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-2">
                    <Link href={`/prenotazioni/${p.id}`} className="font-semibold text-teal-700">
                      #{p.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{p.ospitePrenotante.nome} {p.ospitePrenotante.cognome}</td>
                  <td className="px-4 py-2">{p.gruppo?.nome ?? "—"}</td>
                  <td className="px-4 py-2">{p.segmenti.map((s) => s.camera?.codice ?? `${s.tipoCamera.descrizione} (da assegnare)`).join(", ") || "—"}</td>
                  <td className="px-4 py-2">{dal && al ? `${isoGiorno(dal)} – ${isoGiorno(al)}` : "—"}</td>
                  <td className="px-4 py-2">{p.stato}</td>
                </tr>
              );
            })}
            {prenotazioni.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-600">Nessuna prenotazione ancora.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
