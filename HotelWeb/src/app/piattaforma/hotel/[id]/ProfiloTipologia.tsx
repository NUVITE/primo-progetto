"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { CATALOGO_MODULI } from "@/lib/moduli";
import { nomeTipologia } from "@/lib/tipologie";
import { FUNZIONI } from "@/lib/funzioniRegole";
import type { anteprimaProfilo } from "@/lib/profili";
import { azioneApplicaProfilo } from "../actions";

type Anteprima = Awaited<ReturnType<typeof anteprimaProfilo>>;
const nomeModulo = (m: string) => CATALOGO_MODULI.find((c) => c.modulo === m)?.nome ?? m;
const MODALITA = { titolare: "titolare unico (un solo utente che fa tutto)", ruoli: "più utenti con ruoli" } as const;

/** Profilo di partenza della tipologia: cosa cambierebbe e applicazione con conferma. */
export function ProfiloTipologia({ hotelId, anteprima }: { hotelId: number; anteprima: Anteprima }) {
  const router = useRouter();
  const [conferma, setConferma] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; testo: string } | null>(null);
  const { profilo, differenze: d, stato } = anteprima;

  async function applica() {
    setBusy(true);
    setMsg(null);
    try {
      await sbusta(azioneApplicaProfilo(hotelId));
      setConferma(false);
      setMsg({ ok: true, testo: "Profilo applicato." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, testo: e instanceof Error ? e.message : "Errore imprevisto." });
    } finally {
      setBusy(false);
    }
  }

  const righe = [
    ...d.moduliDaAccendere.map((m) => `Accende il modulo ${nomeModulo(m)}`),
    ...d.moduliDaSpegnere.map((m) => `Spegne il modulo ${nomeModulo(m)} (i dati restano)`),
    ...(d.modalita ? [`Utenti: ${MODALITA[d.modalita]}`] : []),
    ...d.trattamentiDaAttivare.map((t) => `Offre il trattamento "${t}"`),
    ...d.trattamentiDaDisattivare.map((t) => `Non offre più il trattamento "${t}" nelle nuove prenotazioni`),
    ...d.funzioniDaSpegnere.map((f) => `Spegne la funzione ${FUNZIONI[f].nome} (i dati restano)`),
    ...d.funzioniDaAccendere.map((f) => `Accende la funzione ${FUNZIONI[f as keyof typeof FUNZIONI]?.nome ?? f}`),
  ];

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-violet-200 bg-white p-4 sm:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-violet-700">Profilo della tipologia: {nomeTipologia(anteprima.tipologia)}</h2>
      <p className="text-sm text-stone-700">{profilo.descrizione}</p>
      {msg && <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${msg.ok ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>{msg.testo}</p>}
      {d.titolareImpossibile && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Il profilo prevede un solo titolare, ma nell&apos;hotel ci sono {stato.utenti} utenti: la gestione resta a ruoli finché non restano solo in uno.
        </p>
      )}
      {d.nessunaModifica ? (
        <p className="text-sm font-semibold text-emerald-700">La struttura è già impostata come il profilo.</p>
      ) : (
        <>
          <p className="text-sm text-stone-600">Applicando il profilo:</p>
          <ul className="list-disc pl-5 text-sm text-stone-800">
            {righe.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="text-xs text-stone-500">Il modulo Sale ed eventi non cambia. Niente si cancella: dopo si può modificare tutto voce per voce.</p>
          {conferma ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Confermi?</span>
              <button type="button" disabled={busy} onClick={applica} className="rounded-md bg-violet-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
                Sì, applica il profilo
              </button>
              <button type="button" onClick={() => setConferma(false)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
                No
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConferma(true)} className="self-start rounded-md border border-violet-300 px-3 py-1.5 text-sm font-semibold text-violet-800 hover:bg-violet-50">
              Applica il profilo
            </button>
          )}
        </>
      )}
    </section>
  );
}
