"use client";

import { Printer, Shuffle } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { LAVORI, STATI_PULIZIA, testoArrivo, testoBiancheria } from "@/lib/pulizieRegole";
import { Avviso, Etichetta, IntestazionePagina, Pulsante, Sezione, Select, Spunta } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneAssegna, azioneCaricaFoglioPiani, azioneEsitoGovernante, azioneProponi, datiFoglioPiani } from "./actions";

type Dati = Awaited<ReturnType<typeof datiFoglioPiani>>;

const ESITI: Record<string, string> = { fatta: "fatta", dnd: "non disturbare", rifiutato: "riassetto rifiutato" };

/**
 * Foglio dei piani per la governante: camere da fare oggi con biancheria e arrivi, divise fra le
 * cameriere (proposta automatica o a mano), avanzamento, stampa del foglio di ognuna.
 */
export function FoglioPiani({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [presenti, setPresenti] = useState<number[]>(iniziale.cameriere.map((c) => c.id));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok?: string) {
    setMsg(null);
    setBusy(true);
    try {
      setD(await fn());
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const nonAssegnate = d.compiti.filter((c) => !c.assegnata && !c.fatta).length;
  const gruppi = [...d.cameriere.map((p) => ({ id: p.id as number | null, nome: p.nome })), { id: null, nome: "Non assegnate" }];

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Foglio dei piani"
        sottotitolo={`${d.oggi.split("-").reverse().join("/")} · ${d.compiti.filter((c) => !c.fatta).length} camere da fare · ${nonAssegnate} da assegnare`}
        azioni={
          <Pulsante dimensione="piccolo" icona={Printer} onClick={() => window.print()}>
            Stampa
          </Pulsante>
        }
      />
      <Suggerimento id="foglio-piani" titolo="Come si usa">
        <p>
          Qui ci sono le camere da fare oggi: prima quelle con un <strong>arrivo</strong>, poi le <strong>partenze</strong> (pulizia completa), poi le
          <strong> fermate</strong> (riassetto). Scegli le cameriere presenti e premi <strong>Proponi divisione</strong>: il programma divide le camere per
          piano con un carico pari (una partenza vale il doppio di un riassetto). Poi puoi spostarle una per una. Ogni cameriera vede le sue in «Le mie
          camere».
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}
      {d.cameriere.length === 0 && (
        <Avviso tipo="avviso">Nessun utente ha il permesso «Pulire le proprie camere»: assegnalo con il ruolo Cameriera ai piani in Utenti.</Avviso>
      )}

      {d.cameriere.length > 0 && (
        <Sezione titolo="Cameriere di oggi" className="print:hidden">
          <AiutoSezione breve="Togli la spunta a chi oggi non c'è, poi proponi la divisione: le camere già fatte restano a chi le ha fatte.">
            <Esempio>8 partenze e 6 fermate con 2 cameriere: 11 «punti» di lavoro, 5,5 a testa, ognuna su piani vicini.</Esempio>
          </AiutoSezione>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {d.cameriere.map((p) => (
              <span key={p.id} className="flex items-center gap-2 text-sm">
                <Spunta
                  etichetta={p.nome}
                  checked={presenti.includes(p.id)}
                  onChange={(e) => setPresenti(e.target.checked ? [...presenti, p.id] : presenti.filter((x) => x !== p.id))}
                />
                <span className="text-xs text-stone-600">
                  {p.camere} camere · carico {p.carico.toLocaleString("it-IT")} · fatte {p.fatte}
                </span>
              </span>
            ))}
            <Pulsante variante="primario" dimensione="piccolo" icona={Shuffle} disabled={busy || !presenti.length} onClick={() => esegui(() => sbusta(azioneProponi(presenti)), "Camere divise fra le cameriere.")}>
              Proponi divisione
            </Pulsante>
          </div>
        </Sezione>
      )}

      {gruppi.map((gr) => {
        const lista = d.compiti.filter((c) => (c.assegnata?.utenteId ?? null) === gr.id);
        if (!lista.length) return null;
        return (
          <Sezione key={gr.id ?? "nessuna"} titolo={`${gr.nome} (${lista.length})`} className="break-before-page">
            <ul className="divide-y divide-stone-100 text-sm">
              {lista.map((c) => (
                <li key={c.cameraId} className={`flex flex-wrap items-start gap-3 py-2 ${c.fatta || c.assegnata?.esito ? "text-stone-500" : ""}`}>
                  <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${STATI_PULIZIA[c.stato].colore}`} aria-hidden />
                  <span className="w-14 text-lg font-bold">{c.codice}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{LAVORI[c.lavoro]}</span>
                    {c.arrivoOggi && <span className="ml-1 font-semibold text-red-800">· {testoArrivo(c)}</span>}
                    <span className="block text-xs text-stone-600">
                      {c.tipo} · {testoBiancheria(c)}
                      {c.couverture && " · couverture stasera"}
                      {c.ospite && c.lavoro === "fermata" ? ` · ${c.ospite}` : ""}
                    </span>
                    {c.nonDisturbare && <Etichetta tono="rosso">non disturbare</Etichetta>}
                    {c.assegnata?.esito && (
                      <Etichetta tono={c.assegnata.esito === "fatta" ? "verde" : "ambra"} className="ml-1">
                        {ESITI[c.assegnata.esito] ?? c.assegnata.esito}
                        {c.assegnata.nota ? `: ${c.assegnata.nota}` : ""}
                      </Etichetta>
                    )}
                    {!c.assegnata?.esito && <span className="ml-1 text-xs text-stone-600">{STATI_PULIZIA[c.stato].testo}</span>}
                  </span>
                  <span className="flex items-center gap-1 print:hidden">
                    <Select
                      aria-label={`Cameriera per la camera ${c.codice}`}
                      className="h-8 w-40"
                      disabled={busy}
                      value={c.assegnata?.utenteId ?? ""}
                      onChange={(e) => esegui(() => sbusta(azioneAssegna(c.cameraId, e.target.value ? Number(e.target.value) : null)))}
                    >
                      <option value="">Non assegnata</option>
                      {d.cameriere.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </Select>
                    {c.assegnata?.esito && (
                      <Pulsante variante="leggero" dimensione="piccolo" disabled={busy} onClick={() => esegui(() => sbusta(azioneEsitoGovernante(c.cameraId, "riapri", "")), "Camera riaperta.")}>
                        Riapri
                      </Pulsante>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Sezione>
        );
      })}
      {d.compiti.length === 0 && <p className="text-sm text-emerald-800">Oggi non ci sono camere da fare.</p>}
      <div className="print:hidden">
        <Pulsante dimensione="piccolo" disabled={busy} onClick={() => esegui(() => sbusta(azioneCaricaFoglioPiani()), "Aggiornato.")}>
          Aggiorna
        </Pulsante>
      </div>
    </div>
  );
}
