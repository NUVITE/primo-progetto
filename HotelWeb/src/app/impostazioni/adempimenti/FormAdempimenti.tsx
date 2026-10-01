"use client";

import { KeyRound, PlugZap, Save } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Input, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneProvaAlloggiati, azioneSalvaAlloggiati, datiAdempimenti } from "./actions";

type Dati = Awaited<ReturnType<typeof datiAdempimenti>>;

export function FormAdempimenti({ iniziale }: { iniziale: Dati }) {
  const [stato, setStato] = useState(iniziale.alloggiati);
  const [f, setF] = useState({ utente: iniziale.alloggiati.utente, password: "", wskey: "" });
  const [busy, setBusy] = useState(false);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui(fn: () => Promise<Dati["alloggiati"]>, ok: string) {
    setMessaggio(null);
    setBusy(true);
    try {
      setStato(await fn());
      setF((x) => ({ ...x, password: "", wskey: "" }));
      setMessaggio({ tipo: "ok", testo: ok });
    } catch (e) {
      setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Adempimenti" sottotitolo="Collegamenti con Polizia (Alloggiati Web) e ISTAT" />
      <Suggerimento id="adempimenti" titolo="A cosa servono queste impostazioni">
        <p>
          Qui si inseriscono le credenziali con cui HotelWeb invia le schedine alla Polizia. Si fa una volta sola, e di nuovo solo quando cambiate
          la password del portale. Le password sono salvate cifrate e non vengono mai mostrate.
        </p>
      </Suggerimento>

      {messaggio && <Avviso tipo={messaggio.tipo}>{messaggio.testo}</Avviso>}

      <Sezione titolo="Alloggiati Web (Polizia di Stato)">
        <AiutoSezione breve="Utente, password e chiave del servizio web del portale Alloggiati Web della struttura.">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Accedi al portale alloggiatiweb.poliziadistato.it con le credenziali della struttura.</li>
            <li>
              Dal menu utente scegli <strong>«Chiave Web Service»</strong> e genera la chiave (se ne può generare una sola al giorno).
            </li>
            <li>Scrivi qui utente, password e chiave, poi premi «Salva e prova l&apos;accesso».</li>
          </ol>
          <p>
            <strong>Attenzione:</strong> ogni volta che cambiate la password del portale la chiave va rigenerata e reinserita qui, altrimenti
            l&apos;invio smette di funzionare (l&apos;app lo segnala).
          </p>
        </AiutoSezione>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          {stato.verificatoIl ? (
            <span className="font-semibold text-emerald-800">Accesso verificato il {new Date(stato.verificatoIl).toLocaleString("it-IT")}</span>
          ) : stato.utente ? (
            <span className="font-semibold text-amber-800">Credenziali salvate ma accesso non ancora verificato</span>
          ) : (
            <span className="text-stone-600">Non configurato</span>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Campo etichetta="Utente" obbligatorio>
            <Input autoComplete="off" value={f.utente} onChange={(e) => setF({ ...f, utente: e.target.value })} />
          </Campo>
          <Campo etichetta="Password" aiuto={stato.passwordImpostata ? "Già salvata: lascia vuoto per non cambiarla." : undefined}>
            <Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Campo>
          <Campo etichetta="Chiave Web Service" aiuto={stato.wskeyImpostata ? "Già salvata: lascia vuoto per non cambiarla." : undefined}>
            <Input type="password" autoComplete="off" value={f.wskey} onChange={(e) => setF({ ...f, wskey: e.target.value })} />
          </Campo>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pulsante
            variante="primario"
            icona={Save}
            disabled={busy || !f.utente.trim() || (!stato.passwordImpostata && !f.password) || (!stato.wskeyImpostata && !f.wskey)}
            onClick={() => esegui(() => sbusta(azioneSalvaAlloggiati(f)), "Credenziali salvate: la Polizia ha accettato l'accesso.")}
          >
            Salva e prova l&apos;accesso
          </Pulsante>
          {stato.passwordImpostata && stato.wskeyImpostata && (
            <Pulsante icona={PlugZap} disabled={busy} onClick={() => esegui(() => sbusta(azioneProvaAlloggiati()), "La Polizia ha accettato l'accesso.")}>
              Prova di nuovo l&apos;accesso
            </Pulsante>
          )}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-600">
          <KeyRound className="h-3.5 w-3.5" aria-hidden /> Se la prova non riesce le credenziali restano salvate: correggile e riprova.
        </p>
      </Sezione>
    </div>
  );
}
