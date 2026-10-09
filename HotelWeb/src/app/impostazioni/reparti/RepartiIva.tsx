"use client";

import { Plus, Save } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneAliquotaAlloggio, azioneSalvaArticolo, azioneSalvaReparto, datiReparti } from "./actions";

type Dati = Awaited<ReturnType<typeof datiReparti>>;
type Reparto = Dati["reparti"][number];

export function RepartiIva({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [alloggio, setAlloggio] = useState(String(iniziale.aliquotaAlloggio));
  const [modifica, setModifica] = useState<null | { id: number | null; nome: string; aliquota: string; esborso: boolean; attivo: boolean }>(null);
  const [busy, setBusy] = useState(false);
  const [articoli, setArticoli] = useState<number | null>(null);
  const [articolo, setArticolo] = useState<null | { id: number | null; nome: string; prezzo: string; attivo: boolean }>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok: string) {
    setMsg(null);
    setBusy(true);
    try {
      setD(await fn());
      setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const apri = (r: Reparto | null) =>
    setModifica(r ? { id: r.id, nome: r.nome, aliquota: r.aliquotaIva === null ? "" : String(r.aliquotaIva), esborso: r.esborso, attivo: r.attivo } : { id: null, nome: "", aliquota: "22", esborso: false, attivo: true });

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Reparti e IVA" sottotitolo="Aliquote del conto e reparti che addebitano i consumi" />
      <Suggerimento id="reparti-iva" titolo="A cosa servono">
        <p>
          Ogni voce del conto ha la sua IVA: camere e trattamenti quella qui sotto, i consumi quella del reparto che li addebita, i servizi quella
          indicata nel catalogo Servizi. Imposta di soggiorno ed esborsi sono fuori campo IVA. I prezzi si scrivono sempre IVA inclusa.
        </p>
      </Suggerimento>
      <Avviso tipo="avviso">
        Le aliquote di partenza (10% camere, pasti e bar; 22% lavanderia, garage, telefono) sono indicative: <strong>verificale con il commercialista</strong>{" "}
        prima di inviare i conti al gestionale per la fattura.
      </Avviso>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      <Sezione titolo="Camere e trattamenti">
        <div className="flex flex-wrap items-end gap-3">
          <Campo etichetta="IVA (%)" aiuto="Vale per camere, pensione o mezza pensione compresa, uso diurno e per i servizi senza aliquota propria.">
            <Input type="number" min={0} max={100} step="0.5" className="w-28" value={alloggio} onChange={(e) => setAlloggio(e.target.value)} />
          </Campo>
          <Pulsante variante="primario" icona={Save} disabled={busy || alloggio === ""} onClick={() => esegui(() => sbusta(azioneAliquotaAlloggio(Number(alloggio))), "Aliquota salvata.")}>
            Salva
          </Pulsante>
        </div>
      </Sezione>

      <Sezione
        titolo="Reparti"
        azioni={
          !modifica && (
            <Pulsante dimensione="piccolo" variante="primario" icona={Plus} onClick={() => apri(null)}>
              Nuovo reparto
            </Pulsante>
          )
        }
      >
        <AiutoSezione breve="Chi segna i consumi sul conto delle camere: ognuno con la sua IVA.">
          <Esempio>Bar 10%: due caffè a 1,50 € = 3,00 € in conto, imponibile 2,73 € e IVA 0,27 €.</Esempio>
          <p>
            Un reparto &quot;esborso&quot; raccoglie le spese anticipate per l&apos;ospite (taxi, biglietti): sono fuori campo IVA. Un reparto non più
            usato si disattiva (i conti vecchi restano com&apos;erano).
          </p>
        </AiutoSezione>
        {modifica && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-teal-200 bg-teal-50/50 p-3">
            <Campo etichetta="Nome" obbligatorio>
              <Input value={modifica.nome} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} />
            </Campo>
            {!modifica.esborso && (
              <Campo etichetta="IVA (%)" aiuto="Vuoto = fuori campo IVA.">
                <Input type="number" min={0} max={100} step="0.5" className="w-28" value={modifica.aliquota} onChange={(e) => setModifica({ ...modifica, aliquota: e.target.value })} />
              </Campo>
            )}
            <Spunta etichetta="Esborso (spese anticipate)" checked={modifica.esborso} onChange={(e) => setModifica({ ...modifica, esborso: e.target.checked })} />
            <Spunta etichetta="Attivo" checked={modifica.attivo} onChange={(e) => setModifica({ ...modifica, attivo: e.target.checked })} />
            <Pulsante
              variante="primario"
              disabled={busy || !modifica.nome.trim()}
              onClick={async () => {
                const ok = await esegui(
                  () =>
                    sbusta(
                      azioneSalvaReparto(modifica.id, {
                        nome: modifica.nome,
                        aliquotaIva: modifica.esborso || modifica.aliquota === "" ? null : Number(modifica.aliquota),
                        esborso: modifica.esborso,
                        attivo: modifica.attivo,
                      }),
                    ),
                  "Reparto salvato.",
                );
                if (ok) setModifica(null);
              }}
            >
              Salva
            </Pulsante>
            <Pulsante onClick={() => setModifica(null)}>Annulla</Pulsante>
          </div>
        )}
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {d.reparti.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-1.5">
              <span className={`min-w-0 flex-1 font-semibold ${r.attivo ? "text-stone-900" : "text-stone-400"}`}>{r.nome}</span>
              {!r.attivo && <Etichetta>non attivo</Etichetta>}
              <span className="w-40 text-right">{r.esborso ? "esborso, fuori campo" : r.aliquotaIva === null ? "fuori campo" : `IVA ${r.aliquotaIva}%`}</span>
              {!r.esborso && (
                <Pulsante variante="leggero" dimensione="piccolo" onClick={() => setArticoli(articoli === r.id ? null : r.id)}>
                  Articoli ({d.articoli.filter((a) => a.repartoId === r.id).length})
                </Pulsante>
              )}
              <Pulsante variante="leggero" dimensione="piccolo" disabled={!!modifica} onClick={() => apri(r)}>
                Modifica
              </Pulsante>
              {articoli === r.id && (
                <div className="w-full rounded-md border border-stone-200 bg-stone-50 p-2">
                  <p className="text-xs text-stone-600">
                    Articoli a prezzo fisso, da segnare con un tocco (es. per il frigobar: le cameriere li segnano dalla loro pagina e vanno sul conto).
                  </p>
                  <ul className="mt-1 divide-y divide-stone-200">
                    {d.articoli
                      .filter((a) => a.repartoId === r.id)
                      .map((a) => (
                        <li key={a.id} className={`flex items-center gap-2 py-1 ${a.attivo ? "" : "text-stone-400"}`}>
                          <span className="min-w-0 flex-1">{a.nome}</span>
                          <span className="font-mono">€ {a.prezzo.toFixed(2)}</span>
                          <Pulsante variante="leggero" dimensione="piccolo" onClick={() => setArticolo({ id: a.id, nome: a.nome, prezzo: String(a.prezzo), attivo: a.attivo })}>
                            Modifica
                          </Pulsante>
                        </li>
                      ))}
                  </ul>
                  {articolo ? (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <Campo etichetta="Articolo" obbligatorio>
                        <Input value={articolo.nome} onChange={(e) => setArticolo({ ...articolo, nome: e.target.value })} />
                      </Campo>
                      <Campo etichetta="Prezzo (€, IVA inclusa)" obbligatorio>
                        <Input inputMode="decimal" className="w-28" value={articolo.prezzo} onChange={(e) => setArticolo({ ...articolo, prezzo: e.target.value })} />
                      </Campo>
                      <Spunta etichetta="Attivo" checked={articolo.attivo} onChange={(e) => setArticolo({ ...articolo, attivo: e.target.checked })} />
                      <Pulsante
                        variante="primario"
                        dimensione="piccolo"
                        disabled={busy || !articolo.nome.trim() || !articolo.prezzo}
                        onClick={async () => {
                          const ok = await esegui(
                            () => sbusta(azioneSalvaArticolo(articolo.id, { repartoId: r.id, nome: articolo.nome, prezzo: Number(articolo.prezzo.replace(",", ".")), attivo: articolo.attivo })),
                            "Articolo salvato.",
                          );
                          if (ok) setArticolo(null);
                        }}
                      >
                        Salva
                      </Pulsante>
                      <Pulsante dimensione="piccolo" onClick={() => setArticolo(null)}>
                        Annulla
                      </Pulsante>
                    </div>
                  ) : (
                    <Pulsante dimensione="piccolo" icona={Plus} className="mt-2" onClick={() => setArticolo({ id: null, nome: "", prezzo: "", attivo: true })}>
                      Nuovo articolo
                    </Pulsante>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Sezione>
    </div>
  );
}
