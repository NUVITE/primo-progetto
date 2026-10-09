import { notFound } from "next/navigation";
import { puo, richiediPermesso } from "@/lib/auth";
import { contoPrenotazione } from "@/lib/conto";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { METODI_PAGAMENTO, TIPI_PAGAMENTO, trovaPrenotazione } from "@/lib/prenotazioni";
import { BottoneStampa } from "./BottoneStampa";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const it = (g: string) => g.slice(0, 10).split("-").reverse().join("/");

/**
 * Conto proforma (libro p. 335): non numerato, con la scritta PROFORMA, righe con IVA, acconti e caparra
 * già detratti. Non è un documento fiscale: la fattura la emette il gestionale con questi dati.
 */
export default async function ProformaPage({ params }: { params: Promise<{ id: string }> }) {
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  if (!puo(utente, PERMESSI.IMPORTI_VEDI)) notFound();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const p = await trovaPrenotazione(utente.hotelId, id).catch(() => null);
  if (!p) notFound();
  const [conto, hotel] = await Promise.all([contoPrenotazione(utente.hotelId, id), prisma.hotel.findUniqueOrThrow({ where: { id: utente.hotelId }, include: { comune: true } })]);
  const intestatario = p.clientePagante
    ? { nome: p.clientePagante.denominazione, righe: [p.clientePagante.indirizzo, [p.clientePagante.cap, p.clientePagante.comune].filter(Boolean).join(" "), p.clientePagante.partitaIva ? `P.IVA ${p.clientePagante.partitaIva}` : null] }
    : { nome: `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`, righe: [] as (string | null)[] };
  const pagamenti = p.pagamenti.filter((x) => !x.stornatoIl);
  const date = p.segmenti.filter((s) => s.stato !== "ANNULLATO").flatMap((s) => [s.dataInizio, s.dataFine]);
  const dal = date.length ? new Date(Math.min(...date.map((d) => d.getTime()))) : null;
  const al = date.length ? new Date(Math.max(...date.map((d) => d.getTime()))) : null;

  return (
    <div className="mx-auto w-full max-w-3xl bg-white p-6 text-sm text-stone-900 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <BottoneStampa />
      </div>
      <header className="flex flex-wrap justify-between gap-4 border-b border-stone-300 pb-3">
        <div>
          <p className="text-base font-bold">{hotel.ragioneSociale || hotel.nome}</p>
          {hotel.indirizzo && <p>{hotel.indirizzo}</p>}
          <p>
            {[hotel.cap, hotel.comune.nome].filter(Boolean).join(" ")} ({hotel.comune.provincia})
          </p>
          {hotel.partitaIva && <p>P.IVA {hotel.partitaIva}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold tracking-widest">PROFORMA</p>
          <p className="text-xs text-stone-600">Non è un documento fiscale</p>
          <p className="mt-1">Prenotazione #{p.id}</p>
          {dal && al && (
            <p>
              Soggiorno dal {it(dal.toISOString())} al {it(al.toISOString())}
            </p>
          )}
          <p>Data {new Date().toLocaleDateString("it-IT")}</p>
        </div>
      </header>
      <section className="mt-3">
        <p className="text-xs font-semibold text-stone-600">Intestato a</p>
        <p className="font-semibold">{intestatario.nome}</p>
        {intestatario.righe.filter(Boolean).map((r, i) => (
          <p key={i}>{r}</p>
        ))}
      </section>
      <table className="mt-4 w-full">
        <thead className="border-b border-stone-300 text-left text-xs">
          <tr>
            <th className="py-1 pr-2">Data</th>
            <th className="py-1 pr-2">Descrizione</th>
            <th className="py-1 pr-2 text-right">Q.tà</th>
            <th className="py-1 pr-2 text-right">Importo</th>
            <th className="py-1 text-right">IVA</th>
          </tr>
        </thead>
        <tbody>
          {conto.righe
            .filter((r) => !r.stornato)
            .map((r) => (
              <tr key={r.chiave} className="border-b border-stone-100">
                <td className="py-1 pr-2 whitespace-nowrap">{r.data ? it(r.data) : ""}</td>
                <td className="py-1 pr-2">{r.descrizione}</td>
                <td className="py-1 pr-2 text-right">{r.quantita}</td>
                <td className="py-1 pr-2 text-right">{eur(r.importo)}</td>
                <td className="py-1 text-right text-xs">{r.aliquota === null ? "esente/fuori campo" : `${r.aliquota.toLocaleString("it-IT")}%`}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap justify-between gap-6">
        <table className="text-xs">
          <thead className="text-left">
            <tr>
              <th className="pr-3">IVA</th>
              <th className="pr-3 text-right">Imponibile</th>
              <th className="text-right">Imposta</th>
            </tr>
          </thead>
          <tbody>
            {conto.riepilogoIva.map((v, i) => (
              <tr key={i}>
                <td className="pr-3">{v.aliquota === null ? v.natura : `${v.aliquota.toLocaleString("it-IT")}%`}</td>
                <td className="pr-3 text-right">{eur(v.imponibile)}</td>
                <td className="text-right">{v.aliquota === null ? "—" : eur(v.iva)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="min-w-56 space-y-1">
          <div className="flex justify-between font-bold">
            <dt>Totale</dt>
            <dd>{eur(conto.totale)}</dd>
          </div>
          {pagamenti.map((x) => (
            <div key={x.id} className="flex justify-between text-stone-700">
              <dt>
                {x.tipo === "rimborso" ? "Rimborso" : `Già versato (${TIPI_PAGAMENTO[x.tipo as keyof typeof TIPI_PAGAMENTO] ?? x.tipo})`} {it(x.data.toISOString())} ·{" "}
                {METODI_PAGAMENTO[x.metodo as keyof typeof METODI_PAGAMENTO] ?? x.metodo}
              </dt>
              <dd>{eur((x.tipo === "rimborso" ? 1 : -1) * Number(x.importo))}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-stone-300 pt-1 text-base font-bold">
            <dt>Da pagare</dt>
            <dd>{eur(conto.daPagare)}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-6 text-xs text-stone-500">
        Prezzi IVA inclusa. L&apos;imposta di soggiorno e gli esborsi anticipati per conto dell&apos;ospite sono fuori campo IVA.
      </p>
    </div>
  );
}
