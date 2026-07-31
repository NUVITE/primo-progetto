import Link from "next/link";
import { prisma } from "@/lib/db";
import { currentTripDayNumber, daysUntilTrip } from "@/lib/trip";
import { DayView } from "@/components/DayView";

async function getDay(dayNumber: number) {
  return prisma.tripDay.findUnique({
    where: { dayNumber },
    include: { activities: { orderBy: { order: "asc" } }, meals: true },
  });
}

export default async function HomePage() {
  const todayNumber = currentTripDayNumber();

  if (todayNumber === null) {
    const remaining = daysUntilTrip();
    const firstDay = await getDay(1);
    return (
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          {remaining > 0 ? (
            <>
              <p className="text-3xl font-bold text-sky-600">{remaining}</p>
              <p className="text-slate-600">
                {remaining === 1 ? "giorno alla partenza!" : "giorni alla partenza!"}
              </p>
            </>
          ) : (
            <p className="text-slate-600 font-medium">Il viaggio è terminato. Che ricordi! 🎉</p>
          )}
        </div>
        {remaining > 0 && firstDay && (
          <>
            <p className="px-1 text-sm font-medium text-slate-500">Il programma del primo giorno:</p>
            <DayView day={firstDay} />
          </>
        )}
      </div>
    );
  }

  const today = await getDay(todayNumber);
  const tomorrow = todayNumber < 15 ? await getDay(todayNumber + 1) : null;

  return (
    <div className="p-4 space-y-6">
      <section>
        <p className="px-1 mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">Oggi</p>
        {today && <DayView day={today} editable />}
      </section>

      {tomorrow && (
        <section>
          <p className="px-1 mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Anteprima di domani — organizzatevi stasera
          </p>
          <DayView day={tomorrow} />
        </section>
      )}

      <Link
        href="/itinerario"
        className="block text-center text-sm font-medium text-sky-600 bg-white border border-slate-200 rounded-xl py-2.5"
      >
        Vedi tutto l&apos;itinerario →
      </Link>
    </div>
  );
}
