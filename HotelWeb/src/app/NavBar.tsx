import Link from "next/link";
import type { UtenteSessione } from "@/lib/auth";
import { effettuaLogout } from "./logout-action";
import { HotelSwitcher } from "./HotelSwitcher";
import { MenuMobile } from "./MenuMobile";

const VOCI = [
  { href: "/", label: "Situazione camere", ruoli: ["ADMIN", "RECEZIONE"] as const },
  { href: "/prenotazioni", label: "Prenotazioni", ruoli: ["ADMIN", "RECEZIONE"] as const },
  { href: "/camere/gestione", label: "Gestione camere", ruoli: ["ADMIN"] as const },
  { href: "/servizi", label: "Servizi", ruoli: ["ADMIN"] as const },
  { href: "/utenti", label: "Utenti", ruoli: ["ADMIN"] as const },
];

export function NavBar({ utente }: { utente: UtenteSessione }) {
  const voci = VOCI.filter((v) => (v.ruoli as readonly string[]).includes(utente.ruolo)).map(({ href, label }) => ({ href, label }));
  const ruolo = utente.ruolo === "ADMIN" ? "Amministratore" : "Reception";

  return (
    <div className="relative flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-1">
        <span className="mr-2 min-w-0 truncate font-bold lg:mr-4">
          {utente.hotels.length > 1 ? (
            <HotelSwitcher hotelId={utente.hotelId} hotels={utente.hotels} />
          ) : (
            utente.hotelNome
          )}
        </span>
        <nav className="hidden items-center gap-1 lg:flex">
          {voci.map((v) => (
            <Link key={v.href} href={v.href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold text-stone-700 hover:bg-stone-100">
              {v.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="hidden items-center gap-3 lg:flex">
        <span className="hidden whitespace-nowrap text-sm text-stone-600 xl:inline">
          {utente.nome} <span className="text-stone-400">·</span> {ruolo}
        </span>
        <form action={effettuaLogout}>
          <button type="submit" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-semibold text-stone-700">
            Esci
          </button>
        </form>
      </div>
      <MenuMobile voci={voci} descrizioneUtente={`${utente.nome} · ${ruolo}`} />
    </div>
  );
}
