"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Input, Pulsante, Select } from "@/components/ui";
import { azioneOpzioniProvenienza, azioneSospendi, azioneTogliSospeso, caricaPrenotazione } from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Esegui = <T>(fn: () => Promise<T>) => Promise<T | null>;

/** Conto non saldato dopo la partenza (o penale da incassare): incassare o lasciare in sospeso. */
export function ContoSospeso({
  prenotazione: p,
  puoIncassare,
  salvando,
  esegui,
  aggiorna,
}: {
  prenotazione: Prenotazione;
  puoIncassare: boolean;
  salvando: boolean;
  esegui: Esegui;
  aggiorna: (p: Prenotazione) => void;
}) {
  const [form, setForm] = useState<null | { clienteId: string; nota: string }>(null);
  const [clienti, setClienti] = useState<{ id: number; denominazione: string }[]>([]);
  const c = p.conto;
  if (!c.aperto) return null;
  const it = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

  if (c.sospeso) {
    const s = c.sospeso;
    return (
      <Avviso
        tipo="info"
        className="mt-3"
        azione={
          puoIncassare && (
            <Pulsante
              dimensione="piccolo"
              disabled={salvando}
              onClick={async () => {
                const r = await esegui(() => sbusta(azioneTogliSospeso(p.id)));
                if (r) aggiorna(r);
              }}
            >
              Togli dal sospeso
            </Pulsante>
          )
        }
      >
        <strong>Conto in sospeso</strong> dal {it(s.il)} ({s.da}), a carico di <strong>{s.aCarico ?? "l'ospite"}</strong>: {s.nota}
        {s.sollecitoIl && <> · ultimo sollecito il {it(s.sollecitoIl)}</>}. Si chiude da solo quando registri il pagamento.
      </Avviso>
    );
  }

  return (
    <Avviso tipo="avviso" className="mt-3">
      <div className="flex flex-col gap-2">
        <p>
          <strong>{p.stato === "ANNULLATA" ? "Penale da incassare." : "Tutti partiti, ma il conto non è saldato."}</strong> Registra il pagamento qui sotto
          oppure lascia il conto in sospeso, indicando a carico di chi.
        </p>
        {puoIncassare &&
          (!form ? (
            <div>
              <Pulsante
                dimensione="piccolo"
                disabled={salvando}
                onClick={async () => {
                  const o = await esegui(() => sbusta(azioneOpzioniProvenienza()));
                  if (!o) return;
                  setClienti(o.clienti);
                  setForm({ clienteId: p.provenienza.clientePaganteId ? String(p.provenienza.clientePaganteId) : "", nota: "" });
                }}
              >
                Lascia in sospeso
              </Pulsante>
            </div>
          ) : (
            <div className="grid gap-2 rounded-md border border-amber-300 bg-white p-2 sm:grid-cols-2">
              <Campo etichetta="A carico di">
                <Select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
                  <option value="">l&apos;ospite</option>
                  {clienti.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.denominazione}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo etichetta="Nota" obbligatorio aiuto="Perché resta aperto e come verrà pagato.">
                <Input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} />
              </Campo>
              <div className="flex gap-2 sm:col-span-2">
                <Pulsante
                  variante="primario"
                  dimensione="piccolo"
                  disabled={salvando || !form.nota.trim()}
                  onClick={async () => {
                    const r = await esegui(() => sbusta(azioneSospendi(p.id, { clienteId: form.clienteId ? Number(form.clienteId) : null, nota: form.nota })));
                    if (r) {
                      aggiorna(r);
                      setForm(null);
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
          ))}
      </div>
    </Avviso>
  );
}
