import Link from "next/link";
import { CheckCircle2, Circle, Wrench } from "lucide-react";
import type { avvio } from "@/lib/avvio";
import { FUNZIONI, type Funzione } from "@/lib/funzioniRegole";

type Avvio = Awaited<ReturnType<typeof avvio>>;

// Dove il fornitore fa i passi che toccano a lui (gli altri li fa la struttura dalle sue Impostazioni).
const DOVE_FORNITORE: Record<string, { href: string; testo: string }> = {
  tassa: { href: "/piattaforma/tassa", testo: "Tassa di soggiorno" },
  istat: { href: "#dati-hotel", testo: "Sistema ISTAT nei dati qui sotto" },
};

/**
 * Per il fornitore: a che punto è la struttura con il primo avvio (sola lettura, gli stessi passi che
 * vede il titolare in Impostazioni › Primo avvio) e quali funzioni del nucleo ha spento.
 */
export function AvvioStruttura({ avvio: a, funzioniSpente }: { avvio: Avvio; funzioniSpente: Funzione[] }) {
  const daFornitore = a.passi.filter((p) => !p.fatto && p.fornitore);
  return (
    <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-stone-900">Primo avvio della struttura</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.completo ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          {a.completo ? "Pronta" : `Da completare: ${a.fatti} su ${a.totale}`}
        </span>
        {daFornitore.length > 0 && (
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            {daFornitore.length === 1 ? "1 passo tocca a te" : `${daFornitore.length} passi toccano a te`}
          </span>
        )}
      </div>
      <p className="mb-2 text-xs text-stone-600">
        Gli stessi passi che il titolare vede in Impostazioni › Primo avvio. Quelli segnati con la chiave inglese li fa il fornitore; gli altri la struttura.
      </p>
      <ul className="divide-y divide-stone-100 text-sm">
        {a.passi.map((p) => (
          <li key={p.id} className="flex items-start gap-2 py-1.5">
            {p.fatto ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Fatto" />
            ) : p.fornitore ? (
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-label="Tocca al fornitore" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-label="Da fare" />
            )}
            <div className="min-w-0">
              <span className="font-semibold">{p.titolo}</span> <span className="text-stone-600">— {p.dettaglio}</span>
              {!p.fatto && p.fornitore && DOVE_FORNITORE[p.id] && (
                <>
                  {" "}
                  <Link href={DOVE_FORNITORE[p.id].href} className="font-semibold text-teal-700 underline">
                    {DOVE_FORNITORE[p.id].testo}
                  </Link>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <h3 className="mt-4 mb-1 text-xs font-bold uppercase text-stone-500">Funzioni del nucleo</h3>
      <p className="mb-2 text-xs text-stone-600">Le accende e le spegne la struttura in Impostazioni › Struttura.</p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(FUNZIONI) as [Funzione, (typeof FUNZIONI)[Funzione]][]).map(([k, f]) => {
          const spenta = funzioniSpente.includes(k);
          return (
            <span key={k} title={f.descrizione} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${spenta ? "bg-stone-200 text-stone-500 line-through" : "bg-emerald-50 text-emerald-700"}`}>
              {f.nome}
              {spenta ? " (spenta)" : ""}
            </span>
          );
        })}
      </div>
    </section>
  );
}
