import { prisma } from "@/lib/db";

export default async function EscursioniPage() {
  const excursions = await prisma.optionalExcursion.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="p-4 space-y-3">
      <p className="px-1 text-sm font-semibold text-slate-500 uppercase tracking-wide">
        Escursioni facoltative (tour Ovest)
      </p>
      <p className="px-1 text-xs text-slate-500">
        Non incluse nella quota, si pagano in contanti alla guida (eccetto i voli panoramici, anche con carta).
      </p>
      {excursions.map((e) => (
        <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-900">{e.title}</p>
            <span className="text-sm font-semibold text-emerald-600">{e.price}</span>
          </div>
          <p className="text-xs text-slate-400">{e.day}</p>
          {e.description && <p className="text-sm text-slate-600 mt-1">{e.description}</p>}
          {e.recommendation && (
            <p className="text-sm text-sky-800 bg-sky-50 rounded-lg p-2 mt-2">💡 {e.recommendation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
