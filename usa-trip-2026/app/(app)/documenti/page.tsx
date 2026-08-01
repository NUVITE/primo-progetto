import {
  BadgeCheck,
  BookUser,
  ChevronRight,
  FileText,
  HeartPulse,
  Hotel,
  Plane,
  Ticket,
  Users,
  Van,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/dal";

const CATEGORY: Record<string, { label: string; Icon: React.ElementType }> = {
  esta: { label: "ESTA — da mostrare alla frontiera", Icon: BadgeCheck },
  passaporto: { label: "Passaporto", Icon: BookUser },
  volo: { label: "Voli", Icon: Plane },
  hotel: { label: "Hotel", Icon: Hotel },
  assicurazione: { label: "Assicurazione", Icon: HeartPulse },
  biglietto: { label: "Biglietti e voucher", Icon: Ticket },
  transfer: { label: "Transfer", Icon: Van },
  altro: { label: "Programma", Icon: FileText },
};

/** L'ESTA va mostrata per prima: e' il documento che serve appena scesi dall'aereo. */
const CATEGORY_ORDER = ["esta", "passaporto", "volo", "hotel", "biglietto", "transfer", "assicurazione", "altro"];

function byCategory(a: { category: string }, b: { category: string }) {
  const ia = CATEGORY_ORDER.indexOf(a.category);
  const ib = CATEGORY_ORDER.indexOf(b.category);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}

export default async function DocumentiPage() {
  const family = await getCurrentFamily();
  const [commonRaw, personalRaw] = await Promise.all([
    prisma.document.findMany({ where: { familyId: null } }),
    prisma.document.findMany({ where: { familyId: family.id } }),
  ]);
  const common = commonRaw.sort(byCategory);
  const personal = personalRaw.sort(byCategory);

  function Group({
    title,
    subtitle,
    Icon,
    docs,
  }: {
    title: string;
    subtitle: string;
    Icon: React.ElementType;
    docs: typeof common;
  }) {
    if (docs.length === 0) return null;
    return (
      <section>
        <h2 className="mb-2.5 flex items-center gap-2 px-1">
          <Icon size={16} strokeWidth={2.4} className="text-ink-400" />
          <span className="text-[13px] font-extrabold uppercase tracking-widest text-ink-400">
            {title}
          </span>
        </h2>
        <p className="mb-2 px-1 text-[13px] text-ink-400">{subtitle}</p>
        <div className="divide-y divide-sand-200 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sand-200">
          {docs.map((d) => {
            const cat = CATEGORY[d.category] ?? CATEGORY.altro;
            return (
              <a
                key={d.id}
                href={`/documenti/${d.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 active:bg-sand-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <cat.Icon size={19} strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold leading-snug text-ink-900">
                    {d.title}
                  </span>
                  <span className="block text-[13px] text-ink-400">{cat.label}</span>
                </span>
                <ChevronRight size={20} strokeWidth={2.4} className="shrink-0 text-sand-300" />
              </a>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <Group
        title="Documenti comuni"
        subtitle="Uguali per tutte e quattro le famiglie."
        Icon={Users}
        docs={common}
      />
      <Group
        title={family.displayName}
        subtitle="Visibili solo a voi: nessuna altra famiglia può aprirli."
        Icon={FileText}
        docs={personal}
      />

      {personal.length === 0 && (
        <p className="rounded-xl bg-clay-50 px-4 py-3 text-[14px] leading-snug text-clay-700">
          I documenti personali della vostra famiglia non sono ancora stati caricati. Appena
          arrivano i PDF (voli, voucher, assicurazione) compariranno qui.
        </p>
      )}
    </div>
  );
}
