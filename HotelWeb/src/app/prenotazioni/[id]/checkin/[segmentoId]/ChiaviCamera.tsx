"use client";

import { KeyRound, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { MAX_CHIAVI } from "@/lib/custodiaRegole";
import { Pulsante } from "@/components/ui";
import { azioneChiaviCamera } from "./actions";

/** Chiavi o key card della camera: quante consegnate all'arrivo e quante restituite alla partenza. */
export function ChiaviCamera({ segmentoId, consegnate, restituite }: { segmentoId: number; consegnate: number; restituite: number }) {
  const [k, setK] = useState({ consegnate, restituite });
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const mancano = k.consegnate - k.restituite;

  async function imposta(c: number, r: number) {
    setBusy(true);
    setErrore(null);
    try {
      setK(await sbusta(azioneChiaviCamera(segmentoId, c, r)));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const contatore = (etichetta: string, valore: number, meno: () => void, piu: () => void, disMeno: boolean, disPiu: boolean) => (
    <span className="flex items-center gap-1">
      <span className="text-stone-600">{etichetta}</span>
      <Pulsante dimensione="piccolo" icona={Minus} aria-label={`${etichetta}: una in meno`} disabled={busy || disMeno} onClick={meno} />
      <strong className="w-6 text-center font-mono">{valore}</strong>
      <Pulsante dimensione="piccolo" icona={Plus} aria-label={`${etichetta}: una in più`} disabled={busy || disPiu} onClick={piu} />
    </span>
  );

  return (
    <section className={`flex flex-wrap items-center gap-4 rounded-lg border p-3 text-sm ${mancano > 0 ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white"}`}>
      <span className="flex items-center gap-1 font-semibold">
        <KeyRound className="h-4 w-4" aria-hidden /> Chiavi
      </span>
      {contatore("consegnate", k.consegnate, () => imposta(k.consegnate - 1, Math.min(k.restituite, k.consegnate - 1)), () => imposta(k.consegnate + 1, k.restituite), k.consegnate === 0, k.consegnate >= MAX_CHIAVI)}
      {contatore("restituite", k.restituite, () => imposta(k.consegnate, k.restituite - 1), () => imposta(k.consegnate, k.restituite + 1), k.restituite === 0, k.restituite >= k.consegnate)}
      {mancano > 0 && <span className="text-amber-900">{mancano === 1 ? "Manca 1 chiave da restituire alla partenza." : `Mancano ${mancano} chiavi da restituire alla partenza.`}</span>}
      {errore && <span className="text-red-800">{errore}</span>}
    </section>
  );
}
