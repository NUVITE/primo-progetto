"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Input, Pulsante } from "@/components/ui";
import { azioneAvviaVerifica, azioneConfermaVerifica } from "./actions";

/** Codici di riserva appena creati: si vedono una volta sola, da stampare o copiare. */
export function CodiciRiserva({ codici, dopo }: { codici: string[]; dopo: () => void }) {
  const [copiati, setCopiati] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-semibold">Codici di riserva: salvali adesso, non si potranno più rivedere.</p>
      <p className="text-xs">
        Ognuno vale una volta sola, al posto del codice dell&apos;app, se il telefono non c&apos;è. Tienili su un foglio in un posto sicuro o in un gestore di password,
        non nello stesso telefono.
      </p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-base">
        {codici.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Pulsante
          dimensione="piccolo"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(codici.join("\n"));
              setCopiati(true);
            } catch {
              setCopiati(false);
            }
          }}
        >
          {copiati ? "Copiati" : "Copia"}
        </Pulsante>
        <Pulsante dimensione="piccolo" onClick={() => window.print()}>
          Stampa
        </Pulsante>
        <Pulsante dimensione="piccolo" variante="primario" onClick={dopo}>
          Li ho salvati
        </Pulsante>
      </div>
    </div>
  );
}

/** Attivazione: codice QR da inquadrare con l'app, primo codice per confermare, poi i codici di riserva. */
export function AttivaVerifica({ dopo }: { dopo: () => void }) {
  const [qr, setQr] = useState<{ qr: string; segreto: string } | null>(null);
  const [codice, setCodice] = useState("");
  const [codici, setCodici] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function esegui(fn: () => Promise<void>) {
    setErrore(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  if (codici) return <CodiciRiserva codici={codici} dopo={dopo} />;
  return (
    <div className="flex flex-col gap-3 text-sm">
      {!qr ? (
        <>
          <p>
            Serve un&apos;app di autenticazione gratuita sul telefono: Google Authenticator, Microsoft Authenticator o un&apos;altra a scelta. Installala, poi premi il
            pulsante qui sotto.
          </p>
          <div>
            <Pulsante variante="primario" disabled={busy} onClick={() => esegui(async () => setQr(await sbusta(azioneAvviaVerifica())))}>
              Mostra il codice QR
            </Pulsante>
          </div>
        </>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            esegui(async () => setCodici(await sbusta(azioneConfermaVerifica(codice))));
          }}
        >
          <p>1. Nell&apos;app scegli &quot;Aggiungi&quot; o &quot;+&quot; e inquadra il codice:</p>
          {/* SVG generato dal server con la libreria qrcode a partire dal nostro indirizzo otpauth. */}
          <div className="w-[200px] rounded-md border border-stone-200 bg-white p-1" dangerouslySetInnerHTML={{ __html: qr.qr }} />
          <p className="text-xs text-stone-600">
            Non riesci a inquadrarlo? Scegli &quot;inserisci una chiave&quot; e scrivi: <span className="font-mono font-semibold">{qr.segreto}</span>
          </p>
          <p>2. Scrivi qui il codice di 6 cifre che compare nell&apos;app per HotelWeb:</p>
          <Campo etichetta="Codice">
            <Input className="w-40 text-center font-mono text-lg tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={codice} onChange={(e) => setCodice(e.target.value)} />
          </Campo>
          <div>
            <Pulsante type="submit" variante="primario" disabled={busy || codice.replace(/\s/g, "").length !== 6}>
              Attiva
            </Pulsante>
          </div>
        </form>
      )}
      {errore && <Avviso tipo="errore">{errore}</Avviso>}
    </div>
  );
}
