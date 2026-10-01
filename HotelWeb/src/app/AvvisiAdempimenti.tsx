"use client";

import { BarChart3, ShieldAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Avvisi = {
  schedine: { quante: number; scadute: number; primaScadenza: string } | null;
  istat: { sistema: string; giorni: number; scaduti: number; primaScadenza: string; dal: string } | null;
};

/** "tra 5 ore" / "scaduta da 2 ore" rispetto a adesso. */
export function tempoAllaScadenza(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const ore = Math.round(Math.abs(diff) / 3_600_000);
  const quanto = ore < 1 ? "meno di un'ora" : ore === 1 ? "1 ora" : ore < 48 ? `${ore} ore` : `${Math.round(ore / 24)} giorni`;
  return diff >= 0 ? `tra ${quanto}` : `da ${quanto}`;
}

/**
 * Avvisi fissi in cima all'app per chi deve inviare schedine e ISTAT: l'invio è manuale, questo serve a
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
  const i = avvisi?.istat;
  if (!s && !i) return null;
  const it = (g: string) => g.split("-").reverse().join("/");
  return (
    <>
      {s && (
        <Barra
          scaduto={s.scadute > 0}
          icona={ShieldAlert}
          link={pathname !== "/schedine" ? { href: "/schedine", testo: "Vai alle schedine" } : null}
        >
          <strong>
            {s.quante} {s.quante === 1 ? "schedina di Polizia da inviare" : "schedine di Polizia da inviare"}
          </strong>
          {s.scadute > 0
            ? ` — ${s.scadute === 1 ? "una è" : `${s.scadute} sono`} oltre il termine (scaduto ${tempoAllaScadenza(s.primaScadenza)}).`
            : ` — la prima scade ${tempoAllaScadenza(s.primaScadenza)}.`}
        </Barra>
      )}
      {i && (
        <Barra scaduto={i.scaduti > 0} icona={BarChart3} link={pathname !== "/istat" ? { href: "/istat", testo: "Vai all'ISTAT" } : null}>
          <strong>
            ISTAT: {i.giorni} {i.giorni === 1 ? "giorno da comunicare" : "giorni da comunicare"}
          </strong>{" "}
          (dal {it(i.dal)})
          {i.scaduti > 0
            ? ` — ${i.scaduti === 1 ? "uno è" : `${i.scaduti} sono`} oltre il termine.`
            : ` — termine ${it(i.primaScadenza)}.`}
        </Barra>
      )}
    </>
  );
}

function Barra({ scaduto, icona: Icona, link, children }: { scaduto: boolean; icona: LucideIcon; link: { href: string; testo: string } | null; children: ReactNode }) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-sm sm:px-6 ${
        scaduto ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
    >
      <Icona className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">{children}</span>
      {link && (
        <Link
          href={link.href}
          className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-bold text-white shadow-sm pointer-coarse:h-9 ${scaduto ? "bg-red-700 hover:bg-red-800" : "bg-amber-700 hover:bg-amber-800"}`}
        >
          {link.testo}
        </Link>
      )}
    </div>
  );
}
