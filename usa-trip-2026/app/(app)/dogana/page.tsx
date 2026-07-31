import { prisma } from "@/lib/db";

export default async function DoganaPage() {
  const [phrases, medications] = await Promise.all([
    prisma.customsPhrase.findMany({ orderBy: { order: "asc" } }),
    prisma.medication.findMany(),
  ]);

  const grouped = phrases.reduce<Record<string, typeof phrases>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-6">
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-sm text-sky-900">
        Frasi pronte per i controlli in aeroporto (dogana/immigration). Restate tranquilli: rispondete con
        semplicità, l&apos;ufficiale fa domande di routine.
      </div>

      <section>
        <p className="px-1 mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
          🛂 Cosa dire ai controlli
        </p>
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-800 mb-2">{category}</p>
              <ul className="space-y-2">
                {items.map((p) => (
                  <li key={p.id} className="text-sm">
                    <p className="text-slate-500">{p.italian}</p>
                    <p className="font-medium text-slate-900">🇬🇧 {p.english}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="px-1 mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
          💊 I nostri farmaci
        </p>
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {medications.map((m) => (
            <div key={m.id} className="p-4">
              <p className="font-medium text-slate-900">{m.name}</p>
              <p className="text-sm text-slate-500">{m.reason}</p>
              <p className="text-sm text-slate-800 mt-1">🇬🇧 {m.phraseEn}</p>
            </div>
          ))}
        </div>
        <p className="px-1 mt-2 text-xs text-slate-400">
          Consiglio generale: tenete i farmaci nelle confezioni originali, meglio se nel bagaglio a mano, e per
          quelli su prescrizione portate una copia della ricetta o un referto medico se possibile.
        </p>
      </section>
    </div>
  );
}
