import { notFound } from "next/navigation";
import { puo, richiediPermesso } from "@/lib/auth";
import { notaEsborsi } from "@/lib/agenda";
import { PERMESSI } from "@/lib/permessi";
import { BottoneStampa } from "@/app/prenotazioni/[id]/proforma/BottoneStampa";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const it = (g: string) => g.split("-").reverse().join("/");

/**
 * Nota degli esborsi del portiere (libro p. 294): le spese anticipate per conto dell'ospite, con data,
 * oggetto e importo, il totale e lo spazio per la firma. Vanno sul conto fuori campo IVA.
 */
export default async function NotaEsborsiPage({ params }: { params: Promise<{ prenotazioneId: string }> }) {
  const utente = await richiediPermesso([PERMESSI.PORTINERIA, PERMESSI.ADDEBITI_REGISTRA]);
  if (!puo(utente, PERMESSI.IMPORTI_VEDI) && !puo(utente, PERMESSI.ADDEBITI_REGISTRA)) notFound();
  const id = Number((await params).prenotazioneId);
  const n = Number.isInteger(id) ? await notaEsborsi(utente.hotelId, id).catch(() => null) : null;
  if (!n) notFound();
  return (
    <div className="mx-auto w-full max-w-2xl bg-white p-6 text-sm text-stone-900 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <BottoneStampa />
      </div>
      <header className="border-b border-stone-300 pb-3">
        <p className="text-base font-bold">{n.hotel}</p>
        <h1 className="mt-2 text-lg font-bold uppercase tracking-wide">Esborsi del portiere</h1>
        <p>
          Ospite: <strong>{n.ospite}</strong> · camera <strong>{n.camere}</strong> · prenotazione n. {n.prenotazioneId}
        </p>
      </header>
      <table className="mt-4 w-full">
        <thead className="border-b border-stone-300 text-left text-xs uppercase text-stone-600">
          <tr>
            <th className="py-1">Data</th>
            <th className="py-1">Oggetto</th>
            <th className="py-1 text-right">Importo</th>
          </tr>
        </thead>
        <tbody>
          {n.righe.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-3 text-stone-600">
                Nessun esborso.
              </td>
            </tr>
          ) : (
            n.righe.map((r) => (
              <tr key={r.id} className="border-b border-stone-100">
                <td className="py-1">{it(r.data)}</td>
                <td className="py-1">{r.descrizione}</td>
                <td className="py-1 text-right font-mono">{eur(r.importo)}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td colSpan={2} className="pt-2 text-right">
              Totale
            </td>
            <td className="pt-2 text-right font-mono">{eur(n.totale)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="mt-12 flex justify-between gap-8">
        <p className="flex-1 border-t border-stone-400 pt-1 text-center text-xs">Il portiere</p>
        <p className="flex-1 border-t border-stone-400 pt-1 text-center text-xs">Firma dell&apos;ospite</p>
      </div>
      <p className="mt-6 text-xs text-stone-500">Spese anticipate per conto dell&apos;ospite: sono sul conto della camera, fuori campo IVA (art. 15 DPR 633/72).</p>
    </div>
  );
}
