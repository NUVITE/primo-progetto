"use client";

import { BedDouble, Check, Undo2 } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneAddebitoCamera, azioneStornaDiOggi, datiAddebiti } from "./actions";

type Dati = Awaited<ReturnType<typeof datiAddebiti>>;
const eur = (n: number) => `€ ${n.toFixed(2)}`;

/** Addebiti dei reparti: si tocca la camera, si sceglie il reparto, si scrive l'importo. Pensata per il tablet. */
export function AddebitiReparti({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [camera, setCamera] = useState<Dati["camere"][number] | null>(null);
  const [f, setF] = useState({ repartoId: String(iniziale.reparti[0]?.id ?? ""), descrizione: "", quantita: "1", prezzo: "", buono: "" });
  const [storno, setStorno] = useState<null | { id: number; motivo: string }>(null);
  const [busy, setBusy] = useState(false);
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

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Addebiti dei reparti" sottotitolo={`Consumi sul conto delle camere · ${d.giorno.split("-").reverse().join("/")}`} />
      <Suggerimento id="addebiti-reparti" titolo="Come si segna un consumo">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Tocca la camera dell&apos;ospite (compaiono solo quelle con ospiti in casa).</li>
          <li>Scegli il reparto, scrivi cosa ha consumato, quantità e prezzo, e il numero del buono se c&apos;è.</li>
          <li>Il consumo va sul conto della camera e lo trovi al check-out. Se hai sbagliato, stornalo dall&apos;elenco di oggi con il motivo.</li>
        </ol>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {!camera ? (
        <Sezione titolo="Camere con ospiti in casa">
          {d.camere.length === 0 ? (
            <p className="text-sm text-stone-600">Nessuna camera con ospiti arrivati oggi.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {d.camere.map((c) => (
                <button
                  key={c.segmentoId}
                  type="button"
                  className="flex min-h-16 flex-col items-start justify-center rounded-lg border border-stone-300 bg-white px-3 py-2 text-left shadow-sm hover:border-teal-600 hover:bg-teal-50 pointer-coarse:min-h-20"
                  onClick={() => {
                    setCamera(c);
                    setMsg(null);
                  }}
                >
                  <span className="flex items-center gap-1.5 text-lg font-bold text-stone-900">
                    <BedDouble className="h-4 w-4 text-teal-700" aria-hidden /> {c.camera}
                  </span>
                  <span className="truncate text-xs text-stone-600">{c.ospite}</span>
                </button>
              ))}
            </div>
          )}
        </Sezione>
      ) : (
        <Sezione titolo={`Camera ${camera.camera} · ${camera.ospite}`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Campo etichetta="Reparto" obbligatorio>
              <Select value={f.repartoId} onChange={(e) => setF({ ...f, repartoId: e.target.value })}>
                {d.reparti.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Cosa" className="lg:col-span-2">
              <Input value={f.descrizione} placeholder="es. 2 caffè, acqua minerale" onChange={(e) => setF({ ...f, descrizione: e.target.value })} />
            </Campo>
            <Campo etichetta="Quantità" obbligatorio>
              <Input type="number" min={1} inputMode="numeric" value={f.quantita} onChange={(e) => setF({ ...f, quantita: e.target.value })} />
            </Campo>
            <Campo etichetta="Prezzo cad. (€)" obbligatorio>
              <Input inputMode="decimal" value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} />
            </Campo>
            <Campo etichetta="N. buono">
              <Input value={f.buono} onChange={(e) => setF({ ...f, buono: e.target.value })} />
            </Campo>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pulsante
              variante="primario"
              icona={Check}
              disabled={busy || !f.repartoId || !f.prezzo || !f.quantita}
              onClick={async () => {
                const ok = await esegui(
                  () =>
                    sbusta(
                      azioneAddebitoCamera(camera.segmentoId, {
                        repartoId: Number(f.repartoId),
                        descrizione: f.descrizione,
                        quantita: Number(f.quantita),
                        prezzoUnitario: Number(f.prezzo.replace(",", ".")),
                        buono: f.buono,
                      }),
                    ),
                  `Segnato sul conto della camera ${camera.camera}.`,
                );
                if (ok) {
                  setCamera(null);
                  setF({ ...f, descrizione: "", quantita: "1", prezzo: "", buono: "" });
                }
              }}
            >
              Segna sul conto
            </Pulsante>
            <Pulsante onClick={() => setCamera(null)}>Altra camera</Pulsante>
          </div>
        </Sezione>
      )}

      <Sezione titolo={`Addebiti di oggi (${d.oggi.filter((a) => !a.stornato).length})`}>
        {d.oggi.length === 0 ? (
          <p className="text-sm text-stone-600">Nessun addebito oggi.</p>
        ) : (
          <ul className="divide-y divide-stone-100 text-sm">
            {d.oggi.map((a) => (
              <li key={a.id} className={`flex flex-wrap items-center gap-2 py-1.5 ${a.stornato ? "text-stone-400 line-through" : ""}`}>
                <span className="w-12 font-bold">{a.camera}</span>
                <span className="min-w-0 flex-1">
                  {a.reparto}
                  {a.descrizione !== a.reparto ? ` · ${a.descrizione}` : ""} × {a.quantita}
                  {a.buono ? ` · buono ${a.buono}` : ""}
                  <span className="text-xs text-stone-500">
                    {" "}
                    · {new Date(a.ora).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} {a.registratoDa}
                  </span>
                </span>
                <span className="font-mono">{eur(a.importo)}</span>
                {!a.stornato &&
                  (storno?.id === a.id ? (
                    <span className="flex items-center gap-1">
                      <Input className="h-8 w-40" placeholder="Motivo" value={storno.motivo} onChange={(e) => setStorno({ ...storno, motivo: e.target.value })} />
                      <Pulsante
                        variante="pericolo"
                        dimensione="piccolo"
                        disabled={busy || !storno.motivo.trim()}
                        onClick={async () => {
                          if (await esegui(() => sbusta(azioneStornaDiOggi(a.id, storno.motivo)), "Addebito stornato.")) setStorno(null);
                        }}
                      >
                        Storna
                      </Pulsante>
                      <Pulsante dimensione="piccolo" onClick={() => setStorno(null)}>
                        No
                      </Pulsante>
                    </span>
                  ) : (
                    <Pulsante variante="leggero" dimensione="piccolo" icona={Undo2} onClick={() => setStorno({ id: a.id, motivo: "" })}>
                      Storna
                    </Pulsante>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </Sezione>
    </div>
  );
}
