import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarClock, Pill, Plane, Sunrise, Ticket } from "lucide-react";
import { prisma } from "@/lib/db";
import { currentTripDayNumber, daysUntilTrip, TOTAL_DAYS, formatItalianDate } from "@/lib/trip";
import { DayView } from "@/components/DayView";

async function getDay(dayNumber: number) {
  return prisma.tripDay.findUnique({
    where: { dayNumber },
    include: {
      activities: { orderBy: { order: "asc" } },
      meals: true,
      suggestions: { orderBy: { order: "asc" } },
    },
  });
}

function clampDay(n: number) {
  return Math.min(TOTAL_DAYS, Math.max(1, n));
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string }>;
}) {
  const { giorno } = await searchParams;
  const todayNumber = currentTripDayNumber();
  const remaining = daysUntilTrip();

  // Giorno mostrato: quello scelto con le frecce, altrimenti oggi, altrimenti il primo.
  const selected = clampDay(Number(giorno) || todayNumber || 1);
  const isToday = todayNumber !== null && selected === todayNumber;

  const day = await getDay(selected);
  const tomorrow = isToday && selected < TOTAL_DAYS ? await getDay(selected + 1) : null;

  return (
    <div className="space-y-4 p-4">
      {/* Conto alla rovescia e cose da preparare: solo prima della partenza */}
      {remaining > 0 && (
        <Link
          href="/prima-di-partire"
          className="flex items-center gap-3 rounded-2xl bg-brand-800 px-5 py-4 text-white shadow-sm"
        >
          <Plane size={30} strokeWidth={1.8} className="shrink-0 text-brand-200" />
          <span className="flex-1 text-[15px] leading-snug">
            <span className="block text-[26px] font-extrabold leading-none">{remaining}</span>
            {remaining === 1 ? "giorno alla partenza" : "giorni alla partenza"}
            <span className="mt-1 block text-[13px] font-bold text-brand-200">
              Cosa stampare e mettere in valigia →
            </span>
          </span>
        </Link>
      )}

      {/* Selettore del giorno con le frecce */}
      <nav className="flex items-center gap-2" aria-label="Naviga tra i giorni">
        <ArrowLink to={selected - 1} disabled={selected <= 1} direction="prev" />
        <div className="flex-1 rounded-xl bg-white px-3 py-2.5 text-center shadow-sm ring-1 ring-sand-200">
          <p className="text-[12px] font-bold uppercase tracking-wide text-brand-600">
            {isToday ? "Oggi" : `Giorno ${selected} di ${TOTAL_DAYS}`}
          </p>
          {day && (
            <p className="text-[15px] font-extrabold capitalize text-ink-900">
              {formatItalianDate(day.date)}
            </p>
          )}
        </div>
        <ArrowLink to={selected + 1} disabled={selected >= TOTAL_DAYS} direction="next" />
      </nav>

      {todayNumber !== null && !isToday && (
        <Link
          href="/"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 py-2 text-[14px] font-bold text-brand-700"
        >
          <Sunrise size={16} strokeWidth={2.4} />
          Torna alla giornata di oggi
        </Link>
      )}

      {day && <DayView day={day} editable />}

      {/* Anteprima della giornata di domani, per prepararsi la sera prima */}
      {tomorrow && (
        <section>
          <h2 className="mb-2.5 mt-6 flex items-center gap-2 px-1 text-[15px] font-extrabold text-ink-600">
            <CalendarClock size={18} strokeWidth={2.2} className="text-clay-600" />
            Domani — preparatevi stasera
          </h2>
          <DayView day={tomorrow} />
        </section>
      )}

      {/* Scorciatoie alle schede che servono di rado ma servono subito */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link
          href="/dogana"
          className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-3.5 text-[15px] font-bold text-ink-900 shadow-sm ring-1 ring-sand-200"
        >
          <Pill size={19} strokeWidth={2.1} className="text-clay-600" />
          Dogana e farmaci
        </Link>
        <Link
          href="/escursioni"
          className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-3.5 text-[15px] font-bold text-ink-900 shadow-sm ring-1 ring-sand-200"
        >
          <Ticket size={19} strokeWidth={2.1} className="text-clay-600" />
          Escursioni extra
        </Link>
      </div>
    </div>
  );
}

function ArrowLink({
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
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-sand-300"
      >
        <Icon size={24} strokeWidth={2.4} />
      </span>
    );
  }

  return (
    <Link
      href={`/?giorno=${to}`}
      aria-label={label}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm ring-1 ring-sand-200 active:bg-brand-50"
    >
      <Icon size={24} strokeWidth={2.4} />
    </Link>
  );
}
