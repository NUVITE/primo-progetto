"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PhoneOff, Phone } from "lucide-react";
import { currentTripDayNumber, DAY_TIMEZONE, ITALY_ZONE, TOTAL_DAYS } from "@/lib/trip";

/** Ora corrente in un fuso, formato 24 ore. */
function oraIn(zone: string, now: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zone,
  }).format(now);
}

function oraNumericaIn(zone: string, now: Date) {
  return Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: zone }).format(now)
  );
}

/**
 * Giornata a cui si riferisce l'orologio: quella che si sta guardando, cosi'
 * sfogliando i giorni si vede subito che ore sono nella tappa di quel giorno.
 * Se non si e' su una giornata specifica, vale quella di oggi.
 */
function giornoVisualizzato(pathname: string, giornoParam: string | null): number {
  const daPercorso = pathname.match(/^\/itinerario\/(\d+)/);
  if (daPercorso) return Number(daPercorso[1]);

  if (pathname === "/" && giornoParam) return Number(giornoParam);

  return currentTripDayNumber() ?? 1;
}

export function DoppioOrologio() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [now, setNow] = useState<Date | null>(null);

  // Si parte da null e si popola dopo il montaggio: l'ora del server e quella
  // del telefono non coincidono, e farle divergere in idratazione da' errore.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);

  const n = giornoVisualizzato(pathname, searchParams.get("giorno"));
  const giorno = Math.min(TOTAL_DAYS, Math.max(1, n));
  const fuso = DAY_TIMEZONE[giorno] ?? DAY_TIMEZONE[1];

  if (!now) {
    return <div className="h-[38px]" aria-hidden="true" />;
  }

  const oraItalia = oraNumericaIn(ITALY_ZONE, now);
  // In Italia si puo' chiamare senza svegliare nessuno: dalle 8 alle 22.
  const sePuoChiamare = oraItalia >= 8 && oraItalia < 22;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase leading-none tracking-wide text-brand-200">
          {fuso.place}
        </p>
        <p className="text-[17px] font-extrabold leading-tight tabular-nums">
          {oraIn(fuso.zone, now)}
        </p>
      </div>

      <span className="h-7 w-px bg-white/25" aria-hidden="true" />

      <div className="text-center">
        <p className="text-[10px] font-bold uppercase leading-none tracking-wide text-brand-200">
          Italia
        </p>
        <p className="text-[17px] font-extrabold leading-tight tabular-nums">
          {oraIn(ITALY_ZONE, now)}
        </p>
      </div>

      <span
        title={
          sePuoChiamare
            ? "In Italia sono svegli: potete chiamare"
            : "In Italia e' notte: meglio non chiamare"
        }
        className={sePuoChiamare ? "text-emerald-300" : "text-rose-300"}
      >
        {sePuoChiamare ? (
          <Phone size={15} strokeWidth={2.6} aria-label="In Italia potete chiamare" />
        ) : (
          <PhoneOff size={15} strokeWidth={2.6} aria-label="In Italia e' notte" />
        )}
      </span>
    </div>
  );
}
