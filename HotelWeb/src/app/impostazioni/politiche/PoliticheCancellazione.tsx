"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { descriviPolitica, type DatiPolitica, type TipoPenale } from "@/lib/politicheRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneEliminaPolitica, azionePredefinita, azioneSalvaPolitica, datiPolitiche } from "./actions";

type Dati = Awaited<ReturnType<typeof datiPolitiche>>;
type Politica = Dati["politiche"][number];

const TIPI: { valore: TipoPenale; nome: string }[] = [
  { valore: "nessuna", nome: "Nessuna penale" },
  { valore: "notti", nome: "Notti (le prime N)" },
  { valore: "percentuale", nome: "% del soggiorno" },
  { valore: "importo", nome: "Importo fisso (€)" },
];

/** Modifica di una politica: scaglioni (ore prima dell'arrivo → penale) e penale per mancato arrivo. */
function Editor({ iniziale, busy, onSalva, onAnnulla }: { iniziale: DatiPolitica; busy: boolean; onSalva: (d: DatiPolitica) => void; onAnnulla: () => void }) {
  const [d, setD] = useState<DatiPolitica>(iniziale);
  const anteprima = (() => {
    try {
      return descriviPolitica(d);
    } catch {
      return [];
    }
  })();
  const scaglione = (i: number, v: Partial<DatiPolitica["scaglioni"][number]>) => setD({ ...d, scaglioni: d.scaglioni.map((s, k) => (k === i ? { ...s, ...v } : s)) });
  return (
    <div className="flex flex-col gap-3 rounded-md border border-teal-200 bg-teal-50/50 p-3">
      <Campo etichetta="Nome" obbligatorio>
        <Input value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} placeholder="es. Standard 48/24 ore" />
      </Campo>
      <div>
        <p className="mb-1 text-xs font-semibold text-stone-700">Annullamento</p>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-stone-600">
            <tr>
              <th className="py-1 pr-2">Se mancano almeno… ore all&apos;arrivo</th>
              <th className="py-1 pr-2">Penale</th>
              <th className="py-1 pr-2">Valore</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {d.scaglioni.map((s, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <Input type="number" min={0} className="w-28" value={s.oreMin} onChange={(e) => scaglione(i, { oreMin: Number(e.target.value) })} aria-label="Ore prima dell'arrivo" />
                </td>
                <td className="py-1 pr-2">
                  <Select value={s.tipo} onChange={(e) => scaglione(i, { tipo: e.target.value as TipoPenale })} aria-label="Tipo di penale">
                    {TIPI.map((t) => (
                      <option key={t.valore} value={t.valore}>
                        {t.nome}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-1 pr-2">
                  {s.tipo !== "nessuna" && (
                    <Input type="number" min={0} step={s.tipo === "importo" ? "0.01" : "1"} className="w-24" value={s.valore} onChange={(e) => scaglione(i, { valore: Number(e.target.value) })} aria-label="Valore della penale" />
                  )}
                </td>
                <td className="py-1">
                  {d.scaglioni.length > 1 && (
                    <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} aria-label="Togli lo scaglione" onClick={() => setD({ ...d, scaglioni: d.scaglioni.filter((_, k) => k !== i) })} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pulsante
          variante="leggero"
          dimensione="piccolo"
          icona={Plus}
          className="mt-1"
          onClick={() => setD({ ...d, scaglioni: [...d.scaglioni, { oreMin: 0, tipo: "percentuale", valore: 100 }] })}
        >
          Aggiungi uno scaglione
        </Pulsante>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="Mancato arrivo (no-show)">
          <Select value={d.noShow.tipo} onChange={(e) => setD({ ...d, noShow: { ...d.noShow, tipo: e.target.value as TipoPenale } })}>
            {TIPI.map((t) => (
              <option key={t.valore} value={t.valore}>
                {t.nome}
              </option>
            ))}
          </Select>
        </Campo>
        {d.noShow.tipo !== "nessuna" && (
          <Campo etichetta="Valore">
            <Input type="number" min={0} value={d.noShow.valore} onChange={(e) => setD({ ...d, noShow: { ...d.noShow, valore: Number(e.target.value) } })} />
          </Campo>
        )}
      </div>
      {anteprima.length > 0 && (
        <div className="text-sm">
          <p className="text-xs font-semibold text-stone-700">Come la leggerà il cliente</p>
          <ul className="list-disc pl-5 text-stone-800">
            {anteprima.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <Pulsante variante="primario" disabled={busy} onClick={() => onSalva(d)}>
          Salva
        </Pulsante>
        <Pulsante onClick={onAnnulla}>Annulla</Pulsante>
      </div>
    </div>
  );
}

export function PoliticheCancellazione({ iniziale }: { iniziale: Dati }) {
  const [politiche, setPolitiche] = useState<Politica[]>(iniziale.politiche);
  const [modifica, setModifica] = useState<null | { id: number | null; dati: DatiPolitica }>(null);
  const [daEliminare, setDaEliminare] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function esegui(fn: () => Promise<Politica[]>) {
    setErrore(null);
    setBusy(true);
    try {
      setPolitiche(await fn());
      return true;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Politiche di cancellazione" sottotitolo="Penali per annullamento e mancato arrivo" />
      <Suggerimento id="politiche-cancellazione" titolo="Come funzionano">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Crea una o più politiche (puoi partire da un modello) e scegli la predefinita: vale per tutte le nuove prenotazioni.</li>
          <li>Un listino può avere la sua (es. la tariffa non rimborsabile): si sceglie in Listini e tariffe.</li>
          <li>
            Ogni prenotazione conserva la politica valida quando è nata. All&apos;annullamento HotelWeb propone la penale, che resta sempre modificabile.
          </li>
        </ol>
      </Suggerimento>
      {errore && <Avviso tipo="errore">{errore}</Avviso>}

      <Sezione
        titolo="Politiche dell'hotel"
        azioni={
          !modifica && (
            <>
              {iniziale.modelli.map((m) => (
                <Pulsante key={m.nome} dimensione="piccolo" icona={Plus} disabled={busy} onClick={() => setModifica({ id: null, dati: structuredClone(m) })}>
                  Da modello «{m.nome}»
                </Pulsante>
              ))}
              <Pulsante
                dimensione="piccolo"
                variante="primario"
                icona={Plus}
                disabled={busy}
                onClick={() => setModifica({ id: null, dati: { nome: "", scaglioni: [{ oreMin: 0, tipo: "nessuna", valore: 0 }], noShow: { tipo: "notti", valore: 1 } } })}
              >
                Nuova
              </Pulsante>
            </>
          )
        }
      >
        <AiutoSezione breve="Ogni scaglione vale da quel numero di ore prima dell'arrivo in poi; l'ultimo vale fino all'arrivo (0 ore).">
          <p>L&apos;arrivo si conta dall&apos;orario di check-in del primo giorno. La base della penale è il soggiorno: camere e servizi, senza la tassa di soggiorno.</p>
          <Esempio>
            48 ore → nessuna penale; 24 ore → 1 notte; 0 ore → 100%. Chi annulla 30 ore prima paga la prima notte; chi annulla la mattina dell&apos;arrivo paga
            tutto.
          </Esempio>
          <p>Se è stata versata una caparra confirmatoria e il cliente annulla, la penale proposta non è mai inferiore alla caparra.</p>
        </AiutoSezione>

        {modifica && (
          <div className="mt-3">
            <Editor
              iniziale={modifica.dati}
              busy={busy}
              onAnnulla={() => setModifica(null)}
              onSalva={async (dati) => {
                if (await esegui(() => sbusta(azioneSalvaPolitica(modifica.id, dati)))) setModifica(null);
              }}
            />
          </div>
        )}

        {politiche.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">Nessuna politica: all&apos;annullamento la penale si decide a mano.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {politiche.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">
                    {p.nome} {p.predefinita && <Etichetta tono="verde">predefinita</Etichetta>}
                  </p>
                  <ul className="list-disc pl-5 text-xs text-stone-700">
                    {p.descrizione.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {daEliminare === p.id ? (
                    <>
                      <span className="text-xs font-semibold text-red-800">Eliminare?</span>
                      <Pulsante
                        variante="pericolo"
                        dimensione="piccolo"
                        disabled={busy}
                        onClick={async () => {
                          await esegui(() => sbusta(azioneEliminaPolitica(p.id)));
                          setDaEliminare(null);
                        }}
                      >
                        Sì, elimina
                      </Pulsante>
                      <Pulsante dimensione="piccolo" onClick={() => setDaEliminare(null)}>
                        No
                      </Pulsante>
                    </>
                  ) : (
                    <>
                      {!p.predefinita && (
                        <Pulsante variante="leggero" dimensione="piccolo" icona={Star} disabled={busy} onClick={() => esegui(() => sbusta(azionePredefinita(p.id)))}>
                          Rendi predefinita
                        </Pulsante>
                      )}
                      <Pulsante
                        variante="leggero"
                        dimensione="piccolo"
                        disabled={busy || !!modifica}
                        onClick={() => setModifica({ id: p.id, dati: { nome: p.nome, scaglioni: p.scaglioni, noShow: p.noShow } })}
                      >
                        Modifica
                      </Pulsante>
                      <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} disabled={busy} onClick={() => setDaEliminare(p.id)}>
                        Elimina
                      </Pulsante>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-stone-600">Modificare o eliminare una politica non cambia le prenotazioni già fatte: conservano quella accettata.</p>
      </Sezione>
    </div>
  );
}
