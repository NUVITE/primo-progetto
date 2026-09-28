"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { effettuaLogout } from "./logout-action";

/**
 * Menu a tendina per schermi stretti. Il layout resta montato tra una pagina e l'altra, quindi
 * il menu va chiuso esplicitamente al click su una voce, altrimenti resterebbe aperto.
 */
export function MenuMobile({ voci, descrizioneUtente }: { voci: { href: string; label: string }[]; descrizioneUtente: string }) {
  const [aperto, setAperto] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={aperto ? "Chiudi menu" : "Apri menu"}
        aria-expanded={aperto}
        onClick={() => setAperto((a) => !a)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 text-lg text-stone-700"
      >
        {aperto ? "✕" : "☰"}
      </button>
      {aperto && (
        <div className="absolute inset-x-0 top-14 z-40 border-b border-stone-200 bg-white px-3 pb-3 shadow-lg">
          <nav className="flex flex-col py-2">
            {voci.map((v) => {
              const attiva = v.href === "/" ? pathname === "/" : pathname.startsWith(v.href);
              return (
                <Link
                  key={v.href}
                  href={v.href}
                  onClick={() => setAperto(false)}
                  className={`rounded-md px-3 py-2.5 text-sm font-semibold ${attiva ? "bg-teal-50 text-teal-800" : "text-stone-700"}`}
                >
                  {v.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-between border-t border-stone-200 pt-3">
            <span className="text-sm text-stone-600">{descrizioneUtente}</span>
            <form action={effettuaLogout}>
              <button type="submit" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700">
                Esci
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
