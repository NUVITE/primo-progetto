import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { TOTAL_DAYS } from "@/lib/trip";
import { DayView } from "@/components/DayView";

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ dayNumber: string }>;
}) {
  const { dayNumber } = await params;
  const n = Number(dayNumber);

  const day = await prisma.tripDay.findUnique({
    where: { dayNumber: n },
    include: { activities: { orderBy: { order: "asc" } }, meals: true },
  });

  if (!day) notFound();

  return (
    <div className="space-y-3.5 p-4">
      <nav className="flex items-center gap-2" aria-label="Naviga tra i giorni">
        <Step to={n - 1} disabled={n <= 1} direction="prev" />
        <Link
          href="/itinerario"
          className="flex-1 rounded-xl bg-white py-2.5 text-center text-[14px] font-bold text-brand-700 shadow-sm ring-1 ring-sand-200"
        >
          Tutti i giorni
        </Link>
        <Step to={n + 1} disabled={n >= TOTAL_DAYS} direction="next" />
      </nav>

      <DayView day={day} editable />
    </div>
  );
}

function Step({
  to,
  disabled,
  direction,
}: {
  to: number;
  disabled: boolean;
  direction: "prev" | "next";
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label = direction === "prev" ? "Giorno precedente" : "Giorno successivo";

  if (disabled) {
    return (
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-sand-300"
      >
        <Icon size={23} strokeWidth={2.4} />
      </span>
    );
  }

  return (
    <Link
      href={`/itinerario/${to}`}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-sand-200 active:bg-brand-50"
    >
      <Icon size={23} strokeWidth={2.4} />
    </Link>
  );
}
