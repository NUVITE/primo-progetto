import Link from "next/link";
import { richiediSuperAdmin } from "@/lib/auth";
import { elencoHotel } from "@/lib/hotel";
import { CATALOGO_MODULI } from "@/lib/moduli";
import { nomeTipologia } from "@/lib/tipologie";

export default async function HotelPiattaformaPage() {
  await richiediSuperAdmin();
  const hotels = await elencoHotel();
  const nomeModulo = (m: string) => CATALOGO_MODULI.find((c) => c.modulo === m)?.nome ?? m;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Hotel</h1>
          <p className="text-sm text-stone-700">Tutte le strutture della piattaforma (visibile solo al gestore della piattaforma). Clicca un hotel per moduli, dati e stato.</p>
        </div>
        <Link href="/piattaforma/hotel/nuovo" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10">
          + Nuovo hotel
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="tabella-responsive w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-600">
            <tr>
              <th className="px-4 py-2">Hotel</th>
              <th className="px-4 py-2">Comune</th>
              <th className="px-4 py-2">Tipologia</th>
              <th className="px-4 py-2">Categoria</th>
              <th className="px-4 py-2">Camere</th>
              <th className="px-4 py-2">Utenti</th>
              <th className="px-4 py-2">Moduli</th>
              <th className="px-4 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {hotels.map((h) => (
              <tr key={h.id} className="border-b border-stone-100 last:border-0">
                <td className="cella-intera px-4 py-2">
                  <Link href={`/piattaforma/hotel/${h.id}`} className="font-semibold text-teal-700 hover:underline">
                    {h.nome}
                  </Link>
                </td>
                <td data-label="Comune" className="px-4 py-2">{h.comune.nome} ({h.comune.provincia})</td>
                <td data-label="Tipologia" className="px-4 py-2">{nomeTipologia(h.tipologia)}</td>
                <td data-label="Categoria" className="px-4 py-2">{h.categoria ?? "—"}</td>
                <td data-label="Camere" className="px-4 py-2">{h._count.camere}</td>
                <td data-label="Utenti" className="px-4 py-2">{h._count.accessi}</td>
                <td data-label="Moduli" className="px-4 py-2 text-xs">{h.moduli.length ? h.moduli.map(nomeModulo).join(", ") : "Solo base"}</td>
                <td data-label="Stato" className="px-4 py-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${h.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}>
                    {h.attivo ? "Attivo" : "Disattivato"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
