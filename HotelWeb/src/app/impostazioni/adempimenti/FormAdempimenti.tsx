"use client";

import { KeyRound, PlugZap, Save } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import Link from "next/link";
import { azioneProvaAlloggiati, azioneSalvaAlloggiati, azioneSalvaIstat, datiAdempimenti } from "./actions";

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
          Qui si inseriscono le credenziali con cui HotelWeb invia le schedine alla Polizia e i dati ISTAT alla Regione. Si fa una volta sola, e
          di nuovo solo quando cambiate la password dei portali. Le password sono salvate cifrate e non vengono mai mostrate.
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

      <SezioneIstat iniziale={iniziale.istat} />
    </div>
  );
}

// Servizi web Ross1000 delle regioni (elenco del tracciato ufficiale); il Lazio è il predefinito.
const INDIRIZZI_ROSS1000 = [
  ["Lazio", "https://lazioturismo.ross1000.it/ws/checkinV2"],
  ["Abruzzo", "https://app.regione.abruzzo.it/Turismo5/ws/checkinV2"],
  ["Calabria", "https://sirdat.regione.calabria.it/ws/checkinV2"],
  ["Emilia-Romagna", "https://datiturismo.regione.emilia-romagna.it/ws/checkinV2"],
  ["Liguria", "https://turismows.regione.liguria.it/ws/checkinV2"],
  ["Lombardia", "https://www.flussituristici.servizirl.it/Turismo5/app/ws/checkinV2"],
  ["Marche", "https://istrice-ross1000.turismo.marche.it/ws/checkinV2"],
  ["Molise", "https://moliseturismo.ross1000.it/ws/checkinV2"],
  ["Piemonte", "https://piemontedatiturismo.regione.piemonte.it/ws/checkinV2"],
  ["Sardegna", "https://sardegnaturismo.ross1000.it/ws/checkinV2"],
  ["Toscana (Firenze, Pistoia, Prato)", "https://toscanaturismo.ross1000.it/turismo5-web/ws/checkinV2"],
  ["Veneto", "https://flussituristici.regione.veneto.it/ws/checkinV2"],
];

function SezioneIstat({ iniziale }: { iniziale: Dati["istat"] }) {
  const [stato, setStato] = useState(iniziale);
  const [f, setF] = useState({
    primoGiorno: iniziale.primoGiorno ?? "",
    codice: iniziale.ross1000.codice,
    utente: iniziale.ross1000.utente,
    password: "",
    indirizzo: iniziale.ross1000.indirizzo || INDIRIZZI_ROSS1000[0][1],
  });
  const [busy, setBusy] = useState(false);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const ross = stato.sistema === "ROSS1000";

  return (
    <Sezione titolo={`ISTAT movimento turistico${stato.sistema ? (ross ? " (Ross1000)" : " (SPOT Puglia)") : ""}`}>
      {!stato.sistema ? (
        <Avviso tipo="info">
          Il sistema ISTAT della regione (Ross1000 o SPOT) non è ancora attivo: lo imposta il gestore della piattaforma. Il calendario delle chiusure
          è in{" "}
          <Link href="/impostazioni/struttura" className="font-semibold underline">
            Impostazioni &gt; Struttura
          </Link>
          .
        </Avviso>
      ) : (
        <>
          <AiutoSezione
            breve={ross ? "Codice della struttura e credenziali di trasmissione del portale Ross1000 della Regione." : "Da quale giorno HotelWeb prepara i file per SPOT."}
          >
            {ross ? (
              <>
                <p>
                  Codice struttura, utente e password di trasmissione li rilascia l&apos;ufficio turismo della Regione (nel Lazio:
                  bancadatiturismolazio@regione.lazio.it). Se al portale si entra con SPID o CIE, le credenziali di trasmissione vanno chieste a parte.
                </p>
                <p>
                  <strong>Primo giorno</strong>: il primo giorno che comunicherà HotelWeb. I giorni precedenti restano quelli già inviati con il vecchio
                  programma o a mano.
                </p>
              </>
            ) : (
              <p>
                <strong>Primo giorno</strong>: il primo giorno che comunicherà HotelWeb. Il primo file conterrà anche l&apos;«avvio»: gli ospiti già
                presenti la sera prima, come chiede SPOT. I giorni precedenti restano quelli già caricati con il vecchio programma.
              </p>
            )}
          </AiutoSezione>
          {messaggio && (
            <Avviso tipo={messaggio.tipo} className="mt-3">
              {messaggio.testo}
            </Avviso>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Campo etichetta="Primo giorno da comunicare" obbligatorio>
              <Input type="date" value={f.primoGiorno} onChange={(e) => setF({ ...f, primoGiorno: e.target.value })} />
            </Campo>
            {ross && (
              <>
                <Campo etichetta="Codice struttura" obbligatorio>
                  <Input autoComplete="off" value={f.codice} onChange={(e) => setF({ ...f, codice: e.target.value })} />
                </Campo>
                <Campo etichetta="Regione (servizio web)" obbligatorio>
                  <Select value={f.indirizzo} onChange={(e) => setF({ ...f, indirizzo: e.target.value })}>
                    {INDIRIZZI_ROSS1000.some(([, u]) => u === f.indirizzo) ? null : <option value={f.indirizzo}>{f.indirizzo}</option>}
                    {INDIRIZZI_ROSS1000.map(([nome, url]) => (
                      <option key={url} value={url}>
                        {nome}
                      </option>
                    ))}
                  </Select>
                </Campo>
                <Campo etichetta="Utente di trasmissione" obbligatorio>
                  <Input autoComplete="off" value={f.utente} onChange={(e) => setF({ ...f, utente: e.target.value })} />
                </Campo>
                <Campo etichetta="Password di trasmissione" aiuto={stato.ross1000.passwordImpostata ? "Già salvata: lascia vuoto per non cambiarla." : undefined}>
                  <Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                </Campo>
              </>
            )}
          </div>
          <div className="mt-3">
            <Pulsante
              variante="primario"
              icona={Save}
              disabled={busy || !f.primoGiorno}
              onClick={async () => {
                setMessaggio(null);
                setBusy(true);
                try {
                  setStato(await sbusta(azioneSalvaIstat(f)));
                  setF((x) => ({ ...x, password: "" }));
                  setMessaggio({
                    tipo: "ok",
                    testo: ross ? "Salvato. La prova vera è il primo invio dalla pagina ISTAT: la Regione non offre un controllo a parte." : "Salvato.",
                  });
                } catch (e) {
                  setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Salva
            </Pulsante>
          </div>
        </>
      )}
    </Sezione>
  );
}
