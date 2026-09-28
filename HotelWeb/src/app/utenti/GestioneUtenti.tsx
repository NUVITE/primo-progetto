"use client";

import { sbusta } from "@/lib/esito";
import { useState } from "react";
import {
  azioneAggiungiUtente,
  azioneCambiaRuolo,
  azioneImpostaAttivo,
  azioneImpostaSuperAdmin,
  azioneRimuoviDaHotel,
  datiUtenti,
} from "./actions";

type Dati = Awaited<ReturnType<typeof datiUtenti>>;

const PILLOLA = "rounded-full px-2.5 py-0.5 text-xs font-semibold";

export function GestioneUtenti({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [daRimuovere, setDaRimuovere] = useState<number | null>(null);

  const ruoloPredefinito = dati.ruoli.find((r) => r.nome === "Reception")?.id ?? dati.ruoli[0]?.id ?? 0;
  const [nuovo, setNuovo] = useState({ nome: "", email: "", password: "", ruoloId: ruoloPredefinito });

  async function eseguendo(fn: () => Promise<Dati>) {
    setErrore(null);
    setBusy(true);
    try {
      setDati(await fn());
      setDaRimuovere(null);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      // Nuovo oggetto = nuovo render: le tendine controllate tornano al valore reale dopo un rifiuto.
      setDati((d) => ({ ...d }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Utenti</h1>
        <p className="text-sm text-stone-600">
          Chi può accedere a <strong>{dati.hotelNome}</strong> e con quale ruolo. I permessi di ogni ruolo si decidono nella pagina Ruoli.
        </p>
      </div>

      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Utenti dell&apos;hotel</h2>
        <table className="tabella-responsive w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="pb-1">Nome</th>
              <th className="pb-1">Email</th>
              <th className="pb-1">Ruolo</th>
              {dati.sonoSuperAdmin && <th className="pb-1">Account</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {dati.utenti.map((u) => (
              <tr key={u.id} className="border-t border-stone-100">
                <td data-label="Nome" className="py-2 font-semibold">
                  {u.nome}
                  {u.id === dati.ioId && <span className="ml-1 text-xs font-normal text-stone-500">(tu)</span>}
                </td>
                <td data-label="Email" className="break-all py-2">{u.email}</td>
                <td data-label="Ruolo" className="py-2">
                  <select
                    className="rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900"
                    value={u.ruoloId}
                    disabled={busy}
                    onChange={(e) => eseguendo(() => sbusta(azioneCambiaRuolo(u.id, Number(e.target.value))))}
                  >
                    {dati.ruoli.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                </td>
                {dati.sonoSuperAdmin && (
                  <td data-label="Account" className="py-2">
                    <button
                      className={`${PILLOLA} ${u.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                      title="Vale per tutti gli hotel dell'utente"
                      onClick={() => eseguendo(() => sbusta(azioneImpostaAttivo(u.id, !u.attivo)))}
                    >
                      {u.attivo ? "Attivo" : "Disattivato"}
                    </button>
                  </td>
                )}
                <td className="cella-intera py-2 md:text-right">
                  {daRimuovere === u.id ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="text-xs text-stone-600">Togliere l&apos;accesso a {dati.hotelNome}?</span>
                      <button
                        disabled={busy}
                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                        onClick={() => eseguendo(() => sbusta(azioneRimuoviDaHotel(u.id)))}
                      >
                        Rimuovi
                      </button>
                      <button className="rounded-md px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-100" onClick={() => setDaRimuovere(null)}>
                        Annulla
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex flex-wrap gap-1">
                      {dati.sonoSuperAdmin && (
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                          onClick={() => eseguendo(() => sbusta(azioneImpostaSuperAdmin(u.id, true)))}
                        >
                          Rendi superadmin
                        </button>
                      )}
                      <button
                        className="rounded-md px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setErrore(null);
                          setDaRimuovere(u.id);
                        }}
                      >
                        Rimuovi dall&apos;hotel
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {dati.utenti.length === 0 && (
              <tr><td colSpan={5} className="cella-intera py-2 text-stone-500">Nessun utente ha accesso a questo hotel.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="min-w-0 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-600">Nuovo utente</h2>
        <p className="mb-3 text-xs text-stone-500">
          {dati.sonoSuperAdmin
            ? "Se l'email esiste già, l'utente viene collegato a questo hotel con il ruolo scelto (nome e password vengono ignorati)."
            : "L'utente potrà accedere solo a questo hotel."}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-auto">
            Nome
            <input className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} />
          </label>
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-auto">
            Email
            <input type="email" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" value={nuovo.email} onChange={(e) => setNuovo({ ...nuovo, email: e.target.value })} />
          </label>
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-auto">
            Password iniziale (min. 8 caratteri)
            <input type="text" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" value={nuovo.password} onChange={(e) => setNuovo({ ...nuovo, password: e.target.value })} />
          </label>
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-auto">
            Ruolo
            <select className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" value={nuovo.ruoloId} onChange={(e) => setNuovo({ ...nuovo, ruoloId: Number(e.target.value) })}>
              {dati.ruoli.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </label>
          <button
            disabled={busy || !nuovo.email || !nuovo.ruoloId}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            onClick={() =>
              eseguendo(async () => {
                const r = await sbusta(azioneAggiungiUtente(nuovo));
                setNuovo({ nome: "", email: "", password: "", ruoloId: ruoloPredefinito });
                return r;
              })
            }
          >
            + Aggiungi utente
          </button>
        </div>
      </section>

      {dati.sonoSuperAdmin && (
        <section className="min-w-0 rounded-xl border border-violet-200 bg-white p-4 sm:p-5">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">Gestori della piattaforma (superadmin)</h2>
          <p className="mb-3 text-xs text-stone-500">Vedono tutti gli hotel, anche quelli creati in futuro, con tutti i permessi. Visibile solo ai superadmin.</p>
          <ul className="flex flex-col gap-2">
            {dati.superAdmin.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2 text-sm">
                <span>
                  <strong>{u.nome}</strong> <span className="break-all text-stone-600">{u.email}</span>
                  {u.id === dati.ioId && <span className="ml-1 text-xs text-stone-500">(tu)</span>}
                </span>
                {u.id !== dati.ioId && (
                  <button
                    className="rounded-md px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                    onClick={() => eseguendo(() => sbusta(azioneImpostaSuperAdmin(u.id, false)))}
                  >
                    Togli superadmin
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
