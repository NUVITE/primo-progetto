"use client";

import { Bell, BellOff, Phone, Plus, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCaricaOrdini, azioneOrdineTelefono, azioneStatoOrdine, datiOrdini } from "./actions";

type Dati = Awaited<ReturnType<typeof datiOrdini>>;
type Ordine = Dati["ordini"][number];
type Stato = Ordine["stato"];

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const COLONNE: { stato: Stato; titolo: string; azione: { stato: Stato; testo: string } }[] = [
  { stato: "ricevuto", titolo: "Ricevuti", azione: { stato: "in_preparazione", testo: "In preparazione" } },
  { stato: "in_preparazione", titolo: "In preparazione", azione: { stato: "pronto", testo: "Pronto" } },
  { stato: "pronto", titolo: "Da portare", azione: { stato: "consegnato", testo: "Consegnato" } },
];
const AGGIORNA_OGNI = 15000;

/** Breve segnale acustico per un ordine nuovo (nessun file audio: un tono generato dal browser). */
function suona() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio non disponibile: resta l'evidenza a video.
  }
}

/**
 * Room service per cucina, sala e reception: gli ordini in colonne per stato, aggiornati da soli.
 * Alla consegna l'ordine va sul conto della camera. Gli ordini al telefono si inseriscono da qui.
 */
export function OrdiniRoomService({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [annulla, setAnnulla] = useState<null | { id: number; motivo: string }>(null);
  const [telefono, setTelefono] = useState<null | { segmentoId: string; quantita: Record<number, number>; orario: string; nota: string }>(null);
  const [audio, setAudio] = useState(false);
  const visti = useRef(new Set(iniziale.ordini.map((o) => o.id)));
  const audioRef = useRef(audio);
  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  // Aggiornamento automatico; un ordine mai visto prima suona (se l'audio è attivo).
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const nuovo = await sbusta(azioneCaricaOrdini());
        const arrivati = nuovo.ordini.filter((o) => !visti.current.has(o.id));
        for (const o of nuovo.ordini) visti.current.add(o.id);
        if (arrivati.length && audioRef.current) suona();
        setD(nuovo);
      } catch {
        // Rete assente: si riprova al giro dopo.
      }
    }, AGGIORNA_OGNI);
    return () => clearInterval(t);
  }, []);

  async function esegui(fn: () => Promise<Dati>, ok: string) {
    setMsg(null);
    setBusy(true);
    try {
      const r = await fn();
      for (const o of r.ordini) visti.current.add(o.id);
      setD(r);
      setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const chiusi = d.ordini.filter((o) => o.stato === "consegnato" || o.stato === "annullato").reverse();
  const voci = d.menu.flatMap((m) => m.voci);

  const scheda = (o: Ordine, azione?: { stato: Stato; testo: string }) => (
    <li key={o.id} className={`rounded-lg border bg-white p-3 text-sm shadow-sm ${o.conflitti.some((c) => c.allergia) ? "border-red-400" : "border-stone-200"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold">{o.camera ? `Camera ${o.camera}` : o.ospite}</span>
        <span className="text-xs text-stone-600">
          ore {o.ora}
          {o.canale === "telefono" && " · al telefono"}
        </span>
      </div>
      {o.perQuando && <Etichetta tono="blu">per {o.perQuando}</Etichetta>}
      <ul className="mt-1">
        {o.righe.map((r, i) => (
          <li key={i}>
            <strong>{r.quantita} ×</strong> {r.descrizione}
          </li>
        ))}
      </ul>
      {o.nota && <p className="mt-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-900">Nota: {o.nota}</p>}
      {o.conflitti.length > 0 && (
        <p className="mt-1 flex gap-1 font-semibold text-red-800">
          <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {o.conflitti.map((c) => `${c.persona}: ${c.allergia ? "ALLERGIA" : "intolleranza"} — ${c.piatto} (${c.motivi.join(", ")})`).join("; ")}
          </span>
        </p>
      )}
      {o.conflitti.length === 0 && o.noteCamera.length > 0 && <p className="mt-1 text-xs text-stone-700">{o.noteCamera.join(" · ")}</p>}
      <p className="mt-1 text-xs text-stone-600">
        {o.ospite} · {o.totale > 0 ? eur(o.totale) : "compreso"}
      </p>
      {azione && (
        <div className="mt-2 flex flex-wrap gap-1">
          {annulla?.id === o.id ? (
            <>
              <Input className="h-7 w-40" placeholder="Motivo" value={annulla.motivo} onChange={(e) => setAnnulla({ ...annulla, motivo: e.target.value })} />
              <Pulsante
                variante="pericolo"
                dimensione="piccolo"
                disabled={busy || !annulla.motivo.trim()}
                onClick={async () => (await esegui(() => sbusta(azioneStatoOrdine(o.id, "annullato", annulla.motivo)), "Ordine annullato.")) && setAnnulla(null)}
              >
                Annulla ordine
              </Pulsante>
              <Pulsante dimensione="piccolo" onClick={() => setAnnulla(null)}>
                No
              </Pulsante>
            </>
          ) : (
            <>
              <Pulsante variante="primario" dimensione="piccolo" disabled={busy} onClick={() => esegui(() => sbusta(azioneStatoOrdine(o.id, azione.stato, "")), `Ordine: ${azione.testo.toLowerCase()}.`)}>
                {azione.testo}
              </Pulsante>
              {azione.stato !== "consegnato" && (
                <Pulsante dimensione="piccolo" disabled={busy} onClick={() => esegui(() => sbusta(azioneStatoOrdine(o.id, "consegnato", "")), "Ordine consegnato e addebitato.")}>
                  Consegnato
                </Pulsante>
              )}
              <Pulsante variante="leggero" dimensione="piccolo" onClick={() => setAnnulla({ id: o.id, motivo: "" })}>
                Annulla
              </Pulsante>
            </>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Room service"
        sottotitolo={`${d.ordini.filter((o) => o.stato !== "consegnato" && o.stato !== "annullato").length} ordini in corso · si aggiorna da solo`}
        azioni={
          <span className="flex gap-2">
            <Pulsante dimensione="piccolo" icona={audio ? Bell : BellOff} onClick={() => setAudio(!audio)}>
              {audio ? "Suono attivo" : "Attiva il suono"}
            </Pulsante>
            <Pulsante dimensione="piccolo" icona={RefreshCw} disabled={busy} onClick={() => esegui(() => sbusta(azioneCaricaOrdini()), "Aggiornato.")}>
              Aggiorna
            </Pulsante>
          </span>
        }
      />
      <Suggerimento id="room-service" titolo="Come funziona">
        <p>
          L&apos;ospite ordina dal telefono con il QR del cartoncino che riceve al check-in (lo stampi dalla pagina del check-in della camera). Gli
          ordini arrivano qui: <strong>In preparazione</strong> → <strong>Pronto</strong> → <strong>Consegnato</strong>. Alla consegna i piatti con un
          prezzo vanno sul conto della camera. Se l&apos;ospite ha segnalato un&apos;allergia a un piatto ordinato, l&apos;ordine è bordato di rosso.
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}
      {d.menu.length === 0 && (
        <Avviso tipo="avviso">
          Nessun menu room service attivo oggi: crealo in <Link href="/ristorazione/menu" className="font-semibold underline">Menu</Link> con la spunta «Room service».
        </Avviso>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        {COLONNE.map((c) => {
          const lista = d.ordini.filter((o) => o.stato === c.stato);
          return (
            <section key={c.stato} className="rounded-lg bg-stone-100 p-2">
              <h2 className="mb-2 px-1 font-semibold text-stone-700">
                {c.titolo} ({lista.length})
              </h2>
              <ul className="flex flex-col gap-2">{lista.map((o) => scheda(o, c.azione))}</ul>
              {lista.length === 0 && <p className="px-1 text-sm text-stone-500">Nessuno.</p>}
            </section>
          );
        })}
      </div>

      <Sezione titolo="Ordine al telefono">
        {telefono ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <Campo etichetta="Camera">
                <Select value={telefono.segmentoId} onChange={(e) => setTelefono({ ...telefono, segmentoId: e.target.value })}>
                  <option value="">Scegli…</option>
                  {d.camere.map((c) => (
                    <option key={c.segmentoId} value={c.segmentoId}>
                      {c.camera ? `${c.camera} · ` : ""}
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo etichetta="Per le ore" aiuto="Vuoto = appena possibile.">
                <Input type="datetime-local" value={telefono.orario} onChange={(e) => setTelefono({ ...telefono, orario: e.target.value })} />
              </Campo>
              <Campo etichetta="Nota">
                <Input value={telefono.nota} onChange={(e) => setTelefono({ ...telefono, nota: e.target.value })} />
              </Campo>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {voci.map((v) => (
                <li key={v.voceId} className="flex items-center gap-2 text-sm">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    className="w-16"
                    aria-label={`Quantità ${v.nome}`}
                    value={telefono.quantita[v.voceId] ?? ""}
                    onChange={(e) => setTelefono({ ...telefono, quantita: { ...telefono.quantita, [v.voceId]: Number(e.target.value) } })}
                  />
                  <span>
                    {v.nome} <span className="text-stone-500">{v.prezzo > 0 ? eur(v.prezzo) : "compreso"}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Pulsante
                variante="primario"
                disabled={busy || !telefono.segmentoId || !Object.values(telefono.quantita).some((q) => q > 0)}
                onClick={async () => {
                  const ok = await esegui(
                    () =>
                      sbusta(
                        azioneOrdineTelefono(Number(telefono.segmentoId), {
                          righe: Object.entries(telefono.quantita)
                            .filter(([, q]) => q > 0)
                            .map(([voceId, quantita]) => ({ voceId: Number(voceId), quantita })),
                          perQuando: telefono.orario || null,
                          nota: telefono.nota,
                        }),
                      ),
                    "Ordine inserito.",
                  );
                  if (ok) setTelefono(null);
                }}
              >
                Inserisci l&apos;ordine
              </Pulsante>
              <Pulsante onClick={() => setTelefono(null)}>Annulla</Pulsante>
            </div>
          </div>
        ) : (
          <Pulsante icona={Phone} disabled={!d.camere.length || !voci.length} onClick={() => setTelefono({ segmentoId: "", quantita: {}, orario: "", nota: "" })}>
            <Plus className="h-3.5 w-3.5" aria-hidden /> Nuovo ordine al telefono
          </Pulsante>
        )}
      </Sezione>

      {chiusi.length > 0 && (
        <Sezione titolo={`Chiusi oggi (${chiusi.length})`}>
          <ul className="divide-y divide-stone-100 text-sm">
            {chiusi.map((o) => (
              <li key={o.id} className="flex flex-wrap items-baseline gap-2 py-1.5">
                <strong>{o.camera ? `Camera ${o.camera}` : o.ospite}</strong>
                <span className="min-w-0 flex-1 text-stone-700">{o.righe.map((r) => `${r.quantita} × ${r.descrizione}`).join(", ")}</span>
                {o.stato === "consegnato" ? <Etichetta tono="verde">consegnato · {o.aggiornatoDa}</Etichetta> : <Etichetta>annullato: {o.motivoAnnullato}</Etichetta>}
                <Link href={`/prenotazioni/${o.prenotazioneId}`} className="text-xs font-semibold text-teal-800 hover:underline">
                  conto
                </Link>
              </li>
            ))}
          </ul>
        </Sezione>
      )}
    </div>
  );
}
