"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { LUNGHEZZA_MINIMA } from "@/lib/accessiRegole";
import { Avviso, Campo, Input, Pulsante } from "@/components/ui";
import { azioneCambiaPassword } from "./actions";

/** Modulo per cambiare la propria password (profilo e primo accesso con password temporanea). */
export function CambioPassword({ etichettaAttuale = "Password attuale", dopo }: { etichettaAttuale?: string; dopo: () => void }) {
  const [d, setD] = useState({ attuale: "", nuova: "", conferma: "" });
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  return (
    <form
      className="flex max-w-sm flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setErrore(null);
        setBusy(true);
        try {
          await sbusta(azioneCambiaPassword(d.attuale, d.nuova, d.conferma));
          setD({ attuale: "", nuova: "", conferma: "" });
          dopo();
        } catch (err) {
          setErrore(err instanceof Error ? err.message : "Errore imprevisto.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Campo etichetta={etichettaAttuale}>
        <Input type="password" autoComplete="current-password" required value={d.attuale} onChange={(e) => setD({ ...d, attuale: e.target.value })} />
      </Campo>
      <Campo etichetta="Nuova password" aiuto={`Almeno ${LUNGHEZZA_MINIMA} caratteri. Meglio una frase facile da ricordare per te, ma non il tuo nome o la tua email.`}>
        <Input type="password" autoComplete="new-password" required value={d.nuova} onChange={(e) => setD({ ...d, nuova: e.target.value })} />
      </Campo>
      <Campo etichetta="Ripeti la nuova password">
        <Input type="password" autoComplete="new-password" required value={d.conferma} onChange={(e) => setD({ ...d, conferma: e.target.value })} />
      </Campo>
      {errore && <Avviso tipo="errore">{errore}</Avviso>}
      <div>
        <Pulsante type="submit" variante="primario" disabled={busy}>
          Cambia la password
        </Pulsante>
      </div>
    </form>
  );
}
