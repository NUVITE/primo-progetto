"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { elencoChiusure } from "@/lib/chiusure";
import { Avviso, Campo, Input, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { azioneAggiungiChiusura, azioneEliminaChiusura } from "../actions";

type Chiusura = Awaited<ReturnType<typeof elencoChiusure>>[number];
const it = (g: string) => g.split("-").reverse().join("/");

/** Periodi di chiusura della struttura: all'ISTAT quei giorni risultano "chiuso". */
export function CalendarioChiusure({ iniziale }: { iniziale: Chiusura[] }) {
  const [elenco, setElenco] = useState(iniziale);
  const [f, setF] = useState({ dal: "", al: "", nota: "" });
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  // Conferma inline (niente finestre del browser): id della chiusura da eliminare.
  const [daEliminare, setDaEliminare] = useState<number | null>(null);

  async function esegui(fn: () => Promise<Chiusura[]>) {
    setErrore(null);
    setBusy(true);
    try {
      setElenco(await fn());
      return true;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sezione titolo="Periodi di chiusura">
      <AiutoSezione breve="I giorni in cui la struttura è chiusa: all'ISTAT si comunicano come «chiuso», con camere e letti a zero.">
        <p>Le date sono comprese entrambe. Se la struttura è sempre aperta, lascia l&apos;elenco vuoto.</p>
        <Esempio>Chiusura invernale dal 07/01 al 28/02: nei rapporti ISTAT quei giorni risultano chiusi, senza camere disponibili.</Esempio>
      </AiutoSezione>
      {errore && (
        <Avviso tipo="errore" className="mt-3">
          {errore}
        </Avviso>
      )}
      <div className="mt-3 grid items-end gap-3 sm:grid-cols-[10rem_10rem_1fr_auto]">
        <Campo etichetta="Dal" obbligatorio>
          <Input type="date" value={f.dal} onChange={(e) => setF({ ...f, dal: e.target.value, al: f.al || e.target.value })} />
        </Campo>
        <Campo etichetta="Al" obbligatorio>
          <Input type="date" value={f.al} min={f.dal || undefined} onChange={(e) => setF({ ...f, al: e.target.value })} />
        </Campo>
        <Campo etichetta="Nota">
          <Input value={f.nota} placeholder="es. chiusura invernale" onChange={(e) => setF({ ...f, nota: e.target.value })} />
        </Campo>
        <Pulsante
          icona={Plus}
          disabled={busy || !f.dal || !f.al}
          onClick={async () => {
            if (await esegui(() => sbusta(azioneAggiungiChiusura(f)))) setF({ dal: "", al: "", nota: "" });
          }}
        >
          Aggiungi
        </Pulsante>
      </div>
      {elenco.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">Nessuna chiusura: la struttura risulta sempre aperta.</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {elenco.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="font-semibold text-stone-900">
                {c.dal === c.al ? it(c.dal) : `dal ${it(c.dal)} al ${it(c.al)}`}
              </span>
              {c.nota && <span className="text-stone-600">· {c.nota}</span>}
              <span className="ml-auto flex items-center gap-2">
                {daEliminare === c.id ? (
                  <>
                    <span className="text-xs font-semibold text-red-800">Eliminare la chiusura?</span>
                    <Pulsante
                      variante="pericolo"
                      dimensione="piccolo"
                      disabled={busy}
                      onClick={async () => {
                        await esegui(() => sbusta(azioneEliminaChiusura(c.id)));
                        setDaEliminare(null);
                      }}
                    >
                      Sì, elimina
                    </Pulsante>
                    <Pulsante dimensione="piccolo" disabled={busy} onClick={() => setDaEliminare(null)}>
                      No
                    </Pulsante>
                  </>
                ) : (
                  <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} disabled={busy} onClick={() => setDaEliminare(c.id)}>
                    Elimina
                  </Pulsante>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Sezione>
  );
}
