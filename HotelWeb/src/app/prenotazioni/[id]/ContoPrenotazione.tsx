"use client";

import { Plus, Printer, Receipt, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, classePulsante, Etichetta, Input, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { azioneAddebito, azioneStornaAddebito, caricaPrenotazione } from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Esegui = <T>(fn: () => Promise<T>) => Promise<T | null>;
type Tipo = "extra" | "esborso" | "abbuono";

const eur = (n: number) => `€ ${n.toFixed(2)}`;
const it = (g: string) => g.split("-").reverse().join("/");
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const aliquotaTesto = (a: number | null, natura: string | null) => (a === null ? (natura ?? "fuori campo") : `IVA ${a.toLocaleString("it-IT")}%`);

/**
 * Conto della prenotazione: righe automatiche (camere, servizi, tassa) e a mano (consumi dei reparti,
 * esborsi, abbuoni), con l'IVA per voce e il riepilogo per aliquota. Proforma stampabile.
 */
export function ContoPrenotazione({ prenotazione: p, salvando, esegui, aggiorna }: { prenotazione: Prenotazione; salvando: boolean; esegui: Esegui; aggiorna: (p: Prenotazione) => void }) {
  const c = p.contoVoci;
  const [nuovo, setNuovo] = useState<null | { tipo: Tipo; repartoId: string; segmentoId: string; data: string; descrizione: string; quantita: string; prezzo: string; buono: string; nota: string }>(null);
  const [storno, setStorno] = useState<null | { id: number; motivo: string }>(null);
  if (!p.importiVisibili) return null;
  const annullata = p.stato === "ANNULLATA";
  const camere = p.segmenti.filter((s) => !s.annullata && !s.usoDiurno);
  const totale = c.righe.filter((r) => !r.stornato).reduce((t, r) => t + r.importo, 0);

  function apri(tipo: Tipo) {
    const reparto = tipo === "esborso" ? c.reparti.find((r) => r.esborso) : tipo === "extra" ? c.reparti.find((r) => !r.esborso) : undefined;
    setNuovo({
      tipo,
      repartoId: reparto ? String(reparto.id) : "",
      segmentoId: camere.length === 1 ? String(camere[0].id) : "",
      data: oggi(),
      descrizione: "",
      quantita: "1",
      prezzo: "",
      buono: "",
      nota: "",
    });
  }

  return (
    <Sezione
      titolo={
        <span className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-teal-700" aria-hidden /> Conto
        </span>
      }
      azioni={
        <Link href={`/prenotazioni/${p.id}/proforma`} target="_blank" className={classePulsante("secondario", "piccolo")}>
          <Printer className="h-3.5 w-3.5" aria-hidden /> Proforma
        </Link>
      }
    >
      <AiutoSezione breve="Tutto quello che l'ospite deve pagare, voce per voce, con l'IVA. Le righe di camere, servizi e tassa si aggiornano da sole.">
        <p>
          Con <strong>Consumo</strong> si segnano bar, ristorante, frigobar, lavanderia…: l&apos;IVA è quella del reparto. Un{" "}
          <strong>esborso</strong> è una spesa anticipata per l&apos;ospite (taxi, biglietti): fuori campo IVA. Un <strong>abbuono</strong> toglie un
          importo, con il motivo. Un addebito sbagliato non si cancella: si storna.
        </p>
        <p>Il proforma non è un documento fiscale: la fattura la emette il gestionale con questi dati. Le aliquote si impostano in Impostazioni.</p>
        <Esempio>Due caffè al bar a 1,50 € = consumo Bar, quantità 2, 1,50 €: in conto 3,00 € di cui IVA 10% 0,27 €.</Esempio>
      </AiutoSezione>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
            <tr>
              <th className="py-1.5 pr-2">Data</th>
              <th className="py-1.5 pr-2">Voce</th>
              <th className="py-1.5 pr-2 text-right">Q.tà</th>
              <th className="py-1.5 pr-2 text-right">Importo</th>
              <th className="py-1.5 pr-2">IVA</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {c.righe.map((r) => (
              <tr key={r.chiave} className={`border-b border-stone-100 align-top ${r.stornato ? "text-stone-400 line-through" : ""}`}>
                <td className="py-1.5 pr-2 font-mono text-xs whitespace-nowrap">{r.data ? it(r.data) : "—"}</td>
                <td className="py-1.5 pr-2">
                  {r.descrizione}
                  {r.reparto && r.reparto !== r.descrizione && <span className="text-xs text-stone-500"> · {r.reparto}</span>}
                  {r.camera && r.tipo !== "camera" && <span className="text-xs text-stone-500"> · camera {r.camera}</span>}
                  {r.buono && <span className="text-xs text-stone-500"> · buono {r.buono}</span>}
                  {r.tipo === "abbuono" && <Etichetta className="ml-1">abbuono</Etichetta>}
                  {r.tipo === "esborso" && <Etichetta className="ml-1">esborso</Etichetta>}
                  {r.stornato && <div className="text-xs no-underline">stornato da {r.stornato.da}: {r.stornato.motivo}</div>}
                </td>
                <td className="py-1.5 pr-2 text-right">{r.quantita}</td>
                <td className="py-1.5 pr-2 text-right font-mono">{eur(r.importo)}</td>
                <td className="py-1.5 pr-2 text-xs">{aliquotaTesto(r.aliquota, r.natura)}</td>
                <td className="py-1.5 text-right">
                  {r.addebitoId && !r.stornato && c.puoAddebitare && !annullata && storno?.id !== r.addebitoId && (
                    <Pulsante variante="leggero" dimensione="piccolo" icona={Undo2} onClick={() => setStorno({ id: r.addebitoId!, motivo: "" })}>
                      Storna
                    </Pulsante>
                  )}
                  {storno?.id === r.addebitoId && (
                    <span className="flex items-center gap-1">
                      <Input className="h-7 w-40" placeholder="Motivo" value={storno.motivo} onChange={(e) => setStorno({ ...storno, motivo: e.target.value })} />
                      <Pulsante
                        variante="pericolo"
                        dimensione="piccolo"
                        disabled={salvando || !storno.motivo.trim()}
                        onClick={async () => {
                          const x = await esegui(() => sbusta(azioneStornaAddebito(p.id, storno.id, storno.motivo)));
                          if (x) {
                            aggiorna(x);
                            setStorno(null);
                          }
                        }}
                      >
                        Storna
                      </Pulsante>
                      <Pulsante dimensione="piccolo" onClick={() => setStorno(null)}>
                        No
                      </Pulsante>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {c.righe.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-center text-stone-600">
                  Nessuna voce.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td colSpan={3} className="py-1.5 pr-2 text-right">
                Totale
              </td>
              <td className="py-1.5 pr-2 text-right font-mono">{eur(totale)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {c.riepilogoIva.length > 0 && (
        <div className="mt-3 max-w-md text-xs">
          <p className="mb-1 font-semibold text-stone-700">Riepilogo IVA</p>
          <table className="w-full">
            <tbody>
              {c.riepilogoIva.map((v, i) => (
                <tr key={i} className="border-t border-stone-100">
                  <td className="py-0.5 pr-2">{aliquotaTesto(v.aliquota, v.natura)}</td>
                  <td className="py-0.5 pr-2 text-right font-mono">imponibile {eur(v.imponibile)}</td>
                  <td className="py-0.5 text-right font-mono">{v.aliquota === null ? "" : `IVA ${eur(v.iva)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {c.puoAddebitare && !annullata && !nuovo && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Pulsante dimensione="piccolo" icona={Plus} onClick={() => apri("extra")}>
            Consumo
          </Pulsante>
          <Pulsante dimensione="piccolo" icona={Plus} onClick={() => apri("esborso")}>
            Esborso
          </Pulsante>
          {c.puoAbbuonare && (
            <Pulsante dimensione="piccolo" icona={Plus} onClick={() => apri("abbuono")}>
              Abbuono
            </Pulsante>
          )}
        </div>
      )}
      {nuovo && (
        <div className="mt-3 grid gap-2 rounded-md border border-teal-200 bg-teal-50/50 p-3 sm:grid-cols-2 lg:grid-cols-4">
          {nuovo.tipo !== "esborso" && (
            <Campo etichetta={nuovo.tipo === "abbuono" ? "Su quale reparto (IVA)" : "Reparto"} obbligatorio={nuovo.tipo === "extra"}>
              <Select value={nuovo.repartoId} onChange={(e) => setNuovo({ ...nuovo, repartoId: e.target.value })}>
                {nuovo.tipo === "abbuono" && <option value="">Camere e trattamento ({c.aliquotaAlloggio}%)</option>}
                {c.reparti
                  .filter((r) => !r.esborso)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                      {r.aliquotaIva !== null ? ` (${r.aliquotaIva}%)` : ""}
                    </option>
                  ))}
              </Select>
            </Campo>
          )}
          <Campo etichetta="Camera">
            <Select value={nuovo.segmentoId} onChange={(e) => setNuovo({ ...nuovo, segmentoId: e.target.value })}>
              <option value="">—</option>
              {camere.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.cameraCodice ? `Camera ${s.cameraCodice}` : s.tipoCameraNome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etichetta="Data" obbligatorio>
            <Input type="date" value={nuovo.data} onChange={(e) => setNuovo({ ...nuovo, data: e.target.value })} />
          </Campo>
          <Campo etichetta="Descrizione">
            <Input value={nuovo.descrizione} placeholder={nuovo.tipo === "esborso" ? "es. taxi per l'aeroporto" : "es. 2 caffè"} onChange={(e) => setNuovo({ ...nuovo, descrizione: e.target.value })} />
          </Campo>
          <Campo etichetta="Quantità" obbligatorio>
            <Input type="number" min={1} value={nuovo.quantita} onChange={(e) => setNuovo({ ...nuovo, quantita: e.target.value })} />
          </Campo>
          <Campo etichetta={nuovo.tipo === "abbuono" ? "Importo da togliere (€)" : "Prezzo unitario (€, IVA inclusa)"} obbligatorio>
            <Input inputMode="decimal" value={nuovo.prezzo} onChange={(e) => setNuovo({ ...nuovo, prezzo: e.target.value })} />
          </Campo>
          {nuovo.tipo === "extra" && (
            <Campo etichetta="N. buono">
              <Input value={nuovo.buono} onChange={(e) => setNuovo({ ...nuovo, buono: e.target.value })} />
            </Campo>
          )}
          <Campo etichetta={nuovo.tipo === "abbuono" ? "Motivo" : "Nota"} obbligatorio={nuovo.tipo === "abbuono"}>
            <Input value={nuovo.nota} onChange={(e) => setNuovo({ ...nuovo, nota: e.target.value })} />
          </Campo>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Pulsante
              variante="primario"
              disabled={salvando || !nuovo.prezzo || !nuovo.quantita}
              onClick={async () => {
                const reparto = nuovo.tipo === "esborso" ? c.reparti.find((r) => r.esborso) : undefined;
                const x = await esegui(() =>
                  sbusta(
                    azioneAddebito(p.id, {
                      tipo: nuovo.tipo,
                      segmentoId: nuovo.segmentoId ? Number(nuovo.segmentoId) : null,
                      repartoId: nuovo.tipo === "esborso" ? (reparto?.id ?? null) : nuovo.repartoId ? Number(nuovo.repartoId) : null,
                      data: nuovo.data,
                      descrizione: nuovo.descrizione,
                      quantita: Number(nuovo.quantita),
                      prezzoUnitario: Number(nuovo.prezzo.replace(",", ".")),
                      buono: nuovo.buono,
                      nota: nuovo.nota,
                    }),
                  ),
                );
                if (x) {
                  aggiorna(x);
                  setNuovo(null);
                }
              }}
            >
              Segna sul conto
            </Pulsante>
            <Pulsante onClick={() => setNuovo(null)}>Annulla</Pulsante>
          </div>
        </div>
      )}
      {c.puoAddebitare && c.reparti.length === 0 && <Avviso tipo="info" className="mt-3">Nessun reparto attivo: si creano in Impostazioni › Reparti e IVA.</Avviso>}
    </Sezione>
  );
}
