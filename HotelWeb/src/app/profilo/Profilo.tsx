"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Dato, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { CambioPassword } from "./CambioPassword";
import { EVENTI_ACCESSO } from "@/lib/accessiRegole";
import { azioneEsciAltriDispositivi, datiProfilo } from "./actions";

type Dati = Awaited<ReturnType<typeof datiProfilo>>;

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const EVENTI: Record<string, string> = EVENTI_ACCESSO;

/** Il mio profilo: cambio password, uscita dagli altri dispositivi, ultimi accessi. */
export function Profilo({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const ricarica = async () => setD(await datiProfilo());

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
      <Sezione titolo="Dispositivi">
        <AiutoSezione breve="Hai usato il programma su un computer non tuo o hai perso il telefono? Chiudi tutte le altre sessioni: lì bisognerà accedere di nuovo." />
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
