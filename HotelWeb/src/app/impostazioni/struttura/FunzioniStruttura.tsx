"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { FUNZIONI, type Funzione } from "@/lib/funzioniRegole";
import { Avviso, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneFunzioniSpente } from "../actions";

/** Funzioni del nucleo usate dalla struttura: spente spariscono da menu e maschere, i dati restano. */
export function FunzioniStruttura({ iniziali }: { iniziali: Funzione[] }) {
  const router = useRouter();
  const [spente, setSpente] = useState<string[]>(iniziali);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function cambia(f: Funzione, accesa: boolean) {
    const nuove = accesa ? spente.filter((x) => x !== f) : [...spente, f];
    setBusy(true);
    setMsg(null);
    try {
      setSpente(await sbusta(azioneFunzioniSpente(nuove)));
      setMsg({ tipo: "ok", testo: `${FUNZIONI[f].nome}: ${accesa ? "accesa" : "spenta"}.` });
      // Il menu laterale si aggiorna con le funzioni nuove.
      router.refresh();
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-3 pb-6 sm:px-6">
      <Sezione titolo="Funzioni usate">
        <AiutoSezione breve="Quello che la struttura non usa si spegne: sparisce da menu e maschere e il lavoro di tutti i giorni resta più semplice. I dati già registrati restano e si riaccende in ogni momento.">
          <p>
            Trattamenti e listini non hanno un interruttore: se ne è attivo uno solo, nella nuova prenotazione la scelta non compare e si usa quello. I moduli (ristorazione, pulizie,
            portineria…) li attiva il fornitore del programma.
          </p>
        </AiutoSezione>
        {msg && <Avviso tipo={msg.tipo} className="mt-3">{msg.testo}</Avviso>}
        <ul className="mt-3 flex flex-col gap-3">
          {(Object.entries(FUNZIONI) as [Funzione, { nome: string; descrizione: string }][]).map(([f, x]) => (
            <li key={f}>
              <Spunta etichetta={<strong>{x.nome}</strong>} checked={!spente.includes(f)} disabled={busy} onChange={(e) => cambia(f, e.target.checked)} />
              <p className="ml-6 text-xs text-stone-600">{x.descrizione}</p>
            </li>
          ))}
        </ul>
      </Sezione>
    </div>
  );
}
