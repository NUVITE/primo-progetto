import { Banknote, Lightbulb } from "lucide-react";
import { prisma } from "@/lib/db";

export default async function EscursioniPage() {
  const excursions = await prisma.optionalExcursion.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-2xl bg-brand-800 px-5 py-4 text-white shadow-sm">
        <h1 className="text-[20px] font-extrabold leading-tight">Escursioni facoltative</h1>
        <p className="mt-1.5 text-[14px] leading-snug text-brand-100">
          Non sono incluse nella quota e non c&apos;è alcun obbligo. Si pagano{" "}
          <strong>in contanti</strong> direttamente alla guida, tranne i voli panoramici che
          accettano anche la carta.
        </p>
      </div>

      {excursions.map((e) => (
        <section key={e.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand-200">
          <p className="text-[12px] font-bold uppercase tracking-wide text-ink-400">{e.day}</p>
          <div className="mt-0.5 flex items-start justify-between gap-3">
            <h2 className="text-[17px] font-extrabold leading-snug text-ink-900">{e.title}</h2>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-clay-50 px-2.5 py-1 text-[14px] font-extrabold text-clay-700">
              <Banknote size={15} strokeWidth={2.4} />
              {e.price.replace(" a persona", "")}
            </span>
          </div>
          {e.description && (
            <p className="mt-1.5 text-[15px] leading-snug text-ink-600">{e.description}</p>
          )}
          {e.recommendation && (
            <p className="mt-3 flex gap-2.5 rounded-xl bg-brand-50 px-3.5 py-3 text-[14px] leading-snug text-brand-800">
              <Lightbulb size={17} strokeWidth={2.2} className="mt-0.5 shrink-0" />
              {e.recommendation}
            </p>
          )}
        </section>
      ))}

      <p className="rounded-xl bg-sand-100 px-4 py-3 text-[14px] leading-snug text-ink-500">
        Se pensate di acquistarne anche solo alcune, <strong>portate i contanti dall&apos;Italia</strong>:
        cambiare euro negli USA è sconveniente e i prelievi al bancomat costano 3-6 $ a operazione
        oltre alle commissioni della vostra banca.
      </p>
    </div>
  );
}
