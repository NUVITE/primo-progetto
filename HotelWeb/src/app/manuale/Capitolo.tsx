import Link from "next/link";
import { notFound } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { capitoliPer, type Manuale } from "@/lib/manuale";
import { markdown } from "@/lib/manualeRegole";
import { Markdown } from "@/components/Markdown";
import { Stampa } from "./Stampa";

/** Un capitolo del manuale: indice dei paragrafi, testo, capitolo precedente e seguente. */
export async function PaginaCapitolo({ manuale, slug, base }: { manuale: Manuale; slug: string; base: string }) {
  const u = await richiediUtente();
  const tutti = await capitoliPer(manuale, u);
  const i = tutti.findIndex((c) => c.slug === slug);
  if (i < 0) notFound();
  const c = tutti[i];
  const paragrafi = markdown(c.testo).flatMap((b) => (b.tipo === "titolo" && b.livello === 2 ? [{ ancora: b.ancora, testo: b.testo.map((x) => x.testo).join("") }] : []));
  const prima = tutti[i - 1];
  const dopo = tutti[i + 1];
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={base} className="text-sm text-teal-700">
          ← {manuale === "tecnico" ? "Manuale tecnico" : "Manuale"}
        </Link>
        <Stampa />
      </div>
      <h1 className="text-2xl font-bold text-stone-900">{c.titolo}</h1>
      {paragrafi.length > 2 && (
        <nav aria-label="In questo capitolo" className="max-w-3xl rounded-lg border border-stone-200 bg-white p-3 text-sm print:hidden">
          <p className="mb-1 text-xs font-bold uppercase text-stone-500">In questo capitolo</p>
          <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
            {paragrafi.map((p) => (
              <li key={p.ancora}>
                <a href={`#${p.ancora}`} className="text-teal-800 underline decoration-teal-300 underline-offset-2">
                  {p.testo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <Markdown testo={c.testo} />
      <div className="mt-6 flex max-w-3xl flex-wrap justify-between gap-2 border-t border-stone-200 pt-3 text-sm print:hidden">
        {prima ? (
          <Link href={`${base}/${prima.slug}`} className="text-teal-800 underline">
            ← {prima.titolo}
          </Link>
        ) : (
          <span />
        )}
        {dopo && (
          <Link href={`${base}/${dopo.slug}`} className="text-teal-800 underline">
            {dopo.titolo} →
          </Link>
        )}
      </div>
    </div>
  );
}
