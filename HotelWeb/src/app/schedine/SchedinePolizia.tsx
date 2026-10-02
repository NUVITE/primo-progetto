"use client";

import { CheckCircle2, Download, FileCheck2, FileText, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, classePulsante, Etichetta, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { tempoAllaScadenza } from "../AvvisiAdempimenti";
import { azioneControlla, azioneFile, azioneInvia, azioneSegnaInviate, datiSchedine } from "./actions";

type Dati = Awaited<ReturnType<typeof datiSchedine>>;
type EsitoInvio = { inviate: number; accettate: number; scartate: { nome: string; errore: string | null }[] };

const it = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function SchedinePolizia({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [esito, setEsito] = useState<EsitoInvio | null>(null);
  const [controllo, setControllo] = useState<{ controllate: number; valide: number; scartate: { nome: string; errore: string }[] } | null>(null);
  // Dopo il download del file: le schedine contenute, da segnare come inviate una volta caricato.
  const [fileScaricato, setFileScaricato] = useState<number[] | null>(null);
  const pronte = dati.pendenti.filter((p) => p.pronta);

  async function esegui<T>(fn: () => Promise<T>) {
    setErrore(null);
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Schedine Polizia" sottotitolo="Comunicazione degli alloggiati ad Alloggiati Web (art. 109 TULPS)" />
      <Suggerimento id="schedine" titolo="Come si inviano le schedine">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Qui compaiono le persone <strong>arrivate</strong> (check-in confermato) la cui schedina non è ancora stata comunicata. Vanno inviate{" "}
            <strong>entro 24 ore dall&apos;arrivo</strong> (entro 6 ore se il soggiorno dura una notte sola).
          </li>
          <li>Se una persona ha dati mancanti, aprila con &quot;Completa al check-in&quot;: senza quei dati la schedina non si può inviare.</li>
          <li>
            Premi <strong>Invia alla Polizia</strong>: le schedine pronte partono insieme e per ognuna vedi se la Polizia l&apos;ha accettata. In
            alternativa <strong>Scarica il file</strong>, caricalo sul portale Alloggiati Web e poi segnale come inviate.
          </li>
        </ol>
        <p>Il giorno dopo l&apos;invio la ricevuta della Polizia si scarica da sola qui sotto: va conservata 5 anni.</p>
      </Suggerimento>

      {!dati.credenzialiPresenti && (
        <Avviso tipo="info">
          L&apos;invio diretto non è ancora configurato: mancano le credenziali di Alloggiati Web.{" "}
          {dati.puoConfigurare ? (
            <Link href="/impostazioni/adempimenti" className="font-semibold underline">
              Inseriscile in Impostazioni &gt; Adempimenti
            </Link>
          ) : (
            "Chiedi all'amministratore dell'hotel di inserirle."
          )}
          . Nel frattempo puoi usare «Scarica il file».
        </Avviso>
      )}
      {dati.erroreRicevute && <Avviso tipo="avviso">Ricevute non scaricate: {dati.erroreRicevute}</Avviso>}
      {errore && <Avviso tipo="errore">{errore}</Avviso>}
      {controllo && (
        <Avviso tipo={controllo.scartate.length ? "avviso" : "ok"}>
          <strong>
            Controllo della Polizia (nessuna schedina trasmessa): {controllo.valide} su {controllo.controllate} corrette.
          </strong>
          {controllo.scartate.map((s, i) => (
            <div key={i}>
              {s.nome}: {s.errore}
            </div>
          ))}
        </Avviso>
      )}
      {esito && (
        <Avviso tipo={esito.scartate.length ? "avviso" : "ok"}>
          <strong>
            Inviate {esito.inviate}: {esito.accettate} accettate dalla Polizia
            {esito.scartate.length ? `, ${esito.scartate.length} scartate` : ""}.
          </strong>
          {esito.scartate.map((s, i) => (
            <div key={i}>
              {s.nome}: {s.errore}
            </div>
          ))}
          {esito.scartate.length > 0 && <div>Correggi i dati al check-in e invia di nuovo.</div>}
        </Avviso>
      )}

      <Sezione
        titolo={`Da inviare (${dati.pendenti.length})`}
        azioni={
          dati.pendenti.length > 0 && (
            <>
              <Pulsante
                icona={Download}
                disabled={busy || pronte.length === 0}
                onClick={async () => {
                  const f = await esegui(() => sbusta(azioneFile()));
                  if (!f) return;
                  const url = URL.createObjectURL(new Blob([f.testo], { type: "text/plain;charset=utf-8" }));
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `schedine-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}.txt`;
                  link.click();
                  URL.revokeObjectURL(url);
                  setFileScaricato(f.presenzaIds);
                }}
              >
                Scarica il file
              </Pulsante>
              <Pulsante
                icona={ShieldCheck}
                disabled={busy || pronte.length === 0 || !dati.credenzialiPresenti}
                title="Verifica le schedine con la Polizia senza trasmetterle"
                onClick={async () => {
                  setEsito(null);
                  const r = await esegui(() => sbusta(azioneControlla()));
                  if (r) setControllo(r);
                }}
              >
                Controlla senza inviare
              </Pulsante>
              <Pulsante
                variante="primario"
                icona={Send}
                disabled={busy || pronte.length === 0 || !dati.credenzialiPresenti}
                onClick={async () => {
                  const r = await esegui(() => sbusta(azioneInvia()));
                  if (r) {
                    setEsito(r.esito);
                    setDati(r.dati);
                    setFileScaricato(null);
                  }
                }}
              >
                {busy ? "Invio in corso…" : `Invia alla Polizia (${pronte.length})`}
              </Pulsante>
            </>
          )
        }
      >
        {fileScaricato && (
          <Avviso
            tipo="info"
            className="mb-3"
            azione={
              <Pulsante
                variante="primario"
                dimensione="piccolo"
                icona={FileCheck2}
                disabled={busy}
                onClick={async () => {
                  const r = await esegui(() => sbusta(azioneSegnaInviate(fileScaricato)));
                  if (r) {
                    setDati(r);
                    setFileScaricato(null);
                  }
                }}
              >
                Sì, segna come inviate
              </Pulsante>
            }
          >
            File scaricato con {fileScaricato.length} {fileScaricato.length === 1 ? "schedina" : "schedine"}. Dopo averlo caricato sul portale Alloggiati Web
            ed esserti accertato che sia stato accettato, segnale come inviate.
          </Avviso>
        )}
        {dati.pendenti.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Nessuna schedina da inviare: sei in regola.
          </p>
        ) : (
          <table className="tabella-responsive w-full text-sm">
            <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
              <tr>
                <th className="py-1.5 pr-2">Ospite</th>
                <th className="py-1.5 pr-2">Camera</th>
                <th className="py-1.5 pr-2">Arrivo</th>
                <th className="py-1.5 pr-2">Termine</th>
                <th className="py-1.5 pr-2">Stato</th>
              </tr>
            </thead>
            <tbody>
              {dati.pendenti.map((p) => (
                <tr key={p.presenzaId} className="border-b border-stone-100 last:border-0">
                  <td data-label="Ospite" className="py-2 pr-2">
                    <span className="font-semibold text-stone-900">{p.nome || "—"}</span>
                    {(p.tipoAlloggiato === 19 || p.tipoAlloggiato === 20) && <span className="ml-1 text-xs text-stone-500">({p.tipoAlloggiato === 19 ? "familiare" : "membro del gruppo"})</span>}
                  </td>
                  <td data-label="Camera" className="py-2 pr-2">{p.camera ?? "—"}</td>
                  <td data-label="Arrivo" className="py-2 pr-2 font-mono">
                    {it(p.arrivo)} · {p.notti} {p.notti === 1 ? "notte" : "notti"}
                  </td>
                  <td data-label="Termine" className={`py-2 pr-2 font-semibold ${p.scaduta ? "text-red-700" : "text-amber-800"}`}>
                    {p.scaduta ? `scaduto ${tempoAllaScadenza(p.scadenza)}` : `scade ${tempoAllaScadenza(p.scadenza)}`}
                  </td>
                  <td data-label="Stato" className="py-2 pr-2">
                    {p.pronta ? (
                      <Etichetta tono="verde">pronta</Etichetta>
                    ) : (
                      <span className="flex flex-col items-start gap-1">
                        <Etichetta tono="ambra">mancano: {p.mancanti.join(", ")}</Etichetta>
                        <Link href={`/prenotazioni/${p.prenotazioneId}/checkin/${p.segmentoId}`} className={classePulsante("leggero", "piccolo", "-ml-2")}>
                          Completa al check-in
                        </Link>
                      </span>
                    )}
                    {p.ultimoScarto && <div className="mt-1 text-xs font-semibold text-red-800">Scartata dalla Polizia: {p.ultimoScarto}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sezione>

      <Sezione titolo="Invii e ricevute">
        <AiutoSezione breve="Storico degli invii e ricevute PDF della Polizia (da conservare 5 anni).">
          <p>
            Ogni invio mostra quante schedine la Polizia ha accettato. Le ricevute sono disponibili dal giorno dopo l&apos;invio diretto e si
            scaricano da sole aprendo questa pagina; per i file caricati a mano la ricevuta si prende dal portale.
          </p>
        </AiutoSezione>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-stone-700">Ultimi invii</p>
            {dati.storico.invii.length === 0 ? (
              <p className="text-sm text-stone-600">Nessun invio ancora.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {dati.storico.invii.map((i) => (
                  <li key={i.id} className="py-1.5">
                    <span className="font-semibold text-stone-900">{quando(i.il)}</span> · {i.modalita === "servizio" ? "servizio web" : "file caricato"} · {i.da}
                    <div className={i.accettate < i.righe ? "text-red-800" : "text-stone-600"}>
                      {i.accettate} su {i.righe} accettate
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-stone-700">Ricevute della Polizia</p>
            {dati.storico.ricevute.length === 0 ? (
              <p className="text-sm text-stone-600">Nessuna ricevuta ancora.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {dati.storico.ricevute.map((r) => (
                  <li key={r.id}>
                    <a href={`/api/ricevute-alloggiati/${r.id}`} target="_blank" rel="noopener" className={classePulsante("secondario", "piccolo")}>
                      <FileText className="h-3.5 w-3.5" aria-hidden /> {it(r.data)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Sezione>
    </div>
  );
}
