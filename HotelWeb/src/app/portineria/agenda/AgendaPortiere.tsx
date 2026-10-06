"use client";

import { AlarmClock, ChevronLeft, ChevronRight, Plus, Printer, Receipt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { PASSAGGI, STATI_SERVIZIO, TIPI_SERVIZIO, type ServizioInput, type StatoServizio, type TipoServizio } from "@/lib/agendaRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta, Textarea } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneCaricaAgenda, azioneCreaServizio, azioneCreaSveglia, azioneEsborso, azioneEsitoSveglia, azioneStatoServizio, type datiAgenda } from "./actions";

type Dati = Awaited<ReturnType<typeof datiAgenda>>;
type Servizio = Dati["servizi"][number];
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const sposta = (g: string, n: number) => new Date(Date.parse(`${g}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
// "Lunedì 5 ottobre": maiuscola solo all'inizio (i mesi in italiano sono minuscoli).
const it = (g: string) => {
  const t = new Date(`${g}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const TONO: Record<StatoServizio, "ambra" | "blu" | "verde" | "neutro"> = { da_confermare: "ambra", confermato: "blu", fatto: "verde", annullato: "neutro" };
const ABBINATI = ["Colazione in camera", "Taxi", "Giornale"];

const servizioVuoto = (giorno: string): ServizioInput => ({ prenotazioneId: null, destinatario: "", tipo: "taxi", giorno, ora: "09:00", persone: null, dettagli: "", fornitore: "", riferimento: "" });

export function AgendaPortiere({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [sveglia, setSveglia] = useState<null | { cameraId: string; giorno: string; ora: string; abbinati: string[]; altro: string }>(null);
  const [servizio, setServizio] = useState<ServizioInput | null>(null);
  const [azione, setAzione] = useState<null | { id: number; tipo: "conferma" | "annulla" | "esborso"; testo: string; importo: string }>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      setD(await fn());
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const vai = (g: string) => esegui(() => sbusta(azioneCaricaAgenda(g)));

  // Sveglie e servizi in un'unica lista per ora (il libro del portiere).
  const righe = [...d.sveglie.map((s) => ({ ora: s.ora, chiave: `s${s.id}`, sveglia: s, servizio: null })), ...d.servizi.map((s) => ({ ora: s.ora, chiave: `x${s.id}`, sveglia: null, servizio: s }))].sort((a, b) =>
    a.ora.localeCompare(b.ora),
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Agenda del portiere"
        sottotitolo={it(d.giorno)}
        azioni={
          <span className="flex flex-wrap gap-2 print:hidden">
            <Pulsante icona={ChevronLeft} aria-label="Giorno prima" disabled={busy} onClick={() => vai(sposta(d.giorno, -1))} />
            <Input type="date" className="w-40" value={d.giorno} onChange={(e) => e.target.value && vai(e.target.value)} aria-label="Giorno" />
            <Pulsante icona={ChevronRight} aria-label="Giorno dopo" disabled={busy} onClick={() => vai(sposta(d.giorno, 1))} />
            {d.giorno !== oggi() && (
              <Pulsante disabled={busy} onClick={() => vai(oggi())}>
                Oggi
              </Pulsante>
            )}
            <Pulsante icona={Printer} onClick={() => window.print()}>
              Stampa
            </Pulsante>
          </span>
        }
      />
      <Sezione className="print:hidden">
        <AiutoSezione breve="Il libro sveglie e i servizi prenotati per gli ospiti (taxi, transfer, ristoranti, biglietti, escursioni), in ordine di ora. Si stampa per il portiere di notte.">
          <p>
            Le sveglie chieste dall&apos;ospite con il QR compaiono qui da sole. Se l&apos;ospite non risponde, segnalo: la sveglia resta da rifare con l&apos;ora del tentativo. Se
            anticipi una spesa per l&apos;ospite (il taxi, i biglietti…) usa <strong>Esborso</strong>: va sul suo conto fuori campo IVA e nella nota degli esborsi da far firmare.
          </p>
        </AiutoSezione>
        <div className="mt-3 flex flex-wrap gap-2">
          {!sveglia && (
            <Pulsante icona={AlarmClock} onClick={() => setSveglia({ cameraId: "", giorno: d.giorno, ora: "07:00", abbinati: [], altro: "" })}>
              Nuova sveglia
            </Pulsante>
          )}
          {!servizio && (
            <Pulsante icona={Plus} onClick={() => setServizio(servizioVuoto(d.giorno))}>
              Nuovo servizio
            </Pulsante>
          )}
        </div>
      </Sezione>

      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {sveglia && (
        <Sezione titolo="Nuova sveglia" className="print:hidden">
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const dettaglio = [...sveglia.abbinati, sveglia.altro.trim()].filter(Boolean).join(", ");
              if (await esegui(() => sbusta(azioneCreaSveglia(d.giorno, Number(sveglia.cameraId), sveglia.giorno, sveglia.ora, dettaglio)), "Sveglia registrata.")) setSveglia(null);
            }}
          >
            <Campo etichetta="Camera" obbligatorio>
              <Select value={sveglia.cameraId} onChange={(e) => setSveglia({ ...sveglia, cameraId: e.target.value })}>
                <option value="">Scegli…</option>
                {d.camere.map((c) => (
                  <option key={`${c.cameraId}-${c.prenotazioneId}`} value={c.cameraId}>
                    {c.camera} · {c.ospite}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Giorno">
              <Select value={sveglia.giorno} onChange={(e) => setSveglia({ ...sveglia, giorno: e.target.value })}>
                <option value={oggi()}>Oggi</option>
                <option value={sposta(oggi(), 1)}>Domani</option>
              </Select>
            </Campo>
            <Campo etichetta="Ora" obbligatorio>
              <Input type="time" value={sveglia.ora} onChange={(e) => setSveglia({ ...sveglia, ora: e.target.value })} />
            </Campo>
            <div className="flex flex-col gap-1 sm:col-span-4">
              <span className="text-sm font-medium text-stone-700">Insieme alla sveglia</span>
              <div className="flex flex-wrap gap-3">
                {ABBINATI.map((a) => (
                  <Spunta
                    key={a}
                    etichetta={a}
                    checked={sveglia.abbinati.includes(a)}
                    onChange={(e) => setSveglia({ ...sveglia, abbinati: e.target.checked ? [...sveglia.abbinati, a] : sveglia.abbinati.filter((x) => x !== a) })}
                  />
                ))}
              </div>
              <Input placeholder="Altro (facoltativo)" value={sveglia.altro} onChange={(e) => setSveglia({ ...sveglia, altro: e.target.value })} />
            </div>
            <div className="flex gap-2 sm:col-span-4">
              <Pulsante type="submit" variante="primario" disabled={busy || !sveglia.cameraId}>
                Registra
              </Pulsante>
              <Pulsante onClick={() => setSveglia(null)}>Annulla</Pulsante>
            </div>
          </form>
        </Sezione>
      )}

      {servizio && (
        <Sezione titolo="Nuovo servizio" className="print:hidden">
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await esegui(() => sbusta(azioneCreaServizio(d.giorno, servizio)), "Servizio registrato.")) setServizio(null);
            }}
          >
            <Campo etichetta="Per" obbligatorio className="sm:col-span-2">
              <Select
                value={servizio.prenotazioneId ?? ""}
                onChange={(e) => setServizio({ ...servizio, prenotazioneId: Number(e.target.value) || null })}
              >
                <option value="">Scrivo il nome…</option>
                {d.prenotazioni.map((p) => (
                  <option key={p.prenotazioneId} value={p.prenotazioneId}>
                    {p.nome} · {p.camere} · {p.situazione}
                  </option>
                ))}
              </Select>
            </Campo>
            {!servizio.prenotazioneId && (
              <Campo etichetta="Nome" className="sm:col-span-2">
                <Input value={servizio.destinatario} onChange={(e) => setServizio({ ...servizio, destinatario: e.target.value })} />
              </Campo>
            )}
            <Campo etichetta="Servizio" obbligatorio>
              <Select value={servizio.tipo} onChange={(e) => setServizio({ ...servizio, tipo: e.target.value as TipoServizio })}>
                {Object.entries(TIPI_SERVIZIO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Giorno" obbligatorio>
              <Input type="date" value={servizio.giorno} onChange={(e) => setServizio({ ...servizio, giorno: e.target.value })} />
            </Campo>
            <Campo etichetta="Ora" obbligatorio>
              <Input type="time" value={servizio.ora} onChange={(e) => setServizio({ ...servizio, ora: e.target.value })} />
            </Campo>
            <Campo etichetta="Persone">
              <Input type="number" min={1} max={99} value={servizio.persone ?? ""} onChange={(e) => setServizio({ ...servizio, persone: e.target.value ? Number(e.target.value) : null })} />
            </Campo>
            <Campo etichetta="Dettagli" aiuto="Destinazione, ristorante, evento, richieste particolari." className="sm:col-span-4">
              <Textarea rows={2} value={servizio.dettagli} onChange={(e) => setServizio({ ...servizio, dettagli: e.target.value })} />
            </Campo>
            <Campo etichetta="Chi fornisce il servizio" className="sm:col-span-2">
              <Input placeholder="Es. Radio Taxi, Ristorante Da Mario" value={servizio.fornitore} onChange={(e) => setServizio({ ...servizio, fornitore: e.target.value })} />
            </Campo>
            <Campo etichetta="Numero di conferma" className="sm:col-span-2">
              <Input value={servizio.riferimento} onChange={(e) => setServizio({ ...servizio, riferimento: e.target.value })} />
            </Campo>
            <div className="flex gap-2 sm:col-span-4">
              <Pulsante type="submit" variante="primario" disabled={busy}>
                Registra
              </Pulsante>
              <Pulsante onClick={() => setServizio(null)}>Annulla</Pulsante>
            </div>
          </form>
        </Sezione>
      )}

      <Sezione titolo={`Sveglie e servizi (${righe.length})`}>
        {righe.length === 0 ? (
          <p className="text-sm text-stone-600">Niente in agenda per questo giorno.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-100">
            {righe.map((r) => (
              <li key={r.chiave} className="flex flex-wrap items-start gap-3 py-2 text-sm">
                <span className="w-12 shrink-0 font-mono text-base font-bold">{r.ora}</span>
                <div className="min-w-0 flex-1">
                  {r.sveglia ? (
                    <>
                      <span className="flex flex-wrap items-center gap-2">
                        <AlarmClock className="h-4 w-4 text-stone-500" aria-hidden />
                        <strong>Sveglia</strong> camera <strong>{r.sveglia.camera ?? "—"}</strong>
                        {r.sveglia.ospite && <span>· {r.sveglia.ospite}</span>}
                        {r.sveglia.origine === "qr" && <Etichetta>dal QR</Etichetta>}
                        <Etichetta tono={r.sveglia.stato === "fatta" ? "verde" : r.sveglia.nota ? "rosso" : "ambra"}>
                          {r.sveglia.stato === "fatta" ? `Fatta (${r.sveglia.chiusaDa})` : r.sveglia.nota ? "Da richiamare" : "Da fare"}
                        </Etichetta>
                      </span>
                      {r.sveglia.dettaglio && <p className="text-stone-700">Insieme: {r.sveglia.dettaglio}</p>}
                      {r.sveglia.nota && <p className="text-xs text-red-800">{r.sveglia.nota}</p>}
                      {r.sveglia.stato === "aperta" && (
                        <div className="mt-1 flex gap-2 print:hidden">
                          <Pulsante dimensione="piccolo" variante="primario" disabled={busy} onClick={() => esegui(() => sbusta(azioneEsitoSveglia(d.giorno, r.sveglia!.id, "fatta")))}>
                            Fatta
                          </Pulsante>
                          <Pulsante dimensione="piccolo" disabled={busy} onClick={() => esegui(() => sbusta(azioneEsitoSveglia(d.giorno, r.sveglia!.id, "non_risponde")), "Segnato: da richiamare.")}>
                            Non risponde
                          </Pulsante>
                        </div>
                      )}
                    </>
                  ) : (
                    <RigaServizio s={r.servizio!} d={d} busy={busy} azione={azione} setAzione={setAzione} esegui={esegui} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      {d.daConfermare.length > 0 && (
        <Sezione titolo="Da confermare in altri giorni" className="print:hidden">
          <ul className="flex flex-col gap-1 text-sm">
            {d.daConfermare.map((x) => (
              <li key={x.id}>
                <button type="button" className="text-teal-800 underline" onClick={() => vai(x.giorno)}>
                  {x.giorno.split("-").reverse().join("/")} {x.ora}
                </button>{" "}
                · {TIPI_SERVIZIO[x.tipo] ?? x.tipo} per {x.destinatario}
              </li>
            ))}
          </ul>
        </Sezione>
      )}
    </div>
  );
}

function RigaServizio({
  s,
  d,
  busy,
  azione,
  setAzione,
  esegui,
}: {
  s: Servizio;
  d: Dati;
  busy: boolean;
  azione: null | { id: number; tipo: "conferma" | "annulla" | "esborso"; testo: string; importo: string };
  setAzione: (a: null | { id: number; tipo: "conferma" | "annulla" | "esborso"; testo: string; importo: string }) => void;
  esegui: (fn: () => Promise<Dati>, ok?: string) => Promise<boolean>;
}) {
  const passaggi = PASSAGGI[s.stato] ?? [];
  const mia = azione?.id === s.id ? azione : null;
  return (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <strong>{TIPI_SERVIZIO[s.tipo] ?? s.tipo}</strong>
        <span>per {s.destinatario}</span>
        {s.prenotazioneId && (
          <Link href={`/prenotazioni/${s.prenotazioneId}`} className="text-teal-800 hover:underline">
            #{s.prenotazioneId}
          </Link>
        )}
        {s.camere && <span className="text-stone-600">camere {s.camere}</span>}
        {s.persone && <span className="text-stone-600">· {s.persone === 1 ? "1 persona" : `${s.persone} persone`}</span>}
        <Etichetta tono={TONO[s.stato]}>{STATI_SERVIZIO[s.stato]}</Etichetta>
        {s.esborso !== null && <Etichetta tono="viola">Esborso {eur(s.esborso)}</Etichetta>}
      </span>
      {s.dettagli && <p className="text-stone-700">{s.dettagli}</p>}
      {(s.fornitore || s.riferimento) && (
        <p className="text-xs text-stone-600">
          {s.fornitore}
          {s.riferimento && ` · conferma n. ${s.riferimento}`}
        </p>
      )}
      {s.nota && <p className="text-xs text-stone-600">Nota: {s.nota}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-2 print:hidden">
        {passaggi.includes("confermato") && !mia && (
          <Pulsante dimensione="piccolo" disabled={busy} onClick={() => setAzione({ id: s.id, tipo: "conferma", testo: s.riferimento ?? "", importo: "" })}>
            Confermato
          </Pulsante>
        )}
        {passaggi.includes("fatto") && !mia && (
          <Pulsante dimensione="piccolo" variante="primario" disabled={busy} onClick={() => esegui(() => sbusta(azioneStatoServizio(d.giorno, s.id, "fatto", "", "")))}>
            Fatto
          </Pulsante>
        )}
        {passaggi.includes("annullato") && !mia && (
          <Pulsante dimensione="piccolo" variante="leggero" disabled={busy} onClick={() => setAzione({ id: s.id, tipo: "annulla", testo: "", importo: "" })}>
            Annulla
          </Pulsante>
        )}
        {d.puoAddebitare && s.prenotazioneId && s.esborso === null && s.stato !== "annullato" && !mia && (
          <Pulsante dimensione="piccolo" icona={Receipt} disabled={busy} onClick={() => setAzione({ id: s.id, tipo: "esborso", testo: "", importo: "" })}>
            Esborso
          </Pulsante>
        )}
        {s.prenotazioneId && s.esborso !== null && (
          <Link href={`/portineria/esborsi/${s.prenotazioneId}`} className="text-xs text-teal-800 underline">
            Nota degli esborsi
          </Link>
        )}
        {mia && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fatto =
                mia.tipo === "esborso"
                  ? await esegui(() => sbusta(azioneEsborso(d.giorno, s.id, Number(mia.importo.replace(",", ".")), mia.testo)), "Esborso addebitato sul conto.")
                  : await esegui(() => sbusta(azioneStatoServizio(d.giorno, s.id, mia.tipo === "conferma" ? "confermato" : "annullato", mia.tipo === "conferma" ? mia.testo : "", mia.tipo === "annulla" ? mia.testo : "")));
              if (fatto) setAzione(null);
            }}
          >
            {mia.tipo === "esborso" && (
              <Input className="w-28" inputMode="decimal" placeholder="Importo €" value={mia.importo} onChange={(e) => setAzione({ ...mia, importo: e.target.value })} aria-label="Importo anticipato" />
            )}
            <Input
              className="w-56"
              placeholder={mia.tipo === "conferma" ? "Numero di conferma (facoltativo)" : mia.tipo === "annulla" ? "Perché si annulla" : "Descrizione (facoltativa)"}
              value={mia.testo}
              onChange={(e) => setAzione({ ...mia, testo: e.target.value })}
              aria-label="Testo"
            />
            <Pulsante type="submit" dimensione="piccolo" variante={mia.tipo === "annulla" ? "pericolo" : "primario"} disabled={busy}>
              {mia.tipo === "conferma" ? "Segna confermato" : mia.tipo === "annulla" ? "Annulla il servizio" : "Addebita sul conto"}
            </Pulsante>
            <Pulsante dimensione="piccolo" onClick={() => setAzione(null)}>
              Indietro
            </Pulsante>
          </form>
        )}
      </div>
    </>
  );
}
