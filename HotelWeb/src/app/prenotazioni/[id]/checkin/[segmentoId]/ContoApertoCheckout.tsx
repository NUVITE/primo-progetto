"use client";

import { Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta, type ValoreDi } from "@/lib/esito";
import { Avviso, Campo, classePulsante, Input, Pulsante, Select } from "@/components/ui";
import { azioneClientiSospeso, azioneSospendiDaCheckout } from "./actions";

type Risposta = ValoreDi<typeof azioneSospendiDaCheckout>;

/**
 * Dopo l'ultima partenza con saldo ancora da pagare: si incassa (dal dettaglio della prenotazione)
 * o si lascia il conto in sospeso, a carico dell'ospite o di un cliente, con una nota. Mai un
 * check-out "muto" con il conto aperto.
 */
export function ContoApertoCheckout({
  segmentoId,
  conto,
  puoIncassare,
  onSospeso,
}: {
  segmentoId: number;
  conto: { prenotazioneId: number; daPagare: number | null };
  puoIncassare: boolean;
  onSospeso: (r: Risposta) => void;
}) {
  const [form, setForm] = useState<null | { clienteId: string; nota: string }>(null);
  const [clienti, setClienti] = useState<{ id: number; denominazione: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  return (
    <Avviso tipo="avviso">
      <div className="flex flex-col gap-2">
        <p>
          <strong>Tutti partiti, ma il conto non è saldato</strong>
          {conto.daPagare !== null && (
            <>
              : restano da pagare <strong>€ {conto.daPagare.toFixed(2)}</strong>
            </>
          )}
          . Registra il pagamento oppure lascia il conto in sospeso, indicando a carico di chi.
        </p>
        {errore && <p className="font-semibold text-red-800">{errore}</p>}
        {!form ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/prenotazioni/${conto.prenotazioneId}`} className={classePulsante("primario", "piccolo")}>
              <Wallet className="h-3.5 w-3.5" aria-hidden /> Registra il pagamento
            </Link>
            {puoIncassare && (
              <Pulsante
                dimensione="piccolo"
                disabled={busy}
                onClick={async () => {
                  setErrore(null);
                  try {
                    setClienti(await sbusta(azioneClientiSospeso()));
                    setForm({ clienteId: "", nota: "" });
                  } catch (e) {
                    setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
                  }
                }}
              >
                Lascia in sospeso
              </Pulsante>
            )}
          </div>
        ) : (
          <div className="grid gap-2 rounded-md border border-amber-300 bg-white p-2 sm:grid-cols-2">
            <Campo etichetta="A carico di">
              <Select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
                <option value="">l&apos;ospite</option>
                {clienti.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.denominazione}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Nota" obbligatorio aiuto="Perché resta aperto e come verrà pagato (es. bonifico dell'agenzia a 30 giorni).">
              <Input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} />
            </Campo>
            <div className="flex gap-2 sm:col-span-2">
              <Pulsante
                variante="primario"
                dimensione="piccolo"
                disabled={busy || !form.nota.trim()}
                onClick={async () => {
                  setErrore(null);
                  setBusy(true);
                  try {
                    onSospeso(await sbusta(azioneSospendiDaCheckout(segmentoId, { clienteId: form.clienteId ? Number(form.clienteId) : null, nota: form.nota })));
                  } catch (e) {
                    setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Conferma sospeso
              </Pulsante>
              <Pulsante dimensione="piccolo" onClick={() => setForm(null)}>
                Annulla
              </Pulsante>
            </div>
          </div>
        )}
      </div>
    </Avviso>
  );
}
