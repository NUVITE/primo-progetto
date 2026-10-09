"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { METODI_CAUZIONE, type MetodoCauzione } from "@/lib/cauzioniRegole";
import { Campo, Dato, Etichetta, Input, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneIncassaCauzione, azioneRestituisciCauzione, caricaPrenotazione } from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Esegui = <T>(fn: () => Promise<T>) => Promise<T | null>;
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const it = (g: string) => g.split("-").reverse().join("/");
const numero = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : 0);

/** Cauzione (deposito): incasso e restituzione, con la trattenuta per danni che va sul conto. */
export function CauzionePrenotazione({ prenotazione: p, salvando, esegui, aggiorna }: { prenotazione: Prenotazione; salvando: boolean; esegui: Esegui; aggiorna: (p: Prenotazione) => void }) {
  const d = p.cauzione!;
  const c = d.cauzione;
  const [incasso, setIncasso] = useState<null | { importo: string; metodo: MetodoCauzione }>(null);
  const [restituzione, setRestituzione] = useState<null | { trattenuta: string; motivo: string; metodo: MetodoCauzione }>(null);
  const metodi = (Object.entries(METODI_CAUZIONE) as [MetodoCauzione, string][]).map(([k, v]) => (
    <option key={k} value={k}>
      {v}
    </option>
  ));

  return (
    <Sezione titolo="Cauzione">
      <AiutoSezione breve="Deposito che l'ospite lascia all'arrivo e che si restituisce alla partenza: non è un pagamento del conto.">
        <p>
          Nella cassa del giorno compare a parte, tra le cauzioni, e conta nei contanti del cassetto. Se si trattiene qualcosa per un danno, la trattenuta diventa un addebito
          &quot;Risarcimento danni&quot; sul conto (fuori campo IVA) già pagato con la cauzione.
        </p>
      </AiutoSezione>
      {!c ? (
        incasso ? (
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await esegui(() => sbusta(azioneIncassaCauzione(p.id, numero(incasso.importo), incasso.metodo)));
              if (r) {
                aggiorna(r);
                setIncasso(null);
              }
            }}
          >
            <Campo etichetta="Importo (€)">
              <Input className="w-28" inputMode="decimal" value={incasso.importo} onChange={(e) => setIncasso({ ...incasso, importo: e.target.value })} />
            </Campo>
            <Campo etichetta="Metodo">
              <Select value={incasso.metodo} onChange={(e) => setIncasso({ ...incasso, metodo: e.target.value as MetodoCauzione })}>
                {metodi}
              </Select>
            </Campo>
            <Pulsante type="submit" variante="primario" dimensione="piccolo" disabled={salvando}>
              Registra l&apos;incasso
            </Pulsante>
            <Pulsante dimensione="piccolo" onClick={() => setIncasso(null)}>
              Annulla
            </Pulsante>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span>
              Da chiedere: <strong>{eur(d.proposta)}</strong>
            </span>
            <Pulsante dimensione="piccolo" variante="primario" onClick={() => setIncasso({ importo: String(d.proposta || ""), metodo: "contanti" })}>
              Incassa la cauzione
            </Pulsante>
          </div>
        )
      ) : (
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <Dato etichetta="Incassata">
              {eur(c.importo)} · {METODI_CAUZIONE[c.metodo as MetodoCauzione] ?? c.metodo}
            </Dato>
            <Dato etichetta="Il">
              {it(c.incassataIl)} ({c.incassataDa})
            </Dato>
          </div>
          {c.restituitaIl ? (
            <p>
              <Etichetta tono="verde">Restituita</Etichetta> il {it(c.restituitaIl)} ({c.restituitaDa}): {eur(c.importoRestituito ?? 0)}
              {c.trattenuta ? (
                <>
                  {" "}
                  · trattenuti <strong>{eur(c.trattenuta)}</strong> per {c.motivoTrattenuta}, addebitati sul conto come risarcimento danni
                </>
              ) : null}
            </p>
          ) : restituzione ? (
            <form
              className="flex flex-col gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await esegui(() => sbusta(azioneRestituisciCauzione(p.id, numero(restituzione.trattenuta), restituzione.motivo, restituzione.metodo)));
                if (r) {
                  aggiorna(r);
                  setRestituzione(null);
                }
              }}
            >
              <div className="flex flex-wrap items-end gap-2">
                <Campo etichetta="Trattenuta (€)" aiuto="Zero = si restituisce tutto.">
                  <Input className="w-28" inputMode="decimal" value={restituzione.trattenuta} onChange={(e) => setRestituzione({ ...restituzione, trattenuta: e.target.value })} />
                </Campo>
                <Campo etichetta="Si restituisce con">
                  <Select value={restituzione.metodo} onChange={(e) => setRestituzione({ ...restituzione, metodo: e.target.value as MetodoCauzione })}>
                    {metodi}
                  </Select>
                </Campo>
              </div>
              {numero(restituzione.trattenuta) > 0 && (
                <Campo etichetta="Motivo della trattenuta">
                  <Input placeholder="Es. lenzuolo macchiato, telecomando mancante" value={restituzione.motivo} onChange={(e) => setRestituzione({ ...restituzione, motivo: e.target.value })} />
                </Campo>
              )}
              <p className="text-xs text-stone-600">Si restituiscono {eur(Math.max(0, c.importo - numero(restituzione.trattenuta)))}.</p>
              <div className="flex gap-2">
                <Pulsante type="submit" variante="primario" dimensione="piccolo" disabled={salvando}>
                  Registra la restituzione
                </Pulsante>
                <Pulsante dimensione="piccolo" onClick={() => setRestituzione(null)}>
                  Annulla
                </Pulsante>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Etichetta tono="ambra">Da restituire alla partenza</Etichetta>
              <Pulsante dimensione="piccolo" onClick={() => setRestituzione({ trattenuta: "0", motivo: "", metodo: c.metodo as MetodoCauzione })}>
                Restituisci
              </Pulsante>
            </div>
          )}
        </div>
      )}
    </Sezione>
  );
}
