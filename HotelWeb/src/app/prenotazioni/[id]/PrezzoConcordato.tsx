"use client";

import { BadgeEuro } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Input, Pulsante } from "@/components/ui";
import { azionePrezzoConcordato, caricaPrenotazione } from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Segmento = Prenotazione["segmenti"][number];
type Esegui = <T>(fn: () => Promise<T>) => Promise<T | null>;

/**
 * Prezzo per notte concordato a mano sulla camera (permesso "Modificare i prezzi"): sostituisce il
 * listino per tutte le notti e i ricalcoli lo rispettano. Si torna al listino togliendolo.
 */
export function PrezzoConcordato({
  segmento: s,
  puoModificare,
  salvando,
  esegui,
  aggiorna,
}: {
  segmento: Segmento;
  puoModificare: boolean;
  salvando: boolean;
  esegui: Esegui;
  aggiorna: (p: Prenotazione) => void;
}) {
  const [f, setF] = useState<null | { prezzo: string; nota: string }>(null);
  if (s.annullata) return null;

  async function salva(prezzo: number | null, nota: string) {
    const r = await esegui(() => sbusta(azionePrezzoConcordato(s.id, prezzo, nota)));
    if (r) {
      aggiorna(r);
      setF(null);
    }
  }

  return (
    <>
      {s.prezzoConcordato !== null && !f && (
        <Avviso
          tipo="info"
          className="mt-3"
          azione={
            puoModificare && (
              <span className="flex gap-1">
                <Pulsante dimensione="piccolo" disabled={salvando} onClick={() => setF({ prezzo: String(s.prezzoConcordato), nota: s.prezzoConcordatoNota })}>
                  Cambia
                </Pulsante>
                <Pulsante dimensione="piccolo" disabled={salvando} onClick={() => salva(null, "")}>
                  Torna al listino
                </Pulsante>
              </span>
            )
          }
        >
          <strong>Prezzo concordato: € {s.prezzoConcordato.toFixed(2)} a notte</strong> per questa camera ({s.prezzoConcordatoNota}
          {s.prezzoConcordatoDa ? ` · ${s.prezzoConcordatoDa}` : ""}). Il listino non si applica.
        </Avviso>
      )}
      {puoModificare && s.prezzoConcordato === null && !f && (
        <Pulsante variante="leggero" dimensione="piccolo" icona={BadgeEuro} className="-ml-2 mt-2" onClick={() => setF({ prezzo: "", nota: "" })}>
          Prezzo concordato
        </Pulsante>
      )}
      {f && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md border border-teal-200 bg-teal-50/50 p-3">
          <Campo etichetta="€ a notte per la camera" obbligatorio>
            <Input type="number" min={0} step="0.01" className="w-32" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} />
          </Campo>
          <Campo etichetta="Motivo" obbligatorio className="min-w-56 flex-1" aiuto="Es. cliente abituale, accordo con l'azienda.">
            <Input value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} />
          </Campo>
          <Pulsante variante="primario" disabled={salvando || f.prezzo === "" || !f.nota.trim()} onClick={() => salva(Number(f.prezzo.replace(",", ".")), f.nota)}>
            Applica a tutte le notti
          </Pulsante>
          <Pulsante onClick={() => setF(null)}>Annulla</Pulsante>
        </div>
      )}
    </>
  );
}
