"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Dato, Etichetta, Input, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { CambioPassword } from "./CambioPassword";
import { EVENTI_ACCESSO } from "@/lib/accessiRegole";
import { azioneDisattivaVerifica, azioneEsciAltriDispositivi, azioneNuoviCodiciRiserva, datiProfilo } from "./actions";
import { AttivaVerifica, CodiciRiserva } from "./AttivaVerifica";

type Dati = Awaited<ReturnType<typeof datiProfilo>>;

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const EVENTI: Record<string, string> = EVENTI_ACCESSO;

/** Il mio profilo: cambio password, uscita dagli altri dispositivi, ultimi accessi. */
export function Profilo({ iniziale, pochiCodici }: { iniziale: Dati; pochiCodici: boolean }) {
  const [d, setD] = useState(iniziale);
  // Verifica in due passaggi: richiesta in corso (nuovi codici con il codice dell'app, spegnimento con la password).
  const [richiesta, setRichiesta] = useState<null | { cosa: "codici" | "spegni"; valore: string }>(null);
  const [nuoviCodici, setNuoviCodici] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const ricarica = async () => setD(await datiProfilo());
  const v = d.verifica;

  return (
    <div className="flex w-full flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Il mio profilo" sottotitolo={`${d.nome} · ${d.email}`} />
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}
      <Sezione titolo="Password">
        <AiutoSezione breve="Cambiandola, le sessioni aperte su altri computer e telefoni si chiudono: qui resti dentro." />
        <Dato etichetta="Ultimo cambio" className="my-3">
          {d.passwordCambiataIl ? quando(d.passwordCambiataIl) : "Mai cambiata da quando l'account è stato creato"}
        </Dato>
        <CambioPassword
          dopo={async () => {
            setMsg({ tipo: "ok", testo: "Password cambiata. Le sessioni aperte su altri dispositivi sono state chiuse." });
            await ricarica();
          }}
        />
      </Sezione>
      <Sezione titolo="Verifica in due passaggi">
        <AiutoSezione breve="Dopo la password si chiede un codice di 6 cifre dall'app sul telefono: chi scopre la tua password, senza il telefono, non entra." />
        {pochiCodici && v.attiva && v.codiciRimasti <= 2 && (
          <Avviso tipo="avviso" className="mt-2">
            Ti {v.codiciRimasti === 1 ? "resta un solo codice" : `restano ${v.codiciRimasti} codici`} di riserva: creane di nuovi qui sotto.
          </Avviso>
        )}
        <div className="mt-3">
          {nuoviCodici ? (
            <CodiciRiserva
              codici={nuoviCodici}
              dopo={async () => {
                setNuoviCodici(null);
                await ricarica();
              }}
            />
          ) : !v.attiva ? (
            <>
              <p className="mb-2 text-sm">
                <Etichetta tono={v.obbligatoria ? "rosso" : "neutro"}>{v.obbligatoria ? "Obbligatoria per il tuo ruolo" : "Facoltativa"}</Etichetta> Non ancora attiva.
              </p>
              <AttivaVerifica
                dopo={async () => {
                  setMsg({ tipo: "ok", testo: "Verifica in due passaggi attivata." });
                  await ricarica();
                }}
              />
            </>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <p>
                <Etichetta tono="verde">Attiva</Etichetta> dal {quando(v.attivaDal!)} · codici di riserva rimasti: <strong>{v.codiciRimasti}</strong>
                {v.dispositivi > 0 && <> · dispositivi ricordati: {v.dispositivi}</>}
                {v.obbligatoria && <span className="text-stone-600"> · obbligatoria per il tuo ruolo</span>}
              </p>
              {richiesta ? (
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setMsg(null);
                    try {
                      if (richiesta.cosa === "codici") setNuoviCodici(await sbusta(azioneNuoviCodiciRiserva(richiesta.valore)));
                      else {
                        await sbusta(azioneDisattivaVerifica(richiesta.valore));
                        setMsg({ tipo: "ok", testo: "Verifica in due passaggi spenta." });
                        await ricarica();
                      }
                      setRichiesta(null);
                    } catch (err) {
                      setMsg({ tipo: "errore", testo: err instanceof Error ? err.message : "Errore imprevisto." });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Campo etichetta={richiesta.cosa === "codici" ? "Codice dell'app" : "La tua password"}>
                    <Input
                      type={richiesta.cosa === "codici" ? "text" : "password"}
                      inputMode={richiesta.cosa === "codici" ? "numeric" : undefined}
                      value={richiesta.valore}
                      onChange={(e) => setRichiesta({ ...richiesta, valore: e.target.value })}
                    />
                  </Campo>
                  <Pulsante type="submit" variante="primario" disabled={busy || !richiesta.valore}>
                    {richiesta.cosa === "codici" ? "Crea nuovi codici" : "Spegni"}
                  </Pulsante>
                  <Pulsante onClick={() => setRichiesta(null)}>Annulla</Pulsante>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Pulsante dimensione="piccolo" onClick={() => setRichiesta({ cosa: "codici", valore: "" })}>
                    Nuovi codici di riserva
                  </Pulsante>
                  {!v.obbligatoria && (
                    <Pulsante dimensione="piccolo" onClick={() => setRichiesta({ cosa: "spegni", valore: "" })}>
                      Spegni la verifica
                    </Pulsante>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Sezione>
      <Sezione titolo="Dispositivi">
        <AiutoSezione breve="Hai usato il programma su un computer non tuo o hai perso il telefono? Chiudi tutte le altre sessioni e dimentica i dispositivi ricordati: lì bisognerà accedere di nuovo." />
        <div className="mt-3">
          <Pulsante
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMsg(null);
              try {
                await sbusta(azioneEsciAltriDispositivi());
                setMsg({ tipo: "ok", testo: "Fatto: su tutti gli altri dispositivi bisognerà accedere di nuovo." });
                await ricarica();
              } catch (e) {
                setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
              } finally {
                setBusy(false);
              }
            }}
          >
            Esci da tutti gli altri dispositivi
          </Pulsante>
        </div>
      </Sezione>
      <Sezione titolo="Ultimi accessi">
        <AiutoSezione breve="Se vedi un accesso che non riconosci, cambia subito la password e avvisa chi gestisce gli utenti." />
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {d.eventi.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3 py-1.5">
              <span className="font-mono text-xs text-stone-600">{quando(e.creatoIl)}</span>
              <span className={e.tipo === "accesso_fallito" || e.tipo === "bloccato" ? "font-semibold text-red-700" : "font-semibold"}>{EVENTI[e.tipo] ?? e.tipo}</span>
              {e.dettaglio && <span className="text-stone-600">{e.dettaglio}</span>}
              {e.ip && <span className="text-xs text-stone-500">da {e.ip}</span>}
            </li>
          ))}
          {d.eventi.length === 0 && <li className="py-1.5 text-stone-500">Nessun accesso registrato finora.</li>}
        </ul>
      </Sezione>
    </div>
  );
}
