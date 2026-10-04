"use client";

import { BellOff, ClipboardCheck, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { OCCUPAZIONI, STATI_PULIZIA, ELENCO_STATI_PULIZIA, type StatoPulizia } from "@/lib/pulizieRegole";
import { Avviso, Etichetta, Input, IntestazionePagina, Pulsante, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneBiancheria, azioneCaricaStatoCamere, azioneControllo, azioneControlloGovernante, azioneNonDisturbare, azioneStatoPulizia, datiStatoCamere } from "./actions";

type Dati = Awaited<ReturnType<typeof datiStatoCamere>>;
type Camera = Dati["camere"][number];

const ora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

/** Prossima azione proposta per lo stato della camera (il resto si sceglie dal menu "Cambia"). */
function azioniPer(c: Camera, controllo: boolean): { stato: StatoPulizia | "finita"; testo: string }[] {
  switch (c.stato) {
    case "da_pulire":
    case "da_rifare":
      return [
        { stato: "in_pulizia", testo: "Inizia" },
        { stato: "finita", testo: "Finita" },
      ];
    case "in_pulizia":
      return [{ stato: "finita", testo: controllo ? "Finita (da controllare)" : "Finita" }];
    case "da_controllare":
      return [
        { stato: "pronta", testo: "Controllata: pronta" },
        { stato: "da_pulire", testo: "Da rifare" },
      ];
    default:
      return [];
  }
}

/**
 * Stato camere: pulizia, occupazione di oggi, «Non disturbare», fuori servizio e rapporto della
 * governante con le discrepanze rispetto alla reception.
 */
export function StatoCamere({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [filtro, setFiltro] = useState<"tutte" | "da_fare" | "arrivi">("tutte");
  const [rapporto, setRapporto] = useState(false);
  const [cambia, setCambia] = useState<number | null>(null);
  const [note, setNote] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [biancheria, setBiancheria] = useState({
    lenzuola: String(iniziale.biancheria.cambioLenzuolaOgni),
    asciugamani: iniziale.biancheria.cambioAsciugamaniOgni === null ? "" : String(iniziale.biancheria.cambioAsciugamaniOgni),
    couverture: iniziale.biancheria.couverture,
  });
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

  const daFare = (c: Camera) => c.stato !== "pronta" && !c.fuoriServizio;
  const visibili = d.camere.filter((c) => (filtro === "da_fare" ? daFare(c) : filtro === "arrivi" ? c.arrivoOggi : true));
  const piani = [...new Set(visibili.map((c) => c.piano ?? "Senza piano"))];
  const conteggi = Object.fromEntries(ELENCO_STATI_PULIZIA.map((s) => [s, d.camere.filter((c) => c.stato === s && !c.fuoriServizio).length]));
  const arriviNonPronti = d.camere.filter((c) => c.arrivoOggi && c.stato !== "pronta" && c.occupazione !== "fermata");
  const discrepanze = d.camere.filter((c) => c.discrepanza);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Stato camere"
        sottotitolo={`${d.oggi.split("-").reverse().join("/")} · ${conteggi.pronta} pronte su ${d.camere.length}`}
        azioni={
          <Pulsante dimensione="piccolo" icona={RefreshCw} disabled={busy} onClick={() => esegui(() => sbusta(azioneCaricaStatoCamere()))}>
            Aggiorna
          </Pulsante>
        }
      />
      <Suggerimento id="stato-camere" titolo="Come funziona">
        <p>
          Al check-out la camera diventa <strong>Da pulire</strong>; ogni mattina le camere occupate diventano <strong>Da rifare</strong>. Chi pulisce
          segna <strong>Inizia</strong> e <strong>Finita</strong>
          {d.controlloGovernante ? ": la camera passa «Da controllare» finché la governante non la approva." : "."} Le camere con un arrivo oggi
          vanno fatte per prime.
        </p>
        <p>
          Il <strong>rapporto della governante</strong> registra se la camera è stata trovata occupata o libera: se non coincide con la reception
          compare una discrepanza da chiarire.
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}
      {arriviNonPronti.length > 0 && (
        <Avviso tipo="avviso">
          Arrivi di oggi in camere non ancora pronte: <strong>{arriviNonPronti.map((c) => c.codice).join(", ")}</strong>.
        </Avviso>
      )}
      {discrepanze.length > 0 && (
        <Avviso tipo="errore">
          <span className="font-semibold">Discrepanze del rapporto:</span>
          <ul>
            {discrepanze.map((c) => (
              <li key={c.id}>
                Camera {c.codice}: {c.discrepanza}
                {c.prenotazioneId && (
                  <>
                    {" "}
                    <Link href={`/prenotazioni/${c.prenotazioneId}`} className="underline">
                      apri la prenotazione
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Avviso>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {ELENCO_STATI_PULIZIA.map((s) => (
          <span key={s} className="flex items-center gap-1 text-sm" title={STATI_PULIZIA[s].aiuto}>
            <span className={`h-2.5 w-2.5 rounded-full ${STATI_PULIZIA[s].colore}`} aria-hidden /> {STATI_PULIZIA[s].testo} {conteggi[s]}
          </span>
        ))}
        <span className="ml-auto flex flex-wrap gap-1">
          {(
            [
              ["tutte", "Tutte"],
              ["da_fare", "Da fare"],
              ["arrivi", "Arrivi di oggi"],
            ] as const
          ).map(([v, t]) => (
            <Pulsante key={v} dimensione="piccolo" variante={filtro === v ? "primario" : "secondario"} onClick={() => setFiltro(v)}>
              {t}
            </Pulsante>
          ))}
          {d.puoGestire && (
            <Pulsante dimensione="piccolo" variante={rapporto ? "primario" : "secondario"} icona={ClipboardCheck} onClick={() => setRapporto(!rapporto)}>
              Rapporto governante
            </Pulsante>
          )}
        </span>
      </div>

      {piani.map((piano) => (
        <Sezione key={piano} titolo={/^\d/.test(piano) ? `Piano ${piano}` : piano}>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visibili
              .filter((c) => (c.piano ?? "Senza piano") === piano)
              .map((c) => (
                <li key={c.id} className={`rounded-lg border p-3 text-sm ${c.discrepanza ? "border-red-400" : "border-stone-200"} ${c.fuoriServizio ? "bg-stone-100" : "bg-white"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${STATI_PULIZIA[c.stato].colore}`} aria-hidden />
                    <span className="text-lg font-bold">{c.codice}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-stone-600">{c.tipo}</span>
                    {c.nonDisturbare && (
                      <Etichetta tono="rosso">
                        <BellOff className="mr-0.5 inline h-3 w-3" aria-hidden />
                        non disturbare
                      </Etichetta>
                    )}
                  </div>
                  <p className="mt-1">
                    <strong>{STATI_PULIZIA[c.stato].testo}</strong>
                    <span className="text-stone-600">
                      {" · "}
                      {OCCUPAZIONI[c.occupazione]}
                      {c.arrivoOggi && c.occupazione !== "in_arrivo" && " · arrivo oggi"}
                      {c.ospite && ` · ${c.ospite}`}
                    </span>
                  </p>
                  {c.fuoriServizio && <p className="text-xs font-semibold text-stone-700">Fuori servizio: {c.fuoriServizio}</p>}
                  {c.statoDa && (
                    <p className="text-xs text-stone-500">
                      {ora(c.statoIl)} · {c.statoDa}
                    </p>
                  )}

                  {d.puoGestire && !rapporto && !c.fuoriServizio && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {azioniPer(c, d.controlloGovernante).map((a) => (
                        <Pulsante
                          key={a.testo}
                          dimensione="piccolo"
                          variante={a.stato === "finita" || a.stato === "pronta" ? "primario" : "secondario"}
                          disabled={busy}
                          onClick={() => esegui(() => sbusta(azioneStatoPulizia(c.id, a.stato)))}
                        >
                          {a.testo}
                        </Pulsante>
                      ))}
                      {(c.occupazione === "fermata" || c.occupazione === "in_partenza") && (
                        <Pulsante dimensione="piccolo" variante="leggero" disabled={busy} onClick={() => esegui(() => sbusta(azioneNonDisturbare(c.id, !c.nonDisturbare)))}>
                          {c.nonDisturbare ? "Togli non disturbare" : "Non disturbare"}
                        </Pulsante>
                      )}
                      {cambia === c.id ? (
                        <span className="flex flex-wrap gap-1">
                          {ELENCO_STATI_PULIZIA.filter((s) => s !== c.stato).map((s) => (
                            <Pulsante
                              key={s}
                              dimensione="piccolo"
                              variante="leggero"
                              disabled={busy}
                              onClick={async () => (await esegui(() => sbusta(azioneStatoPulizia(c.id, s)))) && setCambia(null)}
                            >
                              {STATI_PULIZIA[s].testo}
                            </Pulsante>
                          ))}
                        </span>
                      ) : (
                        <Pulsante dimensione="piccolo" variante="leggero" onClick={() => setCambia(c.id)}>
                          Cambia…
                        </Pulsante>
                      )}
                    </div>
                  )}

                  {rapporto && d.puoGestire && (
                    <div className="mt-2 flex flex-col gap-1 rounded-md bg-stone-50 p-2">
                      <span className="text-xs font-semibold text-stone-700">Trovata:</span>
                      <span className="flex flex-wrap gap-1">
                        {(["occupata", "libera"] as const).map((t) => (
                          <Pulsante
                            key={t}
                            dimensione="piccolo"
                            variante={c.controllo?.trovata === t ? "primario" : "secondario"}
                            disabled={busy}
                            onClick={() => esegui(() => sbusta(azioneControllo(c.id, c.controllo?.trovata === t ? null : t, note[c.id] ?? c.controllo?.nota ?? "")))}
                          >
                            {t}
                          </Pulsante>
                        ))}
                      </span>
                      <Input
                        className="h-7"
                        placeholder="Nota (es. letto non usato)"
                        value={note[c.id] ?? c.controllo?.nota ?? ""}
                        onChange={(e) => setNote({ ...note, [c.id]: e.target.value })}
                        onBlur={() => {
                          const n = note[c.id];
                          if (c.controllo && n !== undefined && n !== c.controllo.nota) esegui(() => sbusta(azioneControllo(c.id, c.controllo!.trovata, n)));
                        }}
                      />
                      {c.discrepanza && (
                        <span className="flex gap-1 text-xs font-semibold text-red-800">
                          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> {c.discrepanza}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </Sezione>
      ))}
      {visibili.length === 0 && <p className="text-sm text-emerald-800">Nessuna camera in questo elenco.</p>}

      {d.puoConfigurare && (
        <Sezione titolo="Impostazioni">
          <AiutoSezione breve="Nelle strutture piccole chi pulisce rende la camera subito pronta; negli hotel la governante la controlla prima.">
            <Esempio>Con il controllo acceso: la cameriera segna «Finita», la camera passa «Da controllare», la governante la approva e diventa «Pronta».</Esempio>
          </AiutoSezione>
          <div className="mt-2">
            <Spunta
              etichetta="Controllo della governante prima che la camera sia pronta"
              checked={d.controlloGovernante}
              disabled={busy}
              onChange={(e) => esegui(() => sbusta(azioneControlloGovernante(e.target.checked)), "Impostazione salvata.")}
            />
          </div>
          <p className="mt-4 text-sm font-semibold text-stone-800">Biancheria delle camere fermate</p>
          <AiutoSezione breve="In partenza si cambia sempre tutto. Nelle camere fermate: lenzuola ogni quante notti, asciugamani ogni quante notti oppure su richiesta dell'ospite.">
            <Esempio>Lenzuola ogni 3 notti, asciugamani su richiesta: è la regola «ecologica» più diffusa.</Esempio>
          </AiutoSezione>
          <div className="mt-2 flex flex-wrap items-end gap-3 text-sm">
            <label className="flex items-center gap-2">
              Lenzuola ogni
              <Input type="number" min={1} max={14} className="w-16" value={biancheria.lenzuola} onChange={(e) => setBiancheria({ ...biancheria, lenzuola: e.target.value })} />
              notti
            </label>
            <label className="flex items-center gap-2">
              Asciugamani ogni
              <Input type="number" min={1} max={14} className="w-16" placeholder="—" value={biancheria.asciugamani} onChange={(e) => setBiancheria({ ...biancheria, asciugamani: e.target.value })} />
              notti (vuoto = su richiesta)
            </label>
            <Spunta etichetta="Couverture serale" checked={biancheria.couverture} onChange={(e) => setBiancheria({ ...biancheria, couverture: e.target.checked })} />
            <Pulsante
              variante="primario"
              dimensione="piccolo"
              disabled={busy}
              onClick={() =>
                esegui(
                  () =>
                    sbusta(
                      azioneBiancheria({
                        cambioLenzuolaOgni: Number(biancheria.lenzuola),
                        cambioAsciugamaniOgni: biancheria.asciugamani.trim() === "" ? null : Number(biancheria.asciugamani),
                        couverture: biancheria.couverture,
                      }),
                    ),
                  "Regole della biancheria salvate.",
                )
              }
            >
              Salva
            </Pulsante>
          </div>
        </Sezione>
      )}
    </div>
  );
}
