import { notFound } from "next/navigation";
import { richiediPermesso } from "@/lib/auth";
import { ricevutaValori } from "@/lib/custodia";
import { MOVIMENTI_VALORI } from "@/lib/custodiaRegole";
import { PERMESSI } from "@/lib/permessi";
import { BottoneStampa } from "@/app/prenotazioni/[id]/proforma/BottoneStampa";

const giorno = (iso: string) => new Date(iso).toLocaleDateString("it-IT", { timeZone: "Europe/Rome" });
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

/**
 * Ricevuta di deposito dei valori (libro p. 295): numero e data, ospite e camera, cosa è in custodia;
 * sul retro i movimenti con la firma dell'ospite. Dopo il ritiro finale si può cestinare.
 */
export default async function RicevutaValoriPage({ params }: { params: Promise<{ id: string }> }) {
  const utente = await richiediPermesso(PERMESSI.PORTINERIA);
  const id = Number((await params).id);
  const r = Number.isInteger(id) ? await ricevutaValori(utente.hotelId, id).catch(() => null) : null;
  if (!r) notFound();
  const deposito = r.movimenti[0];
  return (
    <div className="mx-auto w-full max-w-2xl bg-white p-6 text-sm text-stone-900 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <BottoneStampa />
      </div>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-300 pb-3">
        <div>
          <p className="text-base font-bold">{r.hotel}</p>
          <h1 className="mt-1 text-lg font-bold uppercase tracking-wide">Ricevuta di deposito valori</h1>
        </div>
        <p className="text-right">
          N. <strong className="font-mono text-lg">{r.numero}</strong>
          <br />
          del {giorno(r.creataIl)}
        </p>
      </header>
      <p className="mt-3">
        Ospite: <strong>{r.nome}</strong>
        {r.camera && (
          <>
            {" "}
            · camera <strong>{r.camera}</strong>
          </>
        )}
      </p>
      <p className="mt-1">
        In custodia: <strong>{r.descrizione}</strong>
        {deposito?.importo != null && <> · contanti {eur(deposito.importo)}</>}
      </p>
      <div className="mt-8 flex justify-between gap-8">
        <p className="flex-1 border-t border-stone-400 pt-1 text-center text-xs">Firma dell&apos;ospite</p>
        <p className="flex-1 border-t border-stone-400 pt-1 text-center text-xs">La direzione</p>
      </div>

      <h2 className="mt-8 border-b border-stone-300 pb-1 font-bold uppercase tracking-wide">Movimenti</h2>
      <table className="mt-2 w-full">
        <thead className="text-left text-xs uppercase text-stone-600">
          <tr>
            <th className="py-1">Data</th>
            <th className="py-1">Operazione</th>
            <th className="py-1 text-right">Importo</th>
            <th className="py-1 pl-4">Firma</th>
          </tr>
        </thead>
        <tbody>
          {r.movimenti.map((m) => (
            <tr key={m.id} className="border-b border-stone-200 align-bottom">
              <td className="py-3">{giorno(m.data)}</td>
              <td className="py-3">
                {MOVIMENTI_VALORI[m.tipo]}
                {m.descrizione && m.tipo !== "deposito" && <span className="text-stone-600"> · {m.descrizione}</span>}
              </td>
              <td className="py-3 text-right font-mono">{m.importo != null ? eur(m.importo) : ""}</td>
              <td className="w-40 py-3 pl-4">
                <span className="block border-b border-stone-400">&nbsp;</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.chiusaIl ? (
        <p className="mt-4 text-xs text-stone-600">
          Valori restituiti il {giorno(r.chiusaIl)} ({r.chiusaDa}): la ricevuta si può cestinare.
        </p>
      ) : (
        r.saldo > 0 && <p className="mt-4 text-xs text-stone-600">Contanti ancora in custodia: {eur(r.saldo)}.</p>
      )}
    </div>
  );
}
