"use client";

import { ExternalLink, Sun, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { azioneCollegaPrenotazionePersona, azioneRimuoviPersona, azioneSalvaPersona, datiDettaglioSala } from "../../actions";
import { BOTTONE, CELLA, type Contesto } from "../../componenti";

type Dettaglio = Awaited<ReturnType<typeof datiDettaglioSala>>["dettaglio"];
type Persona = Dettaglio["persone"][number];

const RUOLI: Record<string, string> = { relatore: "Relatore", organizzatore: "Organizzatore", tecnico: "Tecnico", altro: "Altro" };
const vuota = () => ({ nome: "", ruolo: "relatore", telefono: "", email: "", note: "" });

/**
 * Relatori, organizzatori e tecnici dell'evento, con la camera o l'uso diurno prenotato per loro.
 * Da qui si apre direttamente l'uso diurno già collegato alla persona.
 */
export function PersoneEvento({
  evento,
  contesto,
  puoGestire,
  busy,
  esegui,
}: {
  evento: Dettaglio;
  contesto: Contesto | null;
  puoGestire: boolean;
  busy: boolean;
  esegui: (fn: () => Promise<Dettaglio>, ok: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState<null | { id: number | null; f: ReturnType<typeof vuota> }>(null);
  const [collega, setCollega] = useState<null | { personaId: number; prenotazioneId: string }>(null);
  const [daTogliere, setDaTogliere] = useState<number | null>(null);
  const annullata = evento.stato === "annullata";
  const primoGiorno = evento.giorni[0] ?? "";
  const btnLeggero = "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9";

  const riga = (p: Persona) => (
    <li key={p.id} className="flex flex-wrap items-start gap-3 py-2">
      <div className="min-w-0 flex-1 text-sm">
        <p>
          <strong>{p.nome}</strong> <span className="text-stone-600">· {RUOLI[p.ruolo] ?? p.ruolo}</span>
        </p>
        {(p.telefono || p.email) && <p className="text-xs text-stone-600">{[p.telefono, p.email].filter(Boolean).join(" · ")}</p>}
        {p.note && <p className="text-xs text-stone-600">{p.note}</p>}
        {p.prenotazione ? (
          <Link href={`/prenotazioni/${p.prenotazione.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline">
            <ExternalLink className="h-3 w-3" aria-hidden /> #{p.prenotazione.id}: {p.prenotazione.descrizione}
            {p.prenotazione.annullata ? " (annullata)" : ""}
          </Link>
        ) : (
          <p className="text-xs text-stone-500">Nessuna camera o uso diurno collegato.</p>
        )}
      </div>
      {puoGestire && !annullata && (
        <div className="flex flex-wrap items-center gap-1">
          {!p.prenotazione && (
            <Link href={`/prenotazioni/uso-diurno?giorno=${primoGiorno}&persona=${p.id}`} className={btnLeggero}>
              <Sun className="h-3.5 w-3.5" aria-hidden /> Uso diurno
            </Link>
          )}
          {contesto && (
            <button type="button" className={btnLeggero} onClick={() => setCollega({ personaId: p.id, prenotazioneId: p.prenotazione ? String(p.prenotazione.id) : "" })}>
              {p.prenotazione ? "Cambia collegamento" : "Collega una prenotazione"}
            </button>
          )}
          <button type="button" className={btnLeggero} onClick={() => setForm({ id: p.id, f: { nome: p.nome, ruolo: p.ruolo, telefono: p.telefono, email: p.email, note: p.note } })}>
            Modifica
          </button>
          {daTogliere === p.id ? (
            <>
              <button
                type="button"
                disabled={busy}
                className="inline-flex h-7 items-center rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 pointer-coarse:h-9"
                onClick={async () => {
                  await esegui(() => sbusta(azioneRimuoviPersona(evento.id, p.id)), "Persona tolta dall'evento.");
                  setDaTogliere(null);
                }}
              >
                Sì, togli
              </button>
              <button type="button" className={btnLeggero} onClick={() => setDaTogliere(null)}>
                No
              </button>
            </>
          ) : (
            <button type="button" className="inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold text-red-700 hover:bg-red-50 pointer-coarse:h-9" onClick={() => setDaTogliere(p.id)}>
              Togli
            </button>
          )}
        </div>
      )}
      {collega?.personaId === p.id && contesto && (
        <div className="flex w-full flex-wrap items-end gap-2 rounded-md border border-teal-200 bg-teal-50/40 p-2">
          <label className="flex min-w-64 flex-col gap-1 text-xs font-semibold text-stone-600">
            Prenotazione di camera o uso diurno
            <select className={CELLA} value={collega.prenotazioneId} onChange={(e) => setCollega({ ...collega, prenotazioneId: e.target.value })}>
              <option value="">— nessuna —</option>
              {contesto.prenotazioni.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.etichetta}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            className={BOTTONE}
            onClick={async () => {
              const ok = await esegui(
                () => sbusta(azioneCollegaPrenotazionePersona(evento.id, p.id, collega.prenotazioneId ? Number(collega.prenotazioneId) : null)),
                "Collegamento salvato.",
              );
              if (ok) setCollega(null);
            }}
          >
            Salva
          </button>
          <button type="button" className={btnLeggero} onClick={() => setCollega(null)}>
            Annulla
          </button>
        </div>
      )}
    </li>
  );

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Relatori e organizzatori</h2>
        {puoGestire && !annullata && !form && (
          <button type="button" className={btnLeggero} onClick={() => setForm({ id: null, f: vuota() })}>
            <UserPlus className="h-3.5 w-3.5" aria-hidden /> Aggiungi persona
          </button>
        )}
      </div>
      <AiutoSezione breve="Le persone che seguono l'evento, con la camera o l'uso diurno prenotato per loro.">
        <Esempio>Il relatore arriva la mattina dell&apos;esame e riparte la sera: «Uso diurno» gli prenota una camera dalle 9 alle 18, già collegata all&apos;evento.</Esempio>
      </AiutoSezione>
      {form && (
        <div className="mt-3 grid gap-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
            Nome e cognome
            <input className={CELLA} value={form.f.nome} onChange={(e) => setForm({ ...form, f: { ...form.f, nome: e.target.value } })} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
            Ruolo
            <select className={CELLA} value={form.f.ruolo} onChange={(e) => setForm({ ...form, f: { ...form.f, ruolo: e.target.value } })}>
              {Object.entries(RUOLI).map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
            Telefono
            <input className={CELLA} value={form.f.telefono} onChange={(e) => setForm({ ...form, f: { ...form.f, telefono: e.target.value } })} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
            Email
            <input className={CELLA} value={form.f.email} onChange={(e) => setForm({ ...form, f: { ...form.f, email: e.target.value } })} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600 sm:col-span-2 lg:col-span-4">
            Note
            <input className={CELLA} value={form.f.note} placeholder="es. arriva in treno alle 8:30" onChange={(e) => setForm({ ...form, f: { ...form.f, note: e.target.value } })} />
          </label>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="button"
              disabled={busy || !form.f.nome.trim()}
              className={BOTTONE}
              onClick={async () => {
                if (await esegui(() => sbusta(azioneSalvaPersona(evento.id, form.id, form.f)), "Persona salvata.")) setForm(null);
              }}
            >
              Salva
            </button>
            <button type="button" className={btnLeggero} onClick={() => setForm(null)}>
              Annulla
            </button>
          </div>
        </div>
      )}
      {evento.persone.length === 0 && !form ? (
        <p className="mt-2 text-sm text-stone-600">Nessuna persona indicata.</p>
      ) : (
        <ul className="mt-2 divide-y divide-stone-100">{evento.persone.map(riga)}</ul>
      )}
    </section>
  );
}
