"use client";

import { CheckCircle2, Star } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { Lingua } from "@/lib/emailRegole";
import type { paginaQuestionario } from "@/lib/questionari";
import { MAX_COMMENTO, VOCI_QUESTIONARIO, type VoceQuestionario } from "@/lib/questionariRegole";
import { azioneCompila } from "./actions";

type Dati = NonNullable<Awaited<ReturnType<typeof paginaQuestionario>>>;

const TESTI = {
  it: {
    titolo: "Com'è andato il suo soggiorno?",
    gentile: "Gentile",
    intro: "Ci bastano due minuti: il suo parere ci aiuta a migliorare.",
    generale: "Nel complesso",
    obbligatorio: "obbligatorio",
    facoltative: "Se vuole, ci dica anche (facoltativo):",
    nonSo: "non so",
    consiglia: "Ci consiglierebbe ad amici e parenti?",
    si: "Sì",
    no: "No",
    commento: "Qualcosa da dirci? Cosa le è piaciuto, cosa possiamo migliorare",
    invia: "Invia",
    grazie: "Grazie! Abbiamo ricevuto il suo questionario.",
    recensione: "Se il soggiorno le è piaciuto, ci farebbe un grande favore lasciando una recensione:",
    lasciaRecensione: "Lascia una recensione",
    scaduto: "Il questionario non è più disponibile. Per qualsiasi cosa ci scriva pure.",
    contatti: "Per qualsiasi cosa",
    stelle: (n: number) => `${n} ${n === 1 ? "stella" : "stelle"} su 5`,
  },
  en: {
    titolo: "How was your stay?",
    gentile: "Dear",
    intro: "It only takes two minutes: your opinion helps us improve.",
    generale: "Overall",
    obbligatorio: "required",
    facoltative: "If you like, also tell us (optional):",
    nonSo: "n/a",
    consiglia: "Would you recommend us to friends and family?",
    si: "Yes",
    no: "No",
    commento: "Anything to tell us? What you liked, what we can improve",
    invia: "Send",
    grazie: "Thank you! We have received your questionnaire.",
    recensione: "If you enjoyed your stay, it would mean a lot to us if you left a review:",
    lasciaRecensione: "Leave a review",
    scaduto: "This questionnaire is no longer available. Feel free to write to us.",
    contatti: "For anything",
    stelle: (n: number) => `${n} ${n === 1 ? "star" : "stars"} out of 5`,
  },
};

function Stelle({ valore, onChange, etichetta, t }: { valore: number | undefined; onChange: (n: number) => void; etichetta: string; t: (typeof TESTI)["it"] }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={etichetta}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valore === n}
          aria-label={t.stelle(n)}
          className="rounded p-1 hover:bg-amber-50"
          onClick={() => onChange(n)}
        >
          <Star className={`h-8 w-8 ${valore && n <= valore ? "fill-amber-400 text-amber-500" : "text-stone-300"}`} aria-hidden />
        </button>
      ))}
    </div>
  );
}

/** Questionario di gradimento per l'ospite (link dell'email di ringraziamento). */
export function QuestionarioOspite({ codice, iniziale }: { codice: string; iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [lingua, setLingua] = useState<Lingua>(iniziale.lingua);
  const [generale, setGenerale] = useState<number | undefined>();
  const [voti, setVoti] = useState<Partial<Record<VoceQuestionario, number>>>({});
  const [consiglia, setConsiglia] = useState<boolean | null>(null);
  const [commento, setCommento] = useState("");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const t = TESTI[lingua] ?? TESTI.it;
  const loc = lingua === "en" ? "en-GB" : "it-IT";
  const data = (g: string) => new Date(`${g}T12:00:00Z`).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  async function invia() {
    setErrore(null);
    setBusy(true);
    try {
      setD(await sbusta(azioneCompila(codice, { generale: generale ?? 0, voti, consiglia, commento })));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl p-4 text-stone-900">
      <div className="mb-2 flex justify-end gap-2 text-sm">
        {(["it", "en"] as const).map((l) => (
          <button key={l} type="button" className={lingua === l ? "font-bold text-teal-800" : "text-stone-500 underline"} onClick={() => setLingua(l)}>
            {l === "it" ? "Italiano" : "English"}
          </button>
        ))}
      </div>
      <header className="mb-4 text-center">
        <p className="text-sm uppercase tracking-widest text-stone-500">{d.hotel.nome}</p>
        <h1 className="text-2xl font-bold">{t.titolo}</h1>
        <p className="mt-1 text-stone-700">
          {t.gentile} {d.nome}
          {d.dal && d.al && (
            <>
              : {data(d.dal)} → {data(d.al)}
            </>
          )}
        </p>
      </header>

      {d.stato === "compilato" && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> {t.grazie}
          </p>
          {d.linkRecensioni && (
            <div className="rounded-lg bg-teal-50 p-3 text-teal-900">
              <p>{t.recensione}</p>
              <a href={d.linkRecensioni} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-lg bg-teal-700 px-4 py-2 font-bold text-white">
                {t.lasciaRecensione}
              </a>
            </div>
          )}
        </div>
      )}
      {d.stato === "scaduto" && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">{t.scaduto}</p>}

      {d.stato === "aperto" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            invia();
          }}
        >
          <p className="text-center text-stone-700">{t.intro}</p>
          <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="font-bold">
              {t.generale} <span className="text-xs font-normal text-stone-500">({t.obbligatorio})</span>
            </h2>
            <Stelle valore={generale} onChange={setGenerale} etichetta={t.generale} t={t} />
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm text-stone-600">{t.facoltative}</p>
            <div className="flex flex-col gap-3">
              {(Object.entries(VOCI_QUESTIONARIO) as [VoceQuestionario, { it: string; en: string }][]).map(([k, nomi]) => (
                <div key={k} className="flex flex-col">
                  <span className="font-medium">{nomi[lingua]}</span>
                  <span className="flex items-center gap-2">
                    <Stelle valore={voti[k]} onChange={(n) => setVoti({ ...voti, [k]: n })} etichetta={nomi[lingua]} t={t} />
                    {voti[k] && (
                      <button
                        type="button"
                        className="text-xs text-stone-500 underline"
                        onClick={() => {
                          const resto = { ...voti };
                          delete resto[k];
                          setVoti(resto);
                        }}
                      >
                        {t.nonSo}
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="font-medium">{t.consiglia}</p>
            <div className="mt-2 flex gap-2">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={consiglia === v}
                  className={`rounded-lg border px-5 py-2 font-semibold ${consiglia === v ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300"}`}
                  onClick={() => setConsiglia(consiglia === v ? null : v)}
                >
                  {v ? t.si : t.no}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium" htmlFor="commento">
              {t.commento}
            </label>
            <textarea
              id="commento"
              rows={4}
              maxLength={MAX_COMMENTO}
              className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5"
              value={commento}
              onChange={(e) => setCommento(e.target.value)}
            />
          </section>

          {errore && <p className="rounded-lg bg-red-50 p-3 font-semibold text-red-800">{errore}</p>}
          <button type="submit" disabled={busy || !generale} className="rounded-lg bg-teal-700 py-3 text-lg font-bold text-white disabled:opacity-50">
            {t.invia}
          </button>
        </form>
      )}

      {(d.hotel.telefono || d.hotel.email) && (
        <footer className="mt-8 border-t border-stone-200 pt-3 text-center text-sm text-stone-600">
          {t.contatti}: {[d.hotel.telefono, d.hotel.email].filter(Boolean).join(" · ")}
        </footer>
      )}
    </main>
  );
}
