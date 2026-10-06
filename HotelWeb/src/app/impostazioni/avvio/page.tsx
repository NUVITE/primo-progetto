import Link from "next/link";
import { CheckCircle2, Circle, Store } from "lucide-react";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { avvio } from "@/lib/avvio";
import { classePulsante, Etichetta, IntestazionePagina, Sezione } from "@/components/ui";

/** Primo avvio guidato: cosa serve perché la struttura sia pronta, passo per passo. */
export default async function AvvioPage() {
  const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
  const a = await avvio(u.hotelId);
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Primo avvio"
        sottotitolo={a.completo ? "Tutto pronto: la struttura è configurata." : `${a.fatti} passi fatti su ${a.totale}`}
      />
      <Sezione>
        <p className="text-sm text-stone-700">
          I passi per lavorare con {u.hotelNome}. Ognuno porta alla pagina dove si fa; lo stato si aggiorna da solo. Quando sono tutti fatti, il promemoria sul planning
          sparisce (questa pagina resta, per controllare).
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200" aria-hidden>
          <div className="h-full bg-teal-600" style={{ width: `${Math.round((a.fatti / a.totale) * 100)}%` }} />
        </div>
      </Sezione>
      <Sezione corpoClassName="p-0">
        <ol className="flex flex-col divide-y divide-stone-100">
          {a.passi.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                {p.fatto ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Fatto" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" aria-label="Da fare" />}
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">
                    {i + 1}. {p.titolo}{" "}
                    {p.fornitore && !p.fatto && (
                      <Etichetta tono="viola" className="ml-1">
                        <Store className="mr-1 h-3 w-3" aria-hidden /> Lo fa il fornitore
                      </Etichetta>
                    )}
                  </p>
                  <p className="text-sm text-stone-600">{p.dettaglio}</p>
                </div>
              </div>
              {!p.fatto && !p.fornitore && (
                <Link href={p.href} className={classePulsante("secondario", "piccolo")}>
                  Vai
                </Link>
              )}
            </li>
          ))}
        </ol>
      </Sezione>
    </div>
  );
}
