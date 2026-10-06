"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { paginaPreventivo } from "@/lib/preventivi";
import { azioneAccetta, azioneRifiuta } from "./actions";

type Dati = NonNullable<Awaited<ReturnType<typeof paginaPreventivo>>>;

const TESTI = {
  it: {
    titolo: "Il suo preventivo",
    gentile: "Gentile",
    soggiorno: (n: number) => `${n} ${n === 1 ? "notte" : "notti"}`,
    camere: (n: number) => `${n} ${n === 1 ? "camera" : "camere"}`,
    persone: (a: number, b: number) => `${a} ${a === 1 ? "adulto" : "adulti"}${b ? `, ${b} ${b === 1 ? "bambino" : "bambini"}` : ""} per camera`,
    proposta: "Proposta",
    totale: "Totale",
    aNotte: "a notte per camera",
    tassa: "Tassa di soggiorno esclusa, si paga in hotel.",
    cancellazione: "Cancellazione",
    acconto: (x: string) => `Per confermare le chiederemo un acconto di ${x}.`,
    valido: (d: string) => `Preventivo valido fino al ${d}.`,
    accetto: "Accetto questa proposta",
    conferma: "Confermi? Le terremo la camera e le invieremo le indicazioni per l'acconto.",
    si: "Sì, confermo",
    no: "No",
    rifiuto: "Non mi interessa",
    motivo: "Se vuole, ci dica perché (facoltativo)",
    invia: "Invia",
    accettato: "Grazie! Abbiamo ricevuto la sua conferma: le scriveremo a breve con i dettagli.",
    rifiutato: "Grazie per averci risposto. Speriamo di ospitarla in un'altra occasione.",
    scaduto: "Il preventivo è scaduto. Ci contatti per una nuova proposta.",
    contatti: "Per qualsiasi domanda",
    scelta: "La sua scelta",
    pulizia: "più pulizia finale",
  },
  en: {
    titolo: "Your quotation",
    gentile: "Dear",
    soggiorno: (n: number) => `${n} ${n === 1 ? "night" : "nights"}`,
    camere: (n: number) => `${n} ${n === 1 ? "room" : "rooms"}`,
    persone: (a: number, b: number) => `${a} ${a === 1 ? "adult" : "adults"}${b ? `, ${b} ${b === 1 ? "child" : "children"}` : ""} per room`,
    proposta: "Offer",
    totale: "Total",
    aNotte: "per night per room",
    tassa: "City tax not included, to be paid at the hotel.",
    cancellazione: "Cancellation",
    acconto: (x: string) => `To confirm we will ask for a deposit of ${x}.`,
    valido: (d: string) => `This quotation is valid until ${d}.`,
    accetto: "I accept this offer",
    conferma: "Confirm? We will hold the room and send you the deposit details.",
    si: "Yes, confirm",
    no: "No",
    rifiuto: "Not interested",
    motivo: "If you like, tell us why (optional)",
    invia: "Send",
    accettato: "Thank you! We have received your confirmation: we will write to you shortly with the details.",
    rifiutato: "Thank you for your reply. We hope to welcome you another time.",
    scaduto: "This quotation has expired. Please contact us for a new offer.",
    contatti: "For any question",
    scelta: "Your choice",
    pulizia: "plus final cleaning",
  },
};

/** Preventivo online per l'ospite: proposte, condizioni, accettazione o rifiuto. */
export function PreventivoOspite({ codice, iniziale }: { codice: string; iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [conferma, setConferma] = useState<number | null>(null);
  const [rifiuto, setRifiuto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const t = TESTI[d.lingua] ?? TESTI.it;
  const loc = d.lingua === "en" ? "en-GB" : "it-IT";
  const eur = (n: number) => n.toLocaleString(loc, { style: "currency", currency: "EUR" });
  const data = (g: string) => new Date(`${g}T12:00:00Z`).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const aperto = d.stato === "visto" || d.stato === "inviato";

  async function prova(fn: () => Promise<Dati>) {
    setErrore(null);
    setBusy(true);
    try {
      setD(await fn());
      setConferma(null);
      setRifiuto(null);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-4 text-stone-900">
      <header className="mb-4 text-center">
        <p className="text-sm uppercase tracking-widest text-stone-500">{d.hotel.nome}</p>
        <h1 className="text-2xl font-bold">{t.titolo}</h1>
        <p className="mt-1 text-stone-700">
          {t.gentile} {d.nome}: {data(d.dal)} → {data(d.al)} · {t.soggiorno(d.notti)} · {t.camere(d.camere)} · {t.persone(d.adulti, d.bambini)}
        </p>
      </header>
      {d.messaggio && <p className="mb-4 rounded-lg bg-teal-50 p-3 text-teal-900">{d.messaggio}</p>}
      {errore && <p className="mb-4 rounded-lg bg-red-50 p-3 font-semibold text-red-800">{errore}</p>}
      {d.stato === "accettato" && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> {t.accettato}
        </p>
      )}
      {d.stato === "rifiutato" && <p className="mb-4 rounded-lg bg-stone-100 p-3">{t.rifiutato}</p>}
      {d.stato === "scaduto" && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-amber-900">{t.scaduto}</p>}

      <div className="flex flex-col gap-3">
        {d.proposte.map((p, i) => {
          const accettata = d.propostaAccettataId === p.id;
          return (
            <section key={p.id} className={`rounded-xl border bg-white p-4 shadow-sm ${accettata ? "border-emerald-400" : "border-stone-200"}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {t.proposta} {i + 1}
                {accettata && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 normal-case text-emerald-800">✓ {t.scelta}</span>}
              </p>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">
                  {p.tipo} · {p.trattamento}
                </h2>
                <span className="text-right">
                  <span className="block text-xl font-bold">{eur(p.prezzo)}</span>
                  {p.pulizia > 0 && (
                    <span className="block text-xs text-stone-600">
                      {t.pulizia} {eur(p.pulizia)}
                    </span>
                  )}
                  <span className="text-xs text-stone-600">
                    {eur(p.aNotte)} {t.aNotte}
                  </span>
                </span>
              </div>
              {p.nota && <p className="mt-1 text-sm text-stone-700">{p.nota}</p>}
              {p.politica.length > 0 && (
                <div className="mt-2 text-xs text-stone-600">
                  <p className="font-semibold">{t.cancellazione}</p>
                  <ul className="list-disc pl-4">
                    {p.politica.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aperto &&
                (conferma === p.id ? (
                  <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm">
                    <p>{t.conferma}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" disabled={busy} className="rounded-lg bg-teal-700 px-4 py-2 font-bold text-white disabled:opacity-50" onClick={() => prova(() => sbusta(azioneAccetta(codice, p.id)))}>
                        {t.si}
                      </button>
                      <button type="button" className="rounded-lg border border-stone-300 px-4 py-2" onClick={() => setConferma(null)}>
                        {t.no}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="mt-3 w-full rounded-lg bg-teal-700 py-2.5 font-bold text-white" onClick={() => setConferma(p.id)}>
                    {t.accetto}
                  </button>
                ))}
            </section>
          );
        })}
      </div>

      <div className="mt-4 text-sm text-stone-600">
        <p>{t.tassa}</p>
        {d.accontoRichiesto !== null && <p>{t.acconto(eur(d.accontoRichiesto))}</p>}
        <p>{t.valido(data(d.validoFino))}</p>
      </div>

      {aperto && (
        <div className="mt-4">
          {rifiuto === null ? (
            <button type="button" className="text-sm font-semibold text-stone-600 underline" onClick={() => setRifiuto("")}>
              {t.rifiuto}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <input className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" maxLength={300} placeholder={t.motivo} value={rifiuto} onChange={(e) => setRifiuto(e.target.value)} />
              <div className="flex gap-2">
                <button type="button" disabled={busy} className="rounded-lg border border-stone-400 px-4 py-2 text-sm font-semibold" onClick={() => prova(() => sbusta(azioneRifiuta(codice, rifiuto)))}>
                  {t.invia}
                </button>
                <button type="button" className="text-sm" onClick={() => setRifiuto(null)}>
                  {t.no}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <footer className="mt-8 border-t border-stone-200 pt-3 text-center text-sm text-stone-600">
        {t.contatti}: {[d.hotel.telefono, d.hotel.email].filter(Boolean).join(" · ")}
        {d.hotel.indirizzo && <span className="block">{d.hotel.indirizzo}</span>}
      </footer>
    </main>
  );
}
