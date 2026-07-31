import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/dal";

const CATEGORY_LABEL: Record<string, string> = {
  volo: "✈️ Voli",
  hotel: "🏨 Hotel",
  assicurazione: "🏥 Assicurazione",
  biglietto: "🎫 Biglietti",
  transfer: "🚐 Transfer",
  altro: "📄 Altro",
};

export default async function DocumentiPage() {
  const family = await getCurrentFamily();
  const [common, personal] = await Promise.all([
    prisma.document.findMany({ where: { familyId: null }, orderBy: { category: "asc" } }),
    prisma.document.findMany({ where: { familyId: family.id }, orderBy: { category: "asc" } }),
  ]);

  function Group({ title, docs }: { title: string; docs: typeof common }) {
    if (docs.length === 0) return null;
    return (
      <section>
        <p className="px-1 mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {docs.map((d) => (
            <a
              key={d.id}
              href={`/documenti/${d.id}/download`}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium text-slate-900">{d.title}</p>
                <p className="text-xs text-slate-500">{CATEGORY_LABEL[d.category] ?? d.category}</p>
              </div>
              <span className="text-sky-600 text-sm">Apri →</span>
            </a>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <Group title="Documenti comuni" docs={common} />
      <Group title={`Documenti personali — ${family.displayName}`} docs={personal} />
      {common.length === 0 && personal.length === 0 && (
        <p className="text-center text-sm text-slate-400 mt-8">
          Nessun documento caricato ancora per questa famiglia.
        </p>
      )}
    </div>
  );
}
