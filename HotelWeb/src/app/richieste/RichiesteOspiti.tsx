"use client";

import { AlarmClock, Check, Plus, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { sbusta } from "@/lib/esito";
import { STATI_RICHIESTA, TIPI_RICHIESTA, type TipoRichiesta } from "@/lib/richiesteRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCaricaRichieste, azioneChiudiRichiesta, azioneNuovaRichiesta, datiRichieste } from "./actions";

type Dati = Awaited<ReturnType<typeof datiRichieste>>;
const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Richieste degli ospiti per reception e governante: arrivano anche dal QR della camera, si aggiornano da sole. */
export function RichiesteOspiti({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [nuova, setNuova] = useState<null | { cameraId: string; tipo: TipoRichiesta; dettaglio: string; ora: string }>(null);
  const [annulla, setAnnulla] = useState<null | { id: number; nota: string }>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  // Le richieste dal QR arrivano senza avviso: la pagina aperta si aggiorna ogni 30 secondi.
  useEffect(() => {
    if (d.vista !== "aperte") return;
    const t = setInterval(async () => {
      try {
        setD(await sbusta(azioneCaricaRichieste("aperte")));
      } catch {
        // Rete assente: si riprova al giro dopo.
      }
    }, 30000);
    return () => clearInterval(t);
  }, [d.vista]);

  async function esegui(fn: () => Promise<Dati>, ok?: string) {
    setMsg(null);
    setBusy(true);
    try {
      setD(await fn());
      if (ok) setMsg({ tipo: "ok", testo: ok });
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
      <IntestazionePagina
        titolo="Richieste degli ospiti"
        sottotitolo={d.vista === "aperte" ? `${d.richieste.length} in attesa · si aggiorna da sola` : "Chiuse negli ultimi 7 giorni"}
        azioni={
          <span className="flex gap-2">
            {!nuova && (
              <Pulsante variante="primario" dimensione="piccolo" icona={Plus} onClick={() => setNuova({ cameraId: "", tipo: "asciugamani", dettaglio: "", ora: "" })}>
                Nuova richiesta
              </Pulsante>
            )}
            <Pulsante dimensione="piccolo" icona={RefreshCw} disabled={busy} onClick={() => esegui(() => sbusta(azioneCaricaRichieste(d.vista)))}>
              Aggiorna
            </Pulsante>
          </span>
        }
      />
      <Suggerimento id="richieste-ospiti" titolo="Come funziona">
        <p>
          Gli ospiti chiedono asciugamani, cuscini, una culla o la sveglia dal QR del cartoncino; la reception può inserire quelle ricevute a voce o al
          telefono. Le sveglie e le richieste con un orario stanno in cima, in ordine di ora. Quando è fatta, premi <strong>Fatta</strong>: l&apos;ospite lo
          vede sul telefono.
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {nuova && (
        <Sezione titolo="Nuova richiesta">
          <div className="flex flex-wrap items-end gap-3">
            <Campo etichetta="Camera" obbligatorio>
              <Select value={nuova.cameraId} onChange={(e) => setNuova({ ...nuova, cameraId: e.target.value })}>
                <option value="">Scegli…</option>
                {d.camere.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codice}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Cosa">
              <Select value={nuova.tipo} onChange={(e) => setNuova({ ...nuova, tipo: e.target.value as TipoRichiesta })}>
                {(Object.entries(TIPI_RICHIESTA) as [TipoRichiesta, string][]).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            </Campo>
            {nuova.tipo === "sveglia" && (
              <Campo etichetta="Alle" obbligatorio>
                <Input type="datetime-local" value={nuova.ora} onChange={(e) => setNuova({ ...nuova, ora: e.target.value })} />
              </Campo>
            )}
            <Campo etichetta="Dettagli">
              <Input value={nuova.dettaglio} onChange={(e) => setNuova({ ...nuova, dettaglio: e.target.value })} />
            </Campo>
            <Pulsante
              variante="primario"
              disabled={busy || !nuova.cameraId || (nuova.tipo === "sveglia" && !nuova.ora)}
              onClick={async () => {
                const ok = await esegui(
                  () => sbusta(azioneNuovaRichiesta(Number(nuova.cameraId), { tipo: nuova.tipo, dettaglio: nuova.dettaglio, perQuando: nuova.tipo === "sveglia" ? nuova.ora : null })),
                  "Richiesta registrata.",
                );
                if (ok) setNuova(null);
              }}
            >
              Registra
            </Pulsante>
            <Pulsante onClick={() => setNuova(null)}>Annulla</Pulsante>
          </div>
        </Sezione>
      )}

      <div className="flex gap-2">
        <Pulsante dimensione="piccolo" variante={d.vista === "aperte" ? "primario" : "secondario"} onClick={() => esegui(() => sbusta(azioneCaricaRichieste("aperte")))}>
          In attesa
        </Pulsante>
        <Pulsante dimensione="piccolo" variante={d.vista === "chiuse" ? "primario" : "secondario"} onClick={() => esegui(() => sbusta(azioneCaricaRichieste("chiuse")))}>
          Chiuse
        </Pulsante>
      </div>

      <ul className="flex flex-col gap-2">
        {d.richieste.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm shadow-sm">
            <span className="w-16 text-lg font-bold">{r.camera ?? "—"}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">
                {r.tipo === "sveglia" && <AlarmClock className="mr-1 inline h-4 w-4" aria-hidden />}
                {TIPI_RICHIESTA[r.tipo] ?? r.tipo}
                {r.perQuando && ` · ${r.perQuando}`}
              </span>
              {r.dettaglio && <span className="text-stone-700"> · {r.dettaglio}</span>}
              <span className="block text-xs text-stone-500">
                {quando(r.creataIl)} · {r.origine === "qr" ? "dal QR dell'ospite" : r.creataDa}
                {r.stato !== "aperta" && ` · ${STATI_RICHIESTA[r.stato as keyof typeof STATI_RICHIESTA]} da ${r.chiusaDa}${r.nota ? `: ${r.nota}` : ""}`}
              </span>
            </span>
            {r.origine === "qr" && <Etichetta tono="viola">QR</Etichetta>}
            {r.stato === "aperta" &&
              (annulla?.id === r.id ? (
                <span className="flex items-center gap-1">
                  <Input className="h-7 w-44" placeholder="Motivo" value={annulla.nota} onChange={(e) => setAnnulla({ ...annulla, nota: e.target.value })} />
                  <Pulsante
                    variante="pericolo"
                    dimensione="piccolo"
                    disabled={busy || !annulla.nota.trim()}
                    onClick={async () => (await esegui(() => sbusta(azioneChiudiRichiesta(r.id, "annullata", annulla.nota)), "Richiesta annullata.")) && setAnnulla(null)}
                  >
                    Annulla
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setAnnulla(null)}>
                    No
                  </Pulsante>
                </span>
              ) : (
                <span className="flex gap-1">
                  <Pulsante variante="primario" dimensione="piccolo" icona={Check} disabled={busy} onClick={() => esegui(() => sbusta(azioneChiudiRichiesta(r.id, "fatta", "")), "Richiesta fatta.")}>
                    Fatta
                  </Pulsante>
                  <Pulsante variante="leggero" dimensione="piccolo" icona={X} aria-label="Annulla la richiesta" onClick={() => setAnnulla({ id: r.id, nota: "" })} />
                </span>
              ))}
          </li>
        ))}
        {d.richieste.length === 0 && <li className="text-sm text-emerald-800">{d.vista === "aperte" ? "Nessuna richiesta in attesa." : "Nessuna richiesta chiusa negli ultimi giorni."}</li>}
      </ul>
    </div>
  );
}
