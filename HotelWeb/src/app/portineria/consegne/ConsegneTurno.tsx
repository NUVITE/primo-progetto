"use client";

import { Check, CheckCheck, Send } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Etichetta, IntestazionePagina, Pulsante, Sezione, Spunta, Textarea } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneChiudiConsegna, azioneConsegnaLetta, azioneCreaConsegna, type datiConsegne } from "./actions";

type Dati = Awaited<ReturnType<typeof datiConsegne>>;
type Voce = Dati["aperte"][number];
const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function ConsegneTurno({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [testo, setTesto] = useState("");
  const [importante, setImportante] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      setD(await fn());
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const daLeggere = d.aperte.filter((c) => !c.mia && !c.lettaDaMe).length;
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Consegne fra turni" sottotitolo={daLeggere === 0 ? "Niente da leggere" : daLeggere === 1 ? "1 consegna da leggere" : `${daLeggere} consegne da leggere`} />
      <Sezione titolo="Lascia una consegna">
        <AiutoSezione breve="Quello che chi entra in turno deve sapere: richieste in sospeso, ospiti da richiamare, problemi aperti. Ogni collega la vede in evidenza finché non la segna come letta; si chiude quando è risolta." />
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await esegui(() => sbusta(azioneCreaConsegna(testo, importante)), "Consegna lasciata.")) {
              setTesto("");
              setImportante(false);
            }
          }}
        >
          <Textarea rows={3} maxLength={2000} placeholder="Es. La 204 chiede la fattura intestata alla ditta entro le 7; caldaia rumorosa al 2° piano, avvisato il manutentore." value={testo} onChange={(e) => setTesto(e.target.value)} aria-label="Consegna" />
          <div className="flex flex-wrap items-center gap-3">
            <Spunta etichetta="Importante" checked={importante} onChange={(e) => setImportante(e.target.checked)} />
            <Pulsante type="submit" variante="primario" icona={Send} disabled={busy || !testo.trim()}>
              Lascia la consegna
            </Pulsante>
          </div>
        </form>
      </Sezione>

      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      <Sezione titolo={`Aperte (${d.aperte.length})`}>
        {d.aperte.length === 0 ? (
          <p className="text-sm text-stone-600">Nessuna consegna aperta.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {d.aperte.map((c) => (
              <Riga key={c.id} c={c} busy={busy} esegui={esegui} />
            ))}
          </ul>
        )}
      </Sezione>

      {d.chiuse.length > 0 && (
        <Sezione titolo="Chiuse negli ultimi 7 giorni">
          <ul className="flex flex-col divide-y divide-stone-100">
            {d.chiuse.map((c) => (
              <li key={c.id} className="py-2 text-sm text-stone-700">
                <p className="whitespace-pre-line">{c.testo}</p>
                <p className="text-xs text-stone-500">
                  {c.creataDa}, {quando(c.creataIl)} · chiusa da {c.chiusaDa} {quando(c.chiusaIl!)}
                </p>
              </li>
            ))}
          </ul>
        </Sezione>
      )}
    </div>
  );
}

function Riga({ c, busy, esegui }: { c: Voce; busy: boolean; esegui: (fn: () => Promise<Dati>, ok?: string) => Promise<boolean> }) {
  const nuova = !c.mia && !c.lettaDaMe;
  return (
    <li className={`rounded-lg border p-3 text-sm ${c.importante ? "border-red-300 bg-red-50" : nuova ? "border-amber-300 bg-amber-50" : "border-stone-200"}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
        <strong className="text-stone-900">{c.creataDa}</strong> {quando(c.creataIl)}
        {c.importante && <Etichetta tono="rosso">Importante</Etichetta>}
        {nuova && <Etichetta tono="ambra">Da leggere</Etichetta>}
      </div>
      <p className="mt-1 whitespace-pre-line text-stone-900">{c.testo}</p>
      {c.letture.length > 0 && <p className="mt-1 text-xs text-stone-500">Letta da: {c.letture.map((l) => l.nome).join(", ")}</p>}
      <div className="mt-2 flex gap-2">
        {nuova && (
          <Pulsante dimensione="piccolo" variante="primario" icona={Check} disabled={busy} onClick={() => esegui(() => sbusta(azioneConsegnaLetta(c.id)))}>
            Letta
          </Pulsante>
        )}
        <Pulsante dimensione="piccolo" icona={CheckCheck} disabled={busy} onClick={() => esegui(() => sbusta(azioneChiudiConsegna(c.id)), "Consegna chiusa.")}>
          Risolta, chiudi
        </Pulsante>
      </div>
    </li>
  );
}
