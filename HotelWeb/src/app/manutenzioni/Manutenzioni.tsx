"use client";

import { Ban, CheckCircle2, Hand, Plus, Wrench } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { STATI_SEGNALAZIONE } from "@/lib/manutenzioniRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import {
  azioneAnnullaSegnalazione,
  azioneAssegnaSegnalazione,
  azioneCaricaManutenzioni,
  azioneFuoriServizio,
  azioneNuovaSegnalazione,
  azioneRisolvi,
  datiManutenzioni,
} from "./actions";

type Dati = Awaited<ReturnType<typeof datiManutenzioni>>;
type Filtro = Dati["filtro"];

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const domani = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + 86400000));

/**
 * Manutenzioni: chiunque segnala un guasto (camera o zona comune); il manutentore lo prende in carico
 * e lo risolve; per un guasto urgente in camera la reception può metterla fuori servizio.
 */
export function Manutenzioni({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [nuova, setNuova] = useState<null | { cameraId: string; zona: string; descrizione: string; urgente: boolean }>(null);
  const [chiudi, setChiudi] = useState<null | { id: number; tipo: "risolta" | "annullata"; testo: string }>(null);
  const [fuori, setFuori] = useState<null | { id: number; fino: string }>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const f = d.filtro;

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
  const vai = (nuovo: Filtro) => {
    window.history.replaceState(null, "", nuovo.cameraId ? `/manutenzioni?camera=${nuovo.cameraId}` : "/manutenzioni");
    return esegui(() => sbusta(azioneCaricaManutenzioni(nuovo)));
  };
  const cameraFiltro = f.cameraId ? d.camere.find((c) => c.id === f.cameraId) : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Manutenzioni"
        sottotitolo={cameraFiltro ? `Storico della camera ${cameraFiltro.codice}` : `${d.segnalazioni.length} segnalazioni ${f.vista === "chiuse" ? "chiuse" : "aperte"}`}
        azioni={
          !nuova && (
            <Pulsante variante="primario" dimensione="piccolo" icona={Plus} onClick={() => setNuova({ cameraId: f.cameraId ? String(f.cameraId) : "", zona: "", descrizione: "", urgente: false })}>
              Segnala un guasto
            </Pulsante>
          )
        }
      />
      <Suggerimento id="manutenzioni" titolo="Come funziona">
        <p>
          Chi trova un guasto lo segnala: camera o zona comune, cosa non va, se è <strong>urgente</strong>. Il manutentore lo prende in carico e, quando
          ha finito, lo segna <strong>risolto</strong> scrivendo cosa ha fatto. Se il guasto rende la camera inutilizzabile, la reception la mette{" "}
          <strong>fuori servizio</strong>: alla risoluzione torna in vendita e passa «da pulire».
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {nuova && (
        <Sezione titolo="Nuova segnalazione">
          <AiutoSezione breve="Scrivi cosa non va in modo che il manutentore porti l'attrezzo giusto.">
            <Esempio>Camera 21: il rubinetto della doccia perde, il piatto doccia si allaga. Urgente se ci sono ospiti in arrivo.</Esempio>
          </AiutoSezione>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Campo etichetta="Camera">
              <Select value={nuova.cameraId} onChange={(e) => setNuova({ ...nuova, cameraId: e.target.value })}>
                <option value="">Zona comune</option>
                {d.camere.map((c) => (
                  <option key={c.id} value={c.id}>
                    Camera {c.codice}
                  </option>
                ))}
              </Select>
            </Campo>
            {!nuova.cameraId && (
              <Campo etichetta="Zona" obbligatorio>
                <Input placeholder="es. ascensore, sala colazioni, giardino" value={nuova.zona} onChange={(e) => setNuova({ ...nuova, zona: e.target.value })} />
              </Campo>
            )}
            <div className="sm:col-span-2">
              <Campo etichetta="Cosa non va" obbligatorio>
                <Textarea rows={3} value={nuova.descrizione} onChange={(e) => setNuova({ ...nuova, descrizione: e.target.value })} />
              </Campo>
            </div>
            <Spunta etichetta="Urgente (la camera o la zona non si può usare)" checked={nuova.urgente} onChange={(e) => setNuova({ ...nuova, urgente: e.target.checked })} />
          </div>
          <div className="mt-3 flex gap-2">
            <Pulsante
              variante="primario"
              disabled={busy || nuova.descrizione.trim().length < 3 || (!nuova.cameraId && !nuova.zona.trim())}
              onClick={async () => {
                const ok = await esegui(
                  () =>
                    sbusta(
                      azioneNuovaSegnalazione(
                        { cameraId: nuova.cameraId ? Number(nuova.cameraId) : null, zona: nuova.zona, descrizione: nuova.descrizione, priorita: nuova.urgente ? "urgente" : "normale" },
                        f,
                      ),
                    ),
                  "Segnalazione inviata.",
                );
                if (ok) setNuova(null);
              }}
            >
              Invia
            </Pulsante>
            <Pulsante onClick={() => setNuova(null)}>Annulla</Pulsante>
          </div>
        </Sezione>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Pulsante dimensione="piccolo" variante={f.vista === "aperte" && !f.cameraId ? "primario" : "secondario"} onClick={() => vai({ vista: "aperte" })}>
          Aperte
        </Pulsante>
        {d.gestore && (
          <Pulsante dimensione="piccolo" variante={f.vista === "mie" && !f.cameraId ? "primario" : "secondario"} onClick={() => vai({ vista: "mie" })}>
            Assegnate a me
          </Pulsante>
        )}
        <Pulsante dimensione="piccolo" variante={f.vista === "chiuse" && !f.cameraId ? "primario" : "secondario"} onClick={() => vai({ vista: "chiuse" })}>
          Chiuse
        </Pulsante>
        <div className="w-48">
          <Select aria-label="Storico di una camera" value={f.cameraId ?? ""} onChange={(e) => vai(e.target.value ? { vista: "aperte", cameraId: Number(e.target.value) } : { vista: "aperte" })}>
            <option value="">Storico di una camera…</option>
            {d.camere.map((c) => (
              <option key={c.id} value={c.id}>
                Camera {c.codice}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {d.segnalazioni.map((s) => {
          const aperta = s.stato === "aperta" || s.stato === "in_lavorazione";
          return (
            <li key={s.id} className={`rounded-lg border bg-white p-3 text-sm shadow-sm ${aperta && s.priorita === "urgente" ? "border-red-400" : "border-stone-200"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Wrench className="h-4 w-4 text-stone-500" aria-hidden />
                <span className="font-bold">{s.camera ? `Camera ${s.camera.codice}` : s.zona}</span>
                {s.priorita === "urgente" && <Etichetta tono="rosso">urgente</Etichetta>}
                <Etichetta tono={s.stato === "risolta" ? "verde" : s.stato === "annullata" ? "neutro" : s.stato === "in_lavorazione" ? "blu" : "ambra"}>{STATI_SEGNALAZIONE[s.stato]}</Etichetta>
                {s.origine === "ospite" && <Etichetta tono="viola">dall&apos;ospite</Etichetta>}
                {s.fuoriServizio && <Etichetta tono="rosso">fuori servizio fino al {s.fuoriServizio.al.split("-").reverse().join("/")} (escluso)</Etichetta>}
                <span className="ml-auto text-xs text-stone-500">
                  {quando(s.creataIl)} · {s.segnalataDa}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-line text-stone-900">{s.descrizione}</p>
              {s.assegnataA && aperta && <p className="mt-1 text-xs text-stone-600">In carico a {s.assegnataA.nome}</p>}
              {!aperta && (
                <p className="mt-1 text-xs text-stone-700">
                  {s.stato === "risolta" ? "Fatto" : "Motivo"}: {s.esito} · {s.chiusaDa} {s.chiusaIl ? quando(s.chiusaIl) : ""}
                </p>
              )}

              {aperta && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {d.gestore && s.assegnataA?.id !== d.io && (
                    <Pulsante dimensione="piccolo" icona={Hand} disabled={busy} onClick={() => esegui(() => sbusta(azioneAssegnaSegnalazione(s.id, d.io, f)), "Presa in carico.")}>
                      Prendo io
                    </Pulsante>
                  )}
                  {d.gestore && d.manutentori.length > 1 && (
                    <div className="w-44">
                      <Select
                        aria-label="Assegna a"
                        value={s.assegnataA?.id ?? ""}
                        disabled={busy}
                        onChange={(e) => esegui(() => sbusta(azioneAssegnaSegnalazione(s.id, e.target.value ? Number(e.target.value) : null, f)))}
                      >
                        <option value="">Non assegnata</option>
                        {d.manutentori.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  {d.gestore && chiudi?.id !== s.id && (
                    <>
                      <Pulsante variante="primario" dimensione="piccolo" icona={CheckCircle2} onClick={() => setChiudi({ id: s.id, tipo: "risolta", testo: "" })}>
                        Risolta
                      </Pulsante>
                      <Pulsante variante="leggero" dimensione="piccolo" icona={Ban} onClick={() => setChiudi({ id: s.id, tipo: "annullata", testo: "" })}>
                        Annulla
                      </Pulsante>
                    </>
                  )}
                  {d.puoFuoriServizio && s.camera && !s.fuoriServizio && s.priorita === "urgente" && fuori?.id !== s.id && (
                    <Pulsante variante="pericolo" dimensione="piccolo" onClick={() => setFuori({ id: s.id, fino: domani() })}>
                      Metti fuori servizio
                    </Pulsante>
                  )}
                </div>
              )}

              {aperta && chiudi?.id === s.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md bg-stone-50 p-2">
                  <Campo etichetta={chiudi.tipo === "risolta" ? "Cosa hai fatto" : "Perché si annulla"} obbligatorio>
                    <Input className="w-72" value={chiudi.testo} onChange={(e) => setChiudi({ ...chiudi, testo: e.target.value })} />
                  </Campo>
                  <Pulsante
                    variante="primario"
                    dimensione="piccolo"
                    disabled={busy || !chiudi.testo.trim()}
                    onClick={async () => {
                      const ok = await esegui(
                        () => sbusta(chiudi.tipo === "risolta" ? azioneRisolvi(s.id, chiudi.testo, f) : azioneAnnullaSegnalazione(s.id, chiudi.testo, f)),
                        chiudi.tipo === "risolta" ? "Guasto risolto." : "Segnalazione annullata.",
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
              )}
              {aperta && fuori?.id === s.id && (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md bg-red-50 p-2">
                  <Campo etichetta="Fuori servizio da oggi fino al (escluso)" aiuto="Quando il guasto è risolto la camera torna disponibile da sola.">
                    <Input type="date" value={fuori.fino} onChange={(e) => setFuori({ ...fuori, fino: e.target.value })} />
                  </Campo>
                  <Pulsante
                    variante="pericolo"
                    dimensione="piccolo"
                    disabled={busy || !fuori.fino}
                    onClick={async () => (await esegui(() => sbusta(azioneFuoriServizio(s.id, fuori.fino, f)), "Camera fuori servizio.")) && setFuori(null)}
                  >
                    Conferma
                  </Pulsante>
                  <Pulsante dimensione="piccolo" onClick={() => setFuori(null)}>
                    No
                  </Pulsante>
                </div>
              )}
            </li>
          );
        })}
        {d.segnalazioni.length === 0 && <li className="text-sm text-emerald-800">Nessuna segnalazione in questo elenco.</li>}
      </ul>
    </div>
  );
}
