"use client";

import { Check, Send, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { VOCI_QUESTIONARIO, VOTO_BASSO, type VoceQuestionario } from "@/lib/questionariRegole";
import { Avviso, Campo, Dato, Etichetta, Input, IntestazionePagina, Pulsante, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneCaricaQuestionari, azioneImpostazioniQuestionari, azioneRingrazia, azioneSegnaLetto, type datiQuestionari } from "./actions";

type Dati = Awaited<ReturnType<typeof datiQuestionari>>;
const it = (g: string) => g.slice(0, 10).split("-").reverse().join("/");
const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const voto = (n: number | null) => (n === null ? "—" : n.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

function StelleFisse({ n }: { n: number }) {
  return (
    <span className="inline-flex" aria-label={`${n} su 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-amber-400 text-amber-500" : "text-stone-300"}`} aria-hidden />
      ))}
    </span>
  );
}

export function Questionari({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const r = d.risultati;
  const [periodo, setPeriodo] = useState({ dal: r.dal, al: r.al });
  const [imp, setImp] = useState(iniziale.impostazioni);
  const [soloBassi, setSoloBassi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore" | "info"; testo: string } | null>(null);
  const righe = soloBassi ? r.righe.filter((x) => x.basso) : r.righe;

  async function esegui(fn: () => Promise<Dati>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const nuovi = await fn();
      setD(nuovi);
      setImp(nuovi.impostazioni);
      if (ok) setMsg({ tipo: "ok", testo: ok });
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Questionari e ringraziamenti" sottotitolo={`Dal ${it(r.dal)} al ${it(r.al)}`} />
      <Sezione>
        <AiutoSezione breve="Dopo la partenza l'ospite riceve un'email di ringraziamento con il link a un breve questionario (voto da 1 a 5 stelle, voci facoltative, commento).">
          <p>
            Il ringraziamento parte da solo al check-out dell&apos;ultima camera se lo attivi qui sotto, oppure a mano dalla prenotazione (Comunicazioni › Ringraziamento) o
            dall&apos;elenco delle partenze da ringraziare. I questionari con voto complessivo fino a {VOTO_BASSO} restano in evidenza finché qualcuno li legge. A chi dà 4 o 5
            stelle si propone di lasciare una recensione online, se indichi la pagina.
          </p>
        </AiutoSezione>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            esegui(() => sbusta(azioneCaricaQuestionari(periodo.dal, periodo.al)));
          }}
        >
          <Campo etichetta="Compilati dal">
            <Input type="date" value={periodo.dal} onChange={(e) => setPeriodo({ ...periodo, dal: e.target.value })} />
          </Campo>
          <Campo etichetta="al">
            <Input type="date" value={periodo.al} onChange={(e) => setPeriodo({ ...periodo, al: e.target.value })} />
          </Campo>
          <Pulsante type="submit" disabled={busy}>
            Mostra
          </Pulsante>
        </form>
      </Sezione>

      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      <Sezione titolo="Risultati del periodo">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato etichetta="Questionari inviati">{r.inviati}</Dato>
          <Dato etichetta="Compilati">
            {r.compilati}
            {r.inviati > 0 && <span className="text-stone-500"> ({Math.round((r.compilati / r.inviati) * 100)}%)</span>}
          </Dato>
          <Dato etichetta="Voto complessivo medio">{voto(r.mediaGenerale)} / 5</Dato>
          <Dato etichetta="Ci consiglierebbero">{r.consigliaPercentuale === null ? "—" : `${r.consigliaPercentuale}%`}</Dato>
        </div>
        <table className="mt-4 w-full max-w-md text-sm">
          <thead className="text-left text-xs text-stone-600">
            <tr>
              <th className="py-1">Voce</th>
              <th className="py-1 text-right">Media</th>
              <th className="py-1 text-right">Risposte</th>
            </tr>
          </thead>
          <tbody>
            {r.perVoce.map((v) => (
              <tr key={v.voce} className="border-t border-stone-100">
                <td className="py-1">{VOCI_QUESTIONARIO[v.voce].it}</td>
                <td className="py-1 text-right font-mono">{voto(v.media)}</td>
                <td className="py-1 text-right font-mono">{v.risposte}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Sezione>

      <Sezione
        titolo="Risposte degli ospiti"
        azioni={<Spunta etichetta={`Solo voti bassi (fino a ${VOTO_BASSO})`} checked={soloBassi} onChange={(e) => setSoloBassi(e.target.checked)} />}
      >
        {righe.length === 0 ? (
          <p className="text-sm text-stone-600">Nessun questionario compilato nel periodo.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {righe.map((q) => (
              <li key={q.id} className={`rounded-lg border p-3 text-sm ${q.basso && !q.lettoIl ? "border-red-300 bg-red-50" : "border-stone-200"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <StelleFisse n={q.generale} />
                    <Link href={`/ospiti/${q.ospiteId}`} className="font-semibold text-teal-800 hover:underline">
                      {q.ospite}
                    </Link>
                    <Link href={`/prenotazioni/${q.prenotazioneId}`} className="text-teal-800 hover:underline">
                      #{q.prenotazioneId}
                    </Link>
                    {q.consiglia !== null && <Etichetta tono={q.consiglia ? "verde" : "rosso"}>{q.consiglia ? "Ci consiglierebbe" : "Non ci consiglierebbe"}</Etichetta>}
                    {q.lingua !== "it" && <Etichetta>{q.lingua.toUpperCase()}</Etichetta>}
                  </span>
                  <span className="text-xs text-stone-500">{quando(q.compilatoIl)}</span>
                </div>
                {Object.keys(q.voti).length > 0 && (
                  <p className="mt-1 text-xs text-stone-600">
                    {(Object.entries(q.voti) as [VoceQuestionario, number][]).map(([k, v]) => `${VOCI_QUESTIONARIO[k].it} ${v}`).join(" · ")}
                  </p>
                )}
                {q.commento && <p className="mt-1 whitespace-pre-line text-stone-800">«{q.commento}»</p>}
                {q.basso &&
                  (q.lettoIl ? (
                    <p className="mt-1 text-xs text-stone-500">
                      Letto da {q.lettoDa} il {quando(q.lettoIl)}
                    </p>
                  ) : (
                    <Pulsante className="mt-2" dimensione="piccolo" icona={Check} disabled={busy} onClick={() => esegui(() => sbusta(azioneSegnaLetto(q.id, r.dal, r.al)), "Segnato come letto.")}>
                      Segna come letto
                    </Pulsante>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      {d.daRingraziare && (
        <Sezione titolo="Partenze da ringraziare" descrizione="Ultimi 30 giorni, senza email di ringraziamento.">
          {!imp.emailConfigurata && <Avviso tipo="avviso">La posta non è configurata: si imposta in Impostazioni › Email.</Avviso>}
          {d.daRingraziare.length === 0 ? (
            <p className="text-sm text-stone-600">Nessuna partenza da ringraziare.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-stone-100 text-sm">
              {d.daRingraziare.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <Link href={`/prenotazioni/${p.id}`} className="font-semibold text-teal-800 hover:underline">
                      #{p.id} {p.ospite}
                    </Link>{" "}
                    <span className="text-stone-600">· partenza {it(p.partenza)}</span>
                    {!p.partiti && <span className="text-xs text-stone-500"> · check-out non registrato</span>}
                  </span>
                  {p.email ? (
                    <Pulsante
                      dimensione="piccolo"
                      icona={Send}
                      disabled={busy || !imp.emailConfigurata}
                      onClick={() =>
                        esegui(async () => {
                          const x = await sbusta(azioneRingrazia(p.id, r.dal, r.al));
                          setMsg({ tipo: "ok", testo: `Ringraziamento ${x.esito === "simulata" ? "simulato (ambiente di prova)" : "inviato"} a ${x.destinatario}.` });
                          return x.dati;
                        })
                      }
                    >
                      Invia ringraziamento
                    </Pulsante>
                  ) : (
                    <span className="text-xs text-stone-500">senza email</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Sezione>
      )}

      {d.puoConfigurare && (
        <Sezione titolo="Impostazioni">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              esegui(() => sbusta(azioneImpostazioniQuestionari(imp.ringraziamentoAuto, imp.linkRecensioni, r.dal, r.al)), "Impostazioni salvate.");
            }}
          >
            <Spunta
              etichetta="Manda da solo il ringraziamento con il questionario al check-out dell'ultima camera"
              checked={imp.ringraziamentoAuto}
              onChange={(e) => setImp({ ...imp, ringraziamentoAuto: e.target.checked })}
            />
            <Campo etichetta="Pagina delle recensioni" aiuto="Es. la pagina dell'hotel su Google o TripAdvisor: la proponiamo a chi dà 4 o 5 stelle. Vuota = non si propone.">
              <Input className="w-full max-w-xl" placeholder="https://…" value={imp.linkRecensioni} onChange={(e) => setImp({ ...imp, linkRecensioni: e.target.value })} />
            </Campo>
            <div>
              <Pulsante type="submit" variante="primario" disabled={busy}>
                Salva
              </Pulsante>
            </div>
          </form>
        </Sezione>
      )}
    </div>
  );
}
