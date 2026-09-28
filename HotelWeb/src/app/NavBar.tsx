import Link from "next/link";
import type { UtenteSessione } from "@/lib/auth";
import { effettuaLogout } from "./logout-action";
import { HotelSwitcher } from "./HotelSwitcher";

const VOCI = [
  { href: "/", label: "Situazione camere", ruoli: ["ADMIN", "RECEZIONE"] as const },
  { href: "/prenotazioni", label: "Prenotazioni", ruoli: ["ADMIN", "RECEZIONE"] as const },
  { href: "/camere/gestione", label: "Gestione camere", ruoli: ["ADMIN"] as const },
  { href: "/servizi", label: "Servizi", ruoli: ["ADMIN"] as const },
  { href: "/utenti", label: "Utenti", ruoli: ["ADMIN"] as const },
];

export function NavBar({ utente }: { utente: UtenteSessione }) {
  return (
    <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6">
      <div className="flex items-center gap-1">
        <span className="mr-4 font-bold">
          {utente.hotels.length > 1 ? (
            <HotelSwitcher hotelId={utente.hotelId} hotels={utente.hotels} />
          ) : (
            utente.hotelNome
          )}
        </span>
        {VOCI.filter((v) => (v.ruoli as readonly string[]).includes(utente.ruolo)).map((v) => (
          <Link key={v.href} href={v.href} className="rounded-md px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-100">
            {v.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-stone-600">
          {utente.nome} <span className="text-stone-400">·</span> {utente.ruolo === "ADMIN" ? "Amministratore" : "Reception"}
        </span>
        <form action={effettuaLogout}>
          <button type="submit" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700">
            Esci
          </button>
        </form>
      </div>
    </div>
  );
}
