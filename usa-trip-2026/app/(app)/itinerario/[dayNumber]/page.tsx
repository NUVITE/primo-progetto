import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DayView } from "@/components/DayView";

export default async function DayDetailPage({
  params,
}: {
  params: Promise<{ dayNumber: string }>;
}) {
  const { dayNumber } = await params;
  const day = await prisma.tripDay.findUnique({
    where: { dayNumber: Number(dayNumber) },
    include: { activities: { orderBy: { order: "asc" } }, meals: true },
  });

  if (!day) notFound();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between px-1">
        {day.dayNumber > 1 ? (
          <Link href={`/itinerario/${day.dayNumber - 1}`} className="text-sm text-sky-600">
            ← Giorno {day.dayNumber - 1}
          </Link>
        ) : (
          <span />
        )}
        {day.dayNumber < 15 ? (
          <Link href={`/itinerario/${day.dayNumber + 1}`} className="text-sm text-sky-600">
            Giorno {day.dayNumber + 1} →
          </Link>
        ) : (
          <span />
        )}
      </div>
      <DayView day={day} editable />
    </div>
  );
}
