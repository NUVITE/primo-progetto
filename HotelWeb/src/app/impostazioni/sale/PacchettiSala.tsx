"use client";

import { Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { PacchettoInput, RigaPacchettoInput } from "@/lib/sale";
import { Avviso, Campo, Etichetta, Input, Pulsante, Select, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { azioneEliminaPacchetto, azioneSalvaPacchetto, datiPacchetti } from "./actions";

type Dati = Awaited<ReturnType<typeof datiPacchetti>>;
type Pacchetto = Dati["pacchetti"][number];

const eur = (n: number) => `${n.toFixed(2)} €`;

/** Pacchetti per gli eventi (es. "Giornata congressuale"): servizi che si aggiungono insieme. */
export function PacchettiSala({ iniziale }: { iniziale: Dati }) {
  const [pacchetti, setPacchetti] = useState<Pacchetto[]>(iniziale.pacchetti);
  const [modifica, setModifica] = useState<null | { id: number | null; f: PacchettoInput }>(null);
  const [daEliminare, setDaEliminare] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const servizi = iniziale.servizi;

  async function esegui(fn: () => Promise<Pacchetto[]>) {
    setErrore(null);
    setBusy(true);
    try {
      setPacchetti(await fn());
      return true;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const riga = (i: number, v: Partial<RigaPacchettoInput>) =>
    modifica && setModifica({ ...modifica, f: { ...modifica.f, righe: modifica.f.righe.map((r, k) => (k === i ? { ...r, ...v } : r)) } });

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 px-3 pb-6 sm:px-6">
      <Sezione
        titolo={
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4 text-teal-700" aria-hidden /> Pacchetti per gli eventi
          </span>
        }
        azioni={
          !modifica && (
            <Pulsante
              dimensione="piccolo"
              variante="primario"
              icona={Plus}
              onClick={() =>
                setModifica({
                  id: null,
                  f: { nome: "", descrizione: "", attivo: true, righe: [{ servizioCatalogoId: servizi[0]?.id ?? null, descrizione: "", prezzoUnitario: servizi[0]?.prezzo ?? 0, quantitaPer: "persona" }] },
                })
              }
            >
              Nuovo pacchetto
            </Pulsante>
          )
        }
      >
        <AiutoSezione breve="Servizi che di solito vanno insieme: nell'evento si aggiungono con un clic, con le quantità calcolate dai partecipanti.">
          <p>
            Ogni riga è <strong>a persona</strong> (moltiplicata per i partecipanti) oppure <strong>a evento</strong> (una volta). Il pacchetto si può
            applicare a tutti i giorni dell&apos;evento o a uno solo; i servizi creati restano modificabili.
          </p>
          <Esempio>Giornata congressuale: coffee break 6 € e pranzo 25 € a persona, videoproiettore 50 € a evento. 40 partecipanti = 1.290 € al giorno.</Esempio>
        </AiutoSezione>
        {errore && (
          <Avviso tipo="errore" className="mt-3">
            {errore}
          </Avviso>
        )}

        {modifica && (
          <div className="mt-3 flex flex-col gap-3 rounded-md border border-teal-200 bg-teal-50/50 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etichetta="Nome" obbligatorio>
                <Input value={modifica.f.nome} placeholder="es. Giornata congressuale" onChange={(e) => setModifica({ ...modifica, f: { ...modifica.f, nome: e.target.value } })} />
              </Campo>
              <Campo etichetta="Descrizione">
                <Input value={modifica.f.descrizione} onChange={(e) => setModifica({ ...modifica, f: { ...modifica.f, descrizione: e.target.value } })} />
              </Campo>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-stone-600">
                <tr>
                  <th className="py-1 pr-2">Servizio</th>
                  <th className="py-1 pr-2">Prezzo €</th>
                  <th className="py-1 pr-2">Quantità</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {modifica.f.righe.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <div className="flex flex-col gap-1">
                        <Select
                          aria-label="Servizio"
                          value={r.servizioCatalogoId ?? ""}
                          onChange={(e) => {
                            const id = e.target.value ? Number(e.target.value) : null;
                            riga(i, { servizioCatalogoId: id, prezzoUnitario: id ? (servizi.find((x) => x.id === id)?.prezzo ?? r.prezzoUnitario) : r.prezzoUnitario });
                          }}
                        >
                          <option value="">Altro (scrivi la descrizione)</option>
                          {servizi.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.nome}
                            </option>
                          ))}
                        </Select>
                        {!r.servizioCatalogoId && <Input aria-label="Descrizione" placeholder="es. Cena di gala" value={r.descrizione} onChange={(e) => riga(i, { descrizione: e.target.value })} />}
                      </div>
                    </td>
                    <td className="py-1 pr-2">
                      <Input type="number" min={0} step="0.01" className="w-24" aria-label="Prezzo" value={r.prezzoUnitario} onChange={(e) => riga(i, { prezzoUnitario: Number(e.target.value) })} />
                    </td>
                    <td className="py-1 pr-2">
                      <Select aria-label="Quantità" value={r.quantitaPer} onChange={(e) => riga(i, { quantitaPer: e.target.value as RigaPacchettoInput["quantitaPer"] })}>
                        <option value="persona">a persona</option>
                        <option value="evento">a evento</option>
                      </Select>
                    </td>
                    <td className="py-1">
                      {modifica.f.righe.length > 1 && (
                        <Pulsante
                          variante="leggero"
                          dimensione="piccolo"
                          icona={Trash2}
                          aria-label="Togli la riga"
                          onClick={() => setModifica({ ...modifica, f: { ...modifica.f, righe: modifica.f.righe.filter((_, k) => k !== i) } })}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-3">
              <Pulsante
                variante="leggero"
                dimensione="piccolo"
                icona={Plus}
                onClick={() =>
                  setModifica({ ...modifica, f: { ...modifica.f, righe: [...modifica.f.righe, { servizioCatalogoId: null, descrizione: "", prezzoUnitario: 0, quantitaPer: "persona" }] } })
                }
              >
                Aggiungi un servizio
              </Pulsante>
              <Spunta etichetta="Attivo" checked={modifica.f.attivo} onChange={(e) => setModifica({ ...modifica, f: { ...modifica.f, attivo: e.target.checked } })} />
            </div>
            <div className="flex gap-2">
              <Pulsante
                variante="primario"
                disabled={busy}
                onClick={async () => {
                  if (await esegui(() => sbusta(azioneSalvaPacchetto(modifica.id, modifica.f)))) setModifica(null);
                }}
              >
                Salva
              </Pulsante>
              <Pulsante onClick={() => setModifica(null)}>Annulla</Pulsante>
            </div>
          </div>
        )}

        {pacchetti.length === 0 && !modifica ? (
          <p className="mt-3 text-sm text-stone-600">Nessun pacchetto. I servizi si possono comunque aggiungere uno per uno all&apos;evento.</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100">
            {pacchetti.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start gap-3 py-2">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold text-stone-900">
                    {p.nome} {!p.attivo && <Etichetta>non attivo</Etichetta>}
                  </p>
                  {p.descrizione && <p className="text-stone-600">{p.descrizione}</p>}
                  <p className="text-xs text-stone-700">
                    {p.righe.map((r) => `${r.nome} ${eur(r.prezzoUnitario)} ${r.quantitaPer === "persona" ? "a persona" : "a evento"}`).join(" · ")}
                  </p>
                  <p className="text-xs text-stone-500">
                    Al giorno: {eur(p.aPersona)} a persona{p.aEvento ? ` + ${eur(p.aEvento)} a evento` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {daEliminare === p.id ? (
                    <>
                      <span className="text-xs font-semibold text-red-800">Eliminare?</span>
                      <Pulsante
                        variante="pericolo"
                        dimensione="piccolo"
                        disabled={busy}
                        onClick={async () => {
                          await esegui(() => sbusta(azioneEliminaPacchetto(p.id)));
                          setDaEliminare(null);
                        }}
                      >
                        Sì
                      </Pulsante>
                      <Pulsante dimensione="piccolo" onClick={() => setDaEliminare(null)}>
                        No
                      </Pulsante>
                    </>
                  ) : (
                    <>
                      <Pulsante
                        variante="leggero"
                        dimensione="piccolo"
                        disabled={!!modifica}
                        onClick={() =>
                          setModifica({
                            id: p.id,
                            f: {
                              nome: p.nome,
                              descrizione: p.descrizione,
                              attivo: p.attivo,
                              righe: p.righe.map((r) => ({ servizioCatalogoId: r.servizioCatalogoId, descrizione: r.descrizione, prezzoUnitario: r.prezzoUnitario, quantitaPer: r.quantitaPer })),
                            },
                          })
                        }
                      >
                        Modifica
                      </Pulsante>
                      <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} onClick={() => setDaEliminare(p.id)}>
                        Elimina
                      </Pulsante>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-stone-600">Modificare o eliminare un pacchetto non cambia gli eventi a cui è già stato applicato.</p>
      </Sezione>
    </div>
  );
}
