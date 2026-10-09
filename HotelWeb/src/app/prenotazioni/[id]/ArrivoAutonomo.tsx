"use client";

import { KeyRound, Send } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { MODELLO_ARRIVO } from "@/lib/arrivoRegole";
import { Etichetta, Input, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneCodiceSoggiorno, caricaPrenotazione } from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Esegui = <T>(fn: () => Promise<T>) => Promise<T | null>;

/** Evento ascoltato da Comunicazioni: apre l'email con il modello indicato. */
export const EVENTO_PREPARA_EMAIL = "prepara-email";

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Arrivo autonomo: codice di accesso di ogni unità (modificabile per questo soggiorno) e invio delle istruzioni. */
export function ArrivoAutonomo({ prenotazione: p, salvando, esegui, aggiorna }: { prenotazione: Prenotazione; salvando: boolean; esegui: Esegui; aggiorna: (p: Prenotazione) => void }) {
  const a = p.arrivo!;
  const [modifica, setModifica] = useState<{ segmentoId: number; codice: string } | null>(null);
  const salva = async (segmentoId: number, codice: string) => {
    const r = await esegui(() => sbusta(azioneCodiceSoggiorno(p.id, segmentoId, codice)));
    if (r) {
      aggiorna(r);
      setModifica(null);
    }
  };

  return (
    <Sezione
      titolo={
        <span className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-teal-700" aria-hidden /> Arrivo autonomo
        </span>
      }
      azioni={
        p.email?.configurata && (
          <Pulsante dimensione="piccolo" icona={Send} onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_PREPARA_EMAIL, { detail: MODELLO_ARRIVO }))}>
            {a.inviata ? "Invia di nuovo le istruzioni" : "Invia le istruzioni"}
          </Pulsante>
        )
      }
    >
      <AiutoSezione breve="Istruzioni e codice per entrare da soli: si inviano a mano con l'email «Istruzioni di arrivo».">
        <p>
          Istruzioni e codice fisso di ogni {a.nomeUnita.toLowerCase()} si scrivono in Impostazioni. Qui si può dare a questo soggiorno un codice suo (per esempio quello generato
          dalla serratura): sostituisce quello fisso solo per questa prenotazione. Pochi giorni prima dell&apos;arrivo, se le istruzioni non sono ancora partite, compare un
          promemoria in cima alle pagine.
        </p>
      </AiutoSezione>
      <ul className="mt-3 divide-y divide-stone-100 text-sm">
        {a.unita.map((u) => (
          <li key={u.segmentoId} className="flex flex-wrap items-center gap-2 py-1.5">
            <span className="font-semibold">
              {a.nomeUnita} {u.camera}
            </span>
            {!u.istruzioni && <Etichetta tono="ambra">senza istruzioni</Etichetta>}
            {modifica?.segmentoId === u.segmentoId ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  salva(u.segmentoId, modifica.codice);
                }}
              >
                <Input className="w-36" aria-label="Codice di questo soggiorno" placeholder={u.codiceUnita ?? "Codice"} value={modifica.codice} onChange={(e) => setModifica({ ...modifica, codice: e.target.value })} />
                <Pulsante type="submit" variante="primario" dimensione="piccolo" disabled={salvando}>
                  Salva
                </Pulsante>
                <Pulsante dimensione="piccolo" onClick={() => setModifica(null)}>
                  Annulla
                </Pulsante>
              </form>
            ) : (
              <>
                <span>
                  Codice: <strong className="font-mono">{u.codice ?? "—"}</strong>
                  {u.codice && <span className="text-xs text-stone-500">{u.codiceSoggiorno ? " (di questo soggiorno)" : " (fisso)"}</span>}
                </span>
                <Pulsante dimensione="piccolo" onClick={() => setModifica({ segmentoId: u.segmentoId, codice: u.codiceSoggiorno ?? "" })}>
                  {u.codiceSoggiorno ? "Cambia" : "Codice per questo soggiorno"}
                </Pulsante>
                {u.codiceSoggiorno && (
                  <Pulsante dimensione="piccolo" disabled={salvando} onClick={() => salva(u.segmentoId, "")}>
                    Torna al codice fisso
                  </Pulsante>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-stone-600">
        {a.inviata ? (
          <>
            <Etichetta tono="verde">Istruzioni inviate</Etichetta> il {quando(a.inviata.il)} a {a.inviata.a} ({a.inviata.da})
          </>
        ) : (
          <Etichetta tono="ambra">Istruzioni non ancora inviate</Etichetta>
        )}
      </p>
    </Sezione>
  );
}
