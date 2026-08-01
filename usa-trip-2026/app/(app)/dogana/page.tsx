import { Languages, Pill, ShieldQuestionMark } from "lucide-react";
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
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-brand-800 px-5 py-4 text-white shadow-sm">
        <h1 className="flex items-center gap-2 text-[20px] font-extrabold leading-tight">
          <ShieldQuestionMark size={22} strokeWidth={2.2} className="text-brand-200" />
          Controlli in aeroporto
        </h1>
        <p className="mt-1.5 text-[14px] leading-snug text-brand-100">
          Sono domande di routine, le fanno a tutti. Rispondete con calma e semplicità: non serve
          parlare bene inglese, basta farsi capire. Se non capite, dite pure di ripetere.
        </p>
      </div>

      <section>
        <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[13px] font-extrabold uppercase tracking-widest text-ink-400">
          <Languages size={16} strokeWidth={2.4} />
          Cosa dire
        </h2>
        <div className="space-y-3">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand-200">
              <p className="text-[13px] font-extrabold uppercase tracking-wide text-clay-600">
                {category}
              </p>
              <ul className="mt-3 space-y-3.5">
                {items.map((p) => (
                  <li key={p.id}>
                    <p className="text-[14px] italic leading-snug text-ink-400">{p.italian}</p>
                    <p className="mt-0.5 text-[17px] font-bold leading-snug text-ink-900">
                      {p.english}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[13px] font-extrabold uppercase tracking-widest text-ink-400">
          <Pill size={16} strokeWidth={2.4} />
          I nostri farmaci
        </h2>
        <div className="divide-y divide-sand-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sand-200">
          {medications.map((m) => (
            <div key={m.id} className="p-4">
              <p className="text-[16px] font-bold text-ink-900">{m.name}</p>
              <p className="text-[13px] font-medium text-clay-600">{m.reason}</p>
              <p className="mt-1.5 text-[15px] leading-snug text-ink-600">{m.phraseEn}</p>
            </div>
          ))}
        </div>
        <p className="mt-2.5 rounded-xl bg-clay-50 px-4 py-3 text-[14px] leading-snug text-clay-700">
          Tenete i farmaci nelle <strong>confezioni originali</strong>, meglio se nel bagaglio a
          mano. Per quelli su prescrizione, portate una copia della ricetta o un referto medico:
          se ve li chiedono, mostrarli chiude il discorso in dieci secondi.
        </p>
      </section>
    </div>
  );
}
