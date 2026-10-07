"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ChevronDown, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, UserRound, X } from "lucide-react";
import type { Permesso } from "@/lib/permessi";
import type { Modulo } from "@/lib/moduli";
import { effettuaLogout } from "./logout-action";
import { HotelSwitcher } from "./HotelSwitcher";
import { COOKIE_BARRA, menuVisibile, voceAttiva, type GruppoMenu, type PreferenzeBarra } from "./menu";
import { PERMESSI } from "@/lib/permessi";
import { AvvisiAdempimenti } from "./AvvisiAdempimenti";
import { unitaDi } from "@/lib/tipologie";

export type DatiBarra = {
  nomeUtente: string;
  ruoloNome: string;
  superAdmin: boolean;
  permessi: Permesso[];
  moduli: Modulo[];
  hotelId: number;
  hotelNome: string;
  hotels: { id: number; nome: string }[];
  tipologia: string;
  funzioniSpente: string[];
};

function salvaPreferenze(p: PreferenzeBarra) {
  document.cookie = `${COOKIE_BARRA}=${encodeURIComponent(JSON.stringify(p))}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Cornice dell'app per l'utente loggato: barra laterale fissa da lg in su (riducibile a sole
 * icone), barra in alto + pannello a scomparsa sotto lg.
 */
export function Cornice({ dati, preferenze, children }: { dati: DatiBarra; preferenze: PreferenzeBarra; children: ReactNode }) {
  const [pref, setPref] = useState(preferenze);
  const [pannelloAperto, setPannelloAperto] = useState(false);
  const gruppi = menuVisibile(dati.permessi, dati.superAdmin, dati.moduli, dati.funzioniSpente, unitaDi(dati.tipologia));

  function aggiorna(p: Partial<PreferenzeBarra>) {
    const nuove = { ...pref, ...p };
    setPref(nuove);
    salvaPreferenze(nuove);
  }

  return (
    <div className="flex min-h-screen w-full">
      <aside
        className={`barra-${pref.tema} sticky top-0 z-40 hidden h-screen flex-shrink-0 flex-col lg:flex print:hidden ${pref.compatta ? "w-16" : "w-64"}`}
        style={{ background: "var(--sb-bg)", color: "var(--sb-fg)" }}
      >
        <ContenutoBarra dati={dati} gruppi={gruppi} pref={pref} aggiorna={aggiorna} compatta={pref.compatta} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-stone-200 bg-white px-3 lg:hidden print:hidden">
          <button
            type="button"
            aria-label="Apri menu"
            onClick={() => setPannelloAperto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-300 text-stone-700"
          >
            <Menu size={18} />
          </button>
          <span className="truncate font-bold">{dati.hotelNome}</span>
        </header>
        <div className="print:hidden"><AvvisiAdempimenti attivo={dati.permessi.includes(PERMESSI.ADEMPIMENTI_INVIA) || dati.permessi.includes(PERMESSI.PRENOTAZIONI_GESTISCI) || dati.permessi.includes(PERMESSI.QUESTIONARI_VEDI) || dati.permessi.includes(PERMESSI.PORTINERIA)} /></div>
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>

      {pannelloAperto && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <aside
            className={`barra-${pref.tema} flex h-full w-72 max-w-[85vw] flex-col shadow-xl`}
            style={{ background: "var(--sb-bg)", color: "var(--sb-fg)" }}
          >
            <div className="flex justify-end px-2 pt-2">
              <button type="button" aria-label="Chiudi menu" onClick={() => setPannelloAperto(false)} className="rounded-md p-2 hover:bg-[var(--sb-hover)]">
                <X size={18} />
              </button>
            </div>
            <ContenutoBarra
              dati={dati}
              gruppi={gruppi}
              pref={pref}
              aggiorna={aggiorna}
              compatta={false}
              suNavigazione={() => setPannelloAperto(false)}
            />
          </aside>
          <button type="button" aria-label="Chiudi menu" className="flex-1 bg-black/40" onClick={() => setPannelloAperto(false)} />
        </div>
      )}
    </div>
  );
}

function ContenutoBarra({
  dati,
  gruppi,
  pref,
  aggiorna,
  compatta,
  suNavigazione,
}: {
  dati: DatiBarra;
  gruppi: GruppoMenu[];
  pref: PreferenzeBarra;
  aggiorna: (p: Partial<PreferenzeBarra>) => void;
  compatta: boolean;
  suNavigazione?: () => void;
}) {
  const pathname = usePathname();

  function toggleGruppo(id: string) {
    aggiorna({ chiusi: pref.chiusi.includes(id) ? pref.chiusi.filter((c) => c !== id) : [...pref.chiusi, id] });
  }

  return (
    <>
      {/* Hotel attivo */}
      <div className="border-b px-3 py-3" style={{ borderColor: "var(--sb-border)" }}>
        {compatta ? (
          <div
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold"
            style={{ background: "var(--sb-active-bg)", color: "var(--sb-active-fg)" }}
            title={dati.hotelNome}
          >
            {dati.hotelNome.charAt(0)}
          </div>
        ) : (
          <>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--sb-muted)" }}>
              Hotel
            </div>
            {dati.hotels.length > 1 ? (
              <HotelSwitcher hotelId={dati.hotelId} hotels={dati.hotels} largo />
            ) : (
              <div className="truncate font-bold">{dati.hotelNome}</div>
            )}
          </>
        )}
      </div>

      {/* Menu ad albero */}
      {/* In modalità compatta niente overflow: taglierebbe i riquadri a comparsa delle voci. */}
      <nav className={`flex-1 px-2 py-3 ${compatta ? "" : "overflow-y-auto"}`}>
        {gruppi.map((g) => {
          const Icona = g.icona;
          const contieneAttiva = g.voci.some((v) => voceAttiva(v.href, pathname));
          const aperto = contieneAttiva || !pref.chiusi.includes(g.id);
          const accento = g.soloSuperAdmin ? { color: "var(--sb-piattaforma)" } : undefined;

          if (compatta) {
            // Solo icone: le voci del gruppo compaiono in un riquadro al passaggio del mouse (o al focus).
            return (
              <div key={g.id} className="group relative mb-1">
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-center rounded-md hover:bg-[var(--sb-hover)]"
                  style={contieneAttiva ? { background: "var(--sb-active-bg)", color: "var(--sb-active-fg)" } : accento}
                  aria-label={g.label}
                >
                  <Icona size={18} />
                </button>
                <div
                  className={`barra-${pref.tema} invisible absolute left-full top-0 z-50 ml-2 w-52 rounded-lg p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100`}
                  style={{ background: "var(--sb-bg)", color: "var(--sb-fg)" }}
                >
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--sb-muted)" }}>
                    {g.label}
                  </div>
                  {g.voci.map((v) => (
                    <VoceLink key={v.href} voce={v} attiva={voceAttiva(v.href, pathname)} suNavigazione={suNavigazione} />
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={g.id} className="mb-2">
              <button
                type="button"
                onClick={() => toggleGruppo(g.id)}
                aria-expanded={aperto}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-[var(--sb-hover)]"
                style={accento ?? { color: "var(--sb-muted)" }}
              >
                <Icona size={16} />
                <span className="flex-1 text-left">{g.label}</span>
                <ChevronDown size={14} className={`transition-transform ${aperto ? "" : "-rotate-90"}`} />
              </button>
              {aperto && (
                <div className="mt-0.5 flex flex-col gap-0.5 pl-6">
                  {g.voci.map((v) => (
                    <VoceLink key={v.href} voce={v} attiva={voceAttiva(v.href, pathname)} suNavigazione={suNavigazione} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Utente e comandi */}
      <div className="border-t px-2 py-2" style={{ borderColor: "var(--sb-border)" }}>
        {!compatta && (
          <Link href="/profilo" title="Il mio profilo: password e dispositivi" className="block rounded-md px-2 pb-2 hover:bg-[var(--sb-hover)]">
            <div className="truncate text-sm font-semibold">{dati.nomeUtente}</div>
            <div className="truncate text-xs" style={{ color: dati.superAdmin ? "var(--sb-piattaforma)" : "var(--sb-muted)" }}>
              {dati.ruoloNome}
            </div>
          </Link>
        )}
        <div className={`flex ${compatta ? "flex-col items-center" : "items-center"} gap-1`}>
          {compatta && (
            <Link href="/profilo" title="Il mio profilo" aria-label="Il mio profilo" className="rounded-md p-2 hover:bg-[var(--sb-hover)]">
              <UserRound size={16} />
            </Link>
          )}
          <form action={effettuaLogout} className={compatta ? "" : "flex-1"}>
            <button
              type="submit"
              title="Esci"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-[var(--sb-hover)] ${compatta ? "" : "w-full"}`}
            >
              <LogOut size={16} />
              {!compatta && "Esci"}
            </button>
          </form>
          <button
            type="button"
            title={pref.tema === "scuro" ? "Barra chiara" : "Barra scura"}
            aria-label={pref.tema === "scuro" ? "Barra chiara" : "Barra scura"}
            onClick={() => aggiorna({ tema: pref.tema === "scuro" ? "chiaro" : "scuro" })}
            className="rounded-md p-2 hover:bg-[var(--sb-hover)]"
          >
            {pref.tema === "scuro" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {!suNavigazione && (
            <button
              type="button"
              title={compatta ? "Espandi la barra" : "Riduci a icone"}
              aria-label={compatta ? "Espandi la barra" : "Riduci a icone"}
              onClick={() => aggiorna({ compatta: !compatta })}
              className="rounded-md p-2 hover:bg-[var(--sb-hover)]"
            >
              {compatta ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function VoceLink({ voce, attiva, suNavigazione }: { voce: { href: string; label: string }; attiva: boolean; suNavigazione?: () => void }) {
  return (
    <Link
      href={voce.href}
      onClick={suNavigazione}
      aria-current={attiva ? "page" : undefined}
      className="block rounded-md px-2 py-1.5 text-sm hover:bg-[var(--sb-hover)]"
      style={attiva ? { background: "var(--sb-active-bg)", color: "var(--sb-active-fg)", fontWeight: 600 } : undefined}
    >
      {voce.label}
    </Link>
  );
}
