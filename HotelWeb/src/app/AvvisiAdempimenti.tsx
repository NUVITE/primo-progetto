"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Avvisi = { schedine: { quante: number; scadute: number; primaScadenza: string } | null };

/** "tra 5 ore" / "scaduta da 2 ore" rispetto a adesso. */
export function tempoAllaScadenza(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const ore = Math.round(Math.abs(diff) / 3_600_000);
  const quanto = ore < 1 ? "meno di un'ora" : ore === 1 ? "1 ora" : ore < 48 ? `${ore} ore` : `${Math.round(ore / 24)} giorni`;
  return diff >= 0 ? `tra ${quanto}` : `da ${quanto}`;
}

/**
 * Avviso fisso in cima all'app per chi deve inviare le schedine: l'invio è manuale, questo serve a
 * non dimenticarsene (ambra = da inviare, rosso = termine passato). Si aggiorna a ogni cambio
 * pagina e ogni 2 minuti.
 */
export function AvvisiAdempimenti({ attivo }: { attivo: boolean }) {
  const pathname = usePathname();
  const [avvisi, setAvvisi] = useState<Avvisi | null>(null);

  useEffect(() => {
    if (!attivo) return;
    let annullato = false;
    const carica = () =>
      fetch("/api/avvisi", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((a) => !annullato && setAvvisi(a))
        .catch(() => {});
    carica();
    const t = setInterval(carica, 120_000);
    return () => {
      annullato = true;
      clearInterval(t);
    };
  }, [attivo, pathname]);

  const s = avvisi?.schedine;
  if (!s) return null;
  const scaduto = s.scadute > 0;
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-sm sm:px-6 ${
        scaduto ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
    >
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <strong>
          {s.quante} {s.quante === 1 ? "schedina di Polizia da inviare" : "schedine di Polizia da inviare"}
        </strong>
        {scaduto
          ? ` — ${s.scadute === 1 ? "una è" : `${s.scadute} sono`} oltre il termine (scaduto ${tempoAllaScadenza(s.primaScadenza)}).`
          : ` — la prima scade ${tempoAllaScadenza(s.primaScadenza)}.`}
      </span>
      {pathname !== "/schedine" && (
        <Link
          href="/schedine"
          className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-bold text-white shadow-sm pointer-coarse:h-9 ${scaduto ? "bg-red-700 hover:bg-red-800" : "bg-amber-700 hover:bg-amber-800"}`}
        >
          Vai alle schedine
        </Link>
      )}
    </div>
  );
}
