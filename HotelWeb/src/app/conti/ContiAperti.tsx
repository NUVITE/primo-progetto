"use client";

import { BellRing, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Etichetta, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneSollecito, datiConti } from "./actions";

type Riga = Awaited<ReturnType<typeof datiConti>>[number];

const it = (g: string) => g.slice(0, 10).split("-").reverse().join("/");
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

const GRUPPI = [
  { chiave: "da_decidere", titolo: "Partiti con il conto da saldare", aiuto: "Nessuno ha ancora deciso: registra il pagamento o lascia il conto in sospeso dal dettaglio." },
  { chiave: "sospesi", titolo: "Conti in sospeso", aiuto: "Lasciati aperti con una nota (es. pagherà l'agenzia a 30 giorni). Si chiudono da soli quando registri il pagamento." },
  { chiave: "penali", titolo: "Penali da incassare", aiuto: "Prenotazioni annullate con una penale più alta di quanto già incassato." },
] as const;

export function ContiAperti({ iniziale }: { iniziale: Riga[] }) {
  const [righe, setRighe] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const totale = righe.reduce((t, r) => t + r.daPagare, 0);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Conti aperti e sospesi" sottotitolo={righe.length ? `${righe.length} conti, ${eur(totale)} da incassare` : "Nessun conto da chiudere"} />
      <Suggerimento id="conti-sospesi" titolo="A cosa serve">
        <p>
          Un soggiorno finisce con il saldo pagato oppure con un conto <strong>in sospeso</strong> esplicito, mai con un &quot;da pagare&quot; dimenticato. Qui
          trovi chi è partito senza saldare, i conti lasciati in sospeso (con il sollecito) e le penali di annullamento ancora da incassare. Apri la
          prenotazione per registrare il pagamento.
        </p>
      </Suggerimento>
      {errore && <Avviso tipo="errore">{errore}</Avviso>}
      {righe.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Tutti i conti sono chiusi.
        </p>
      )}
      {GRUPPI.map((g) => {
        const lista = righe.filter((r) => r.gruppo === g.chiave);
        if (!lista.length) return null;
        return (
          <Sezione key={g.chiave} titolo={`${g.titolo} (${lista.length})`}>
            <AiutoSezione breve={g.aiuto}>
              <Esempio>Gruppo partito sabato, l&apos;agenzia paga con bonifico a 30 giorni: si lascia in sospeso a carico dell&apos;agenzia con la nota.</Esempio>
            </AiutoSezione>
            <table className="tabella-responsive mt-3 w-full text-sm">
              <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
                <tr>
                  <th className="py-1.5 pr-2">Prenotazione</th>
                  <th className="py-1.5 pr-2">{g.chiave === "penali" ? "Annullata" : "Partenza"}</th>
                  <th className="py-1.5 pr-2">A carico di</th>
                  <th className="py-1.5 pr-2 text-right">Da incassare</th>
                  <th className="py-1.5 pr-2" />
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} className="border-b border-stone-100 align-top last:border-0">
                    <td data-label="Prenotazione" className="py-1.5 pr-2">
                      <Link href={`/prenotazioni/${r.id}`} className="font-semibold text-stone-900 hover:underline">
                        {r.cliente}
                      </Link>{" "}
                      <span className="text-xs text-stone-500">#{r.id}</span>
                      {r.tramite && <div className="text-xs text-stone-600">tramite {r.tramite}</div>}
                      {r.sospeso?.nota && <div className="text-xs text-stone-700">{r.sospeso.nota}</div>}
                    </td>
                    <td data-label="Data" className="py-1.5 pr-2 font-mono text-xs">
                      {r.partenza ? it(r.partenza) : "—"}
                    </td>
                    <td data-label="A carico di" className="py-1.5 pr-2">
                      {r.sospeso ? (r.sospeso.aCarico ?? "l'ospite") : (r.pagante ?? "l'ospite")}
                      {r.sospeso?.sollecitoIl && <div className="text-xs text-stone-600">sollecitato il {it(r.sospeso.sollecitoIl)}</div>}
                    </td>
                    <td data-label="Da incassare" className="py-1.5 pr-2 text-right font-mono font-semibold">
                      {eur(r.daPagare)}
                    </td>
                    <td className="cella-intera py-1.5 md:text-right">
                      {g.chiave === "da_decidere" && <Etichetta tono="rosso">da decidere</Etichetta>}
                      {r.sospeso && (
                        <Pulsante
                          variante="leggero"
                          dimensione="piccolo"
                          icona={BellRing}
                          disabled={busy}
                          title="Segna che oggi hai sollecitato il pagamento"
                          onClick={async () => {
                            setErrore(null);
                            setBusy(true);
                            try {
                              setRighe(await sbusta(azioneSollecito(r.id, oggi())));
                            } catch (e) {
                              setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Sollecitato oggi
                        </Pulsante>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Sezione>
        );
      })}
    </div>
  );
}
