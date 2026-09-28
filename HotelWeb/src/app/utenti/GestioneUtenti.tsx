"use client";

import { sbusta } from "@/lib/esito";
import { useState } from "react";
import type { RuoloUtente } from "@/generated/prisma/enums";
import { azioneCreaUtente, azioneImpostaAccessoHotel, azioneImpostaAttivo, azioneImpostaRuolo, datiUtenti } from "./actions";

type Dati = Awaited<ReturnType<typeof datiUtenti>>;

const RUOLI: RuoloUtente[] = ["ADMIN", "RECEZIONE"];

export function GestioneUtenti({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [nuovo, setNuovo] = useState<{ nome: string; email: string; password: string; ruolo: RuoloUtente; hotelIds: number[] }>({
    nome: "",
    email: "",
    password: "",
    ruolo: "RECEZIONE",
    hotelIds: dati.hotelsGestibili.map((h) => h.id),
  });

  async function eseguendo(fn: () => Promise<Dati>) {
    setErrore(null);
    setBusy(true);
    try {
      setDati(await fn());
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <h1 className="text-xl font-bold">Utenti</h1>

      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Elenco</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="pb-1">Nome</th>
              <th className="pb-1">Email</th>
              <th className="pb-1">Ruolo</th>
              <th className="pb-1">Hotel</th>
              <th className="pb-1">Attivo</th>
            </tr>
          </thead>
          <tbody>
            {dati.utenti.map((u) => (
              <tr key={u.id} className="border-t border-stone-100">
                <td className="py-2 font-semibold">{u.nome}</td>
                <td className="py-2">{u.email}</td>
                <td className="py-2">
                  <select
                    className="rounded-md border border-stone-300 px-2 py-1 text-sm"
                    value={u.ruolo}
                    onChange={(e) => eseguendo(() => sbusta(azioneImpostaRuolo(u.id, e.target.value as RuoloUtente)))}
                  >
                    {RUOLI.map((r) => <option key={r} value={r}>{r === "ADMIN" ? "Amministratore" : "Reception"}</option>)}
                  </select>
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    {dati.hotelsGestibili.map((h) => {
                      const attivo = u.hotelIds.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${attivo ? "bg-teal-50 text-teal-700 border border-teal-700" : "bg-stone-100 text-stone-500 border border-stone-300"}`}
                          onClick={() => eseguendo(() => sbusta(azioneImpostaAccessoHotel(u.id, h.id, !attivo)))}
                        >
                          {h.nome}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="py-2">
                  <button
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                    onClick={() => eseguendo(() => sbusta(azioneImpostaAttivo(u.id, !u.attivo)))}
                  >
                    {u.attivo ? "Attivo" : "Disattivato"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Nuovo utente</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-stone-600">Nome</label>
            <input className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Email</label>
            <input type="email" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovo.email} onChange={(e) => setNuovo({ ...nuovo, email: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Password iniziale</label>
            <input type="text" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovo.password} onChange={(e) => setNuovo({ ...nuovo, password: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Ruolo</label>
            <select className="rounded-md border border-stone-300 px-2 py-1.5 text-sm" value={nuovo.ruolo} onChange={(e) => setNuovo({ ...nuovo, ruolo: e.target.value as RuoloUtente })}>
              {RUOLI.map((r) => <option key={r} value={r}>{r === "ADMIN" ? "Amministratore" : "Reception"}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-600">Hotel</label>
            <div className="flex gap-2">
              {dati.hotelsGestibili.map((h) => {
                const attivo = nuovo.hotelIds.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attivo ? "bg-teal-50 text-teal-700 border border-teal-700" : "bg-stone-100 text-stone-500 border border-stone-300"}`}
                    onClick={() =>
                      setNuovo({
                        ...nuovo,
                        hotelIds: attivo ? nuovo.hotelIds.filter((id) => id !== h.id) : [...nuovo.hotelIds, h.id],
                      })
                    }
                  >
                    {h.nome}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            disabled={busy || !nuovo.nome || !nuovo.email || !nuovo.password || nuovo.hotelIds.length === 0}
            className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
            onClick={() =>
              eseguendo(async () => {
                const r = await sbusta(azioneCreaUtente(nuovo));
                setNuovo({ nome: "", email: "", password: "", ruolo: "RECEZIONE", hotelIds: dati.hotelsGestibili.map((h) => h.id) });
                return r;
              })
            }
          >
            + Crea utente
          </button>
        </div>
      </section>
    </div>
  );
}
