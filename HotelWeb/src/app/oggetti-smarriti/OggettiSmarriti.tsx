"use client";

import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { STATI_OGGETTO } from "@/lib/richiesteRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCaricaOggetti, azioneConservazione, azioneRegistraOggetto, azioneRestituisci, azioneSmaltisci, datiOggetti } from "./actions";

type Dati = Awaited<ReturnType<typeof datiOggetti>>;
const it = (g: string) => g.split("-").reverse().join("/");
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/** Registro degli oggetti smarriti: trovati, in deposito, restituiti o smaltiti. */
export function OggettiSmarriti({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [nuovo, setNuovo] = useState<null | { trovatoIl: string; cameraId: string; zona: string; descrizione: string; conservatoIn: string }>(null);
  const [chiudi, setChiudi] = useState<null | { id: number; tipo: "restituito" | "smaltito"; a: string; nota: string }>(null);
  const [mesi, setMesi] = useState(String(iniziale.mesi));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

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
  const daSmaltire = d.oggetti.filter((o) => o.daSmaltire).length;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Oggetti smarriti"
        sottotitolo={d.vista === "deposito" ? `${d.oggetti.length} in deposito${daSmaltire ? ` · ${daSmaltire} da smaltire` : ""}` : "Restituiti e smaltiti"}
        azioni={
          !nuovo && (
            <Pulsante variante="primario" dimensione="piccolo" icona={Plus} onClick={() => setNuovo({ trovatoIl: oggi(), cameraId: "", zona: "", descrizione: "", conservatoIn: "" })}>
              Oggetto trovato
            </Pulsante>
          )
        }
      />
      <Suggerimento id="oggetti-smarriti" titolo="Come funziona">
        <p>
          Ogni oggetto trovato si registra con dove e quando, e dove è stato messo. Se è stato trovato in una camera il programma propone il
          <strong> probabile proprietario</strong>: chi ha lasciato la camera quel giorno o il giorno prima, con telefono ed email per contattarlo. Alla
          consegna si segna a chi è stato restituito; dopo {d.mesi} mesi in deposito l&apos;oggetto è segnalato da smaltire.
        </p>
        <p>
          Per gli oggetti di cui non si trova il proprietario possono valere regole di legge (ad esempio la consegna al Comune): verificale con il
          consulente prima di smaltire oggetti di valore.
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {nuovo && (
        <Sezione titolo="Oggetto trovato">
          <AiutoSezione breve="Descrivi l'oggetto in modo da riconoscerlo (colore, marca), senza aprire borse o portafogli se non per cercare un nome.">
            <Esempio>Caricabatterie bianco con cavo USB-C, camera 12, sul comodino. Messo nell&apos;armadio della governante.</Esempio>
          </AiutoSezione>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etichetta="Trovato il" obbligatorio>
              <Input type="date" max={oggi()} value={nuovo.trovatoIl} onChange={(e) => setNuovo({ ...nuovo, trovatoIl: e.target.value })} />
            </Campo>
            <Campo etichetta="Camera">
              <Select value={nuovo.cameraId} onChange={(e) => setNuovo({ ...nuovo, cameraId: e.target.value })}>
                <option value="">Zona comune</option>
                {d.camere.map((c) => (
                  <option key={c.id} value={c.id}>
                    Camera {c.codice}
                  </option>
                ))}
              </Select>
            </Campo>
            {!nuovo.cameraId && (
              <Campo etichetta="Dove" obbligatorio>
                <Input placeholder="es. hall, piscina" value={nuovo.zona} onChange={(e) => setNuovo({ ...nuovo, zona: e.target.value })} />
              </Campo>
            )}
            <Campo etichetta="Conservato in">
              <Input placeholder="es. cassaforte della reception" value={nuovo.conservatoIn} onChange={(e) => setNuovo({ ...nuovo, conservatoIn: e.target.value })} />
            </Campo>
            <div className="sm:col-span-2 lg:col-span-4">
              <Campo etichetta="Oggetto" obbligatorio>
                <Input value={nuovo.descrizione} onChange={(e) => setNuovo({ ...nuovo, descrizione: e.target.value })} />
              </Campo>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Pulsante
              variante="primario"
              disabled={busy || nuovo.descrizione.trim().length < 3 || (!nuovo.cameraId && !nuovo.zona.trim())}
              onClick={async () => {
                const ok = await esegui(
                  () =>
                    sbusta(
                      azioneRegistraOggetto({ trovatoIl: nuovo.trovatoIl, cameraId: nuovo.cameraId ? Number(nuovo.cameraId) : null, zona: nuovo.zona, descrizione: nuovo.descrizione, conservatoIn: nuovo.conservatoIn }),
                    ),
                  "Oggetto registrato.",
                );
                if (ok) setNuovo(null);
              }}
            >
              Registra
            </Pulsante>
            <Pulsante onClick={() => setNuovo(null)}>Annulla</Pulsante>
          </div>
        </Sezione>
      )}

      <div className="flex gap-2">
        <Pulsante dimensione="piccolo" variante={d.vista === "deposito" ? "primario" : "secondario"} onClick={() => esegui(() => sbusta(azioneCaricaOggetti("deposito")))}>
          In deposito
        </Pulsante>
        <Pulsante dimensione="piccolo" variante={d.vista === "chiusi" ? "primario" : "secondario"} onClick={() => esegui(() => sbusta(azioneCaricaOggetti("chiusi")))}>
          Restituiti e smaltiti
        </Pulsante>
      </div>

      <ul className="flex flex-col gap-2">
        {d.oggetti.map((o) => (
          <li key={o.id} className={`rounded-lg border bg-white p-3 text-sm shadow-sm ${o.daSmaltire ? "border-amber-400" : "border-stone-200"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Package className="h-4 w-4 text-stone-500" aria-hidden />
              <span className="font-semibold">{o.descrizione}</span>
              {o.daSmaltire && <Etichetta tono="ambra">da smaltire</Etichetta>}
              {o.stato !== "in_deposito" && <Etichetta tono={o.stato === "restituito" ? "verde" : "neutro"}>{STATI_OGGETTO[o.stato as keyof typeof STATI_OGGETTO]}</Etichetta>}
              <span className="ml-auto text-xs text-stone-500">
                {it(o.trovatoIl)} · {o.camera ? `camera ${o.camera}` : o.zona} · {o.trovatoDa}
              </span>
            </div>
            {o.conservatoIn && <p className="text-xs text-stone-600">Conservato in: {o.conservatoIn}</p>}
            {o.proprietario && (
              <p className="mt-1 text-xs">
                Probabile proprietario:{" "}
                <Link href={`/prenotazioni/${o.proprietario.prenotazioneId}`} className="font-semibold underline">
                  {o.proprietario.nome}
                </Link>
                {o.proprietario.contatto && ` · ${o.proprietario.contatto}`}
              </p>
            )}
            {o.stato !== "in_deposito" && (
              <p className="mt-1 text-xs text-stone-700">
                {o.stato === "restituito" ? `Restituito a ${o.restituitoA}` : "Smaltito"}
                {o.nota ? ` · ${o.nota}` : ""} · {o.chiusoDa}
              </p>
            )}
            {o.stato === "in_deposito" &&
              (chiudi?.id === o.id ? (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md bg-stone-50 p-2">
                  {chiudi.tipo === "restituito" && (
                    <Campo etichetta="Restituito a" obbligatorio>
                      <Input value={chiudi.a} onChange={(e) => setChiudi({ ...chiudi, a: e.target.value })} />
                    </Campo>
                  )}
                  <Campo etichetta={chiudi.tipo === "restituito" ? "Nota (es. spedito con corriere)" : "Come (es. donato, buttato)"} obbligatorio={chiudi.tipo === "smaltito"}>
                    <Input className="w-64" value={chiudi.nota} onChange={(e) => setChiudi({ ...chiudi, nota: e.target.value })} />
                  </Campo>
                  <Pulsante
                    variante="primario"
                    dimensione="piccolo"
                    disabled={busy || (chiudi.tipo === "restituito" ? !chiudi.a.trim() : !chiudi.nota.trim())}
                    onClick={async () => {
                      const ok = await esegui(
                        () => sbusta(chiudi.tipo === "restituito" ? azioneRestituisci(o.id, chiudi.a, chiudi.nota) : azioneSmaltisci(o.id, chiudi.nota)),
                        chiudi.tipo === "restituito" ? "Oggetto restituito." : "Oggetto smaltito.",
                      );
                      if (ok) setChiudi(null);
                    }}
                  >
                    Conferma
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setChiudi(null)}>
                    No
                  </Pulsante>
                </div>
              ) : (
                <div className="mt-2 flex gap-1">
                  <Pulsante dimensione="piccolo" variante="primario" onClick={() => setChiudi({ id: o.id, tipo: "restituito", a: o.proprietario?.nome ?? "", nota: "" })}>
                    Restituito
                  </Pulsante>
                  <Pulsante dimensione="piccolo" variante="leggero" onClick={() => setChiudi({ id: o.id, tipo: "smaltito", a: "", nota: "" })}>
                    Smaltito
                  </Pulsante>
                </div>
              ))}
          </li>
        ))}
        {d.oggetti.length === 0 && <li className="text-sm text-stone-600">Nessun oggetto in questo elenco.</li>}
      </ul>

      {d.puoConfigurare && (
        <Sezione titolo="Impostazioni">
          <div className="flex flex-wrap items-end gap-2 text-sm">
            <label className="flex items-center gap-2">
              Segnala da smaltire dopo
              <Input type="number" min={1} max={36} className="w-16" value={mesi} onChange={(e) => setMesi(e.target.value)} />
              mesi in deposito
            </label>
            <Pulsante dimensione="piccolo" variante="primario" disabled={busy} onClick={() => esegui(() => sbusta(azioneConservazione(Number(mesi))), "Impostazione salvata.")}>
              Salva
            </Pulsante>
          </div>
        </Sezione>
      )}
    </div>
  );
}
