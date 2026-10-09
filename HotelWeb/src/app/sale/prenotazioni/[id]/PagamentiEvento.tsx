"use client";

import { Plus, Undo2 } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Campo, Input, Pulsante, Select } from "@/components/ui";
import { azionePagamentoSala, azioneStornaPagamentoSala, datiDettaglioSala } from "../../actions";
import { euro, it } from "../../componenti";

type Dettaglio = Awaited<ReturnType<typeof datiDettaglioSala>>["dettaglio"];

const METODI = [
  ["contanti", "Contanti"],
  ["carta", "Carta di credito"],
  ["bancomat", "Bancomat"],
  ["bonifico", "Bonifico"],
  ["assegno", "Assegno"],
  ["altro", "Altro"],
] as const;
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/** Acconti, saldo e rimborsi dell'evento: entrano nella cassa del giorno come quelli delle camere. */
export function PagamentiEvento({
  evento: d,
  puoIncassare,
  busy,
  esegui,
}: {
  evento: Dettaglio;
  puoIncassare: boolean;
  busy: boolean;
  esegui: (fn: () => Promise<Dettaglio>, ok: string) => Promise<boolean>;
}) {
  const [nuovo, setNuovo] = useState<null | { data: string; importo: string; metodo: string; tipo: string; nota: string }>(null);
  const [storno, setStorno] = useState<null | { id: number; motivo: string }>(null);
  const annullata = d.stato === "annullata";

  return (
    <div className="mt-4 border-t border-stone-200 pt-3">
      <p className="text-sm font-semibold text-stone-800">Pagamenti</p>
      {d.pagamenti.length === 0 && <p className="mt-1 text-sm text-stone-600">Nessun pagamento registrato.</p>}
      {d.pagamenti.length > 0 && (
        <ul className="mt-1 divide-y divide-stone-100 text-sm">
          {d.pagamenti.map((x) => (
            <li key={x.id} className={`flex flex-wrap items-center gap-2 py-1.5 ${x.stornato ? "text-stone-400" : ""}`}>
              <span className="font-mono text-xs">{it(x.data)}</span>
              <span className={`min-w-0 flex-1 ${x.stornato ? "line-through" : ""}`}>
                {x.tipoTesto} · {x.metodo}
                {x.nota && <span className="text-xs text-stone-500"> · {x.nota}</span>}
                <span className="text-xs text-stone-500"> · {x.registratoDa}</span>
              </span>
              <span className={`font-mono ${x.stornato ? "line-through" : x.tipo === "rimborso" ? "text-red-700" : "font-semibold"}`}>
                {x.tipo === "rimborso" ? "−" : ""}
                {euro(x.importo)}
              </span>
              {x.stornato && <span className="w-full text-xs">stornato da {x.stornato.da}: {x.stornato.motivo}</span>}
              {!x.stornato && puoIncassare && storno?.id !== x.id && (
                <Pulsante variante="leggero" dimensione="piccolo" icona={Undo2} onClick={() => setStorno({ id: x.id, motivo: "" })}>
                  Storna
                </Pulsante>
              )}
              {storno?.id === x.id && (
                <span className="flex w-full items-center gap-1">
                  <Input className="h-7" placeholder="Motivo dello storno" value={storno.motivo} onChange={(e) => setStorno({ ...storno, motivo: e.target.value })} />
                  <Pulsante
                    variante="pericolo"
                    dimensione="piccolo"
                    disabled={busy || !storno.motivo.trim()}
                    onClick={async () => {
                      if (await esegui(() => sbusta(azioneStornaPagamentoSala(storno.id, storno.motivo)), "Pagamento stornato.")) setStorno(null);
                    }}
                  >
                    Storna
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setStorno(null)}>
                    No
                  </Pulsante>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {puoIncassare && !annullata && !nuovo && (
        <Pulsante
          dimensione="piccolo"
          icona={Plus}
          className="mt-2"
          onClick={() =>
            setNuovo({
              data: oggi(),
              importo: d.totali.daPagare > 0 ? d.totali.daPagare.toFixed(2) : "",
              metodo: "bonifico",
              tipo: d.totali.pagato > 0 ? "saldo" : "acconto",
              nota: "",
            })
          }
        >
          Registra pagamento
        </Pulsante>
      )}
      {puoIncassare && annullata && d.totali.pagato > 0 && !nuovo && (
        <Pulsante
          dimensione="piccolo"
          className="mt-2"
          onClick={() => setNuovo({ data: oggi(), importo: d.totali.pagato.toFixed(2), metodo: "bonifico", tipo: "rimborso", nota: "" })}
        >
          Registra rimborso
        </Pulsante>
      )}
      {nuovo && (
        <div className="mt-2 grid gap-2 rounded-md border border-teal-200 bg-teal-50/50 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <Campo etichetta="Tipo">
            <Select value={nuovo.tipo} onChange={(e) => setNuovo({ ...nuovo, tipo: e.target.value })}>
              <option value="caparra">Caparra confirmatoria</option>
              <option value="acconto">Acconto</option>
              <option value="saldo">Saldo</option>
              <option value="rimborso">Rimborso</option>
            </Select>
          </Campo>
          <Campo etichetta="Importo (€)" obbligatorio>
            <Input type="number" min={0} step="0.01" value={nuovo.importo} onChange={(e) => setNuovo({ ...nuovo, importo: e.target.value })} />
          </Campo>
          <Campo etichetta="Metodo">
            <Select value={nuovo.metodo} onChange={(e) => setNuovo({ ...nuovo, metodo: e.target.value })}>
              {METODI.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etichetta="Data">
            <Input type="date" value={nuovo.data} onChange={(e) => setNuovo({ ...nuovo, data: e.target.value })} />
          </Campo>
          <Campo etichetta="Nota">
            <Input value={nuovo.nota} placeholder="es. numero del bonifico" onChange={(e) => setNuovo({ ...nuovo, nota: e.target.value })} />
          </Campo>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <Pulsante
              variante="primario"
              dimensione="piccolo"
              disabled={busy || !(Number(nuovo.importo) > 0)}
              onClick={async () => {
                const ok = await esegui(
                  () => sbusta(azionePagamentoSala(d.id, { data: nuovo.data, importo: Number(nuovo.importo), metodo: nuovo.metodo, tipo: nuovo.tipo, nota: nuovo.nota })),
                  "Pagamento registrato.",
                );
                if (ok) setNuovo(null);
              }}
            >
              Registra
            </Pulsante>
            <Pulsante dimensione="piccolo" onClick={() => setNuovo(null)}>
              Annulla
            </Pulsante>
          </div>
        </div>
      )}
    </div>
  );
}
