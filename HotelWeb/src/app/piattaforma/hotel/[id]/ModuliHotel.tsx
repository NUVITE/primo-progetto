"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { CATALOGO_MODULI, type Modulo } from "@/lib/moduli";
import { azioneCambiaHotel } from "../../../cambia-hotel-action";
import { azioneImpostaAttivo, azioneImpostaModuli } from "../actions";

export function ModuliHotel({ hotelId, attivo, moduli }: { hotelId: number; attivo: boolean; moduli: Modulo[] }) {
  const router = useRouter();
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confermaDisattiva, setConfermaDisattiva] = useState(false);

  async function esegui(fn: () => Promise<unknown>) {
    setErrore(null);
    setBusy(true);
    try {
      await fn();
      setConfermaDisattiva(false);
      router.refresh();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <section className="flex flex-col gap-3 rounded-xl border border-violet-200 bg-white p-4 sm:p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-700">Stato</h2>
        {errore && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{errore}</p>}
        <p className="text-sm">
          {attivo ? (
            <span className="font-semibold text-emerald-700">Attivo</span>
          ) : (
            <span className="font-semibold text-stone-700">Disattivato: gli utenti dell&apos;hotel non possono accedere.</span>
          )}
        </p>
        {confermaDisattiva ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-red-50 px-3 py-2">
            <span className="text-xs text-red-800">Nessun utente dell&apos;hotel potrà più accedere. Confermi?</span>
            <button
              disabled={busy}
              className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
              onClick={() => esegui(() => sbusta(azioneImpostaAttivo(hotelId, false)))}
            >
              Disattiva
            </button>
            <button className="rounded-md px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-white" onClick={() => setConfermaDisattiva(false)}>
              Annulla
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {attivo ? (
              <button className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10" onClick={() => setConfermaDisattiva(true)}>
                Disattiva hotel
              </button>
            ) : (
              <button
                disabled={busy}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
                onClick={() => esegui(() => sbusta(azioneImpostaAttivo(hotelId, true)))}
              >
                Riattiva hotel
              </button>
            )}
            <form action={azioneCambiaHotel}>
              <input type="hidden" name="hotelId" value={hotelId} />
              <button type="submit" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10">
                Lavora su questo hotel
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-violet-200 bg-white p-4 sm:p-5 lg:col-span-2">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">Moduli attivi</h2>
        <p className="mb-3 text-sm text-stone-600">
          Planning, prenotazioni, camere, servizi, utenti e ruoli sono sempre inclusi. Un modulo spento nasconde menu e permessi collegati.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATALOGO_MODULI.map((m) => {
            const acceso = moduli.includes(m.modulo);
            return (
              <label key={m.modulo} className={`flex items-start gap-2 rounded-md border border-stone-200 p-2 text-sm ${m.disponibile ? "" : "opacity-60"}`}>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-teal-700"
                  checked={acceso}
                  disabled={busy || (!m.disponibile && !acceso)}
                  onChange={(e) =>
                    esegui(() => sbusta(azioneImpostaModuli(hotelId, e.target.checked ? [...moduli, m.modulo] : moduli.filter((x) => x !== m.modulo))))
                  }
                />
                <span>
                  <span className="font-semibold text-stone-800">{m.nome}</span>
                  {!m.disponibile && <span className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-stone-500">in arrivo</span>}
                  <span className="block text-xs text-stone-500">{m.descrizione}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
