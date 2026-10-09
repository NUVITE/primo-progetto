"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { ELENCO_PASTI, PASTI, type Pasto } from "@/lib/pastiRegole";
import { descriviMenu } from "@/lib/menuRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCreaMenu, azioneEliminaMenu, datiElencoMenu } from "../actions";

type Menu = Awaited<ReturnType<typeof datiElencoMenu>>[number];
/** Elenco dei menu (colazione, del giorno, alla carta, room service) e creazione di uno nuovo. */
export function ElencoMenu({ iniziale }: { iniziale: Menu[] }) {
  const router = useRouter();
  const [lista, setLista] = useState(iniziale);
  const [nuovo, setNuovo] = useState<null | { nome: string; pasti: Pasto[]; giorno: string; roomService: boolean }>(null);
  const [daTogliere, setDaTogliere] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function prova<T>(fn: () => Promise<T>) {
    setErrore(null);
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Menu"
        sottotitolo={`${lista.filter((m) => m.attivo).length} menu attivi`}
        azioni={
          !nuovo && (
            <Pulsante variante="primario" dimensione="piccolo" icona={Plus} onClick={() => setNuovo({ nome: "", pasti: ["cena"], giorno: "", roomService: false })}>
              Nuovo menu
            </Pulsante>
          )
        }
      />
      <Suggerimento id="menu" titolo="Come si usano i menu">
        <p>
          Un menu è un elenco di piatti presi da <Link href="/ristorazione/piatti" className="font-semibold underline">Piatti e allergeni</Link>. Si indica
          per quali servizi vale (colazione, pranzo, cena) e, per il menu del giorno, la data: il foglio del giorno lo usa per avvisare la sala dei
          piatti da non servire agli ospiti allergici. Il menu del giorno di domani si fa duplicando quello di oggi.
        </p>
      </Suggerimento>
      {errore && <Avviso tipo="errore">{errore}</Avviso>}

      {nuovo && (
        <Sezione titolo="Nuovo menu">
          <AiutoSezione breve="Prima nome e servizi, poi nel menu si aggiungono i piatti.">
            <Esempio>«Menu del giorno» per la cena del 12/10, oppure «Colazione» per la colazione, valido sempre.</Esempio>
          </AiutoSezione>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <Campo etichetta="Nome" obbligatorio>
              <Input value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} />
            </Campo>
            <Campo etichetta="Solo per il giorno" aiuto="Vuoto = vale sempre.">
              <Input type="date" value={nuovo.giorno} onChange={(e) => setNuovo({ ...nuovo, giorno: e.target.value })} />
            </Campo>
            <div className="flex flex-wrap gap-3 pb-2">
              {ELENCO_PASTI.map((p) => (
                <Spunta
                  key={p}
                  etichetta={PASTI[p]}
                  checked={nuovo.pasti.includes(p)}
                  onChange={(e) => setNuovo({ ...nuovo, pasti: e.target.checked ? [...nuovo.pasti, p] : nuovo.pasti.filter((x) => x !== p) })}
                />
              ))}
              <Spunta etichetta="Room service" checked={nuovo.roomService} onChange={(e) => setNuovo({ ...nuovo, roomService: e.target.checked })} />
            </div>
            <Pulsante
              variante="primario"
              disabled={busy || !nuovo.nome.trim()}
              onClick={async () => {
                const id = await prova(() =>
                  sbusta(azioneCreaMenu({ nome: nuovo.nome, pasti: nuovo.pasti, giorno: nuovo.giorno || null, dalle: "", alle: "", roomService: nuovo.roomService, attivo: true, note: "" })),
                );
                if (id) router.push(`/ristorazione/menu/${id}`);
              }}
            >
              Crea e aggiungi i piatti
            </Pulsante>
            <Pulsante onClick={() => setNuovo(null)}>Annulla</Pulsante>
          </div>
        </Sezione>
      )}

      <Sezione titolo="Elenco">
        <ul className="divide-y divide-stone-100 text-sm">
          {lista.map((m) => (
            <li key={m.id} className={`flex flex-wrap items-center gap-2 py-2 ${m.attivo ? "" : "text-stone-400"}`}>
              <span className="min-w-0 flex-1">
                <Link href={`/ristorazione/menu/${m.id}`} className="font-semibold hover:underline">
                  {m.nome}
                </Link>
                {!m.attivo && <Etichetta className="ml-1">non attivo</Etichetta>}
                <span className="block text-xs text-stone-600">
                  {descriviMenu(m)} · {m.piatti} piatti
                </span>
              </span>
              {daTogliere === m.id ? (
                <span className="flex items-center gap-1">
                  <span className="text-xs">Eliminare il menu? (I piatti restano.)</span>
                  <Pulsante
                    variante="pericolo"
                    dimensione="piccolo"
                    disabled={busy}
                    onClick={async () => {
                      const r = await prova(() => sbusta(azioneEliminaMenu(m.id)));
                      if (r) {
                        setLista(r);
                        setDaTogliere(null);
                      }
                    }}
                  >
                    Elimina
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setDaTogliere(null)}>
                    No
                  </Pulsante>
                </span>
              ) : (
                <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} aria-label={`Elimina ${m.nome}`} onClick={() => setDaTogliere(m.id)} />
              )}
            </li>
          ))}
          {lista.length === 0 && <li className="py-3 text-stone-600">Nessun menu.</li>}
        </ul>
      </Sezione>
    </div>
  );
}
