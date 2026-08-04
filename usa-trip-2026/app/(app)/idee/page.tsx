import { Lightbulb } from "lucide-react";
import { prisma } from "@/lib/db";
import { ElencoIdee, type IdeaConGiorno } from "@/components/ElencoIdee";

export default async function IdeePage() {
  const idee = (await prisma.suggestion.findMany({
    orderBy: [{ tripDay: { dayNumber: "asc" } }, { order: "asc" }],
    include: { tripDay: { select: { dayNumber: true, date: true, location: true } } },
  })) as IdeaConGiorno[];

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-clay-600 px-5 py-4 text-white shadow-sm">
        <h1 className="flex items-center gap-2 text-[20px] font-extrabold leading-tight">
          <Lightbulb size={22} strokeWidth={2.1} />
          Tutte le idee in più
        </h1>
        <p className="mt-1.5 text-[14px] leading-snug text-clay-50">
          Le {idee.length} proposte che ho cercato sul web, tutte insieme e filtrabili. Le stesse le
          trovate anche dentro la giornata a cui si riferiscono.
        </p>
      </div>

      <ElencoIdee idee={idee} />

      <p className="rounded-xl bg-sand-100 px-4 py-3 text-[13px] leading-snug text-ink-500">
        Non fanno parte del programma dell&apos;agenzia: sono ricerche mie, verificate ad agosto
        2026. Orari e prezzi possono cambiare, controllateli sul posto.
      </p>
    </div>
  );
}
